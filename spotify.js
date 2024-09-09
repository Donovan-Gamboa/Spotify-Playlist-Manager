const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require('querystring');
const port = 8888;
const playlistName = "Recent Releases";

// Spotify credentials
const clientId = 'c8c43e75f94b432baffedc160d09fc96';
const clientSecret = '7600f08cb5c34cc498be66dc832f0abf';
const redirectUri = 'http://localhost:8888/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri,
});

const app = express();

// Step 1: Redirect to Spotify Authorization URL
app.get('/login', (req, res) => {
  const scopes = [
    'user-follow-read',
    'playlist-modify-public',
    'playlist-modify-private',
  ];

  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

// Step 2: Handle the callback from Spotify
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  try {
    // Debugging: Log the authorization code received
    console.log('Received Authorization Code:', code);

    const data = await spotifyApi.authorizationCodeGrant(code);

    const accessToken = data.body['access_token'];
    const refreshToken = data.body['refresh_token'];

    // Debugging: Log the tokens received
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    res.send('Authorization successful! You can now close this window.');

    // Proceed with updating the playlist
    await updatePlaylist();

  } catch (err) {
    console.error('Error during the callback process:', err);

    // Only send a response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).send('Error during the callback process: ' + err.message);
    }
  }
});


// Step 3: Use the access token to interact with Spotify's API
async function updatePlaylist() {
  try {
    const playlistId = await getOrCreatePlaylist();

    // Fetch recent releases from followed artists (modify according to your logic)
    const recentReleases = await getRecentReleasesFromFollowedArtists();

    // Clear out old tracks from the playlist
    await clearPlaylist(playlistId);

    // Add new tracks to the playlist
    await addTracksToPlaylist(playlistId, recentReleases);

    console.log('Playlist updated successfully with recent releases.');

  } catch (err) {
    console.error('Error updating the playlist:', err);
  }
}

async function addTracksToPlaylist(playlistId, trackUris) {
  try {
    const batchSize = 100;
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      await spotifyApi.addTracksToPlaylist(playlistId, batch);
    }

    console.log('All tracks added to the playlist successfully.');

  } catch (err) {
    console.error('Error adding tracks to the playlist:', err);
  }
}


async function getOrCreatePlaylist() {
  try {
    const playlists = await spotifyApi.getUserPlaylists();
    let playlist = playlists.body.items.find(p => p.name === playlistName);

    if (!playlist) {
      const newPlaylist = await spotifyApi.createPlaylist(playlistName, {
        'description': 'Latest releases from your favorite artists.',
        'public': true
      });
      playlist = newPlaylist.body;
    }

    return playlist.id;

  } catch (err) {
    console.error('Error getting or creating playlist:', err);
  }
}

async function getRecentReleasesFromFollowedArtists() {
  try {
    const followedArtists = await spotifyApi.getFollowedArtists({ limit: 50 });
    const recentReleases = [];

    for (const artist of followedArtists.body.artists.items) {
      const albums = await spotifyApi.getArtistAlbums(artist.id, { limit: 50 });
      for (const album of albums.body.items) {
        const releaseDate = new Date(album.release_date);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 30); // Customize this range if needed

        if (releaseDate > twoWeeksAgo) {
          const tracks = await spotifyApi.getAlbumTracks(album.id);
          for (const track of tracks.body.items) {
            const trackDetails = await spotifyApi.getTrack(track.id);
            const isArtistFeatured = trackDetails.body.artists.some(trackArtist => trackArtist.id === artist.id);

            if (isArtistFeatured) {
              recentReleases.push(track.uri);
            }
          }
        }
      }
    }

    return recentReleases;

  } catch (err) {
    console.error('Error fetching recent releases:', err);
  }
}


async function clearPlaylist(playlistId) {
  try {
    const playlistTracks = await spotifyApi.getPlaylistTracks(playlistId);
    const trackUris = playlistTracks.body.items.map(item => item.track.uri);

    if (trackUris.length > 0) {
      await spotifyApi.removeTracksFromPlaylist(playlistId, trackUris.map(uri => ({ uri })));
    }

  } catch (err) {
    console.error('Error clearing the playlist:', err);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log('Visit http://localhost:8888/login to log in to Spotify');
});