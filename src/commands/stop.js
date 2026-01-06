const { SlashCommandBuilder } = require('discord.js');
const { clearLeaveTimer } = require('../utils/timers');
const { safeDeferReply } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('音楽を停止し、キューをクリアします。'),
    async execute(interaction) {
        const { client } = interaction;

        // safeDeferReply でエラーハンドリング付き defer
        const deferSuccess = await safeDeferReply(interaction, {});
        if (!deferSuccess) return;

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) return interaction.followUp({ content: '停止するものがありません。', ephemeral: true });

        clearLeaveTimer(interaction.guildId);
        await queue.stop();
        await interaction.followUp('再生を停止し、キューをクリアしました。ボイスチャンネルに他のユーザーが残っている場合、5分後に退出します。');
    },
}; 