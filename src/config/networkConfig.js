/**
 * ネットワーク関連の設定
 */

const { TIMEOUTS, RETRY } = require('./constants');

// ServerInfoEmbed更新用の設定
const SERVER_INFO_UPDATE_CONFIG = {
    // リトライ設定（constants.js から参照）
    retry: {
        maxRetries: RETRY.MAX_ATTEMPTS,
        baseDelay: RETRY.BASE_DELAY,
        maxDelay: RETRY.MAX_DELAY,
        backoffMultiplier: RETRY.BACKOFF_MULTIPLIER,
        timeoutMs: 15000      // 15秒タイムアウト（ServerInfo固有）
    },

    // デバウンス設定（constants.js から参照）
    debounce: {
        delayMs: TIMEOUTS.DEBOUNCE_UPDATE
    },

    // ログレベル設定
    logging: {
        enableDebugLogs: false,  // debug ログを有効にするかどうか
        enableRetryLogs: true    // リトライ詳細ログを有効にするかどうか
    }
};

// Discord API汎用設定
const DISCORD_API_CONFIG = {
    retry: {
        maxRetries: 1,
        baseDelay: 2000,      // 2秒
        maxDelay: 8000,       // 8秒
        backoffMultiplier: 2,
        timeoutMs: 30000      // 30秒タイムアウト
    }
};

// エラー分類設定
const ERROR_CONFIG = {
    // リトライ可能なエラー
    retryableErrors: [
        'EAI_AGAIN',                  // DNS解決エラー
        'ECONNRESET',                 // 接続リセット
        'ECONNREFUSED',               // 接続拒否
        'ETIMEDOUT',                  // タイムアウト
        'ENOTFOUND',                  // ホスト見つからず
        'UND_ERR_CONNECT_TIMEOUT',    // Undiciタイムアウト
        'UND_ERR_SOCKET',             // Undiciソケットエラー
        'Operation timeout',          // カスタムタイムアウト
        'GuildMembersTimeout'         // メンバー取得タイムアウト
    ],

    // 回復不可能なエラー（管理停止対象）
    unrecoverableErrors: [
        'Missing Permissions',        // 権限不足
        'Missing Access',             // アクセス権限なし
        'Unknown Channel',            // チャンネル削除済み
        'Unknown Message',            // メッセージ削除済み
        'Unknown Guild'               // ギルドからキック済み
    ]
};

module.exports = {
    SERVER_INFO_UPDATE_CONFIG,
    DISCORD_API_CONFIG,
    ERROR_CONFIG
};