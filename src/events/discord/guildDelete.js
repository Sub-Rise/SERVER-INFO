/**
 * guildDeleteイベントハンドラ
 * ボットがギルドから退出した際に関連リソースをクリーンアップ
 */

const structuredLog = require('../../utils/logger');
const { cleanupGuild } = require('../../utils/timers');
const { stopManagingForGuildDelete } = require('../../utils/infoUpdater');

module.exports = {
    name: 'guildDelete',
    async execute(guild) {
        structuredLog('info', '[GuildDelete] Bot removed from guild', {
            guildId: guild.id,
            guildName: guild.name
        });

        // タイマー関連のMapエントリをクリーンアップ
        cleanupGuild(guild.id);

        // サーバー情報パネルの管理を停止
        try {
            await stopManagingForGuildDelete(guild.id);
        } catch (error) {
            structuredLog('error', '[GuildDelete] Error stopping info panel', {
                guildId: guild.id,
                errorMessage: error.message
            });
        }
    },
};
