const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const structuredLog = require('../utils/logger');
const { wrapCommand } = require('../utils/commandWrapper');
const { ownerId } = require('../config/environment');
const { COLORS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription('ボットに関する統計情報を表示します。'),
    execute: wrapCommand(async (interaction) => {
        // 権限チェックは wrapCommand の前に実行されるべきだが、
        // wrapCommand 内でも対応可能（followUp で ephemeral エラー）
        if (!isAdmin(interaction)) {
            return interaction.followUp({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
        }

        const { client } = interaction;

        const uptimeMs = client.uptime;
        const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const uptimeSeconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
        const uptimeString = `${uptimeDays}日 ${uptimeHours}時間 ${uptimeMinutes}分 ${uptimeSeconds}秒`;

        const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        let totalUsers = 0;
        try {
            const guilds = await client.guilds.fetch();
            for (const oauth2guild of guilds.values()) {
                const guild = await client.guilds.fetch(oauth2guild.id);
                totalUsers += guild.memberCount;
            }
        } catch (err) {
            structuredLog('warn', '[BotStats] Failed to fetch all guild member counts', { errorMessage: err.message });
            totalUsers = client.users.cache.size;
        }

        let botOwnerUserTag = 'N/A';
        if (ownerId) {
            try {
                const botOwnerUser = await client.users.fetch(ownerId);
                if (botOwnerUser) {
                    botOwnerUserTag = botOwnerUser.tag;
                }
            } catch (err) {
                structuredLog('warn', '[BotStats] Failed to fetch bot owner user by ID', { ownerId, errorMessage: err.message });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`${client.user.username} の統計情報`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'ボット名', value: client.user.tag, inline: true },
                { name: 'ボットID', value: client.user.id, inline: true },
                { name: 'Botオーナー', value: botOwnerUserTag, inline: true },
                { name: '稼働時間', value: uptimeString, inline: false },
                { name: '参加サーバー数', value: client.guilds.cache.size.toString(), inline: true },
                { name: '総ユーザー数 (推定)', value: totalUsers.toString(), inline: true },
                { name: 'メモリ使用量 (RSS)', value: `${memoryUsage} MB`, inline: true },
                { name: 'Discord.js バージョン', value: version, inline: true },
                { name: 'Node.js バージョン', value: process.version, inline: true },
                { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }
            )
            .setTimestamp();
        await interaction.followUp({ embeds: [embed] });
    }),
};