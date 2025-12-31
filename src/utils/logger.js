const { isProduction } = require('../config/environment');

function structuredLog(level, message, context = {}) {
  // 本番環境でセキュリティリスクのある情報を除去
  const sanitizedContext = isProduction ? sanitizeContext(context) : context;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(), // INFO, WARN, ERROR, DEBUGなど
    message: message,
    ...sanitizedContext, // サニタイズ済みのコンテキスト
  };

  if (level.toUpperCase() === 'ERROR' || level.toUpperCase() === 'WARN') {
    console.error(JSON.stringify(logEntry, null, 2)); // エラーや警告は見やすく整形
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * 本番環境でセキュリティリスクのあるコンテキスト情報を除去
 * @param {Object} context - 元のコンテキストオブジェクト
 * @returns {Object} - サニタイズ済みのコンテキスト
 */
function sanitizeContext(context) {
  const sanitized = { ...context };
  
  // セキュリティリスクのある情報を除去
  delete sanitized.errorStack;
  
  // エラーメッセージから機密情報が含まれる可能性のあるパスを除去
  if (sanitized.errorMessage && typeof sanitized.errorMessage === 'string') {
    sanitized.errorMessage = sanitized.errorMessage
      .replace(/[A-Z]:\\[\w\\.-]+/g, '[FILE_PATH_REDACTED]') // Windowsパス
      .replace(/\/[\w\/.-]+/g, '[FILE_PATH_REDACTED]'); // Unixパス
  }
  
  return sanitized;
}

module.exports = structuredLog; 