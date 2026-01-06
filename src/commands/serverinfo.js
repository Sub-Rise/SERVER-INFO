const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const { toggleUpdate } = require('../utils/infoUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('サーバー情報を表示、またはリアルタイム更新の開始/停止をします。'),
    async execute(interaction) {
        if (!isAdmin(interaction)) {
            return interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
        }
        await toggleUpdate(interaction);
    },
}; 