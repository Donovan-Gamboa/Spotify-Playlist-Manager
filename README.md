# Spotify Recent Releases Playlist Manager

This Node.js application automatically updates a Spotify playlist with the most recent releases from artists you follow. It also removes older tracks to keep your playlist fresh with releases from the last two weeks (or more if you change the howLongAgo variable). The app allows you to log in to your Spotify account, retrieve followed artists, fetch new releases, and manage a playlist accordingly.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Functions](#functions)
- [Debugging](#debugging)
- [License](#license)

## Features
- Logs in to Spotify and retrieves followed artists.
- Creates or updates a playlist with the most recent releases (from the last 2 weeks).
- Removes older songs from the playlist to keep it up to date.
- Handles cases where an artist is featured on a track.
- Supports up to 100 song additions per batch due to Spotify API limits.
- Displays the followed artists and added tracks on a local web page after the playlist is updated.

## Prerequisites
Before using this app, ensure that you have the following installed:
- [Node.js](https://nodejs.org) (version 14 or above)
- A [Spotify Developer Account](https://developer.spotify.com/dashboard/login)

## Installation

1. **Clone the Repository**:
   First, you'll need to clone the repository to your local machine. Open your terminal or command prompt and run the following command:
   ```bash
   git clone https://github.com/your-repository/spotify-playlist-manager.git
   ```
   After the repository is cloned, navigate to the project directory:
   ```bash
   cd spotify-playlist-manager
   
2. **Install Node.js Dependencies**:
   The app requires several Node.js libraries to function, which are listed in the package.json file.
     To install these dependencies, run:
    ```bash
    npm install
    ```
      This command will install all required packages such as express and spotify-web-api-node.
## Setup
1. **Create a Spotify Developer Account**:
   If you haven't already, create a Spotify Developer Account. Once logged in, create a new app. You will receive:

    - Client ID

    - Client Secret

    - You will also need to set a Redirect URI to http://localhost:8888/callback in your Spotify App settings.

2. **Configure Spotify API Credentials**:
   After setting up your Spotify app, you need to add your credentials to the application.
   Open the spotify.js file in the root of the project.
   Replace the following placeholders with your Spotify API credentials:
    ```bash
    const clientId = 'YOUR_CLIENT_ID';
    const clientSecret = 'YOUR_CLIENT_SECRET';
    const redirectUri = 'http://localhost:8888/callback';
    ```
    
   These credentials will allow the app to authenticate with Spotify's API and manage your playlist.

3. **Set Up the Redirect URI in Spotify Dashboard**:
  In your Spotify Developer Dashboard, navigate to your app's settings.
  Add http://localhost:8888/callback as a Redirect URI in the "Redirect URIs" section.

## Usage
1. **Start the server**:

```bash
node spotify.js
```

2. **Open your browser and visit**:

```bash
http://localhost:8888/login
```

3. **Log in to your Spotify account and grant the app permissions. You’ll be redirected back to the app, where it will**:

   - Retrieve your followed artists.

   - Add their recent releases (within the last two weeks) to the playlist.

   - Remove older tracks from the playlist.

   - Display the added tracks and followed artists on a web page.

## Endpoints
 - **/login**: Redirects the user to Spotify’s authorization page.

 - **/callback**: Receives the Spotify authorization code and exchanges it for an access token.

 - **/updatePlaylist**: Displays your followed artists and the songs added to the playlist.

## Functions

- **updatePlaylist()**: Manages the process of retrieving releases, clearing old tracks, and adding new ones.

- **getOrCreatePlaylist()**: Finds or creates a playlist named "Recent Releases".

- **getRecentReleasesFromFollowedArtists()**: Fetches recent album releases (within the last two weeks) from followed artists.

- **clearPlaylist(playlistId)**: Clears all tracks from the specified playlist.

- **addTracksToPlaylist(playlistId, trackUris)**: Adds tracks in batches (max 100 per request) to a playlist.

## Debugging

The application includes console logs for debugging:

   - **Authorization Code**: Logs the authorization code received from Spotify.
   - **Access and Refresh Tokens**: Logs the access and refresh tokens used for API requests.
   **Errors**: Any errors encountered during playlist updating or API calls will be logged to the console.
