/**
 * DisTubeエラーハンドリングユーティリティ
 * エラーコードをユーザーフレンドリーなメッセージに変換
 */

const ERROR_MESSAGES = {
    'NO_RESULTS': (query) => `曲「${query || '指定された曲'}」は見つかりませんでした。`,
    'UNAVAILABLE': () => '指定された曲は現在利用できません。',
    'VIDEO_UNAVAILABLE': () => '指定された動画は現在利用できません。',
    'NOT_SUPPORTED_URL': () => '指定されたURLはサポートされていません。',
    'VOICE_CONNECT_FAILED': () => 'ボイスチャンネルへの接続に失敗しました。権限やチャンネルの状態を確認してください。',
    'VOICE_MISSING_PERMISSIONS': () => 'ボイスチャンネルで必要な権限（発言、接続など）がBotにありません。',
    'CANNOT_RESOLVE_SONG': () => '曲の処理中にエラーが発生しました。別の曲を試してください。',
    'SPOTIFY_API_ERROR': (msg) => `Spotifyの処理中にエラーが発生しました。${msg ? `(${msg.split('\n')[0]})` : ''}`,
    'FFMPEG_ERROR': () => '再生エンジンで深刻なエラーが発生しました。Bot管理者にご連絡ください。',
    'PLAYER_ERROR': () => '再生エンジンで深刻なエラーが発生しました。Bot管理者にご連絡ください。',
    'UNKNOWN_ERROR': () => '音楽機能で予期せぬエラーが発生しました。Bot管理者に連絡してください。',
};

/**
 * 重大なエラーコード（キュー停止が必要）
 */
const CRITICAL_ERROR_CODES = ['FFMPEG_ERROR', 'PLAYER_ERROR', 'UNKNOWN_ERROR'];

/**
 * VC退出が必要なエラーコード
 */
const LEAVE_VC_ERROR_CODES = ['VOICE_CONNECT_FAILED', 'VOICE_MISSING_PERMISSIONS', 'FFMPEG_ERROR', 'PLAYER_ERROR', 'UNKNOWN_ERROR'];

/**
 * DisTubeエラーをユーザーメッセージに変換
 * @param {Error} error - DisTubeエラー
 * @param {string} query - 検索クエリ（オプション）
 * @returns {string} - ユーザー向けメッセージ
 */
function getErrorMessage(error, query = null) {
    if (error.name !== 'DisTubeError') {
        return '再生処理中にエラーが発生しました。';
    }

    const handler = ERROR_MESSAGES[error.errorCode];
    if (handler) {
        return handler(query || error.message);
    }

    return `音楽機能でエラーが発生しました (コード: ${error.errorCode || '不明'})。`;
}

/**
 * エラーが重大かどうか（キュー停止が必要）を判定
 * @param {Error} error - DisTubeエラー
 * @returns {boolean}
 */
function isCriticalError(error) {
    return CRITICAL_ERROR_CODES.includes(error.errorCode);
}

/**
 * エラー時にVC退出が必要かを判定
 * @param {Error} error - DisTubeエラー
 * @returns {boolean}
 */
function shouldLeaveVC(error) {
    return LEAVE_VC_ERROR_CODES.includes(error.errorCode);
}

module.exports = {
    getErrorMessage,
    isCriticalError,
    shouldLeaveVC,
    ERROR_MESSAGES,
    CRITICAL_ERROR_CODES,
    LEAVE_VC_ERROR_CODES
};
