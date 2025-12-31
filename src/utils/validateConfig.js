/**
 * 設定の検証ユーティリティ
 * 起動時に必須設定が存在するかチェック
 */

const { EXIT_CODES } = require('../config/constants');

/**
 * 必須設定項目
 */
const REQUIRED_CONFIG = [
    { key: 'token', name: 'Discord Bot Token', envVar: 'DISCORD_TOKEN' },
    { key: 'clientId', name: 'Discord Client ID', envVar: 'DISCORD_CLIENT_ID' },
];

/**
 * 推奨設定項目（警告のみ）
 */
const RECOMMENDED_CONFIG = [
    { key: 'ownerId', name: 'Owner ID', envVar: 'DISCORD_OWNER_ID' },
    { key: 'spotifyClientId', name: 'Spotify Client ID', envVar: 'SPOTIFY_CLIENT_ID' },
    { key: 'spotifyClientSecret', name: 'Spotify Client Secret', envVar: 'SPOTIFY_CLIENT_SECRET' },
];

/**
 * 設定を検証し、不足があれば終了
 * @param {Object} config - 設定オブジェクト
 * @returns {boolean} - 検証成功
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];

    // 必須項目のチェック
    for (const item of REQUIRED_CONFIG) {
        if (!config[item.key]) {
            errors.push(`❌ ${item.name} が設定されていません (環境変数: ${item.envVar})`);
        }
    }

    // 推奨項目のチェック
    for (const item of RECOMMENDED_CONFIG) {
        if (!config[item.key]) {
            warnings.push(`⚠️  ${item.name} が未設定です (環境変数: ${item.envVar})`);
        }
    }

    // トークンの基本的な形式チェック
    if (config.token && !isValidTokenFormat(config.token)) {
        errors.push('❌ Discord Bot Token の形式が正しくありません');
    }

    // 警告を出力
    if (warnings.length > 0) {
        console.warn('\n========== 設定の警告 ==========');
        warnings.forEach(w => console.warn(w));
        console.warn('================================\n');
    }

    // エラーがあれば終了
    if (errors.length > 0) {
        console.error('\n========== 設定エラー ==========');
        errors.forEach(e => console.error(e));
        console.error('');
        console.error('必要な環境変数を設定してください。');
        console.error('.env.example を参照してください。');
        console.error('================================\n');
        process.exit(EXIT_CODES.MISSING_CONFIG);
    }

    return true;
}

/**
 * Discord トークンの基本的な形式チェック
 * @param {string} token - チェックするトークン
 * @returns {boolean}
 */
function isValidTokenFormat(token) {
    // Discord トークンは通常 . で区切られた3つの部分で構成
    if (typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
}

module.exports = { validateConfig, REQUIRED_CONFIG, RECOMMENDED_CONFIG };
