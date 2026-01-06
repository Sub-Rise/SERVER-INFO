const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');
const { COLORS, MUSIC } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('現在の音楽キューをシャッフルします。'),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue || queue.songs.length < 2) {
            return interaction.followUp({ content: 'シャッフルするにはキューに2曲以上必要です。', ephemeral: true });
        }

        const veryInitialOrderUrls = queue.songs.slice(1).map(song => song.url);
        const shuffleAttempts = queue.songs.length <= 2 ? 1 : MUSIC.SHUFFLE_ATTEMPTS;

        for (let i = 0; i < shuffleAttempts; i++) {
            await queue.shuffle();
            if (shuffleAttempts > 1 && i < shuffleAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        const finalOrderUrls = queue.songs.slice(1).map(song => song.url);
        const isDifferentFromVeryInitial = !(veryInitialOrderUrls.length === finalOrderUrls.length &&
            veryInitialOrderUrls.every((url, index) => url === finalOrderUrls[index]));

        const embed = new EmbedBuilder().setColor(COLORS.INFO);
        if (isDifferentFromVeryInitial) {
            embed.setDescription('🔀 キューをシャッフルしました！');
        } else {
            structuredLog('warn', '[ShuffleCommand] Queue order did not change after shuffle', { guildId: interaction.guild.id });
            embed.setDescription('🔀 キューをシャッフルしようとしましたが、元の順序と同じになりました。');
        }
        await interaction.followUp({ embeds: [embed] });
    },
}; 