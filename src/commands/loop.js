const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');
const { safeDeferReply } = require('../utils/commandWrapper');
const { COLORS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('キューのループモードを設定します。')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('設定するループモード')
                .setRequired(true)
                .addChoices(
                    { name: 'オフ', value: 'off' },
                    { name: 'トラック', value: 'track' },
                    { name: 'キュー', value: 'queue' },
                )),
    async execute(interaction) {
        const { client } = interaction;

        // safeDeferReply でエラーハンドリング付き defer
        const deferSuccess = await safeDeferReply(interaction, {});
        if (!deferSuccess) return;

        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.followUp({ content: 'ループモードを設定するキューがありません。', ephemeral: true });
        }
        const modeArg = interaction.options.getString('mode');
        let repeatMode;
        let modeText = '';
        switch (modeArg) {
            case 'off': repeatMode = 0; modeText = 'オフ'; break;
            case 'track': repeatMode = 1; modeText = '現在の曲をリピート'; break;
            case 'queue': repeatMode = 2; modeText = 'キュー全体をリピート'; break;
            default: // Should not be reachable due to choices
                return interaction.followUp({ content: '無効なループモードです。', ephemeral: true });
        }
        try {
            queue.setRepeatMode(repeatMode);
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`🔁 ループモードを **${modeText}** に設定しました。`);
            await interaction.followUp({ embeds: [embed] });
        } catch (e) {
            structuredLog('error', '[LoopCommand] Error setting loop mode.', { modeArg, guildId: interaction.guild.id, errorMessage: e.message });
            await interaction.followUp({ content: 'ループモードの設定に失敗しました。', ephemeral: true });
        }
    },
}; 