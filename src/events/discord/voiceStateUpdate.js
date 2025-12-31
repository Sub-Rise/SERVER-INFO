const { Events } = require('discord.js');
const structuredLog = require('../../utils/logger');
const { clearLeaveTimer, guildLeaveTimers, guildLastTextChannel } = require('../../utils/timers');
const { logVoiceStateChange } = require('../../utils/muteLogger');
const { enableMuteLogging } = require('../../config/environment');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(client, oldState, newState) {
        const botId = client.user.id;
        
        // ミュートログ機能（設定が有効な場合のみ）
        if (enableMuteLogging) {
            try {
                await logVoiceStateChange(oldState, newState);
            } catch (error) {
                structuredLog('error', '[VoiceStateUpdate] Failed to log mute state change', {
                    guildId: oldState.guild?.id || newState.guild?.id,
                    userId: oldState.id || newState.id,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
            }
        }

        if (newState.id === botId && oldState.id === botId) {
            if (oldState.channelId && !newState.channelId) {
                structuredLog('info', '[VoiceStateUpdate] Bot was disconnected from VC', {
                    guildId: oldState.guild.id,
                    oldChannelId: oldState.channelId,
                    oldChannelName: oldState.channel?.name
                });
                clearLeaveTimer(oldState.guild.id);
            }
            return;
        }

        const guildId = oldState.guild?.id || newState.guild?.id;
        if (!guildId) return;

        const botVoiceConnection = client.distube.voices.get(guildId);
        const botCurrentChannelId = botVoiceConnection?.channel?.id;

        // 1. ユーザーがBotのいるVCから退出、またはBotのいるVCが空になったか確認
        if (oldState.channelId === botCurrentChannelId && (newState.channelId !== botCurrentChannelId || !newState.channelId)) {
            const oldChannel = oldState.channel;
            if (oldChannel) {
                const membersInOldChannel = oldChannel.members.filter(member => !member.user.bot);
                if (membersInOldChannel.size === 0) {
                    const queue = client.distube.getQueue(guildId);
                    let textChannelForMessage = queue?.textChannel || guildLastTextChannel.get(guildId);

                    if (textChannelForMessage) {
                        try {
                            await textChannelForMessage.send('ボイスチャンネルに誰もいなくなったため、退出します。');
                        } catch (e) {
                            structuredLog('error', '[VoiceStateUpdate] Error sending immediate leave message:', { guildId, channelId: textChannelForMessage.id, errorMessage: e.message, errorStack: e.stack });
                        }
                    } else {
                        structuredLog('warn', '[VoiceStateUpdate] No text channel found to send immediate leave message for guild', { guildId });
                    }
                    if (botVoiceConnection) {
                        try {
                            await botVoiceConnection.leave();
                            structuredLog('info', '[VoiceStateUpdate] Left voice channel in guild', { guildId, channelId: oldChannel.id, channelName: oldChannel.name });
                        } catch (e) {
                            structuredLog('error', '[VoiceStateUpdate] Error leaving voice channel for guild', { guildId, channelId: oldChannel.id, channelName: oldChannel.name, errorMessage: e.message, errorStack: e.stack });
                        }
                    }
                    clearLeaveTimer(guildId);
                }
            }
        }

        // 2. ユーザーがBotのいるVCに参加してきたか確認
        if (newState.channelId === botCurrentChannelId && oldState.channelId !== botCurrentChannelId) {
            if (!newState.member?.user.bot) {
                const newChannel = newState.channel;
                if (newChannel) {
                    const membersInNewChannel = newChannel.members.filter(member => !member.user.bot);
                    if (membersInNewChannel.size >= 1 && guildLeaveTimers.has(guildId)) {
                        clearLeaveTimer(guildId);
                    }
                }
            }
        }
    },
}; 