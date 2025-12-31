const { Events, EmbedBuilder } = require('discord.js');
const setupDisTube = require('../../core/distube.js');
const structuredLog = require('../../utils/logger.js');
const { clearLeaveTimer, startLeaveTimer, guildLastTextChannel, guildAutoShuffle } = require('../../utils/timers.js');
const { initializeManagedPanels } = require('../../utils/infoUpdater.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        structuredLog('info', `Logged in as ${client.user.tag}!`, { botTag: client.user.tag });

        client.distube = setupDisTube(client);

        // Initialize server info panels from persistence
        await initializeManagedPanels(client);

        // Distube イベントリスナー
        client.distube
            .on('playSong', (queue, song) => {
                clearLeaveTimer(queue.id);
                queue.textChannel?.send(`再生開始: **${song.name}** - \`${song.formattedDuration}\``);
            })
            .on('addSong', async (queue, song) => {
                clearLeaveTimer(queue.id);
                queue.textChannel?.send(`キュー追加: **${song.name}** - \`${song.formattedDuration}\``);
                if (guildAutoShuffle.get(queue.id) === true && queue.songs.length > 1) {
                    try {
                        await queue.shuffle();
                        const shuffleNotificationTitle = '🔄 自動シャッフルによりキューをシャッフルしました。';
                        const embed = new EmbedBuilder().setColor(0x00AE86).setTitle(shuffleNotificationTitle);
                        if (queue.songs.length > 1) {
                            let description = '次に再生される曲からのキュー:\n';
                            const songsToShow = queue.songs.slice(1);
                            const displayLimit = Math.min(songsToShow.length, 3);
                            for (let i = 0; i < displayLimit; i++) {
                                description += `**${i + 1}.** ${songsToShow[i].name} - \`${songsToShow[i].formattedDuration}\`\n`;
                            }
                            if (songsToShow.length > displayLimit) {
                                description += `他 ${songsToShow.length - displayLimit} 曲...\n`;
                            }
                            embed.setDescription(description.trim());
                        } else {
                            embed.setDescription('(キューには次に再生する曲がありません)');
                        }
                        queue.textChannel?.send({ embeds: [embed] }).catch(e => structuredLog('warn', '[AutoShuffle] Failed to send shuffle notification embed in addSong', { guildId: queue.id, error: e.message }));
                    } catch (e) {
                        structuredLog('error', '[AutoShuffle] Error shuffling queue in addSong', { guildId: queue.id, error: e.message, errorStack: e.stack });
                    }
                }
            })
            .on('addList', async (queue, playlist) => {
                clearLeaveTimer(queue.id);
                queue.textChannel?.send(`プレイリスト追加: **${playlist.name}** (${playlist.songs.length} 曲)`);
                if (guildAutoShuffle.get(queue.id) === true && queue.songs.length > 1) {
                    try {
                        await queue.shuffle();
                        const shuffleNotificationTitle = '🔄 自動シャッフルによりキューをシャッフルしました。';
                        const embed = new EmbedBuilder().setColor(0x00AE86).setTitle(shuffleNotificationTitle);
                        if (queue.songs.length > 1) {
                            let description = '次に再生される曲からのキュー:\n';
                            const songsToShow = queue.songs.slice(1);
                            const displayLimit = Math.min(songsToShow.length, 3);
                            for (let i = 0; i < displayLimit; i++) {
                                description += `**${i + 1}.** ${songsToShow[i].name} - \`${songsToShow[i].formattedDuration}\`\n`;
                            }
                            if (songsToShow.length > displayLimit) {
                                description += `他 ${songsToShow.length - displayLimit} 曲...\n`;
                            }
                            embed.setDescription(description.trim());
                        } else {
                            embed.setDescription('(キューには次に再生する曲がありません)');
                        }
                        queue.textChannel?.send({ embeds: [embed] }).catch(e => structuredLog('warn', '[AutoShuffle] Failed to send shuffle notification embed in addList', { guildId: queue.id, error: e.message }));
                    } catch (e) {
                        structuredLog('error', '[AutoShuffle] Error shuffling queue in addList', { guildId: queue.id, error: e.message, errorStack: e.stack });
                    }
                }
            })
            .on('error', (channel, error) => {
                structuredLog('error', 'DisTube Global Error', {
                    sourceChannelId: channel?.id,
                    guildId: error.guildId || channel?.guild?.id,
                    errorCode: error.errorCode,
                    errorMessage: error.message,
                    errorName: error.name,
                    errorStack: error.stack
                });
                let userMessage = `音楽機能でエラーが発生しました。 (エラーコード: ${error.errorCode || '不明'})`;
                let shouldStopQueue = false;
                let shouldLeaveVC = false;

                if (error.name === 'DisTubeError') {
                    switch (error.errorCode) {
                        case 'VOICE_CONNECT_FAILED':
                            userMessage = 'ボイスチャンネルへの接続に失敗しました。権限やチャンネルの状態を確認してください。';
                            shouldLeaveVC = true;
                            break;
                        case 'VOICE_MISSING_PERMISSIONS':
                            userMessage = 'ボイスチャンネルで必要な権限 (発言、接続など) がBotにありません。';
                            shouldLeaveVC = true;
                            break;
                        case 'NO_RESULTS':
                        case 'UNAVAILABLE':
                        case 'VIDEO_UNAVAILABLE':
                        case 'NOT_SUPPORTED_URL':
                        case 'CANNOT_RESOLVE_SONG':
                            userMessage = `曲の処理中にエラーが発生しました (コード: ${error.errorCode})。別の曲を試してください。`;
                            break;
                        case 'FFMPEG_ERROR':
                        case 'PLAYER_ERROR':
                        case 'UNKNOWN_ERROR':
                            userMessage = `再生エンジンで深刻なエラーが発生しました (コード: ${error.errorCode})。Bot管理者にご連絡ください。`;
                            shouldStopQueue = true;
                            shouldLeaveVC = true;
                            break;
                        case 'SPOTIFY_API_ERROR':
                            userMessage = `Spotifyの曲またはプレイリストの処理中にエラーが発生しました。URLが正しいか、公開されているか確認してください。(詳細: ${error.message.split('\n')[0]})`;
                            break;
                        default:
                            userMessage = `音楽機能で予期せぬエラーが発生しました (コード: ${error.errorCode || '不明'})。Bot管理者に連絡してください。`;
                            break;
                    }
                }

                if (channel && typeof channel.send === 'function') {
                    channel.send(userMessage.slice(0, 1900)).catch(e => structuredLog('error', '[DisTube Global Error Handler] Failed to send error message to channel', { guildId: channel?.guild?.id, errorMessage: e.message, errorStack: e.stack }));
                } else {
                    structuredLog('error', '[DisTube Global Error] Could not send message to provided channel. Error message attempted:', { userMessageAttempted: userMessage, guildId: error.guildId || channel?.guild?.id });
                    const guildId = error.guildId || channel?.guild?.id;
                    if(guildId){
                        const lastKnownChannel = guildLastTextChannel.get(guildId);
                        if(lastKnownChannel){
                            lastKnownChannel.send(`音楽機能でエラーが発生しました。詳細: ${(error.message || String(error)).slice(0,1500)}`).catch(e => structuredLog('error', '[DisTube Global Error Handler] Failed to send to fallback channel', { guildId, channelId: lastKnownChannel.id, errorMessage: e.message, errorStack: e.stack }));
                        }
                    }
                }

                const guildIdForAction = error.guildId || channel?.guild?.id;
                if (guildIdForAction) {
                    const queue = client.distube.getQueue(guildIdForAction);
                    if (queue) {
                        if (shouldStopQueue) {
                            structuredLog('warn', '[DisTube Global Error Handler] Stopping queue for guild', { guildId: guildIdForAction, errorCode: error.errorCode });
                            queue.stop().catch(e => structuredLog('error', '[DisTube Global Error Handler] Failed to stop queue', { guildId: guildIdForAction, errorMessage: e.message, errorStack: e.stack }));
                        }
                        if (shouldLeaveVC && queue.voice) {
                            structuredLog('warn', '[DisTube Global Error Handler] Leaving voice channel for guild', { guildId: guildIdForAction, errorCode: error.errorCode });
                            queue.voice.leave().catch(e => structuredLog('error', '[DisTube Global Error Handler] Failed to leave VC', { guildId: guildIdForAction, errorMessage: e.message, errorStack: e.stack }));
                        }
                    } else if (shouldLeaveVC) { 
                         const voiceConnection = client.distube.voices.get(guildIdForAction);
                         if (voiceConnection) {
                            structuredLog('warn', '[DisTube Global Error Handler] Leaving voice channel for guild', { guildId: guildIdForAction, errorCode: error.errorCode });
                            voiceConnection.leave().catch(e => structuredLog('error', '[DisTube Global Error Handler] Failed to leave VC', { guildId: guildIdForAction, errorMessage: e.message, errorStack: e.stack }));
                         }
                    }
                }
            })
            .on('searchNoResult', (message, query) => {
                const source = message.channel || message;
                structuredLog('info', '[DisTube] No result found for query', { query, sourceChannelId: source?.id, guildId: source?.guild?.id });
                
                if (source && typeof source.send === 'function') {
                    source.send(`\`${query}\` の検索結果が見つかりませんでした。`).catch(err => {
                        structuredLog('error', '[DisTube Event Handler] Error sending searchNoResult message to TextChannel', { query, sourceChannelId: source?.id, guildId: source?.guild?.id, errorMessage: err.message, errorStack: err.stack });
                    });
                } else if (message.followUp && typeof message.followUp === 'function') {
                    message.followUp({content: `\`${query}\` の検索結果が見つかりませんでした。`, flags: 64 }).catch(err => {
                         structuredLog('error', '[DisTube Event Handler] Error sending searchNoResult followUp to Interaction', { query, interactionId: message.id, guildId: message.guildId, errorMessage: err.message, errorStack: err.stack });
                    });
                } else {
                    structuredLog('error', '[DisTube Event Handler] Could not send searchNoResult message, channel or interaction method not found', { query });
                }
            })
            .on('finish', queue => {
                structuredLog('info', '[DisTube] Finished queue for guild', { guildId: queue.id });
                const voiceConnection = client.distube.voices.get(queue.id);
                if (voiceConnection && voiceConnection.channel) {
                    const membersInChannel = voiceConnection.channel.members.filter(member => !member.user.bot);
                    if (membersInChannel.size > 0) {
                        queue.textChannel?.send('再生キューがすべて終了しました。操作がない場合5分後に退出します。');
                        startLeaveTimer(client, queue);
                    } else {
                        if (queue.textChannel) queue.textChannel.send('再生キューがすべて終了し、ボイスチャンネルに誰もいないため退出します。').catch(e => structuredLog('warn', '[DisTube Event Handler] Error sending message on finish + empty', { guildId: queue.id, error: e.message }));
                        voiceConnection.leave().catch(e => structuredLog('warn', '[DisTube Event Handler] Error leaving on finish + empty', { guildId: queue.id, error: e.message }));
                        clearLeaveTimer(queue.id);
                    }
                } else {
                    queue.textChannel?.send('再生キューがすべて終了しました。');
                    structuredLog('info', '[DisTube-finish] Queue finished for guild', { guildId: queue.id, butNoVoiceConnectionOrChannelInfo: true });
                }
            })
            .on('disconnect', queue => {
                structuredLog('info', '[DisTube] Bot disconnected from voice channel in guild', { guildId: queue.id });
                queue.textChannel?.send('ボイスチャンネルから切断されました。');
                clearLeaveTimer(queue.id);
            })
            .on('deleteQueue', queue => {
                structuredLog('info', '[DisTube] Queue deleted for guild', { guildId: queue.id });
                const voiceConnection = client.distube.voices.get(queue.id);
                if (voiceConnection && voiceConnection.channel) {
                    const membersInChannel = voiceConnection.channel.members.filter(member => !member.user.bot);
                    if (membersInChannel.size > 0) {
                        startLeaveTimer(client, queue);
                    } else {
                        clearLeaveTimer(queue.id);
                    }
                } else {
                    structuredLog('info', '[DisTube-deleteQueue] Queue deleted for guild', { guildId: queue.id, butNoVoiceConnectionOrChannelInfo: true });
                }
            });
        structuredLog('info', 'Bot is ready to use DisTube (initialized in ready event).');
    },
}; 