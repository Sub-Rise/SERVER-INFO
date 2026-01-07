/**
 * musicState.js ユニットテスト
 * 自動シャッフル状態管理のテスト
 * 
 * 公開APIのみを使用してテスト（内部Mapへの直接アクセスは行わない）
 */

// logger モジュールをモック化
jest.mock('../src/utils/logger', () => jest.fn());

// 各テストで新しいモジュールインスタンスを使用するためにキャッシュをクリア
beforeEach(() => {
    jest.resetModules();
});

describe('musicState', () => {
    let setAutoShuffle, isAutoShuffleEnabled, cleanupMusicState;

    beforeEach(() => {
        // モジュールを再読み込みして状態をリセット
        jest.isolateModules(() => {
            const musicState = require('../src/utils/musicState');
            setAutoShuffle = musicState.setAutoShuffle;
            isAutoShuffleEnabled = musicState.isAutoShuffleEnabled;
            cleanupMusicState = musicState.cleanupMusicState;
        });
        jest.clearAllMocks();
    });

    describe('setAutoShuffle', () => {
        it('有効な guildId で状態を設定できる', () => {
            setAutoShuffle('guild-123', true);

            expect(isAutoShuffleEnabled('guild-123')).toBe(true);
        });

        it('false を設定できる', () => {
            setAutoShuffle('guild-456', false);

            expect(isAutoShuffleEnabled('guild-456')).toBe(false);
        });

        it('guildId が undefined の場合、設定しない', () => {
            setAutoShuffle(undefined, true);
            // undefinedは設定されないため、isAutoShuffleEnabledはfalseを返す
            expect(isAutoShuffleEnabled(undefined)).toBe(false);
        });

        it('guildId が null の場合、設定しない', () => {
            setAutoShuffle(null, true);
            expect(isAutoShuffleEnabled(null)).toBe(false);
        });
    });

    describe('isAutoShuffleEnabled', () => {
        it('true が設定されている場合 true を返す', () => {
            setAutoShuffle('guild-789', true);

            expect(isAutoShuffleEnabled('guild-789')).toBe(true);
        });

        it('false が設定されている場合 false を返す', () => {
            setAutoShuffle('guild-abc', false);

            expect(isAutoShuffleEnabled('guild-abc')).toBe(false);
        });

        it('未設定の場合 false を返す', () => {
            expect(isAutoShuffleEnabled('unknown-guild')).toBe(false);
        });
    });

    describe('cleanupMusicState', () => {
        it('存在するギルドの状態をクリーンアップし true を返す', () => {
            setAutoShuffle('guild-cleanup', true);

            const result = cleanupMusicState('guild-cleanup');

            expect(result).toBe(true);
            expect(isAutoShuffleEnabled('guild-cleanup')).toBe(false);
        });

        it('存在しないギルドの場合 false を返す', () => {
            const result = cleanupMusicState('nonexistent-guild');

            expect(result).toBe(false);
        });

        it('guildId が undefined の場合 false を返す', () => {
            const result = cleanupMusicState(undefined);

            expect(result).toBe(false);
        });

        it('guildId が null の場合 false を返す', () => {
            const result = cleanupMusicState(null);

            expect(result).toBe(false);
        });
    });
});
