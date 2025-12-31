const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('現在の音楽キューを表示します。'),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue || !queue.songs || queue.songs.length === 0) {
            return interaction.followUp({ content: '現在再生中のキューはありません。', flags: 64 });
        }
        const q = queue.songs
            .map((song, i) => `${i === 0 ? '再生中:' : ` \`${i}.\``} ${song.name} - \`${song.formattedDuration}\``)
            .join('\n');
        const embed = new EmbedBuilder()
            .setTitle('再生キュー')
            .setDescription(q.slice(0, 4090) || 'キューは空です。')
            .setColor('#0099ff');
        await interaction.followUp({ embeds: [embed] });
    },
}; 