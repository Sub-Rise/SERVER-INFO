/**
 * musicState.js ユニットテスト
 * 自動シャッフル状態管理のテスト
 */

// logger モジュールをモック化
jest.mock('../src/utils/logger', () => jest.fn());

const {
    guildAutoShuffle,
    setAutoShuffle,
    isAutoShuffleEnabled,
    cleanupMusicState
} = require('../src/utils/musicState');

describe('musicState', () => {
    // 各テスト前に状態をリセット
    beforeEach(() => {
        guildAutoShuffle.clear();
        jest.clearAllMocks();
    });

    describe('setAutoShuffle', () => {
        it('有効な guildId で状態を設定できる', () => {
            setAutoShuffle('guild-123', true);

            expect(guildAutoShuffle.get('guild-123')).toBe(true);
        });

        it('false を設定できる', () => {
            setAutoShuffle('guild-456', false);

            expect(guildAutoShuffle.get('guild-456')).toBe(false);
        });

        it('guildId が undefined の場合、設定しない', () => {
            const initialSize = guildAutoShuffle.size;

            setAutoShuffle(undefined, true);

            expect(guildAutoShuffle.size).toBe(initialSize);
        });

        it('guildId が null の場合、設定しない', () => {
            const initialSize = guildAutoShuffle.size;

            setAutoShuffle(null, true);

            expect(guildAutoShuffle.size).toBe(initialSize);
        });
    });

    describe('isAutoShuffleEnabled', () => {
        it('true が設定されている場合 true を返す', () => {
            guildAutoShuffle.set('guild-789', true);

            expect(isAutoShuffleEnabled('guild-789')).toBe(true);
        });

        it('false が設定されている場合 false を返す', () => {
            guildAutoShuffle.set('guild-abc', false);

            expect(isAutoShuffleEnabled('guild-abc')).toBe(false);
        });

        it('未設定の場合 false を返す', () => {
            expect(isAutoShuffleEnabled('unknown-guild')).toBe(false);
        });
    });

    describe('cleanupMusicState', () => {
        it('存在するギルドの状態をクリーンアップし true を返す', () => {
            guildAutoShuffle.set('guild-cleanup', true);

            const result = cleanupMusicState('guild-cleanup');

            expect(result).toBe(true);
            expect(guildAutoShuffle.has('guild-cleanup')).toBe(false);
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
