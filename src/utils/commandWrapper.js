/**
 * コマンド実行ラッパーユーティリティ
 * deferReply のエラーハンドリングを共通化し、DRY原則を徹底
 */

const structuredLog = require('./logger');

/**
 * deferReply を安全に実行する
 * @param {Interaction} interaction - コマンドインタラクション
 * @param {Object} options - deferReply オプション
 * @returns {Promise<boolean>} - 成功時 true、失敗時 false
 */
async function safeDeferReply(interaction, options = {}) {
    try {
        await interaction.deferReply(options);
        return true;
    } catch (deferError) {
        structuredLog('error', '[CommandWrapper] deferReply failed.', {
            command: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
            errorCode: deferError.code,
            errorMessage: deferError.message,
            errorStack: deferError.stack
        });

        // Discord API エラーコード 10062 = Unknown Interaction（タイムアウト等）
        if (deferError.code === 10062) {
            structuredLog('warn', '[CommandWrapper] Interaction expired (Unknown Interaction).', {
                command: interaction.commandName,
                userId: interaction.user.id,
                guildId: interaction.guild?.id
            });
        }

        return false;
    }
}

/**
 * コマンド実行を安全にラップする Higher-Order Function
 * @param {Function} commandFn - コマンドのメイン処理関数 (interaction) => Promise<void>
 * @param {Object} options - オプション
 * @param {boolean} options.ephemeral - deferReply を ephemeral にするか（デフォルト: false）
 * @param {boolean} options.shouldDefer - 自動的に deferReply を実行するか（デフォルト: true）
 * @returns {Function} - ラップされた execute 関数
 */
function wrapCommand(commandFn, options = {}) {
    const { ephemeral = false, shouldDefer = true } = options;

    return async function wrappedExecute(interaction) {
        try {
            // 共通の defer 処理
            if (shouldDefer && !interaction.deferred && !interaction.replied) {
                const deferSuccess = await safeDeferReply(interaction, { ephemeral });
                if (!deferSuccess) {
                    return; // defer に失敗した場合は処理を中断
                }
            }

            // メインのコマンド処理を実行
            await commandFn(interaction);

        } catch (error) {
            structuredLog('error', `[CommandWrapper] Command execution failed: ${interaction.commandName}`, {
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                errorMessage: error.message,
                errorStack: error.stack
            });

            // ユーザーへのエラー通知
            const errorContent = { content: 'コマンド実行中にエラーが発生しました。', ephemeral: true };
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(errorContent);
                } else {
                    await interaction.reply(errorContent);
                }
            } catch (replyError) {
                structuredLog('warn', '[CommandWrapper] Failed to send error notification', {
                    command: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    errorMessage: replyError.message
                });
            }
        }
    };
}

module.exports = {
    safeDeferReply,
    wrapCommand
};
