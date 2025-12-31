const { SlashCommandBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('現在の曲をスキップします。'),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) return interaction.followUp({ content: 'スキップする曲がありません。', flags: 64 });
        try {
            if (queue.songs.length <= 1 && !queue.autoplay && queue.repeatMode === 0) {
                await queue.stop();
                await interaction.followUp('キューに次の曲がないため、再生を停止しました。');
            } else {
                const song = await queue.skip();
                await interaction.followUp(`スキップしました。次の曲: **${song.name}**`);
            }
        } catch (e) {
            structuredLog('error', '[SkipCommand] Error skipping song.', { guildId: interaction.guild.id, errorMessage: e.message });
            await interaction.followUp({ content: `スキップできませんでした: ${e.message.slice(0, 1900)}`, flags: 64 });
        }
    },
}; 