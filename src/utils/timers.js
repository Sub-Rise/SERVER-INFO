const structuredLog = require('./logger');
const { TIMEOUTS } = require('../config/constants');

const guildLeaveTimers = new Map();
const guildLastTextChannel = new Map();
const guildAutoShuffle = new Map();
const LEAVE_TIMEOUT_MS = TIMEOUTS.LEAVE_TIMER;

function startLeaveTimer(client, queueOrGuildId, textChannelFromEvent = null) {
  const guildId = typeof queueOrGuildId === 'string' ? queueOrGuildId : queueOrGuildId?.id;
  let operableTextChannel = textChannelFromEvent;

  if (!guildId) {
    structuredLog('error', '[LeaveTimer] Cannot start timer: guildId is undefined.');
    return;
  }

  if (!operableTextChannel && typeof queueOrGuildId === 'object' && queueOrGuildId?.textChannel) {
    operableTextChannel = queueOrGuildId.textChannel;
  }
  if (!operableTextChannel) {
    operableTextChannel = guildLastTextChannel.get(guildId);
  }

  clearLeaveTimer(guildId);

  structuredLog('info', '[LeaveTimer] Starting', { guildId, timeoutSeconds: LEAVE_TIMEOUT_MS / 1000 });
  const timer = setTimeout(async () => {
    const currentQueue = client.distube.getQueue(guildId);
    const voiceConnection = client.distube.voices.get(guildId);

    let finalOperableTextChannel = operableTextChannel;
    if (currentQueue && currentQueue.textChannel) {
        finalOperableTextChannel = currentQueue.textChannel;
    } else if (!finalOperableTextChannel) {
        finalOperableTextChannel = guildLastTextChannel.get(guildId);
    }

    if (voiceConnection) {
      structuredLog('info', '[LeaveTimer] Timer expired for guild', { guildId });
      if (finalOperableTextChannel) {
          try {
            await finalOperableTextChannel.send('5分間操作がなかったため、ボイスチャンネルから退出します。');
          } catch (sendError) {
            structuredLog('error', '[LeaveTimer] Failed to send leave message to channel for guild', { guildId, channelId: finalOperableTextChannel.id, errorMessage: sendError.message, errorStack: sendError.stack });
          }
      } else {
          structuredLog('warn', '[LeaveTimer] No text channel found to send leave message for guild', { guildId });
      }
      
      try {
        await voiceConnection.leave();
        structuredLog('info', '[LeaveTimer] Left voice channel in guild', { guildId });
      } catch (e) {
        structuredLog('error', '[LeaveTimer] Error leaving voice channel for guild', { guildId, errorMessage: e.message, errorStack: e.stack });
      }
    } else {
      structuredLog('info', '[LeaveTimer] Timer expired for guild', { guildId, butVoiceConnectionNoLongerExists: true });
    }
    guildLeaveTimers.delete(guildId);
  }, LEAVE_TIMEOUT_MS);
  guildLeaveTimers.set(guildId, timer);
}

function clearLeaveTimer(guildId) {
  if (guildLeaveTimers.has(guildId)) {
    clearTimeout(guildLeaveTimers.get(guildId));
    guildLeaveTimers.delete(guildId);
    structuredLog('info', '[LeaveTimer] Cleared leave timer for guild', { guildId });
  }
}

module.exports = {
  guildLeaveTimers,
  guildLastTextChannel,
  guildAutoShuffle,
  startLeaveTimer,
  clearLeaveTimer,
}; 