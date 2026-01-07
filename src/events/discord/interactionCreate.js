const { Events } = require('discord.js');
const structuredLog = require('../../utils/logger');
const { guildLastTextChannel } = require('../../utils/timers');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ実行できます。' }).catch(err => {
                structuredLog('warn', 'Failed to reply for DM interaction', {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    errorMessage: err.message
                });
            });
            return;
        }

        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: 'サーバー情報の取得準備中のため、このコマンドは実行できません。少し待ってから再度お試しください。', ephemeral: true }).catch(err => {
                structuredLog('warn', 'Failed to reply for uncached guild interaction', {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    errorMessage: err.message
                });
            });
            return;
        }

        // guildLastTextChannel の更新
        if (interaction.guildId) {
            guildLastTextChannel.set(interaction.guildId, interaction.channel);
        }

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            structuredLog('error', 'Command not found', { commandName: interaction.commandName, userId: interaction.user.id, guildId: interaction.guild?.id });
            await interaction.reply({ content: '存在しないコマンドです。', ephemeral: true }).catch(err => {
                structuredLog('warn', 'Failed to reply for unknown command', {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    errorMessage: err.message
                });
            });
            return;
        }

        try {
            // client インスタンスは interaction に含まれているので、別途渡す必要はない
            await command.execute(interaction);
        } catch (error) {
            // wrapCommand でラップされているコマンドは内部でエラーハンドリングを行うため、
            // ここに到達するのは「ラップし忘れ」または予期せぬエラーの場合のみ。
            // 「最後の砦」として安全網を維持する。
            structuredLog('error', '[InteractionCreate] Uncaught error in command execution (possible unwrapped command)', {
                commandName: interaction.commandName,
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                errorMessage: error.message,
                errorStack: error.stack
            });

            // ユーザーへのフォールバック通知
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
                }
            } catch (replyError) {
                structuredLog('warn', '[InteractionCreate] Failed to send fallback error notification', {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    errorMessage: replyError.message
                });
            }
        }
    },
};