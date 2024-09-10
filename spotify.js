const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const port = 8888;
const playlistName = "Recent Releases";

// Spotify credentials
const clientId = 'clientiD'; //YOUR CLINET ID NEEDS TO GO HERE
const clientSecret = 'clinetSecret'; //YOUR CLIENT SECRET NEEDS TO GO HERE
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

    res.redirect('/updatePlaylist');

  } catch (err) {
    console.error('Error during the callback process:', err);

    // Only send a response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).send('Error during the callback process: ' + err.message);
    }
  }
});

// Step 3: Display followed artists and their newly released songs
app.get('/updatePlaylist', async (req, res) => {
  let followedArtistsInfo = "";
  let playlistInfo = "";

  try {
    const followedArtists = await spotifyApi.getFollowedArtists({ limit: 50 });

    followedArtistsInfo = "<h2>Your Followed Artists:</h2><ul>";

    for (const artist of followedArtists.body.artists.items) {
      followedArtistsInfo += `<li>${artist.name}</li>`;
    }
    followedArtistsInfo += "</ul>";

    // Update the playlist and fetch the current playlist items
    const playlistItems = await updatePlaylist();

    playlistInfo = "<h2>Songs Added to Playlist:</h2><ul>";

    if (playlistItems && playlistItems.length > 0) {
      playlistItems.forEach(item => {
        playlistInfo += `<li>${item.track.name} by ${item.track.artists.map(artist => artist.name).join(', ')}</li>`;
      });
    } else {
      playlistInfo += "<li>No songs were added to the playlist.</li>";
    }
    playlistInfo += "</ul>";

    // Display followed artists and songs added to the playlist
    res.send(`<h1>PLAYLIST UPDATED!</h1>${followedArtistsInfo}${playlistInfo}`);

  } catch (err) {
    console.error('Error during the update process:', err);
    res.status(500).send('Error during the update process: ' + err.message);
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

    // Fetch the playlist items to display later
    const playlistItems = await spotifyApi.getPlaylistTracks(playlistId);
    return playlistItems.body.items;

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