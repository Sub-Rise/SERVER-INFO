const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const structuredLog = require('../utils/logger');
const { TIMEOUTS, MUSIC, COLORS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('曲を検索し、結果を表示します。')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('検索する曲名またはキーワード')
                .setRequired(true)),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const query = interaction.options.getString('query');

        if (!query) {
            return interaction.followUp({ content: '検索クエリを入力してください。', ephemeral: true });
        }
        const youtubePlugin = client.distube.plugins.get('YouTube');
        if (!youtubePlugin) {
            structuredLog('error', '[SearchCommand] YouTubePlugin instance is not available.', { guildId: interaction.guild.id });
            return interaction.followUp({ content: '検索機能の準備ができていません。', ephemeral: true });
        }

        try {
            const results = await youtubePlugin.search(query, {
                limit: MUSIC.SEARCH_LIMIT,
                type: 'video',
            });

            if (!results || results.length === 0) {
                return interaction.followUp({ content: `\`${query}\` の検索結果が見つかりませんでした。`, ephemeral: true });
            }

            const itemsPerPage = 10;
            let currentPage = 0;
            const totalPages = Math.ceil(results.length / itemsPerPage);

            const generateSearchMessagePayload = (pageIdx) => {
                const startIndex = pageIdx * itemsPerPage;
                const currentResults = results.slice(startIndex, startIndex + itemsPerPage);

                const embed = new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setTitle(`「${query}」の検索結果 (${pageIdx + 1}/${totalPages}ページ)`)
                    .setDescription(currentResults.map((song, i) => `**${startIndex + i + 1}.** [${song.name}](${song.url}) \`${song.formattedDuration}\``).join('\n') || 'このページに結果はありません。');

                const selectOptions = currentResults.map((song) => ({
                    label: (song.name.length > 90 ? song.name.substring(0, 87) + '...' : song.name),
                    description: (song.uploader?.name ? (song.uploader.name.length > 80 ? song.uploader.name.substring(0, 77) + '...' : song.uploader.name) : `Duration: ${song.formattedDuration}`).substring(0, 100),
                    value: song.url,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('search-select-song')
                    .setPlaceholder('再生する曲を選択してください')
                    .addOptions(selectOptions);

                const prevButton = new ButtonBuilder()
                    .setCustomId('search-prev-page')
                    .setLabel('◀️ 前へ')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIdx === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('search-next-page')
                    .setLabel('次へ ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIdx >= totalPages - 1);

                const components = [];
                if (currentResults.length > 0 && selectOptions.length > 0) {
                    components.push(new ActionRowBuilder().addComponents(selectMenu));
                }
                if (totalPages > 1) {
                    components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
                }

                return { embeds: [embed], components };
            };

            const initialMessagePayload = generateSearchMessagePayload(currentPage);
            const message = await interaction.followUp(initialMessagePayload);

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: TIMEOUTS.INTERACTION_COLLECTOR,
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'search-select-song') {
                        if (!i.isStringSelectMenu()) return;
                        await i.deferUpdate();
                        const selectedUrl = i.values[0];
                        const voiceChannel = interaction.member.voice.channel;

                        if (!voiceChannel) {
                            await i.followUp({ content: '曲を再生するには、まずボイスチャンネルに参加してください。', ephemeral: true });
                            collector.stop('no_voice_channel');
                            return;
                        }
                        try {
                            const songToPlay = results.find(s => s.url === selectedUrl);
                            await client.distube.play(voiceChannel, selectedUrl, {
                                member: interaction.member,
                                textChannel: interaction.channel,
                            });
                            await message.edit({ content: `🎵 **${songToPlay?.name || '選択された曲'}** を再生キューに追加しました。`, embeds: [], components: [] });
                        } catch (e) {
                            structuredLog('error', '[SearchCollector] Error playing selected song.', { selectedUrl, guildId: interaction.guild.id, errorCode: e.errorCode, errorMessage: e.message });
                            await message.edit({ content: '選択された曲の再生中にエラーが発生しました。', embeds: [], components: [] });
                        }
                        collector.stop('song_selected');
                    } else if (i.customId === 'search-prev-page') {
                        await i.deferUpdate();
                        currentPage--;
                        await message.edit(generateSearchMessagePayload(currentPage));
                    } else if (i.customId === 'search-next-page') {
                        await i.deferUpdate();
                        currentPage++;
                        await message.edit(generateSearchMessagePayload(currentPage));
                    }
                } catch (collectorError) {
                    structuredLog('error', '[SearchCollector] Error in collect event.', { guildId: interaction.guild.id, customId: i.customId, errorMessage: collectorError.message });
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '処理中にエラーが発生しました。', ephemeral: true }).catch(() => { });
                    } else {
                        await i.followUp({ content: '処理中にエラーが発生しました。', ephemeral: true }).catch(() => { });
                    }
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'song_selected' && reason !== 'no_voice_channel') {
                    message.edit({ content: '検索操作がタイムアウトしました。', components: [] }).catch(() => { });
                }
            });

        } catch (e) {
            structuredLog('error', '[SearchCommand] Error during search.', { query, guildId: interaction.guild.id, errorMessage: e.message });
            await interaction.followUp({ content: '検索中に予期せぬエラーが発生しました。', ephemeral: true });
        }
    },
}; 