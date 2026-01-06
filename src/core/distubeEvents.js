/**
 * DisTubeイベントハンドラ
 * ready.js から分離した DisTube イベントリスナーを一元管理
 */

const { EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger.js');
const { clearLeaveTimer, startLeaveTimer, guildLastTextChannel } = require('../utils/timers.js');
const { isAutoShuffleEnabled } = require('../utils/musicState.js');
const { getErrorMessage, isCriticalError, shouldLeaveVC } = require('../utils/distubeErrors.js');
const { COLORS } = require('../config/constants.js');

/**
 * 自動シャッフル処理を実行
 * @param {Queue} queue - DisTubeキュー
 * @param {string} context - ログ用コンテキスト（'addSong' or 'addList'）
 */
async function performAutoShuffle(queue, context) {
    if (!isAutoShuffleEnabled(queue.id) || queue.songs.length <= 1) {
        return;
    }

    try {
        await queue.shuffle();
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🔄 自動シャッフルによりキューをシャッフルしました。');

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

        queue.textChannel?.send({ embeds: [embed] }).catch(e =>
            structuredLog('warn', `[AutoShuffle] Failed to send notification in ${context}`, {
                guildId: queue.id,
                error: e.message
            })
        );
    } catch (e) {
        structuredLog('error', `[AutoShuffle] Error shuffling in ${context}`, {
            guildId: queue.id,
            error: e.message,
            errorStack: e.stack
        });
    }
}

/**
 * DisTubeエラー時のユーザーメッセージ送信
 * @param {TextChannel|null} channel - 送信先チャンネル
 * @param {Error} error - エラーオブジェクト
 * @param {string} userMessage - ユーザー向けメッセージ
 */
function sendErrorToUser(channel, error, userMessage) {
    if (channel && typeof channel.send === 'function') {
        channel.send(userMessage.slice(0, 1900)).catch(e =>
            structuredLog('error', '[DisTube Error Handler] Failed to send error message', {
                guildId: channel?.guild?.id,
                errorMessage: e.message
            })
        );
        return;
    }

    // フォールバック: guildLastTextChannel から送信を試みる
    structuredLog('error', '[DisTube Error] Could not send to provided channel', {
        userMessageAttempted: userMessage,
        guildId: error.guildId || channel?.guild?.id
    });

    const guildId = error.guildId || channel?.guild?.id;
    if (guildId) {
        const lastKnownChannel = guildLastTextChannel.get(guildId);
        if (lastKnownChannel) {
            lastKnownChannel.send(`音楽機能でエラーが発生しました。詳細: ${(error.message || String(error)).slice(0, 1500)}`)
                .catch(e => structuredLog('error', '[DisTube Error Handler] Failed to send to fallback channel', {
                    guildId,
                    channelId: lastKnownChannel.id,
                    errorMessage: e.message
                }));
        }
    }
}

/**
 * DisTubeエラー時のキュー/VC処理
 * @param {Client} client - Discordクライアント
 * @param {string} guildId - ギルドID
 * @param {boolean} shouldStopQueue - キュー停止が必要か
 * @param {boolean} shouldLeaveVoice - VC退出が必要か
 * @param {Error} error - エラーオブジェクト
 */
function handleQueueAndVoiceAction(client, guildId, shouldStopQueue, shouldLeaveVoice, error) {
    const queue = client.distube.getQueue(guildId);

    if (queue) {
        if (shouldStopQueue) {
            structuredLog('warn', '[DisTube Error Handler] Stopping queue', { guildId, errorCode: error.errorCode });
            queue.stop().catch(e =>
                structuredLog('error', '[DisTube Error Handler] Failed to stop queue', {
                    guildId,
                    errorMessage: e.message
                })
            );
        }
        if (shouldLeaveVoice && queue.voice) {
            structuredLog('warn', '[DisTube Error Handler] Leaving voice channel', { guildId, errorCode: error.errorCode });
            queue.voice.leave().catch(e =>
                structuredLog('error', '[DisTube Error Handler] Failed to leave VC', {
                    guildId,
                    errorMessage: e.message
                })
            );
        }
    } else if (shouldLeaveVoice) {
        const voiceConnection = client.distube.voices.get(guildId);
        if (voiceConnection) {
            structuredLog('warn', '[DisTube Error Handler] Leaving voice channel (no queue)', { guildId, errorCode: error.errorCode });
            voiceConnection.leave().catch(e =>
                structuredLog('error', '[DisTube Error Handler] Failed to leave VC', {
                    guildId,
                    errorMessage: e.message
                })
            );
        }
    }
}

/**
 * DisTubeグローバルエラーハンドラ
 * @param {Client} client - Discordクライアント
 * @param {TextChannel|null} channel - エラー発生チャンネル
 * @param {Error} error - エラーオブジェクト
 */
function handleDisTubeError(client, channel, error) {
    // ログ出力
    structuredLog('error', 'DisTube Global Error', {
        sourceChannelId: channel?.id,
        guildId: error.guildId || channel?.guild?.id,
        errorCode: error.errorCode,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
    });

    // ユーティリティ関数でエラーを分析
    const userMessage = getErrorMessage(error);
    const shouldStopQueue = isCriticalError(error);
    const shouldLeaveVoice = shouldLeaveVC(error);

    // ユーザーへのメッセージ送信
    sendErrorToUser(channel, error, userMessage);

    // キュー/VC処理
    const guildIdForAction = error.guildId || channel?.guild?.id;
    if (guildIdForAction) {
        handleQueueAndVoiceAction(client, guildIdForAction, shouldStopQueue, shouldLeaveVoice, error);
    }
}

/**
 * DisTubeイベントリスナーをセットアップ
 * @param {DisTube} distube - DisTubeインスタンス
 * @param {Client} client - Discordクライアント
 */
function setupDisTubeEvents(distube, client) {
    distube
        .on('playSong', (queue, song) => {
            clearLeaveTimer(queue.id);
            queue.textChannel?.send(`再生開始: **${song.name}** - \`${song.formattedDuration}\``);
        })
        .on('addSong', async (queue, song) => {
            clearLeaveTimer(queue.id);
            queue.textChannel?.send(`キュー追加: **${song.name}** - \`${song.formattedDuration}\``);
            await performAutoShuffle(queue, 'addSong');
        })
        .on('addList', async (queue, playlist) => {
            clearLeaveTimer(queue.id);
            queue.textChannel?.send(`プレイリスト追加: **${playlist.name}** (${playlist.songs.length} 曲)`);
            await performAutoShuffle(queue, 'addList');
        })
        .on('error', (channel, error) => {
            handleDisTubeError(client, channel, error);
        })
        .on('searchNoResult', (message, query) => {
            const source = message.channel || message;
            structuredLog('info', '[DisTube] No result found for query', { query, sourceChannelId: source?.id, guildId: source?.guild?.id });

            if (source && typeof source.send === 'function') {
                source.send(`\`${query}\` の検索結果が見つかりませんでした。`).catch(err => {
                    structuredLog('error', '[DisTube Event Handler] Error sending searchNoResult message to TextChannel', { query, sourceChannelId: source?.id, guildId: source?.guild?.id, errorMessage: err.message, errorStack: err.stack });
                });
            } else if (message.followUp && typeof message.followUp === 'function') {
                message.followUp({ content: `\`${query}\` の検索結果が見つかりませんでした。`, ephemeral: true }).catch(err => {
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

    structuredLog('info', 'DisTube event handlers registered.');
}

module.exports = { setupDisTubeEvents };
