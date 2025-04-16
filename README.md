# LiveATC and YouTube Audio Proxy

A Node.js application that proxies LiveATC.net audio streams and YouTube audio to a custom HTML page for simultaneous playback.

## Features

- Listen to multiple LiveATC air traffic control feeds simultaneously
- Play audio from YouTube videos and playlists alongside LiveATC streams
- Control volume and playback for each stream independently
- Simple, clean interface for managing multiple audio streams
- Proxy support for LiveATC streams (which normally block direct browser access)

## Local Development

To run the application locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

This will start the development server at http://localhost:5000.

## Build for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Docker Deployment

This application can be containerized using Docker:

```bash
# Build the Docker image
docker build -t liveatc-youtube-proxy .

# Run the container
docker run -p 5000:5000 liveatc-youtube-proxy
```

## Deploying to Fly.io

This application is configured for easy deployment to Fly.io:

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Login to Fly.io: `fly auth login`
3. Launch the app: `fly launch`
4. Deploy updates: `fly deploy`

## Adding Streams

### LiveATC Streams

For LiveATC streams, always use the direct .pls file URLs from LiveATC. For example:
- https://www.liveatc.net/play/katl_twr.pls (Atlanta Tower)
- https://www.liveatc.net/play/kjfk_twr.pls (JFK Tower)

The browser will not play these directly, but our proxy will handle them correctly.

### YouTube Streams

You can add any YouTube video or playlist URL to play the audio portion. Just paste the standard YouTube URL:
- https://www.youtube.com/watch?v=jfKfPfyJRdk (Lofi Hip Hop Radio)
- https://www.youtube.com/watch?v=mIYzp5rcTvU (Classical Music)