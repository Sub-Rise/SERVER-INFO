const { Client, GatewayIntentBits, Collection, Partials, Options } = require('discord.js');
const config = require('./config/environment');
const { validateConfig } = require('./utils/validateConfig');
const { setupGracefulShutdown } = require('./utils/gracefulShutdown');
const structuredLog = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// 起動時に設定を検証
validateConfig(config);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers, // For emoji/sticker update events
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction],
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: 25,
    }),
});

// コマンドハンドリングの準備
client.commands = new Collection();

const infoUpdater = require('./utils/infoUpdater');
const { hasManagedMessage } = require('./utils/infoUpdater');

// --- コマンドハンドラの動的読み込み ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}


// --- イベントハンドラの動的読み込み ---
const eventsPath = path.join(__dirname, 'events');
const eventFolders = fs.readdirSync(eventsPath);

for (const folder of eventFolders) {
    const folderPath = path.join(eventsPath, folder);
    const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(folderPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(client, ...args));
        }
    }
}

const eventsToUpdate = [
    'channelCreate', 'channelDelete', 'channelUpdate',
    'emojiCreate', 'emojiDelete', 'emojiUpdate',
    'guildUpdate', 'guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate',
    'presenceUpdate', 'roleCreate', 'roleDelete', 'roleUpdate',
    'stickerCreate', 'stickerDelete', 'stickerUpdate', 'voiceStateUpdate'
];

eventsToUpdate.forEach(event => {
    client.on(event, (arg1, arg2) => {
        // guildUpdate gives (oldGuild, newGuild)
        // other events like channelCreate give (channel)
        // voiceStateUpdate gives (oldState, newState)
        let guild = null;

        if (event === 'guildUpdate') {
            guild = arg2;
        } else if (event === 'voiceStateUpdate') {
            guild = arg2?.guild;
        } else {
            guild = arg1?.guild || arg1; // arg1 might be the guild itself (e.g. guildMemberAdd gives member, member.guild)
            if (!guild?.id && arg1?.guild) guild = arg1.guild;
        }

        // Some events might not map cleanly this way, so we do a safety check
        if (guild && guild.id && hasManagedMessage(guild.id)) {
            infoUpdater.scheduleUpdate(guild.id);
        }
    });
});

client.on('guildDelete', (guild) => {
    if (hasManagedMessage(guild.id)) {
        // Stop managing without trying to update the message since we can't access it anymore
        const info = infoUpdater.managedMessages.get(guild.id);
        clearTimeout(info.debounceTimeout);
        infoUpdater.managedMessages.delete(guild.id);
        infoUpdater.savePersistentData().catch(err => {
            structuredLog('error', '[InfoUpdater] Failed to save after guildDelete', { errorMessage: err.message });
        });
        structuredLog('info', '[InfoUpdater] Stopped managing panel for left guild', {
            guildName: guild.name,
            guildId: guild.id
        });
    }
});

// グレースフルシャットダウンを設定
setupGracefulShutdown(client);

// Discordにログイン
client.login(config.token).catch(err => {
    structuredLog('error', 'Failed to login to Discord', { errorMessage: err.message });
    process.exit(1);
}); 