/**
 * シンプルなLRUキャッシュ実装
 * 
 * 外部ライブラリなしで動作する軽量LRUキャッシュ。
 * managedMessagesなどのMapベースストレージの代替として使用可能。
 */

const structuredLog = require('./logger');

/**
 * LRUキャッシュクラス
 * @template K, V
 */
class LRUCache {
    /**
     * @param {number} maxSize - 最大エントリ数
     * @param {number} [ttlMs=0] - エントリの有効期限（ミリ秒）。0は無期限。
     * @param {string} [name='LRUCache'] - ログ用の識別名
     */
    constructor(maxSize, ttlMs = 0, name = 'LRUCache') {
        if (maxSize < 1) {
            throw new Error('maxSize must be at least 1');
        }
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.name = name;
        /** @type {Map<K, { value: V, expiresAt: number | null }>} */
        this.cache = new Map();
    }

    /**
     * キーの値を取得（アクセス時に最新に移動）
     * @param {K} key
     * @returns {V | undefined}
     */
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }

        const entry = this.cache.get(key);

        // TTLチェック
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        // LRU: 最新のアクセスとして再挿入
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * キーに値を設定
     * @param {K} key
     * @param {V} value
     */
    set(key, value) {
        // 既存エントリの削除（更新時のLRU順序維持）
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // キャッシュサイズ制限のチェック
        if (this.cache.size >= this.maxSize) {
            // 最も古いエントリ（Mapの最初の要素）を削除
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            structuredLog('debug', `[${this.name}] Evicted oldest entry`, { evictedKey: oldestKey });
        }

        const expiresAt = this.ttlMs > 0 ? Date.now() + this.ttlMs : null;
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * キーが存在するか確認（TTL考慮）
     * @param {K} key
     * @returns {boolean}
     */
    has(key) {
        if (!this.cache.has(key)) {
            return false;
        }

        const entry = this.cache.get(key);
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * キーを削除
     * @param {K} key
     * @returns {boolean}
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * キャッシュをクリア
     */
    clear() {
        this.cache.clear();
    }

    /**
     * 現在のキャッシュサイズ
     * @returns {number}
     */
    get size() {
        return this.cache.size;
    }

    /**
     * 期限切れエントリを掃除
     * @returns {number} - 削除されたエントリ数
     */
    cleanup() {
        if (this.ttlMs === 0) return 0;

        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache) {
            if (entry.expiresAt !== null && now > entry.expiresAt) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            structuredLog('debug', `[${this.name}] Cleaned up expired entries`, { removedCount: removed });
        }

        return removed;
    }

    /**
     * すべてのキーを取得
     * @returns {IterableIterator<K>}
     */
    keys() {
        return this.cache.keys();
    }

    /**
     * forEach互換メソッド
     * @param {(value: V, key: K) => void} callback
     */
    forEach(callback) {
        for (const [key, entry] of this.cache) {
            // TTL切れはスキップ
            if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                continue;
            }
            callback(entry.value, key);
        }
    }
}

module.exports = LRUCache;
