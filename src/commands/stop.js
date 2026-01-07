const { SlashCommandBuilder } = require('discord.js');
const { clearLeaveTimer } = require('../utils/timers');
const { wrapCommand } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('音楽を停止し、キューをクリアします。'),
    execute: wrapCommand(async (interaction) => {
        const { client } = interaction;
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.followUp({ content: '停止するものがありません。', ephemeral: true });
        }

        clearLeaveTimer(interaction.guildId);
        await queue.stop();
        await interaction.followUp('再生を停止し、キューをクリアしました。ボイスチャンネルに他のユーザーが残っている場合、5分後に退出します。');
    }),
};