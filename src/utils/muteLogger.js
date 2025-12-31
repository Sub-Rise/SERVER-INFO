const fs = require('fs').promises;
const path = require('path');
const structuredLog = require('./logger');

/**
 * ミュートログ専用ユーティリティ
 * サーバー別・日付別でのミュート状態変化ログを管理
 */

// ログベースディレクトリ
const LOGS_BASE_DIR = path.join(__dirname, '../../logs');

/**
 * ファイル名として使用できない文字を置換する
 * @param {string} name - サーバー名など
 * @returns {string} - サニタイズされた名前
 */
function sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 100);
}

/**
 * 現在の日付文字列を取得（YYYY-MM-DD形式、日本時間）
 * @returns {string} - 日付文字列
 */
function getCurrentDateString() {
    const now = new Date();
    // 日本時間で日付を取得
    const jstDate = now.toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    // yyyy/mm/dd形式からyyyy-mm-dd形式に変換
    return jstDate.replace(/\//g, '-');
}

/**
 * 現在の時刻文字列を取得（HH:mm:ss形式、日本時間）
 * @returns {string} - 時刻文字列
 */
function getCurrentTimeString() {
    const now = new Date();
    // 日本時間で時刻を取得（24時間形式）
    const jstTime = now.toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return jstTime;
}

/**
 * ログディレクトリを作成（存在しない場合）
 * @param {string} serverName - サーバー名
 */
async function ensureLogDirectory(serverName) {
    const sanitizedServerName = sanitizeFileName(serverName);
    const serverLogDir = path.join(LOGS_BASE_DIR, sanitizedServerName);
    
    try {
        await fs.mkdir(LOGS_BASE_DIR, { recursive: true });
        await fs.mkdir(serverLogDir, { recursive: true });
        return serverLogDir;
    } catch (error) {
        structuredLog('error', '[MuteLogger] Failed to create log directory', {
            serverName: sanitizedServerName,
            errorMessage: error.message
        });
        throw error;
    }
}

/**
 * ログファイルパスを取得
 * @param {string} serverName - サーバー名
 * @param {string} dateString - 日付文字列（オプション、未指定時は今日）
 * @returns {string} - ログファイルパス
 */
function getLogFilePath(serverName, dateString = null) {
    const sanitizedServerName = sanitizeFileName(serverName);
    const date = dateString || getCurrentDateString();
    return path.join(LOGS_BASE_DIR, sanitizedServerName, `${date}.txt`);
}

/**
 * ミュート状態変化の種類を日本語に変換
 * @param {boolean} oldMute - 以前のミュート状態
 * @param {boolean} newMute - 新しいミュート状態
 * @param {string} muteType - ミュート種別
 * @returns {string} - ログ用文字列
 */
function getMuteChangeDescription(oldMute, newMute, muteType) {
    const muteTypeMap = {
        'selfMute': 'セルフミュート',
        'serverMute': 'サーバーミュート', 
        'selfDeaf': 'スピーカーミュート'
    };
    
    const muteTypeName = muteTypeMap[muteType] || muteType;
    
    if (!oldMute && newMute) {
        return `${muteTypeName} ON`;
    } else if (oldMute && !newMute) {
        return `${muteTypeName} OFF`;
    }
    
    return null; // 状態変化なし
}

/**
 * ミュートログを書き込む
 * @param {string} serverName - サーバー名
 * @param {string} channelName - チャンネル名
 * @param {string} userName - ユーザー名
 * @param {string} changeDescription - 変化の説明
 */
async function writeLogEntry(serverName, channelName, userName, changeDescription) {
    try {
        await ensureLogDirectory(serverName);
        const logFilePath = getLogFilePath(serverName);
        const timeString = getCurrentTimeString();
        
        const logEntry = `[${timeString}] ${userName} - ${serverName} - ${channelName}: ${changeDescription}\n`;
        
        await fs.appendFile(logFilePath, logEntry, 'utf8');
        
        structuredLog('debug', '[MuteLogger] Log entry written', {
            serverName,
            channelName,
            userName,
            changeDescription,
            logFilePath
        });
        
    } catch (error) {
        structuredLog('error', '[MuteLogger] Failed to write log entry', {
            serverName,
            channelName,
            userName,
            changeDescription,
            errorMessage: error.message,
            errorStack: error.stack
        });
    }
}

/**
 * ボイス状態変更からミュートログを記録する
 * @param {VoiceState} oldState - 以前のボイス状態
 * @param {VoiceState} newState - 新しいボイス状態
 */
async function logVoiceStateChange(oldState, newState) {
    // ボット自身の変更は無視
    if (newState.member?.user.bot || oldState.member?.user.bot) {
        return;
    }
    
    // VCにいない場合は記録しない
    if (!newState.channelId && !oldState.channelId) {
        return;
    }
    
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    const channel = newState.channel || oldState.channel;
    
    if (!guild || !member || !channel) {
        return;
    }
    
    const serverName = guild.name;
    const channelName = channel.name;
    const userName = member.displayName || member.user.username;
    
    // セルフミュート状態の変化をチェック
    const selfMuteChange = getMuteChangeDescription(
        oldState.selfMute, 
        newState.selfMute, 
        'selfMute'
    );
    
    // サーバーミュート状態の変化をチェック
    const serverMuteChange = getMuteChangeDescription(
        oldState.serverMute, 
        newState.serverMute, 
        'serverMute'
    );
    
    // スピーカーミュート状態の変化をチェック
    const selfDeafChange = getMuteChangeDescription(
        oldState.selfDeaf, 
        newState.selfDeaf, 
        'selfDeaf'
    );
    
    // 変化があった場合のみログを記録
    const changes = [selfMuteChange, serverMuteChange, selfDeafChange].filter(change => change !== null);
    
    for (const change of changes) {
        await writeLogEntry(serverName, channelName, userName, change);
    }
}

/**
 * 指定したサーバーの指定日のログを読み取る
 * @param {string} serverName - サーバー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string|null} - ログ内容（存在しない場合はnull）
 */
async function readLogFile(serverName, dateString) {
    try {
        const logFilePath = getLogFilePath(serverName, dateString);
        const logContent = await fs.readFile(logFilePath, 'utf8');
        return logContent;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // ファイルが存在しない
        }
        structuredLog('error', '[MuteLogger] Failed to read log file', {
            serverName,
            dateString,
            errorMessage: error.message
        });
        throw error;
    }
}

/**
 * 指定したサーバーの利用可能なログ日付一覧を取得
 * @param {string} serverName - サーバー名
 * @returns {string[]} - 日付文字列の配列
 */
async function getAvailableLogDates(serverName) {
    try {
        const sanitizedServerName = sanitizeFileName(serverName);
        const serverLogDir = path.join(LOGS_BASE_DIR, sanitizedServerName);
        
        const files = await fs.readdir(serverLogDir);
        const logDates = files
            .filter(file => file.endsWith('.txt'))
            .map(file => file.replace('.txt', ''))
            .sort()
            .reverse(); // 新しい日付順
            
        return logDates;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // ディレクトリが存在しない
        }
        structuredLog('error', '[MuteLogger] Failed to get available log dates', {
            serverName,
            errorMessage: error.message
        });
        return [];
    }
}

module.exports = {
    logVoiceStateChange,
    readLogFile,
    getAvailableLogDates,
    writeLogEntry,
    ensureLogDirectory
};