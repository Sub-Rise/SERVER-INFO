const { EmbedBuilder } = require('discord.js');
const { createServerInfoEmbed, updateLogic } = require('./infoEmbed');
const structuredLog = require('./logger');
const fs = require('fs').promises;
const path = require('path');
const { SERVER_INFO_UPDATE_CONFIG } = require('../config/networkConfig');

// Map<guildId, { debounceTimeout: NodeJS.Timeout, channelId: string, messageId: string, client: any }>
const managedMessages = new Map();

const DEBOUNCE_DELAY = SERVER_INFO_UPDATE_CONFIG.debounce.delayMs;
const PERSISTENCE_FILE = path.join(__dirname, '../../data/managed-panels.json');

function scheduleUpdate(guildId) {
    if (!managedMessages.has(guildId)) return;

    const info = managedMessages.get(guildId);

    clearTimeout(info.debounceTimeout);

    info.debounceTimeout = setTimeout(async () => {
        try {
            const result = await updateLogic(guildId, info.client, info.channelId, info.messageId);

            // 管理停止が必要な場合
            if (result && result.shouldStopManaging) {
                structuredLog('info', '[InfoUpdater] Automatically stopping management', {
                    guildId,
                    reason: result.reason,
                    error: result.error
                });

                await stopManagingWithCleanup(guildId, result.reason);
            }
        } catch (error) {
            structuredLog('error', '[InfoUpdater] Unexpected error in scheduled update', {
                guildId,
                errorMessage: error.message,
                errorStack: error.stack
            });
        }
    }, DEBOUNCE_DELAY);

    managedMessages.set(guildId, info);
}

function stopManaging(guildId) {
    if (managedMessages.has(guildId)) {
        const info = managedMessages.get(guildId);
        clearTimeout(info.debounceTimeout);
        managedMessages.delete(guildId);

        // 永続化ファイルを更新
        savePersistentData().catch(error => {
            structuredLog('warn', '[InfoUpdater] Failed to save persistence data', {
                errorMessage: error.message
            });
        });

        return { channelId: info.channelId, messageId: info.messageId };
    }
    return null;
}

/**
 * 管理停止とクリーンアップを実行
 * @param {string} guildId - ギルドID
 * @param {string} reason - 停止理由
 */
async function stopManagingWithCleanup(guildId, reason) {
    // 停止前に情報を保存
    const info = managedMessages.get(guildId);
    if (!info) return;

    const stoppedInfo = stopManaging(guildId);
    if (!stoppedInfo) return;

    try {
        // メッセージの状態を更新（可能であれば）
        if (info.client) {
            const channel = await info.client.channels.fetch(stoppedInfo.channelId).catch(() => null);
            if (channel) {
                const message = await channel.messages.fetch(stoppedInfo.messageId).catch(() => null);
                if (message && message.embeds.length > 0) {
                    const finalEmbed = EmbedBuilder.from(message.embeds[0])
                        .setTitle(message.embeds[0].title.replace('(リアルタイム更新中)', '(更新停止)'))
                        .setColor('#FF0000')
                        .setFooter({
                            text: `更新が停止されました: ${reason}`,
                            iconURL: info.client.user.displayAvatarURL({ dynamic: true })
                        });
                    await message.edit({ embeds: [finalEmbed] }).catch(() => {
                        // メッセージ更新に失敗しても継続
                    });
                }
            }
        }
    } catch (error) {
        structuredLog('warn', '[InfoUpdater] Failed to update message during cleanup', {
            guildId,
            reason,
            errorMessage: error.message
        });
    }
}

async function startManaging(interaction) {
    const { guild, client } = interaction;

    await interaction.deferReply({ flags: 64 }); // 64 = ephemeral flag

    try {
        const initialEmbed = await createServerInfoEmbed(guild, client);
        const message = await interaction.channel.send({ embeds: [initialEmbed] });

        managedMessages.set(guild.id, {
            debounceTimeout: null,
            channelId: message.channel.id,
            messageId: message.id,
            client: client,
        });

        // 永続化
        await savePersistentData();

        structuredLog('info', '[InfoUpdater] Started managing server info panel', {
            guildId: guild.id,
            channelId: message.channel.id,
            messageId: message.id
        });

        await interaction.editReply({ content: `サーバー情報のリアルタイム更新を開始しました。更新は<#${message.channel.id}>のメッセージで行われます。` });
    } catch (error) {
        structuredLog('error', '[InfoUpdater] Failed to start managing', {
            guildId: guild.id,
            errorMessage: error.message
        });
        await interaction.editReply({ content: 'サーバー情報の更新開始中にエラーが発生しました。' });
    }
}

async function toggleUpdate(interaction) {
    const { guild, client } = interaction;

    if (managedMessages.has(guild.id)) {
        await interaction.deferReply({ flags: 64 });
        await stopManagingWithCleanup(guild.id, 'user_request');
        structuredLog('info', '[InfoUpdater] User stopped server info panel', {
            guildId: guild.id,
            userId: interaction.user.id
        });
        await interaction.editReply({ content: 'サーバー情報のリアルタイム更新を停止しました。' });
    } else {
        await startManaging(interaction);
    }
}

/**
 * 永続化データの保存
 */
async function savePersistentData() {
    try {
        const dataToSave = [];
        managedMessages.forEach((info, guildId) => {
            dataToSave.push({
                guildId,
                channelId: info.channelId,
                messageId: info.messageId
            });
        });

        await fs.mkdir(path.dirname(PERSISTENCE_FILE), { recursive: true });
        await fs.writeFile(PERSISTENCE_FILE, JSON.stringify(dataToSave, null, 2));
        structuredLog('debug', '[InfoUpdater] Saved persistence data', {
            count: dataToSave.length
        });
    } catch (error) {
        structuredLog('error', '[InfoUpdater] Failed to save persistence data', {
            errorMessage: error.message
        });
    }
}

/**
 * 永続化データの読み込みと復元
 * @param {Client} client - Discord client
 */
async function initializeManagedPanels(client) {
    try {
        const data = await fs.readFile(PERSISTENCE_FILE, 'utf8');
        const panels = JSON.parse(data);

        structuredLog('info', '[InfoUpdater] Initializing managed panels from persistence', {
            count: panels.length
        });

        for (const panel of panels) {
            try {
                // ギルドとチャンネル、メッセージが存在するか確認
                const guild = await client.guilds.fetch(panel.guildId).catch(() => null);
                if (!guild) continue;

                const channel = await client.channels.fetch(panel.channelId).catch(() => null);
                if (!channel) continue;

                const message = await channel.messages.fetch(panel.messageId).catch(() => null);
                if (!message) continue;

                // 管理対象として復元
                managedMessages.set(panel.guildId, {
                    debounceTimeout: null,
                    channelId: panel.channelId,
                    messageId: panel.messageId,
                    client: client
                });

                structuredLog('info', '[InfoUpdater] Successfully re-initialized panel for guild', {
                    guildId: panel.guildId
                });

            } catch (error) {
                structuredLog('warn', '[InfoUpdater] Failed to re-initialize panel for guild', {
                    guildId: panel.guildId,
                    errorMessage: error.message
                });
            }
        }

        // 復元完了後、永続化ファイルを更新（無効なパネルを除去）
        await savePersistentData();

    } catch (error) {
        if (error.code === 'ENOENT') {
            structuredLog('info', '[InfoUpdater] No persistence file found, starting fresh');
        } else {
            structuredLog('error', '[InfoUpdater] Failed to load persistence data', {
                errorMessage: error.message
            });
        }
    }
}

/**
 * 指定されたギルドが管理対象かどうかを確認
 * @param {string} guildId - ギルドID
 * @returns {boolean}
 */
function hasManagedMessage(guildId) {
    return managedMessages.has(guildId);
}

/**
 * 指定されたギルドの管理情報を取得
 * @param {string} guildId - ギルドID
 * @returns {{ channelId: string, messageId: string } | null}
 */
function getManagedMessageInfo(guildId) {
    const info = managedMessages.get(guildId);
    if (!info) return null;
    return { channelId: info.channelId, messageId: info.messageId };
}

module.exports = {
    toggleUpdate,
    scheduleUpdate,
    managedMessages,  // 後方互換性のため維持
    hasManagedMessage,
    getManagedMessageInfo,
    initializeManagedPanels,
    savePersistentData
}; 