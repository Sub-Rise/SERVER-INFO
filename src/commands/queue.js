const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const { safeDeferReply } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('現在の音楽キューを表示します。'),
    async execute(interaction) {
        const { client } = interaction;

        // safeDeferReply でエラーハンドリング付き defer
        const deferSuccess = await safeDeferReply(interaction, {});
        if (!deferSuccess) return;

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue || !queue.songs || queue.songs.length === 0) {
            return interaction.followUp({ content: '現在再生中のキューはありません。', ephemeral: true });
        }
        const q = queue.songs
            .map((song, i) => `${i === 0 ? '再生中:' : ` \`${i}.\``} ${song.name} - \`${song.formattedDuration}\``)
            .join('\n');
        const embed = new EmbedBuilder()
            .setTitle('再生キュー')
            .setDescription(q.slice(0, 4090) || 'キューは空です。')
            .setColor(COLORS.INFO);
        await interaction.followUp({ embeds: [embed] });
    },
}; 