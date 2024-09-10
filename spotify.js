const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const port = 8888; // Port on which the server will run
const playlistName = "Recent Releases"; // Name of the playlist to be updated

// Spotify credentials (replace with your actual client credentials)
const clientId = 'clientiD'; // Your Client ID goes here
const clientSecret = 'clientSecret'; // Your Client Secret goes here
const redirectUri = 'http://localhost:8888/callback'; // Redirect URI for Spotify OAuth

// Initialize the Spotify API client with your credentials
const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri,
});

const app = express();

// Step 1: Redirect to Spotify Authorization URL
// This endpoint handles user login and authorization via Spotify
app.get('/login', (req, res) => {
    const scopes = [
        'user-follow-read', // Permission to read followed artists
        'playlist-modify-public', // Permission to modify public playlists
        'playlist-modify-private', // Permission to modify private playlists
    ];

    // Generate Spotify authorization URL with the necessary scopes
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL); // Redirect the user to the Spotify login page
});

// Step 2: Handle the callback from Spotify
// This endpoint processes the OAuth callback and exchanges the authorization code for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code || null; // Get the authorization code from the callback URL

    try {
        console.log('Received Authorization Code:', code); // Log the received authorization code

        // Exchange the authorization code for access and refresh tokens
        const data = await spotifyApi.authorizationCodeGrant(code);

        const accessToken = data.body['access_token']; // Extract access token
        const refreshToken = data.body['refresh_token']; // Extract refresh token

        // Log the tokens for debugging purposes
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);

        // Set the tokens for the Spotify API client
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);

        // Redirect to the playlist update endpoint
        res.redirect('/updatePlaylist');

    } catch (err) {
        console.error('Error during the callback process:', err);

        // Handle any errors during the callback process
        if (!res.headersSent) {
            res.status(500).send('Error during the callback process: ' + err.message);
        }
    }
});

// Step 3: Display followed artists and their newly released songs
// This endpoint updates the playlist and displays followed artists and the songs added
app.get('/updatePlaylist', async (req, res) => {
    let followedArtistsInfo = "";
    let playlistInfo = "";

    try {
        // Fetch the list of followed artists
        const followedArtists = await spotifyApi.getFollowedArtists({
            limit: 50
        });

        // Prepare a list of followed artists for display
        followedArtistsInfo = "<h2>Your Followed Artists:</h2><ul>";
        for (const artist of followedArtists.body.artists.items) {
            followedArtistsInfo += `<li>${artist.name}</li>`;
        }
        followedArtistsInfo += "</ul>";

        // Update the playlist and fetch the current playlist items
        const playlistItems = await updatePlaylist();

        // Prepare a list of songs added to the playlist for display
        playlistInfo = "<h2>Songs Added to Playlist:</h2><ul>";
        if (playlistItems && playlistItems.length > 0) {
            playlistItems.forEach(item => {
                playlistInfo += `<li>${item.track.name} by ${item.track.artists.map(artist => artist.name).join(', ')}</li>`;
            });
        } else {
            playlistInfo += "<li>No songs were added to the playlist.</li>";
        }
        playlistInfo += "</ul>";

        // Send the response showing followed artists and songs added to the playlist
        res.send(`<h1>PLAYLIST UPDATED!</h1>${followedArtistsInfo}${playlistInfo}`);

    } catch (err) {
        console.error('Error during the update process:', err);
        res.status(500).send('Error during the update process: ' + err.message);
    }
});

// Helper function: Updates the playlist with recent releases from followed artists
async function updatePlaylist() {
    try {
        const playlistId = await getOrCreatePlaylist(); // Get or create the playlist

        // Fetch recent releases from followed artists
        const recentReleases = await getRecentReleasesFromFollowedArtists();

        // Clear out old tracks from the playlist
        await clearPlaylist(playlistId);

        // Add new tracks to the playlist
        await addTracksToPlaylist(playlistId, recentReleases);

        console.log('Playlist updated successfully with recent releases.');

        // Fetch and return the playlist items for display
        const playlistItems = await spotifyApi.getPlaylistTracks(playlistId);
        return playlistItems.body.items;

    } catch (err) {
        console.error('Error updating the playlist:', err);
    }
}

// Helper function: Adds tracks to the playlist in batches to avoid hitting the rate limit
async function addTracksToPlaylist(playlistId, trackUris) {
    try {
        const batchSize = 100; // Spotify's limit for adding tracks at once
        for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            await spotifyApi.addTracksToPlaylist(playlistId, batch);
        }
        console.log('All tracks added to the playlist successfully.');
    } catch (err) {
        console.error('Error adding tracks to the playlist:', err);
    }
}


// Helper function: Gets the existing playlist or creates a new one if it doesn't exist
async function getOrCreatePlaylist() {
    try {
        const playlists = await spotifyApi.getUserPlaylists(); // Fetch user's playlists
        let playlist = playlists.body.items.find(p => p.name === playlistName); // Look for the specific playlist

        if (!playlist) {
            // If playlist doesn't exist, create a new one
            const newPlaylist = await spotifyApi.createPlaylist(playlistName, {
                'description': 'Latest releases from your favorite artists.',
                'public': true
            });
            playlist = newPlaylist.body; // Use the newly created playlist
        }

        return playlist.id; // Return the playlist ID

    } catch (err) {
        console.error('Error getting or creating playlist:', err);
    }
}

// Helper function: Fetches recent releases from followed artists within the past 30 days
async function getRecentReleasesFromFollowedArtists() {
    try {
        const followedArtists = await spotifyApi.getFollowedArtists({
            limit: 50
        });
        const recentReleases = [];

        for (const artist of followedArtists.body.artists.items) {
            const albums = await spotifyApi.getArtistAlbums(artist.id, {
                limit: 50
            });
            for (const album of albums.body.items) {
                const releaseDate = new Date(album.release_date); // Convert release date to a Date object
                const howLongAgo = new Date();
                howLongAgo.setDate(howLongAgo.getDate() - 30); // Define the range for recent releases

                // Check if the album was released within the past 30 days
                if (releaseDate > howLongAgo) {
                    const tracks = await spotifyApi.getAlbumTracks(album.id); // Get tracks from the album
                    for (const track of tracks.body.items) {
                        const trackDetails = await spotifyApi.getTrack(track.id);
                        // Check if the followed artist is featured on the track
                        const isArtistFeatured = trackDetails.body.artists.some(trackArtist => trackArtist.id === artist.id);

                        if (isArtistFeatured) {
                            recentReleases.push(track.uri); // Add the track to the list of recent releases
                        }
                    }
                }
            }
        }

        return recentReleases; // Return the list of recent releases

    } catch (err) {
        console.error('Error fetching recent releases:', err);
    }
}

// Helper function: Clears all tracks from the playlist
async function clearPlaylist(playlistId) {
    try {
        const playlistTracks = await spotifyApi.getPlaylistTracks(playlistId); // Get current playlist tracks
        const trackUris = playlistTracks.body.items.map(item => item.track.uri); // Extract URIs of the tracks

        if (trackUris.length > 0) {
            await spotifyApi.removeTracksFromPlaylist(playlistId, trackUris.map(uri => ({
                uri
            }))); // Remove the tracks
        }
    } catch (err) {
        console.error('Error clearing the playlist:', err);
    }
}

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`); // Log server URL
    console.log('Visit http://localhost:8888/login to log in to Spotify'); // Prompt to log in via Spotify
});