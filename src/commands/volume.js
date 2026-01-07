const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');
const { wrapCommand } = require('../utils/commandWrapper');
const { COLORS } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('音楽の音量を設定します。')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('音量レベル (例: 0-200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)),
    execute: wrapCommand(async (interaction) => {
        const { client } = interaction;
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.followUp({ content: '音量を変更するキューがありません。', ephemeral: true });
        }

        const level = interaction.options.getInteger('level');
        if (level === null) {
            return interaction.followUp({ content: '音量を指定してください。', ephemeral: true });
        }

        try {
            queue.setVolume(level);
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`🔊 音量を **${level}%** に設定しました。`);
            await interaction.followUp({ embeds: [embed] });
        } catch (e) {
            structuredLog('error', '[VolumeCommand] Error setting volume.', {
                level,
                guildId: interaction.guild?.id,
                errorMessage: e.message
            });
            await interaction.followUp({ content: '音量の設定に失敗しました。', ephemeral: true });
        }
    }),
};