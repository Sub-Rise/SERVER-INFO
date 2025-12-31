const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YouTubePlugin } = require('@distube/youtube');
const { spotifyClientId, spotifyClientSecret } = require('../config/environment');
const structuredLog = require('../utils/logger');

function setupDisTube(client) {
  const plugins = [new YouTubePlugin({})];

  // Spotify認証情報が設定されている場合のみプラグインを追加
  if (spotifyClientId && spotifyClientSecret) {
    plugins.push(new SpotifyPlugin({
      api: {
        clientId: spotifyClientId,
        clientSecret: spotifyClientSecret,
      }
    }));
    structuredLog('info', '[DisTube] Spotify plugin enabled');
  } else {
    structuredLog('warn', '[DisTube] Spotify plugin disabled (credentials not configured)');
  }

  const distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins,
  });

  return distube;
}

module.exports = setupDisTube; 