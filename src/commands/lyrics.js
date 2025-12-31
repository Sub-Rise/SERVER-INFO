const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('現在再生中の曲の歌詞を表示します。'),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue || !queue.songs || queue.songs.length === 0) {
            return interaction.followUp({ content: '現在再生中の曲がありません。', flags: 64 });
        }

        const song = queue.songs[0];
        let rawArtist = song.uploader?.name || 'Unknown Artist';
        let rawTitle = song.name;

        const commonSeparators = [' - ', ' – ', '／', '/'];
        let artist = '';
        let title = '';
        let separatorUsed = false;

        for (const sep of commonSeparators) {
            if (rawTitle.includes(sep)) {
                const parts = rawTitle.split(sep);
                if (song.uploader?.name && song.uploader.name !== 'Unknown Artist') {
                    artist = song.uploader.name;
                    if (parts.length >= 2 && !['various artists', 'va', 'soundtrack'].includes(parts[0].toLowerCase().trim())) {
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

        if (!separatorUsed || !artist) {
            if (song.uploader?.name && song.uploader.name !== 'Unknown Artist') {
                artist = song.uploader.name;
                title = rawTitle;
            } else {
                title = rawTitle;
                artist = 'Unknown Artist';
            }
        }

        let cleanedArtist = artist.replace(/\s*\([^)]*\)$/, '').trim();
        cleanedArtist = cleanedArtist.replace(/\.\(\d+\)/g, '').trim();
        let cleanedTitle = title;
        if (cleanedArtist && cleanedArtist !== 'Unknown Artist' && cleanedTitle.toLowerCase().startsWith(cleanedArtist.toLowerCase())) {
            let tempTitle = cleanedTitle.substring(cleanedArtist.length).trim();
            tempTitle = tempTitle.replace(/^[\s\-–／/『』「」().「」【】]*(?:official|lyric|music|video|audio|mv|pv|ver\.|ft\.|feat\.|feat|ver|short|edit|remix|live|acoustic|cover|original|stereo|hq|hd|4k|8k|フル|歌詞付き|高音質|作業用bgm|inst.)*/gi, '').trim();
            tempTitle = tempTitle.replace(/^[\s\-–／/『』「」().「」【】]+/g, '').trim();
            if (tempTitle) {
                cleanedTitle = tempTitle;
            }
        }

        const removePatterns = [
            /\(Official Video\)/ig, /\(Official Music Video\)/ig, /\(Music Video\)/ig, /\(Official Audio\)/ig, /\(Official Lyric Video\)/ig, /\(Lyric Video\)/ig, /\(Lyrics\)/ig, /\(MV\)/ig, /\(PV\)/ig,
            /\[MV\]/ig, /【MV】/ig, /s*(Official Music Video|Music Video|Official Video|Official Audio|Official Lyric Video|Lyric Video|Lyrics|MV|PV|フル|歌詞付き|高音質|作業用BGM)s*$/i,
            /s*ft\.?.*$/i, /s*feat\.?.*$/i, /s*ver\.?.*$/i, /s*\(.*ver\.\)/i, /[()\[\]【】『』「」\\]/g,
            /full version/ig, /short version/ig, /TV size/ig, /TV edit/ig, /TV ver\.?/ig, /game ver\.?/ig, /movie ver\.?/ig, /instrumental/ig, /karaoke/ig, /off vocal/ig, /stereo/ig, /hq/ig, /hd/ig, /4k/ig, /8k/ig, /高音質/g, /作業用bgm/g, /歌詞付き/g, /フル/g,
        ];
        for (const pattern of removePatterns) {
            cleanedTitle = cleanedTitle.replace(pattern, '').trim();
        }
        cleanedTitle = cleanedTitle.replace(/[\s\-–／/『』「」().「」【】]+/g, ' ').trim();
        cleanedTitle = cleanedTitle.replace(/\.$/, '').trim();

        if (cleanedArtist === 'Unknown Artist' || !cleanedTitle) {
            return interaction.followUp({ content: 'アーティスト名または曲名を特定できませんでした。', flags: 64 });
        }

        const apiUrl = 'https://lyrics.lewdhutao.my.eu.org/youtube/lyrics';
        const params = { title: cleanedTitle };
        structuredLog('info', '[LyricsCommand] Fetching lyrics', { title: cleanedTitle });

        try {
            const response = await axios.get(apiUrl, { params });
            let lyrics = response.data.lyrics;

            if (!lyrics || (Array.isArray(lyrics) && lyrics.length === 0) || (typeof lyrics === 'string' && lyrics.trim() === '')) {
                return interaction.followUp({ content: `「${cleanedArtist} - ${cleanedTitle}」の歌詞は見つかりませんでした。`, flags: 64 });
            }
            if (Array.isArray(lyrics)) {
                lyrics = lyrics.join('\n');
            }
            lyrics = lyrics.replace(/<br\/>/gi, '\n').trim();

            const displayArtist = response.data.artist_name || cleanedArtist;
            const displayTitle = response.data.track_name || cleanedTitle;

            const embed = new EmbedBuilder()
                .setTitle(`${displayArtist} - ${displayTitle}`)
                .setColor(0x00AE86);
            if (response.data.artwork_url) {
                embed.setThumbnail(response.data.artwork_url);
            }
            if (lyrics.length > 4000) {
                embed.setDescription(lyrics.substring(0, 4000) + '\n\n... (歌詞が長すぎるため省略)');
            } else {
                embed.setDescription(lyrics);
            }
            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            structuredLog('error', '[LyricsCommand] API Error', { title: cleanedTitle, error: error.message });
            await interaction.followUp({ content: '歌詞の取得中にエラーが発生しました。', flags: 64 });
        }
    },
}; 