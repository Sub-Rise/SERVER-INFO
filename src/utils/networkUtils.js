const structuredLog = require('./logger');
const { DISCORD_API_CONFIG, ERROR_CONFIG } = require('../config/networkConfig');

// デフォルトリトライ設定
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    baseDelay: 1000,  // 1秒
    maxDelay: 10000,  // 10秒
    backoffMultiplier: 2,
    timeoutMs: 10000  // 10秒タイムアウト
};

/**
 * 指数バックオフでリトライ機能付きの非同期関数実行
 * @param {Function} asyncFunction - 実行する非同期関数
 * @param {Object} options - リトライ設定
 * @param {string} context - ログ用のコンテキスト情報
 * @returns {Promise} - 実行結果
 */
async function retryWithBackoff(asyncFunction, options = {}, context = '') {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        try {
            // タイムアウト付きで実行
            const result = await Promise.race([
                asyncFunction(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Operation timeout')), config.timeoutMs)
                )
            ]);
            
            if (attempt > 1) {
                structuredLog('info', `[NetworkUtils] Operation succeeded after retry`, {
                    context,
                    attempt,
                    totalAttempts: attempt
                });
            }
            
            return result;
        } catch (error) {
            lastError = error;
            
            // 最後の試行の場合はリトライしない
            if (attempt > config.maxRetries) {
                structuredLog('error', `[NetworkUtils] Operation failed after all retries`, {
                    context,
                    maxRetries: config.maxRetries,
                    errorMessage: error.message,
                    errorCode: error.code
                });
                throw error;
            }
            
            // リトライ可能なエラーかチェック
            if (!isRetryableError(error)) {
                structuredLog('warn', `[NetworkUtils] Non-retryable error, aborting`, {
                    context,
                    attempt,
                    errorMessage: error.message,
                    errorCode: error.code
                });
                throw error;
            }
            
            // 遅延時間の計算（指数バックオフ + ジッター）
            const baseDelay = Math.min(
                config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
                config.maxDelay
            );
            const jitter = Math.random() * 0.1 * baseDelay; // 10%のジッター
            const delay = baseDelay + jitter;
            
            structuredLog('warn', `[NetworkUtils] Operation failed, retrying`, {
                context,
                attempt,
                maxRetries: config.maxRetries,
                delayMs: Math.round(delay),
                errorMessage: error.message,
                errorCode: error.code
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * リトライ可能なエラーかどうかを判定
 * @param {Error} error - チェックするエラー
 * @returns {boolean} - リトライ可能かどうか
 */
function isRetryableError(error) {
    return ERROR_CONFIG.retryableErrors.some(code => 
        error.code === code || error.message.includes(code)
    );
}

/**
 * Discord API呼び出し用のリトライラッパー
 * @param {Function} apiCall - Discord API呼び出し関数
 * @param {string} context - ログ用のコンテキスト
 * @returns {Promise} - API呼び出し結果
 */
async function retryDiscordAPI(apiCall, context) {
    return retryWithBackoff(apiCall, DISCORD_API_CONFIG.retry, context);
}

module.exports = {
    retryWithBackoff,
    retryDiscordAPI,
    isRetryableError,
    DEFAULT_RETRY_OPTIONS
};