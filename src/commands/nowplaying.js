const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('現在再生中の曲の情報を表示します。'),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply();
        const queue = client.distube.getQueue(interaction.guildId);

        if (!queue || !queue.songs || queue.songs.length === 0) {
            return interaction.followUp({ content: '現在再生中の曲はありません。', flags: 64 });
        }

        const song = queue.songs[0];
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(song.name)
            .setURL(song.url)
            .setAuthor({ name: song.uploader?.name || '不明なアップロード者', url: song.uploader?.url })
            .setThumbnail(song.thumbnail || null)
            .addFields(
                { name: '再生時間', value: `${queue.formattedCurrentTime} / ${song.formattedDuration}`, inline: true },
                { name: 'リクエスト者', value: song.user?.toString() || '不明', inline: true },
                { name: '音量', value: `${queue.volume}%`, inline: true }
            );

        let repeatModeText = 'オフ';
        if (queue.repeatMode === 1) repeatModeText = 'トラックリピート';
        else if (queue.repeatMode === 2) repeatModeText = 'キューリピート';
        embed.addFields({ name: 'リピートモード', value: repeatModeText, inline: true });

        if (queue.autoplay) {
            embed.addFields({ name: '自動再生', value: 'オン', inline: true });
        }

        if (song.duration > 0) {
            const progress = Math.floor((queue.currentTime / song.duration) * 20);
            const progressBar = '─'.repeat(progress) + '🔘' + '─'.repeat(Math.max(0, 19 - progress));
            embed.addFields({ name: '進行状況', value: `\`${progressBar}\``, inline: false });
        }

        await interaction.followUp({ embeds: [embed] });
    },
}; 