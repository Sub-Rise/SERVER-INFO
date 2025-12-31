/**
 * グレースフルシャットダウン処理
 * プロセス終了時にリソースを適切にクリーンアップ
 */

const structuredLog = require('./logger');
const { EXIT_CODES } = require('../config/constants');

let isShuttingDown = false;

/**
 * シャットダウンハンドラを設定
 * @param {Client} client - Discord クライアント
 */
function setupGracefulShutdown(client) {
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            structuredLog('warn', 'Shutdown already in progress, ignoring signal', { signal });
            return;
        }
        
        isShuttingDown = true;
        structuredLog('info', `Received ${signal}, starting graceful shutdown...`, { signal });

        try {
            // DisTubeの全キューを停止
            if (client.distube) {
                const voices = client.distube.voices;
                if (voices && voices.size > 0) {
                    structuredLog('info', 'Leaving all voice channels...', { count: voices.size });
                    for (const [guildId, voice] of voices) {
                        try {
                            await voice.leave();
                            structuredLog('debug', 'Left voice channel', { guildId });
                        } catch (e) {
                            structuredLog('warn', 'Failed to leave voice channel', { guildId, error: e.message });
                        }
                    }
                }
            }

            // Discordクライアントを破棄
            if (client) {
                structuredLog('info', 'Destroying Discord client...');
                client.destroy();
            }

            structuredLog('info', 'Graceful shutdown completed');
            process.exit(EXIT_CODES.SUCCESS);

        } catch (error) {
            structuredLog('error', 'Error during graceful shutdown', { 
                errorMessage: error.message,
                errorStack: error.stack 
            });
            process.exit(EXIT_CODES.GENERAL_ERROR);
        }
    };

    // シグナルハンドラを登録
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 未処理の例外をキャッチ
    process.on('uncaughtException', (error) => {
        structuredLog('error', 'Uncaught Exception', {
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name
        });
        
        // クリティカルエラーの場合は終了
        if (!isShuttingDown) {
            shutdown('uncaughtException').catch(() => {
                process.exit(EXIT_CODES.UNCAUGHT_EXCEPTION);
            });
        }
    });

    // 未処理のPromiseリジェクションをキャッチ
    process.on('unhandledRejection', (reason, promise) => {
        structuredLog('error', 'Unhandled Promise Rejection', {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined
        });
        
        // 開発環境では警告のみ、本番環境では終了
        const { isProduction } = require('../config/environment');
        if (isProduction && !isShuttingDown) {
            shutdown('unhandledRejection').catch(() => {
                process.exit(EXIT_CODES.UNHANDLED_REJECTION);
            });
        }
    });

    structuredLog('info', 'Graceful shutdown handlers registered');
}

/**
 * シャットダウン中かどうかを確認
 * @returns {boolean}
 */
function isShutdownInProgress() {
    return isShuttingDown;
}

module.exports = { setupGracefulShutdown, isShutdownInProgress };
