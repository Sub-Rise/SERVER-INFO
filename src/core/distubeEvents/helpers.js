/**
 * ヘルパー関数モジュール
 * DisTubeイベントハンドラで使用される共通ヘルパー関数
 */

const { EmbedBuilder } = require('discord.js');
const structuredLog = require('../../utils/logger.js');
const { guildLastTextChannel } = require('../../utils/timers.js');
const { isAutoShuffleEnabled } = require('../../utils/musicState.js');
const { getErrorMessage, isCriticalError, shouldLeaveVC } = require('../../utils/distubeErrors.js');
const { COLORS } = require('../../config/constants.js');

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
    structuredLog('error', 'DisTube Global Error', {
        sourceChannelId: channel?.id,
        guildId: error.guildId || channel?.guild?.id,
        errorCode: error.errorCode,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
    });

    const userMessage = getErrorMessage(error);
    const shouldStopQueue = isCriticalError(error);
    const shouldLeaveVoice = shouldLeaveVC(error);

    sendErrorToUser(channel, error, userMessage);

    const guildIdForAction = error.guildId || channel?.guild?.id;
    if (guildIdForAction) {
        handleQueueAndVoiceAction(client, guildIdForAction, shouldStopQueue, shouldLeaveVoice, error);
    }
}

module.exports = {
    performAutoShuffle,
    sendErrorToUser,
    handleQueueAndVoiceAction,
    handleDisTubeError
};
