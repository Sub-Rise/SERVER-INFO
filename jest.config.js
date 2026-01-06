module.exports = {
    // テスト環境
    testEnvironment: 'node',

    // テストファイルのパターン
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // カバレッジ設定
    collectCoverageFrom: [
        'src/utils/**/*.js',
        '!src/utils/logger.js',  // ログ出力は除外
    ],

    // テスト実行前のセットアップ
    setupFilesAfterEnv: [],

    // モジュール解決
    moduleDirectories: ['node_modules', 'src'],

    // テストタイムアウト（ミリ秒）
    testTimeout: 10000,

    // 詳細な出力
    verbose: true,
};
