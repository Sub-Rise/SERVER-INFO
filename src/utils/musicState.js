/**
 * 音楽状態管理モジュール
 * ギルドごとの音楽関連状態（自動シャッフル等）を管理
 * 
 * timers.js から音楽固有の状態管理を分離し、責務を明確化
 */

const structuredLog = require('./logger');

/**
 * ギルドごとの自動シャッフル設定
 * @type {Map<string, boolean>}
 */
const guildAutoShuffle = new Map();

/**
 * 自動シャッフルを有効化/無効化
 * @param {string} guildId - ギルドID
 * @param {boolean} enabled - 有効/無効
 */
function setAutoShuffle(guildId, enabled) {
    if (!guildId) {
        structuredLog('warn', '[MusicState] Cannot set auto shuffle: guildId is undefined');
        return;
    }

    guildAutoShuffle.set(guildId, enabled);
    structuredLog('info', '[MusicState] Auto shuffle updated', {
        guildId,
        enabled
    });
}

/**
 * 自動シャッフルが有効かどうかを取得
 * @param {string} guildId - ギルドID
 * @returns {boolean} - 有効な場合 true
 */
function isAutoShuffleEnabled(guildId) {
    return guildAutoShuffle.get(guildId) === true;
}

/**
 * ギルドの音楽状態をクリーンアップ
 * @param {string} guildId - ギルドID
 * @returns {boolean} - クリーンアップが行われた場合 true
 */
function cleanupMusicState(guildId) {
    if (!guildId) return false;

    const hadState = guildAutoShuffle.has(guildId);

    if (hadState) {
        guildAutoShuffle.delete(guildId);
        structuredLog('debug', '[MusicState] Cleaned up music state for guild', { guildId });
    }

    return hadState;
}

module.exports = {
    // 推奨API（カプセル化されたアクセス）
    setAutoShuffle,
    isAutoShuffleEnabled,
    cleanupMusicState,
};

