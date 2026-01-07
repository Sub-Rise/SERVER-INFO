/**
 * サーバー情報パネル更新用イベントハンドラ
 * 
 * 複数のDiscordイベントに対してパネル更新をトリガーする共通ハンドラ。
 * 動的ローディングパターンで登録される。
 */

const { hasManagedMessage, scheduleUpdate } = require('../../../utils/infoUpdater');
const structuredLog = require('../../../utils/logger');

// このハンドラが対応するイベント名一覧
const HANDLED_EVENTS = [
    'channelCreate', 'channelDelete', 'channelUpdate',
    'emojiCreate', 'emojiDelete', 'emojiUpdate',
    'guildUpdate', 'guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate',
    'presenceUpdate', 'roleCreate', 'roleDelete', 'roleUpdate',
    'stickerCreate', 'stickerDelete', 'stickerUpdate', 'voiceStateUpdate'
];

/**
 * イベント引数からギルドを抽出
 * @param {string} eventName - イベント名
 * @param {any} arg1 - 第1引数
 * @param {any} arg2 - 第2引数
 * @returns {Guild|null}
 */
function extractGuild(eventName, arg1, arg2) {
    if (eventName === 'guildUpdate') {
        return arg2; // (oldGuild, newGuild)
    } else if (eventName === 'voiceStateUpdate') {
        return arg2?.guild; // (oldState, newState)
    } else {
        // その他のイベント: arg1.guild または arg1 自体がギルド
        let guild = arg1?.guild || arg1;
        if (!guild?.id && arg1?.guild) guild = arg1.guild;
        return guild;
    }
}

/**
 * 動的ローダー用のイベント登録関数を生成
 * @param {string} eventName - イベント名
 * @returns {Object} - イベントモジュール形式
 */
function createEventHandler(eventName) {
    return {
        name: eventName,
        once: false,
        execute(client, arg1, arg2) {
            const guild = extractGuild(eventName, arg1, arg2);

            if (guild && guild.id && hasManagedMessage(guild.id)) {
                scheduleUpdate(guild.id);
            }
        }
    };
}

// 各イベントのハンドラをエクスポート
module.exports = {
    HANDLED_EVENTS,
    createEventHandler,

    /**
     * すべてのパネル更新イベントを一括登録
     * @param {Client} client - Discordクライアント
     */
    registerAll(client) {
        HANDLED_EVENTS.forEach(eventName => {
            const handler = createEventHandler(eventName);
            client.on(handler.name, (arg1, arg2) => handler.execute(client, arg1, arg2));
        });
        structuredLog('info', '[InfoPanelEvents] Registered all info panel update events', {
            eventCount: HANDLED_EVENTS.length
        });
    }
};
