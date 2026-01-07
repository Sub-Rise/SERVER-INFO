/**
 * DisTubeイベントハンドラ - メインエントリーポイント
 * 
 * イベントローダーパターン:
 * - helpers.js: 共通ヘルパー関数
 * - index.js: イベント登録（このファイル）
 * 
 * 新しいイベントを追加する際は、setupDisTubeEvents内に追加するか、
 * handlers/ ディレクトリに個別ファイルを作成して読み込む（将来拡張時）
 */

const structuredLog = require('../../utils/logger.js');
const { clearLeaveTimer, startLeaveTimer } = require('../../utils/timers.js');
const { performAutoShuffle, handleDisTubeError } = require('./helpers.js');

/**
 * DisTubeイベントリスナーをセットアップ
 * @param {DisTube} distube - DisTubeインスタンス
 * @param {Client} client - Discordクライアント
 */
function setupDisTubeEvents(distube, client) {
    // 再生開始イベント
    distube.on('playSong', (queue, song) => {
        clearLeaveTimer(queue.id);
        queue.textChannel?.send(`再生開始: **${song.name}** - \`${song.formattedDuration}\``);
    });

    // 曲追加イベント
    distube.on('addSong', async (queue, song) => {
        clearLeaveTimer(queue.id);
        queue.textChannel?.send(`キュー追加: **${song.name}** - \`${song.formattedDuration}\``);
        await performAutoShuffle(queue, 'addSong');
    });

    // プレイリスト追加イベント
    distube.on('addList', async (queue, playlist) => {
        clearLeaveTimer(queue.id);
        queue.textChannel?.send(`プレイリスト追加: **${playlist.name}** (${playlist.songs.length} 曲)`);
        await performAutoShuffle(queue, 'addList');
    });

    // エラーイベント
    distube.on('error', (channel, error) => {
        handleDisTubeError(client, channel, error);
    });

    // 検索結果なしイベント
    distube.on('searchNoResult', (message, query) => {
        const source = message.channel || message;
        structuredLog('info', '[DisTube] No result found for query', {
            query,
            sourceChannelId: source?.id,
            guildId: source?.guild?.id
        });

        if (source && typeof source.send === 'function') {
            source.send(`\`${query}\` の検索結果が見つかりませんでした。`).catch(err => {
                structuredLog('error', '[DisTube Event Handler] Error sending searchNoResult message', {
                    query,
                    sourceChannelId: source?.id,
                    guildId: source?.guild?.id,
                    errorMessage: err.message
                });
            });
        } else if (message.followUp && typeof message.followUp === 'function') {
            message.followUp({ content: `\`${query}\` の検索結果が見つかりませんでした。`, ephemeral: true }).catch(err => {
                structuredLog('error', '[DisTube Event Handler] Error sending searchNoResult followUp', {
                    query,
                    interactionId: message.id,
                    guildId: message.guildId,
                    errorMessage: err.message
                });
            });
        } else {
            structuredLog('error', '[DisTube Event Handler] Could not send searchNoResult message', { query });
        }
    });

    // キュー終了イベント
    distube.on('finish', queue => {
        structuredLog('info', '[DisTube] Finished queue for guild', { guildId: queue.id });
        const voiceConnection = client.distube.voices.get(queue.id);

        if (voiceConnection && voiceConnection.channel) {
            const membersInChannel = voiceConnection.channel.members.filter(member => !member.user.bot);
            if (membersInChannel.size > 0) {
                queue.textChannel?.send('再生キューがすべて終了しました。操作がない場合5分後に退出します。');
                startLeaveTimer(client, queue);
            } else {
                queue.textChannel?.send('再生キューがすべて終了し、ボイスチャンネルに誰もいないため退出します。')
                    .catch(e => structuredLog('warn', '[DisTube] Error sending finish message', { guildId: queue.id, error: e.message }));
                voiceConnection.leave()
                    .catch(e => structuredLog('warn', '[DisTube] Error leaving on finish', { guildId: queue.id, error: e.message }));
                clearLeaveTimer(queue.id);
            }
        } else {
            queue.textChannel?.send('再生キューがすべて終了しました。');
            structuredLog('info', '[DisTube] Queue finished for guild', { guildId: queue.id, noVoiceConnection: true });
        }
    });

    // 切断イベント
    distube.on('disconnect', queue => {
        structuredLog('info', '[DisTube] Bot disconnected from voice channel', { guildId: queue.id });
        queue.textChannel?.send('ボイスチャンネルから切断されました。');
        clearLeaveTimer(queue.id);
    });

    // キュー削除イベント
    distube.on('deleteQueue', queue => {
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
            structuredLog('info', '[DisTube] Queue deleted for guild', { guildId: queue.id, noVoiceConnection: true });
        }
    });

    structuredLog('info', 'DisTube event handlers registered.');
}

module.exports = { setupDisTubeEvents };
