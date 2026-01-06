const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const structuredLog = require('../utils/logger');
const { clearLeaveTimer } = require('../utils/timers');
const { getErrorMessage } = require('../utils/distubeErrors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('YouTubeの曲を再生します。曲が指定されていない場合は、一時停止中の曲を再開します。')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('再生する曲名またはURL（一時停止中の場合は空白で再開）')
                .setRequired(false)),
    async execute(interaction) {
        const { client } = interaction; // client を interaction から取得

        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (deferError) {
            structuredLog('error', '[PlayCommand] deferReply failed.', {
                command: 'play',
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                errorCode: deferError.code,
                errorMessage: deferError.message,
                errorStack: deferError.stack
            });
            if (deferError.code === 10062) {
                structuredLog('warn', '[PlayCommand] deferReply failed with Unknown Interaction, cannot reliably reply.', { userId: interaction.user.id, guildId: interaction.guild?.id });
            } else {
                structuredLog('warn', '[PlayCommand] deferReply failed with non-10062 error.', { userId: interaction.user.id, guildId: interaction.guild?.id, originalErrorCode: deferError.code });
            }
            return;
        }

        let replyEditedForSearch = false;
        if (interaction.options.getString('song')) {
            try {
                await interaction.editReply({ content: '⏳ 曲を検索・準備中です...' });
                replyEditedForSearch = true;
            } catch (e) {
                structuredLog('error', '[PlayCommand] Initial editReply error for song query.', { userId: interaction.user.id, guildId: interaction.guild.id, errorCode: e.code, errorMessage: e.message });
            }
        }

        const songArg = interaction.options.getString('song');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.followUp({ content: '先にボイスチャンネルに参加してください！', ephemeral: true });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.followUp({ content: 'ボイスチャンネルに接続または発言する権限がありません。権限を確認してください。', ephemeral: true });
        }

        if (!songArg) {
            const queue = client.distube.getQueue(interaction.guildId);
            if (queue && queue.voice && queue.voice.channelId === voiceChannel.id) {
                return interaction.followUp({ content: '既にボイスチャンネルに接続済みです。再生する曲を指定してください。', ephemeral: true });
            }
            try {
                await client.distube.voices.join(voiceChannel);
                clearLeaveTimer(interaction.guildId);
                const messageToSend = `🔊 ${voiceChannel.name} に参加しました。再生する曲をリクエストしてください。`;
                if (replyEditedForSearch) {
                    return interaction.followUp({ content: messageToSend });
                } else {
                    return interaction.editReply({ content: messageToSend });
                }
            } catch (e) {
                structuredLog('error', '[JoinOnPlayCommand] Error joining voice channel.', { userId: interaction.user.id, guildId: interaction.guild.id, errorMessage: e.message, errorStack: e.stack });
                return interaction.followUp({ content: 'ボイスチャンネルへの参加に失敗しました。', ephemeral: true });
            }
        }

        try {
            const queue = client.distube.getQueue(interaction.guildId);
            if (voiceChannel && (!queue || !queue.voice || queue.voice.channelId !== voiceChannel.id)) {
                clearLeaveTimer(interaction.guildId);
            } else if (queue && queue.voice && queue.voice.channelId === voiceChannel.id) {
                clearLeaveTimer(interaction.guildId);
            }

            await client.distube.play(voiceChannel, songArg, {
                member: interaction.member,
                textChannel: interaction.channel,
            });

        } catch (e) {
            structuredLog('error', '[PlayCommand] DisTube play error.', { query: songArg, userId: interaction.user.id, guildId: interaction.guild.id, errorCode: e.errorCode, errorMessage: e.message, errorName: e.name });
            const userFriendlyMessage = getErrorMessage(e, songArg);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: userFriendlyMessage, ephemeral: true });
                } else {
                    await interaction.followUp({ content: userFriendlyMessage, ephemeral: true });
                }
            } catch (followUpError) {
                structuredLog('error', '[PlayCommand] Failed to send error followUp.', { userId: interaction.user.id, guildId: interaction.guild.id, errorMessage: followUpError.message });
            }
        }
    },
}; 