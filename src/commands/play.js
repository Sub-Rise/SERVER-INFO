const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const structuredLog = require('../utils/logger');
const { clearLeaveTimer } = require('../utils/timers');
const { getErrorMessage } = require('../utils/distubeErrors');
const { wrapCommand } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('YouTubeの曲を再生します。曲が指定されていない場合は、一時停止中の曲を再開します。')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('再生する曲名またはURL（一時停止中の場合は空白で再開）')
                .setRequired(false)),
    execute: wrapCommand(async (interaction) => {
        const { client } = interaction;

        // 曲が指定されている場合は検索中メッセージを表示
        const songArg = interaction.options.getString('song');
        if (songArg) {
            try {
                await interaction.editReply({ content: '⏳ 曲を検索・準備中です...' });
            } catch (e) {
                structuredLog('warn', '[PlayCommand] editReply for search status failed.', {
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    errorMessage: e.message
                });
            }
        }

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.followUp({ content: '先にボイスチャンネルに参加してください！', ephemeral: true });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.followUp({ content: 'ボイスチャンネルに接続または発言する権限がありません。権限を確認してください。', ephemeral: true });
        }

        // 曲が指定されていない場合はVCに参加のみ
        if (!songArg) {
            const queue = client.distube.getQueue(interaction.guildId);
            if (queue && queue.voice && queue.voice.channelId === voiceChannel.id) {
                return interaction.followUp({ content: '既にボイスチャンネルに接続済みです。再生する曲を指定してください。', ephemeral: true });
            }
            try {
                await client.distube.voices.join(voiceChannel);
                clearLeaveTimer(interaction.guildId);
                return interaction.followUp({ content: `🔊 ${voiceChannel.name} に参加しました。再生する曲をリクエストしてください。` });
            } catch (e) {
                structuredLog('error', '[PlayCommand] Error joining voice channel.', {
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    errorMessage: e.message,
                    errorStack: e.stack
                });
                return interaction.followUp({ content: 'ボイスチャンネルへの参加に失敗しました。', ephemeral: true });
            }
        }

        // 曲を再生
        try {
            clearLeaveTimer(interaction.guildId);
            await client.distube.play(voiceChannel, songArg, {
                member: interaction.member,
                textChannel: interaction.channel,
            });
            // DisTubeの 'playSong' / 'addSong' イベントで再生通知が行われるため、ここでは何もしない
        } catch (e) {
            structuredLog('error', '[PlayCommand] DisTube play error.', {
                query: songArg,
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                errorCode: e.errorCode,
                errorMessage: e.message,
                errorName: e.name
            });
            const userFriendlyMessage = getErrorMessage(e, songArg);
            await interaction.followUp({ content: userFriendlyMessage, ephemeral: true });
        }
    }, { ephemeral: false, autoDefer: true }),
};