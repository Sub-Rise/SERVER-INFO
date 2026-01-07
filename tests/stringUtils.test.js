/**
 * stringUtils.js ユニットテスト
 * 曲タイトル・アーティスト抽出ロジックのテスト
 */

const { cleanSongTitle, extractArtistAndTitle, normalizeLyrics } = require('../src/utils/stringUtils');

describe('stringUtils', () => {
    describe('cleanSongTitle', () => {
        it('Official Video表記を除去', () => {
            expect(cleanSongTitle('Song Name (Official Video)')).toBe('Song Name');
        });

        it('MV表記を除去', () => {
            expect(cleanSongTitle('Song Name [MV]')).toBe('Song Name');
            expect(cleanSongTitle('Song Name【MV】')).toBe('Song Name');
        });

        it('品質表記を除去', () => {
            expect(cleanSongTitle('Song Name 高音質')).toBe('Song Name');
            expect(cleanSongTitle('Song Name 4k')).toBe('Song Name');
        });

        it('空文字やnullを処理', () => {
            expect(cleanSongTitle('')).toBe('');
            expect(cleanSongTitle(null)).toBe('');
            expect(cleanSongTitle(undefined)).toBe('');
        });

        it('複合的なクリーンアップ', () => {
            expect(cleanSongTitle('Artist - Song (Official Music Video) 高音質')).toBe('Artist Song');
        });
    });

    describe('extractArtistAndTitle', () => {
        it('ハイフン区切りを正しく分割', () => {
            const result = extractArtistAndTitle('Artist Name - Song Title');
            expect(result.artist).toBe('Artist Name');
            expect(result.title).toBe('Song Title');
        });

        it('アップローダー名を優先', () => {
            const result = extractArtistAndTitle('Some Video - Title', 'Real Artist');
            expect(result.artist).toBe('Real Artist');
            expect(result.title).toBe('Title');
        });

        it('区切りなしの場合アップローダー名を使用', () => {
            const result = extractArtistAndTitle('Song Title Only', 'Channel Name');
            expect(result.artist).toBe('Channel Name');
            expect(result.title).toBe('Song Title Only');
        });

        it('区切りもアップローダーもない場合Unknown Artist', () => {
            const result = extractArtistAndTitle('Song Title Only');
            expect(result.artist).toBe('Unknown Artist');
            expect(result.title).toBe('Song Title Only');
        });

        it('空文字を処理', () => {
            const result = extractArtistAndTitle('');
            expect(result.artist).toBe('Unknown Artist');
            expect(result.title).toBe('');
        });

        it('タイトルからMV表記を除去', () => {
            const result = extractArtistAndTitle('Artist - Song Name (Official Video)');
            expect(result.title).toBe('Song Name');
        });
    });

    describe('normalizeLyrics', () => {
        it('文字列をそのまま返す', () => {
            expect(normalizeLyrics('Line 1\nLine 2')).toBe('Line 1\nLine 2');
        });

        it('配列を改行で結合', () => {
            expect(normalizeLyrics(['Line 1', 'Line 2'])).toBe('Line 1\nLine 2');
        });

        it('HTMLタグを改行に変換', () => {
            expect(normalizeLyrics('Line 1<br/>Line 2')).toBe('Line 1\nLine 2');
            expect(normalizeLyrics('Line 1<br>Line 2')).toBe('Line 1\nLine 2');
        });

        it('空値を処理', () => {
            expect(normalizeLyrics('')).toBe('');
            expect(normalizeLyrics(null)).toBe('');
            expect(normalizeLyrics(undefined)).toBe('');
        });
    });
});
