const { Events } = require('discord.js');
const setupDisTube = require('../../core/distube.js');
const { setupDisTubeEvents } = require('../../core/distubeEvents/index.js');
const structuredLog = require('../../utils/logger.js');
const { initializeManagedPanels } = require('../../utils/infoUpdater.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        structuredLog('info', `Logged in as ${client.user.tag}!`, { botTag: client.user.tag });

        // DisTubeを初期化
        client.distube = setupDisTube(client);

        // DisTubeイベントリスナーをセットアップ
        setupDisTubeEvents(client.distube, client);

        // サーバー情報パネルを永続化データから復元
        await initializeManagedPanels(client);

        structuredLog('info', 'Bot is ready!');
    },
};