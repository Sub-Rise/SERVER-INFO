const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YouTubePlugin } = require('@distube/youtube');
const { spotifyClientId, spotifyClientSecret } = require('../config/environment');

function setupDisTube(client) {
  const youtubePlugin = new YouTubePlugin({});
  const spotifyPlugin = new SpotifyPlugin({
    api: {
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
    }
  });

  const distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
      youtubePlugin,
      spotifyPlugin
    ],
  });

  return distube;
}

module.exports = setupDisTube; 