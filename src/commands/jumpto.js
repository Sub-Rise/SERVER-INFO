const { SlashCommandBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jumpto')
        .setDescription('キュー内の指定された番号の曲へジャンプします。')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('ジャンプ先の曲番号（現在の曲の次が1番目）')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);
        const jumpToNumber = interaction.options.getInteger('number');

        structuredLog('info', '[JumptoCommand] Received', { guildId: interaction.guild?.id, userId: interaction.user?.id, jumpToUserSpecifiedNumber: jumpToNumber, currentQueueLength: queue?.songs?.length ?? 0 });

        if (!interaction.member.voice.channel) {
            return interaction.followUp({ content: '先にボイスチャンネルに参加してください！', ephemeral: true });
        }
        if (!queue) {
            return interaction.followUp({ content: '現在再生中のキューはありません。', ephemeral: true });
        }
        if (queue.songs.length <= 1) {
            return interaction.followUp({ content: 'キューにジャンプ先の曲がありません。', ephemeral: true });
        }
        if (jumpToNumber <= 0 || jumpToNumber >= queue.songs.length) {
            return interaction.followUp({
                content: `無効な曲番号です。1 から ${queue.songs.length - 1} の間で指定してください。`,
                ephemeral: true
            });
        }

        try {
            const targetSong = queue.songs[jumpToNumber];
            await queue.jump(jumpToNumber);
            // playSong イベントで再生開始メッセージが出るため、ここでは成功メッセージのみ
            await interaction.followUp({ content: `⏭️ **${targetSong.name}** へジャンプしました。` });
        } catch (e) {
            structuredLog('error', '[JumptoCommand] Error jumping to song.', { guildId: interaction.guild?.id, jumpTo: jumpToNumber, errorMessage: e.message, errorStack: e.stack });
            await interaction.followUp({ content: '曲のジャンプに失敗しました。', ephemeral: true });
        }
    },
}; 