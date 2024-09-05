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
      const data = await spotifyApi.authorizationCodeGrant(code);
      const accessToken = data.body['access_token'];
      const refreshToken = data.body['refresh_token'];
  
      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);
  
      // Step 3: Use the access token to perform Spotify actions
      // Call your function to manage the playlist here
      await updatePlaylist();
  
      // Only send a response after all async operations are complete
      res.send('Authorization successful! You can now close this window.');
  
    } catch (err) {
      // If an error occurs, send an error response
      res.status(500).send('Error getting tokens: ' + err);
    }
  });

// Step 3: Use the access token to interact with Spotify's API
async function updatePlaylist() {
    const playlistId = await getOrCreatePlaylist();
    
    // Get followed artists
    const artists = await getFollowedArtists();
    
    // Fetch and filter tracks released within the last week
    const recentTracks = await getRecentTracks(artists);
    
    // Add the tracks to the playlist
    if (recentTracks.length > 0) {
      await spotifyApi.addTracksToPlaylist(playlistId, recentTracks);
      console.log(`${recentTracks.length} tracks added to the playlist.`);
    } else {
      console.log('No new tracks to add.');
    }
  }
  
  async function getFollowedArtists() {
    let artists = [];
    let data;
    let after = null;
  
    do {
      data = await spotifyApi.getFollowedArtists({ limit: 50, after });
      console.log(data)
      artists = artists.concat(data.body.artists.items);
      after = data.body.artists.cursors.after;
    } while (after);
  
    return artists;
  }
  
  async function getRecentTracks(artists) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    let tracks = [];
  
    for (const artist of artists) {
      const albums = await spotifyApi.getArtistAlbums(artist.id, { limit: 5, album_type: 'album,single' });
  
      for (const album of albums.body.items) {
        const albumDate = new Date(album.release_date);
        if (albumDate >= oneWeekAgo) {
          const albumTracks = await spotifyApi.getAlbumTracks(album.id);
          tracks = tracks.concat(albumTracks.body.items.map(track => track.uri));
        }
      }
    }
  
    return tracks;
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
      return newPlaylist.body.id;
    }

    return playlist.id;

  } catch (err) {
    console.error('Error creating or finding playlist:', err);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log('Visit http://localhost:8888/login to log in to Spotify');
});
