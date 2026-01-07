/**
 * 文字列ユーティリティモジュール
 * 
 * 曲タイトルや歌詞テキストの正規化・クリーンアップ処理を提供
 * Discord.js非依存のため、ユニットテストが容易
 */

/**
 * 曲タイトルから不要な装飾を除去するパターン
 */
const TITLE_CLEANUP_PATTERNS = [
    // 動画タイプ表記
    /\(Official Video\)/ig,
    /\(Official Music Video\)/ig,
    /\(Music Video\)/ig,
    /\(Official Audio\)/ig,
    /\(Official Lyric Video\)/ig,
    /\(Lyric Video\)/ig,
    /\(Lyrics\)/ig,
    /\(MV\)/ig,
    /\(PV\)/ig,
    /\[MV\]/ig,
    /【MV】/ig,

    // バージョン・アレンジ表記
    /full version/ig,
    /short version/ig,
    /TV size/ig,
    /TV edit/ig,
    /TV ver\.?/ig,
    /game ver\.?/ig,
    /movie ver\.?/ig,
    /instrumental/ig,
    /karaoke/ig,
    /off vocal/ig,

    // 品質表記
    /stereo/ig,
    /hq/ig,
    /hd/ig,
    /4k/ig,
    /8k/ig,

    // 日本語表記
    /高音質/g,
    /作業用bgm/g,
    /歌詞付き/g,
    /フル/g,

    // 括弧類
    /[()[\]【】『』「」\\]/g,

    // feat/ft表記（末尾のみ）
    /\s*ft\.?.*$/i,
    /\s*feat\.?.*$/i,
    /\s*ver\.?.*$/i,
    /\s*\(.*ver\.\)/i,
];

/**
 * アーティスト名/タイトルの区切り文字
 */
const COMMON_SEPARATORS = [' - ', ' – ', '／', '/'];

/**
 * 曲タイトルをクリーンアップ
 * @param {string} title - 元のタイトル
 * @returns {string} - クリーンアップ後のタイトル
 */
function cleanSongTitle(title) {
    if (!title || typeof title !== 'string') return '';

    let cleaned = title;

    for (const pattern of TITLE_CLEANUP_PATTERNS) {
        cleaned = cleaned.replace(pattern, '').trim();
    }

    // 連続する空白・区切り文字を正規化
    cleaned = cleaned.replace(/[\s\-–／/『』「」().「」【】]+/g, ' ').trim();
    // 末尾のピリオドを除去
    cleaned = cleaned.replace(/\.$/, '').trim();

    return cleaned;
}

/**
 * YouTube動画タイトルからアーティスト名と曲名を抽出
 * @param {string} rawTitle - 動画タイトル
 * @param {string|null} uploaderName - アップローダー名（チャンネル名）
 * @returns {{ artist: string, title: string }}
 */
function extractArtistAndTitle(rawTitle, uploaderName = null) {
    if (!rawTitle || typeof rawTitle !== 'string') {
        return { artist: 'Unknown Artist', title: '' };
    }

    let artist = '';
    let title = '';
    let separatorUsed = false;

    // セパレータで分割を試みる
    for (const sep of COMMON_SEPARATORS) {
        if (rawTitle.includes(sep)) {
            const parts = rawTitle.split(sep);

            if (uploaderName && uploaderName !== 'Unknown Artist') {
                artist = uploaderName;
                // Various Artists等の場合はタイトル全体を使用
                const skipArtists = ['various artists', 'va', 'soundtrack'];
                if (parts.length >= 2 && !skipArtists.includes(parts[0].toLowerCase().trim())) {
                    title = parts.slice(1).join(sep).trim();
                } else {
                    title = rawTitle;
                }
            } else if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join(sep).trim();
            }

            if (artist && title) {
                separatorUsed = true;
                break;
            }
        }
    }

    // セパレータがない場合のフォールバック
    if (!separatorUsed || !artist) {
        if (uploaderName && uploaderName !== 'Unknown Artist') {
            artist = uploaderName;
            title = rawTitle;
        } else {
            title = rawTitle;
            artist = 'Unknown Artist';
        }
    }

    // アーティスト名のクリーンアップ
    let cleanedArtist = artist.replace(/\s*\([^)]*\)$/, '').trim();
    cleanedArtist = cleanedArtist.replace(/\.\(\d+\)/g, '').trim();

    // タイトルからアーティスト名の重複を除去
    let cleanedTitle = title;
    if (cleanedArtist && cleanedArtist !== 'Unknown Artist' &&
        cleanedTitle.toLowerCase().startsWith(cleanedArtist.toLowerCase())) {
        let tempTitle = cleanedTitle.substring(cleanedArtist.length).trim();
        tempTitle = tempTitle.replace(/^[\s\-–／/『』「」().「」【】]*(?:official|lyric|music|video|audio|mv|pv|ver\.|ft\.|feat\.|feat|ver|short|edit|remix|live|acoustic|cover|original|stereo|hq|hd|4k|8k|フル|歌詞付き|高音質|作業用bgm|inst.)*/gi, '').trim();
        tempTitle = tempTitle.replace(/^[\s\-–／/『』「」().「」【】]+/g, '').trim();
        if (tempTitle) {
            cleanedTitle = tempTitle;
        }
    }

    // 最終クリーンアップ
    cleanedTitle = cleanSongTitle(cleanedTitle);

    return { artist: cleanedArtist, title: cleanedTitle };
}

/**
 * 歌詞テキストを正規化
 * @param {string|string[]} lyrics - 歌詞（文字列または配列）
 * @returns {string}
 */
function normalizeLyrics(lyrics) {
    if (!lyrics) return '';

    let text = lyrics;
    if (Array.isArray(lyrics)) {
        text = lyrics.join('\n');
    }

    // HTMLタグを改行に変換
    text = text.replace(/<br\/?>/gi, '\n').trim();

    return text;
}

module.exports = {
    cleanSongTitle,
    extractArtistAndTitle,
    normalizeLyrics,
    TITLE_CLEANUP_PATTERNS,
    COMMON_SEPARATORS
};
