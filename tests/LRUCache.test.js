/**
 * LRUCache.js ユニットテスト
 */

jest.mock('../src/utils/logger', () => jest.fn());

const LRUCache = require('../src/utils/LRUCache');

describe('LRUCache', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('基本操作', () => {
        it('set/getで値を保存・取得できる', () => {
            const cache = new LRUCache(10);
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('存在しないキーはundefinedを返す', () => {
            const cache = new LRUCache(10);
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('hasで存在確認できる', () => {
            const cache = new LRUCache(10);
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('nonexistent')).toBe(false);
        });

        it('deleteで削除できる', () => {
            const cache = new LRUCache(10);
            cache.set('key1', 'value1');
            cache.delete('key1');
            expect(cache.has('key1')).toBe(false);
        });

        it('clearで全削除できる', () => {
            const cache = new LRUCache(10);
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.size).toBe(0);
        });
    });

    describe('LRU eviction', () => {
        it('maxSizeを超えると最古のエントリが削除される', () => {
            const cache = new LRUCache(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('d', 4); // 'a'が削除されるはず

            expect(cache.has('a')).toBe(false);
            expect(cache.has('b')).toBe(true);
            expect(cache.has('c')).toBe(true);
            expect(cache.has('d')).toBe(true);
        });

        it('getアクセスで順序が更新される', () => {
            const cache = new LRUCache(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            cache.get('a'); // 'a'が最新に
            cache.set('d', 4); // 'b'が削除されるはず

            expect(cache.has('a')).toBe(true);
            expect(cache.has('b')).toBe(false);
            expect(cache.has('c')).toBe(true);
            expect(cache.has('d')).toBe(true);
        });
    });

    describe('TTL', () => {
        it('TTL内はアクセス可能', () => {
            const cache = new LRUCache(10, 1000); // 1秒
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('TTL経過後はundefined', async () => {
            const cache = new LRUCache(10, 50); // 50ms
            cache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 60));

            expect(cache.get('key1')).toBeUndefined();
        });

        it('cleanupで期限切れエントリを削除', async () => {
            const cache = new LRUCache(10, 50);
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            await new Promise(resolve => setTimeout(resolve, 60));

            const removed = cache.cleanup();
            expect(removed).toBe(2);
            expect(cache.size).toBe(0);
        });
    });

    describe('forEach', () => {
        it('全エントリを反復処理', () => {
            const cache = new LRUCache(10);
            cache.set('a', 1);
            cache.set('b', 2);

            const results = [];
            cache.forEach((value, key) => {
                results.push({ key, value });
            });

            expect(results).toHaveLength(2);
            expect(results.find(r => r.key === 'a')?.value).toBe(1);
            expect(results.find(r => r.key === 'b')?.value).toBe(2);
        });
    });

    describe('エッジケース', () => {
        it('maxSize < 1 でエラー', () => {
            expect(() => new LRUCache(0)).toThrow();
        });

        it('同じキーで上書き', () => {
            const cache = new LRUCache(10);
            cache.set('key1', 'value1');
            cache.set('key1', 'value2');
            expect(cache.get('key1')).toBe('value2');
            expect(cache.size).toBe(1);
        });
    });
});
