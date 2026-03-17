import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStreamSchema, streamUrlSchema } from "@shared/schema";
import { streamService } from "./services/streamService";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import yts from "yt-search";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API Routes
  
  // Get all streams
  app.get("/api/streams", async (req: Request, res: Response) => {
    try {
      const streams = await storage.getStreams();
      return res.json(streams);
    } catch (error) {
      log(`Error fetching streams: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to fetch streams" });
    }
  });

  // Get a single stream
  app.get("/api/streams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }

      const stream = await storage.getStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      return res.json(stream);
    } catch (error) {
      log(`Error fetching stream: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to fetch stream" });
    }
  });

  // Create a new stream
  app.post("/api/streams", async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const streamData = insertStreamSchema.parse(req.body);
      
      // Extract file name from URL if not provided (mainly for LiveATC streams)
      if (!streamData.fileName && streamData.url) {
        // For LiveATC streams
        if (streamData.type === 'liveatc' || streamData.url.endsWith('.pls')) {
          const urlParts = streamData.url.split("/");
          streamData.fileName = urlParts[urlParts.length - 1];
        } 
        // For YouTube streams, use video or playlist ID as filename
        else if (streamData.type === 'youtube') {
          if (streamData.url.includes('list=')) {
            const match = streamData.url.match(/[?&]list=([^#\&\?]+)/);
            streamData.fileName = match ? `playlist-${match[1]}` : 'youtube-playlist';
          } else {
            const match = streamData.url.match(/(?:v=|\/)([\w-]{11})(?:[^#\&\?]*)/);
            streamData.fileName = match ? `video-${match[1]}` : 'youtube-video';
          }
        }
      }
      
      // Ensure the type is set
      if (!streamData.type) {
        streamData.type = streamData.url.includes('youtube') ? 'youtube' : 'liveatc';
      }
      
      // Create the stream in storage
      const newStream = await storage.createStream(streamData);
      
      return res.status(201).json(newStream);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      log(`Error creating stream: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to create stream" });
    }
  });

  // Update a stream
  app.patch("/api/streams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }

      const stream = await storage.getStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      const updatedStream = await storage.updateStream(id, req.body);
      return res.json(updatedStream);
    } catch (error) {
      log(`Error updating stream: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to update stream" });
    }
  });

  // Delete a stream
  app.delete("/api/streams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }

      const success = await storage.deleteStream(id);
      if (!success) {
        return res.status(404).json({ message: "Stream not found" });
      }

      return res.status(204).send();
    } catch (error) {
      log(`Error deleting stream: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to delete stream" });
    }
  });

  // Proxy a stream
  app.get("/api/proxy/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }

      const stream = await storage.getStream(id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      // Update stream status to connecting
      await storage.updateStream(id, { status: "connecting" });
      
      // Handle different stream types
      if (stream.type === 'youtube') {
        // For YouTube, we don't need to proxy - we'll play directly on the client
        // Just mark as connected and return the URL
        await storage.updateStream(id, { status: "connected" });
        return res.json({ 
          message: "YouTube stream - client side playback",
          url: stream.url,
          type: 'youtube'
        });
      } else {
        // For LiveATC streams, extract the actual stream URL from the PLS file
        const streamUrl = await streamService.getStreamUrlFromPls(stream.url);
        
        if (!streamUrl) {
          await storage.updateStream(id, { status: "error" });
          return res.status(404).json({ message: "No valid stream URL found in PLS file" });
        }
        
        // Update stream status to connected
        await storage.updateStream(id, { status: "connected" });
        
        // Create and use stream proxy
        const proxyHandler = streamService.createStreamProxy(streamUrl);

        // Mark stream as disconnected when client stops listening
        req.on('close', () => {
          storage.updateStream(id, { status: "disconnected" });
        });

        return proxyHandler(req, res);
      }
    } catch (error) {
      log(`Error proxying stream: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to proxy stream" });
    }
  });

  // Search LiveATC feeds by airport ICAO or IATA code
  app.get("/api/liveatc/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim().toUpperCase();
      if (!q || q.length < 3 || q.length > 4) {
        return res.status(400).json({ message: "Provide a 3-4 letter airport code" });
      }

      let feeds = await streamService.searchFeeds(q);

      // If 3-letter code with no results, try prefixing with K (US IATA → ICAO)
      if (feeds.length === 0 && q.length === 3) {
        feeds = await streamService.searchFeeds(`K${q}`);
      }

      return res.json(feeds);
    } catch (error) {
      log(`Error searching feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search feeds" });
    }
  });

  // Search YouTube videos
  app.get("/api/youtube/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) {
        return res.status(400).json({ message: "Provide a search query" });
      }
      const results = await yts(q);
      const videos = results.videos.slice(0, 12).map((v) => ({
        name: v.title,
        url: v.url,
        thumbnail: v.thumbnail,
        duration: v.timestamp,
        author: v.author.name,
      }));
      return res.json(videos);
    } catch (error) {
      log(`Error searching YouTube: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search YouTube" });
    }
  });

  // Validate stream URL
  app.post("/api/validate-url", async (req: Request, res: Response) => {
    try {
      const { url, type } = streamUrlSchema.parse(req.body);
      
      // Handle different URL types
      if (type === 'liveatc') {
        // Check if URL is a valid PLS file
        const streamUrl = await streamService.getStreamUrlFromPls(url);
        
        if (!streamUrl) {
          return res.status(400).json({ 
            valid: false, 
            message: "Could not extract a valid stream URL from PLS file" 
          });
        }
        
        return res.json({ valid: true, url: streamUrl, type: 'liveatc' });
      } 
      else if (type === 'youtube') {
        // For YouTube URLs, we just validate the format and return success
        // Actual video ID extraction will happen on the client side
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          return res.json({ valid: true, url, type: 'youtube' });
        } else {
          return res.status(400).json({ 
            valid: false, 
            message: "Invalid YouTube URL format" 
          });
        }
      }
      
      return res.status(400).json({ 
        valid: false, 
        message: "Unsupported stream type" 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ valid: false, message: "Invalid URL format" });
      }
      
      log(`Error validating URL: ${error}`, "routes");
      return res.status(500).json({ valid: false, message: "Failed to validate URL" });
    }
  });

  return httpServer;
}
