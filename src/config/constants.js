/**
 * アプリケーション全体で使用する定数
 * マジックナンバーを排除し、一元管理
 */

module.exports = {
    // タイムアウト設定（ミリ秒）
    TIMEOUTS: {
        LEAVE_TIMER: 5 * 60 * 1000,           // 5分 - VC自動退出
        INTERACTION_COLLECTOR: 120 * 1000,     // 2分 - インタラクション収集
        API_REQUEST: 30 * 1000,                // 30秒 - API リクエスト
        DEBOUNCE_UPDATE: 15 * 1000,            // 15秒 - パネル更新デバウンス
    },

    // Discord Embed制限
    EMBED_LIMITS: {
        DESCRIPTION: 4096,
        FIELD_VALUE: 1024,
        TITLE: 256,
        SAFE_DESCRIPTION: 4000,  // 余裕を持たせた値
    },

    // メッセージ制限
    MESSAGE_LIMITS: {
        CONTENT: 2000,
        SAFE_CONTENT: 1900,  // 余裕を持たせた値
    },

    // 音楽機能
    MUSIC: {
        MAX_VOLUME: 200,
        DEFAULT_VOLUME: 100,
        SEARCH_LIMIT: 20,
        ITEMS_PER_PAGE: 10,
        SHUFFLE_ATTEMPTS: 3,
    },

    // リトライ設定
    RETRY: {
        MAX_ATTEMPTS: 3,
        BASE_DELAY: 1000,
        MAX_DELAY: 10000,
        BACKOFF_MULTIPLIER: 2,
    },

    // カラーコード
    COLORS: {
        SUCCESS: 0x00AE86,
        ERROR: 0xFF0000,
        INFO: 0x0099FF,
        WARNING: 0xFFCC00,
    },

    // 終了コード
    EXIT_CODES: {
        SUCCESS: 0,
        GENERAL_ERROR: 1,
        MISSING_CONFIG: 2,
        UNCAUGHT_EXCEPTION: 3,
        UNHANDLED_REJECTION: 4,
    },
};
