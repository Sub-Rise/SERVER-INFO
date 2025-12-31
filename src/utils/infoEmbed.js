const { EmbedBuilder, ChannelType, Collection } = require('discord.js');
const { retryDiscordAPI, retryWithBackoff } = require('./networkUtils');
const structuredLog = require('./logger');
const { ERROR_CONFIG } = require('../config/networkConfig');

async function createServerInfoEmbed(guild, client) {
    // 全件取得を並列実行（重い処理は個別に長めのタイムアウトでリトライ）
    const fetchOptions = { timeoutMs: 30000, maxRetries: 1, baseDelay: 2000 };

    // メンバー取得用の最適化された関数
    // 正確性を維持しつつ、タイムアウトを回避
    const fetchMembersPromise = async () => {
        const cachedMembers = guild.members.cache;
        
        // キャッシュがほぼ完全な場合はキャッシュを使用（95%以上）
        if (cachedMembers.size >= guild.memberCount * 0.95) {
            structuredLog('debug', '[ServerInfoEmbed] Using cached members (sufficient coverage)', {
                cached: cachedMembers.size,
                total: guild.memberCount,
                coverage: `${Math.round(cachedMembers.size / guild.memberCount * 100)}%`
            });
            return cachedMembers;
        }

        try {
            // プレゼンスなしで高速取得（タイムアウトを短めに設定）
            const fetched = await retryWithBackoff(
                () => guild.members.fetch({ withPresences: false, time: 15000 }), 
                fetchOptions, 
                'createEmbed-members'
            );
            structuredLog('debug', '[ServerInfoEmbed] Fetched members from API', {
                fetched: fetched.size,
                total: guild.memberCount
            });
            return fetched;
        } catch (error) {
            // タイムアウト時はキャッシュを使用（データがないよりはマシ）　
            structuredLog('warn', '[ServerInfoEmbed] Fetch timeout, using cache', {
                errorMessage: error.message,
                cachedCount: cachedMembers.size,
                coverage: `${Math.round(cachedMembers.size / guild.memberCount * 100)}%`
            });
            return cachedMembers;
        }
    };

    const [membersRes, ownerRes, channelsRes] = await Promise.allSettled([
        fetchMembersPromise(),
        retryWithBackoff(() => guild.fetchOwner(), fetchOptions, 'createEmbed-owner'),
        retryWithBackoff(() => guild.channels.fetch(), fetchOptions, 'createEmbed-channels'),
    ]);

    let members = new Collection();
    if (membersRes.status === 'fulfilled') {
        members = membersRes.value;
    } else {
        structuredLog('warn', '[ServerInfoEmbed] Failed to fetch members, using cache', {
            errorMessage: membersRes.reason?.message,
        });
        members = guild.members?.cache ?? new Collection();
    }

    let serverOwner = null;
    if (ownerRes.status === 'fulfilled') {
        serverOwner = ownerRes.value;
    } else {
        structuredLog('warn', '[ServerInfoEmbed] Failed to fetch owner, using guild.ownerId if present', {
            errorMessage: ownerRes.reason?.message,
        });
    }

    let channels = new Collection();
    if (channelsRes.status === 'fulfilled') {
        channels = channelsRes.value;
    } else {
        structuredLog('warn', '[ServerInfoEmbed] Failed to fetch channels, falling back to cache', {
            errorMessage: channelsRes.reason?.message,
        });
        channels = guild.channels?.cache ?? new Collection();
    }

    const bannerUrl = guild.bannerURL({ dynamic: true, size: 512 });

    const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(ch => ch.type === ChannelType.GuildVoice).size;
    const categoryChannels = channels.filter(ch => ch.type === ChannelType.GuildCategory).size;

    const totalMembers = guild.memberCount;
    const userMembers = members.filter(m => !m.user.bot).size;
    const botMembers = members.filter(m => m.user.bot).size;

    let userOnline = 0, userDnd = 0, userIdle = 0;
    let botOnline = 0, botDnd = 0, botIdle = 0;
    let desktop = 0, mobile = 0, web = 0;

    members.forEach(member => {
        if (member.presence) {
            if (member.user.bot) {
                switch (member.presence.status) {
                    case 'online': botOnline++; break;
                    case 'dnd': botDnd++; break;
                    case 'idle': botIdle++; break;
                }
            } else {
                switch (member.presence.status) {
                    case 'online': userOnline++; break;
                    case 'dnd': userDnd++; break;
                    case 'idle': userIdle++; break;
                }
            }

            if (member.presence.clientStatus) {
                if (member.presence.clientStatus.desktop) desktop++;
                if (member.presence.clientStatus.mobile) mobile++;
                if (member.presence.clientStatus.web) web++;
            }
        }
    });
    
    const userOffline = userMembers > 0 ? userMembers - (userOnline + userDnd + userIdle) : 0;
    const botOffline = botMembers > 0 ? botMembers - (botOnline + botDnd + botIdle) : 0;

    const roles = guild.roles.cache.size;
    const staticEmojis = guild.emojis.cache.filter(e => !e.animated).size;
    const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
    const stickers = guild.stickers.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const verificationLevelMap = { 0: 'なし', 1: '低', 2: '中', 3: '高', 4: '最高' };
    const premiumTiers = { 0: '0', 1: '1', 2: '2', 3: '3' };
    const afkChannel = guild.afkChannel ? `<#${guild.afkChannel.id}> (${guild.afkTimeout / 60}分)` : 'なし';

    const displayOwnerMention = serverOwner ? `<@${serverOwner.id}>` : (guild.ownerId ? `<@${guild.ownerId}>` : '取得不可');
    const ownerRoleColor = serverOwner?.roles?.highest?.color || 0;
    const colorForEmbed = ownerRoleColor || (guild.members?.me?.roles?.highest?.color || 0);

    const otherInfo = [
        `**チャンネル:** ${channels.size}個 (💬: ${textChannels} 🔊: ${voiceChannels} 📝: ${categoryChannels})`,
        `**ロール:** ${roles > 0 ? roles - 1 : 0}個`,
        `**絵文字:** ${guild.emojis.cache.size}個 (静的: ${staticEmojis}, アニメ: ${animatedEmojis})`,
        `**ステッカー:** ${stickers}個`,
        `**認証レベル:** ${verificationLevelMap[guild.verificationLevel]}`,
        `**AFK設定:** ${afkChannel}`,
        `**Nitro:** ${boostCount}ブースト (レベル${premiumTiers[boostLevel]})`,
        `**シャード:** ${guild.shardId}番`,
    ].join('\n');

    const embed = new EmbedBuilder()
        .setColor(colorForEmbed === 0 ? '#22C55E' : colorForEmbed)
        .setTitle(`✅ ${guild.name}の情報 (リアルタイム更新中)`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: 'ID', value: guild.id, inline: false },
            { name: '所有者', value: displayOwnerMention, inline: false },
            { name: '人数', value: `${totalMembers}人 (ユーザー: ${userMembers}人, BOT: ${botMembers}人)`, inline: false },
            { name: '作成日時', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
            { name: 'ユーザー状況', value: `🟢: ${userOnline}人 ⛔: ${userDnd}人 🌙: ${userIdle}人 ⚫: ${userOffline}人`, inline: false },
            { name: 'BOT状況', value: `🟢: ${botOnline}人 ⛔: ${botDnd}人 🌙: ${botIdle}人 ⚫: ${botOffline}人`, inline: false },
            { name: 'デバイス', value: `🌐: ${web}人 📱: ${mobile}人 🖥️: ${desktop}人`, inline: false },
            { name: 'その他', value: otherInfo, inline: false }
        )
        .setFooter({ text: `最終更新`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    if (bannerUrl) {
        embed.setImage(bannerUrl);
    }

    return embed;
}

async function updateLogic(guildId, client, channelId, messageId) {
    const context = `updateLogic-${guildId}`;
    
    try {
        structuredLog('debug', '[ServerInfoEmbed] Starting update', {
            guildId,
            channelId,
            messageId
        });

        // ギルド情報の取得（リトライ付き）
        const guild = await retryDiscordAPI(
            () => client.guilds.fetch(guildId, { force: true }),
            `${context}-fetchGuild`
        );

        // チャンネル情報の取得（リトライ付き）
        const channel = await retryDiscordAPI(
            () => client.channels.fetch(channelId),
            `${context}-fetchChannel`
        );
        
        if (!channel) {
            structuredLog('warn', '[ServerInfoEmbed] Channel not found, stopping management', {
                guildId,
                channelId
            });
            return { shouldStopManaging: true, reason: 'channel_not_found' };
        }

        // メッセージの取得（リトライ付き）
        const message = await retryDiscordAPI(
            () => channel.messages.fetch(messageId),
            `${context}-fetchMessage`
        );
        
        if (!message) {
            structuredLog('warn', '[ServerInfoEmbed] Message not found, stopping management', {
                guildId,
                channelId,
                messageId
            });
            return { shouldStopManaging: true, reason: 'message_not_found' };
        }
        
        // Embed作成（重い取得はcreateServerInfoEmbed内で個別リトライ）
        const updatedEmbed = await createServerInfoEmbed(guild, client);
        
        // メッセージ更新（リトライ付き）
        await retryDiscordAPI(
            () => message.edit({ embeds: [updatedEmbed] }),
            `${context}-editMessage`
        );

        structuredLog('debug', '[ServerInfoEmbed] Update completed successfully', {
            guildId
        });

        return { shouldStopManaging: false };

    } catch (error) {
        // 権限エラーなど回復不可能なエラーの場合は管理停止
        if (isUnrecoverableError(error)) {
            structuredLog('error', '[ServerInfoEmbed] Unrecoverable error, stopping management', {
                guildId,
                channelId,
                messageId,
                errorMessage: error.message,
                errorCode: error.code
            });
            return { shouldStopManaging: true, reason: 'unrecoverable_error', error: error.message };
        }

        structuredLog('error', '[ServerInfoEmbed] Update failed after retries', {
            guildId,
            channelId,
            messageId,
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack
        });

        // リトライ可能エラーの場合は次回の更新を待つ
        return { shouldStopManaging: false };
    }
}

/**
 * 回復不可能なエラーかどうかを判定
 * @param {Error} error - チェックするエラー
 * @returns {boolean} - 回復不可能かどうか
 */
function isUnrecoverableError(error) {
    return ERROR_CONFIG.unrecoverableErrors.some(errorText => 
        error.message.includes(errorText) || error.code === errorText
    );
}

module.exports = { createServerInfoEmbed, updateLogic }; 