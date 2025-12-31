const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const structuredLog = require('../utils/logger');

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
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.followUp({ content: '音量を変更するキューがありません。', flags: 64 });
        }
        const level = interaction.options.getInteger('level');
        if (level === null) { // Redundant check due to required=true, but good practice
            return interaction.followUp({ content: '音量を指定してください。', flags: 64 });
        }

        try {
            queue.setVolume(level);
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setDescription(`🔊 音量を **${level}%** に設定しました。`);
            await interaction.followUp({ embeds: [embed] });
        } catch (e) {
            structuredLog('error', '[VolumeCommand] Error setting volume.', { level, guildId: interaction.guild.id, errorMessage: e.message });
            await interaction.followUp({ content: '音量の設定に失敗しました。', flags: 64 });
        }
    },
}; 