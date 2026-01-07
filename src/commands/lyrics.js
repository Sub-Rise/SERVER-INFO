const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');
const { wrapCommand } = require('../utils/commandWrapper');
const axios = require('axios');
const { lyricsApiUrl } = require('../config/environment');
const { COLORS } = require('../config/constants');
const { extractArtistAndTitle, normalizeLyrics } = require('../utils/stringUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('現在再生中の曲の歌詞を表示します。'),
    execute: wrapCommand(async (interaction) => {
        const { client } = interaction;
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue || !queue.songs || queue.songs.length === 0) {
            return interaction.followUp({ content: '現在再生中の曲がありません。', ephemeral: true });
        }

        const song = queue.songs[0];
        const uploaderName = song.uploader?.name || null;

        // ビジネスロジックを共通ユーティリティに委譲
        const { artist: cleanedArtist, title: cleanedTitle } = extractArtistAndTitle(song.name, uploaderName);

        if (cleanedArtist === 'Unknown Artist' || !cleanedTitle) {
            return interaction.followUp({ content: 'アーティスト名または曲名を特定できませんでした。', ephemeral: true });
        }

        const apiUrl = lyricsApiUrl;
        const params = { title: cleanedTitle };
        structuredLog('info', '[LyricsCommand] Fetching lyrics', { title: cleanedTitle, artist: cleanedArtist });

        try {
            const response = await axios.get(apiUrl, { params });
            let lyrics = response.data.lyrics;

            if (!lyrics || (Array.isArray(lyrics) && lyrics.length === 0) || (typeof lyrics === 'string' && lyrics.trim() === '')) {
                return interaction.followUp({ content: `「${cleanedArtist} - ${cleanedTitle}」の歌詞は見つかりませんでした。`, ephemeral: true });
            }

            // 歌詞の正規化を共通ユーティリティに委譲
            lyrics = normalizeLyrics(lyrics);

            const displayArtist = response.data.artist_name || cleanedArtist;
            const displayTitle = response.data.track_name || cleanedTitle;

            const embed = new EmbedBuilder()
                .setTitle(`${displayArtist} - ${displayTitle}`)
                .setColor(COLORS.SUCCESS);
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
            await interaction.followUp({ content: '歌詞の取得中にエラーが発生しました。', ephemeral: true });
        }
    }),
};