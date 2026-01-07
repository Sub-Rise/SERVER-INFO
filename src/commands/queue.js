const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const { wrapCommand } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('現在の音楽キューを表示します。'),
    execute: wrapCommand(async (interaction) => {
        const { client } = interaction;
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
    }),
};