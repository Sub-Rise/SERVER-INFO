const { SlashCommandBuilder } = require('discord.js');
const { guildAutoShuffle } = require('../utils/timers');
const { safeDeferReply } = require('../utils/commandWrapper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoshuffle')
        .setDescription('キューの自動シャッフルモードをオンまたはオフにします。')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('自動シャッフルをオンまたはオフに設定します。')
                .setRequired(true)
                .addChoices(
                    { name: 'オン', value: 'on' },
                    { name: 'オフ', value: 'off' },
                )),
    async execute(interaction) {
        // safeDeferReply でエラーハンドリング付き defer
        const deferSuccess = await safeDeferReply(interaction, {});
        if (!deferSuccess) return;

        const mode = interaction.options.getString('mode');
        const guildId = interaction.guildId;

        if (!guildId) {
            return interaction.followUp({ content: 'このコマンドはサーバー内でのみ実行できます。', ephemeral: true });
        }

        if (mode === 'on') {
            guildAutoShuffle.set(guildId, true);
            await interaction.followUp({ content: '✅ 自動シャッフルをオンにしました。今後、曲が追加されるたびにキューがシャッフルされます。' });
        } else if (mode === 'off') {
            guildAutoShuffle.set(guildId, false);
            await interaction.followUp({ content: '❌ 自動シャッフルをオフにしました。' });
        }
    },
}; 