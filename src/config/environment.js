require('dotenv').config();

// 環境変数から設定を読み込み、フォールバックとしてconfig.jsonを使用
function getConfig() {
    let config = {};
    
    try {
        // config.jsonが存在する場合は読み込み（開発時のフォールバック）
        config = require('../../config.json');
    } catch (error) {
        // config.jsonが存在しない場合は空のオブジェクト
        config = {};
    }
    
    // 環境判定の優先順位: NODE_ENV環境変数 > config.json設定 > デフォルト
    const nodeEnv = process.env.NODE_ENV || 'development';
    let isProduction = false;
    
    if (process.env.NODE_ENV) {
        // 環境変数が設定されている場合は環境変数を優先
        isProduction = nodeEnv.toLowerCase() === 'production';
    } else if (typeof config.isProduction === 'boolean') {
        // 環境変数が未設定の場合はconfig.jsonの設定を使用
        isProduction = config.isProduction;
    }
    // それ以外はデフォルト(false = development)
    
    return {
        token: process.env.DISCORD_TOKEN || config.token,
        clientId: process.env.DISCORD_CLIENT_ID || config.clientId,
        guildId: process.env.DISCORD_GUILD_ID || config.guildId,
        ownerId: process.env.DISCORD_OWNER_ID || config.ownerId,
        adminRoleIds: process.env.ADMIN_ROLE_IDS ? 
            process.env.ADMIN_ROLE_IDS.split(',').map(id => id.trim()) : 
            (config.adminRoleIds || []),
        spotifyClientId: process.env.SPOTIFY_CLIENT_ID || config.spotifyClientId,
        spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || config.spotifyClientSecret,
        fabriXApiKey: process.env.FABRIX_API_KEY || config.fabriXApiKey,
        
        // ミュートログ設定
        enableMuteLogging: process.env.ENABLE_MUTE_LOGGING ?
            process.env.ENABLE_MUTE_LOGGING.toLowerCase() === 'true' :
            (config.enableMuteLogging !== undefined ? config.enableMuteLogging : true),
        
        // 環境設定
        nodeEnv: nodeEnv,
        isProduction: isProduction,
        isDevelopment: !isProduction
    };
}

module.exports = getConfig();