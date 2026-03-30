import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStreamSchema, streamUrlSchema } from "@shared/schema";
import { streamService } from "./services/streamService";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import yts from "yt-search";
import { getAirportByIcao, getAirportByIata, getAirportCoords } from "./data/airports";
import { searchScannerFeeds } from "./data/scannerFeeds";
import { searchNoaaFeeds } from "./data/noaaFeeds";
import { searchRailroadFeeds } from "./data/railroadFeeds";
import { getAllSomaFmFeeds, searchSomaFmFeeds } from "./data/somafmFeeds";
import { getFlightCount } from "./services/flightService";
import { TTLCache } from "./utils/cache";

// Weather data types and cache
interface WeatherData {
  icao: string;
  temp: number;
  windSpeed: number;
  visibility: number;
  condition: string;
  conditionLabel: string;
  rawMetar: string;
  reportTime: string;
}

const weatherCache = new TTLCache<WeatherData>(10 * 60 * 1000); // 10 minutes

function parseWeatherCondition(wxString: string | null, clouds: Array<{ cover: string; base?: number }> | null): { condition: string; conditionLabel: string } {
  // Check wxString first for weather phenomena
  if (wxString) {
    const wx = wxString.toUpperCase();
    if (wx.includes('TS')) return { condition: 'thunderstorm', conditionLabel: 'Thunderstorm' };
    if (wx.includes('SN')) return { condition: 'snow', conditionLabel: 'Snow' };
    if (wx.includes('RA') || wx.includes('DZ')) return { condition: 'rain', conditionLabel: 'Rain' };
    if (wx.includes('FG')) return { condition: 'fog', conditionLabel: 'Fog' };
    if (wx.includes('BR') || wx.includes('HZ')) return { condition: 'mist', conditionLabel: 'Mist/Haze' };
  }

  // Fall back to cloud cover
  if (clouds && clouds.length > 0) {
    // Use the most significant (highest coverage) cloud layer
    const coverOrder = ['OVC', 'BKN', 'SCT', 'FEW', 'CLR', 'SKC'];
    let mostSignificant = 'CLR';
    for (const layer of clouds) {
      if (coverOrder.indexOf(layer.cover) < coverOrder.indexOf(mostSignificant)) {
        mostSignificant = layer.cover;
      }
    }
    switch (mostSignificant) {
      case 'OVC': return { condition: 'overcast', conditionLabel: 'Overcast' };
      case 'BKN': return { condition: 'broken', conditionLabel: 'Mostly Cloudy' };
      case 'SCT': return { condition: 'scattered', conditionLabel: 'Partly Cloudy' };
      case 'FEW': return { condition: 'few_clouds', conditionLabel: 'Few Clouds' };
      case 'CLR':
      case 'SKC':
      default: return { condition: 'clear', conditionLabel: 'Clear Skies' };
    }
  }

  return { condition: 'clear', conditionLabel: 'Clear Skies' };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API Routes

  // App version — generated once at server startup
  const serverVersion = Date.now().toString(36);
  app.get("/api/version", (_req: Request, res: Response) => {
    res.json({ version: serverVersion });
  });

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
        // For scanner/noaa/railroad streams, use feed ID as filename
        else if (streamData.type === 'scanner' || streamData.type === 'noaa' || streamData.type === 'railroad') {
          const parts = streamData.url.split('/');
          streamData.fileName = `${streamData.type}-${parts[parts.length - 1]}`;
        }
        // For SomaFM streams, use channel name as filename
        else if (streamData.type === 'somafm') {
          const match = streamData.url.match(/\/([^/]+-128-mp3)$/);
          streamData.fileName = match ? `somafm-${match[1]}` : 'somafm-stream';
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
        streamData.type = streamData.url.includes('youtube') ? 'youtube'
          : streamData.url.includes('somafm.com') ? 'somafm'
          : streamData.url.includes('broadcastify') ? 'scanner'
          : 'liveatc';
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
      } else if (stream.type === 'scanner' || stream.type === 'noaa' || stream.type === 'railroad' || stream.type === 'somafm') {
        // Scanner, NOAA, Railroad, and SomaFM streams are direct MP3 streams — proxy directly without PLS parsing
        await storage.updateStream(id, { status: "connected" });

        const proxyHandler = streamService.createStreamProxy(stream.url);

        req.on('close', () => {
          storage.updateStream(id, { status: "disconnected" });
        });

        return proxyHandler(req, res);
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

  // Get airport metadata by ICAO code
  app.get("/api/airports/:icao", async (req: Request, res: Response) => {
    const icao = req.params.icao.toUpperCase();
    const info = getAirportByIcao(icao);
    if (!info) {
      return res.status(404).json({ message: "Airport not found" });
    }
    return res.json(info);
  });

  // Search LiveATC feeds by airport ICAO or IATA code
  app.get("/api/liveatc/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim().toUpperCase();
      if (!q || q.length < 3 || q.length > 4) {
        return res.status(400).json({ message: "Provide a 3-4 letter airport code" });
      }

      let feeds = await streamService.searchFeeds(q);
      let icao = q;

      // If 3-letter code with no results, try prefixing with K (US IATA → ICAO)
      if (feeds.length === 0 && q.length === 3) {
        feeds = await streamService.searchFeeds(`K${q}`);
        if (feeds.length > 0) icao = `K${q}`;
      }

      // Look up airport metadata for the resolved ICAO code
      let airport = getAirportByIcao(icao);
      // If still not found and original was 3 letters, try IATA lookup
      if (!airport && q.length === 3) {
        airport = getAirportByIata(q);
      }

      return res.json({
        feeds,
        airport: airport || null,
      });
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

  // Search scanner feeds
  // Cache for Broadcastify live search results
  const scannerSearchCache = new TTLCache<any[]>(10 * 60 * 1000);

  app.get("/api/scanner/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      const category = req.query.category as string | undefined;

      if (!q) {
        return res.json([]);
      }

      // Check cache first
      const cacheKey = `${q.toLowerCase()}|${category || ''}`;
      const cached = scannerSearchCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Try live Broadcastify search first
      let liveResults: any[] = [];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        // Step 1: Search city to get county links
        const searchResp = await fetch(
          `https://www.broadcastify.com/listen/?action=searchCity&city=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (searchResp.ok) {
          const html = await searchResp.text();
          // Extract county links: /listen/ctid/{id} with names
          const countyMatches = [...html.matchAll(/<td>\s*<a href="\/listen\/ctid\/(\d+)">([^<]+)<\/a>/g)];
          // Also extract city and state from preceding <td> elements
          const rowMatches = [...html.matchAll(/<tr><td>\s*([^<]+)<\/td><td>\s*([^<]+)<\/td><td>\s*<a href="\/listen\/ctid\/(\d+)">([^<]+)<\/a>/g)];

          // Collect counties, deduplicate by ID, count how many rows reference each
          const countyCount = new Map<string, number>();
          const countyInfo = new Map<string, { id: string; county: string; city: string; state: string }>();
          for (const m of rowMatches) {
            const city = m[1].trim();
            const state = m[2].trim();
            const ctid = m[3];
            const county = m[4].trim();
            countyCount.set(ctid, (countyCount.get(ctid) || 0) + 1);
            if (!countyInfo.has(ctid)) {
              countyInfo.set(ctid, { id: ctid, county, city, state });
            }
          }
          // Sort by reference count (most-referenced = most relevant), take top 3
          const sortedCounties = [...countyInfo.values()]
            .sort((a, b) => (countyCount.get(b.id) || 0) - (countyCount.get(a.id) || 0));
          const uniqueCounties = new Map<string, { id: string; county: string; city: string; state: string }>();
          for (const c of sortedCounties) {
            uniqueCounties.set(c.id, c);
            if (uniqueCounties.size >= 3) break;
          }

          // Step 2: Fetch feeds from each county page
          const countyFetches = [...uniqueCounties.values()].map(async (ct) => {
            try {
              const ctrl = new AbortController();
              const to = setTimeout(() => ctrl.abort(), 5000);
              const resp = await fetch(`https://www.broadcastify.com/listen/ctid/${ct.id}`, { signal: ctrl.signal });
              clearTimeout(to);
              if (!resp.ok) return [];

              const pageHtml = await resp.text();
              // Extract feed links: /listen/feed/{id} with names
              const feedMatches = [...pageHtml.matchAll(/<a href="\/listen\/feed\/(\d+)"><span[^>]*>([^<]+)<\/span><\/a>/g)];
              return feedMatches.map(fm => {
                const feedId = fm[1];
                const feedName = fm[2].trim();
                // Guess category from name
                const nameLower = feedName.toLowerCase();
                let cat = 'multi';
                if (nameLower.includes('police') || nameLower.includes('sheriff') || nameLower.includes('pd ')) cat = 'police';
                else if (nameLower.includes('fire')) cat = 'fire';
                else if (nameLower.includes('ems') || nameLower.includes('ambulance') || nameLower.includes('medic')) cat = 'ems';
                else if (nameLower.includes('dispatch') || nameLower.includes('public safety')) cat = 'multi';

                return {
                  id: feedId,
                  name: feedName,
                  city: ct.city,
                  state: ct.state,
                  county: ct.county,
                  category: cat,
                  url: `https://broadcastify.cdnstream1.com/${feedId}`,
                  tags: [cat, ct.county.toLowerCase()],
                };
              });
            } catch {
              return [];
            }
          });

          const countyResults = await Promise.all(countyFetches);
          liveResults = countyResults.flat();
        }
      } catch (err) {
        log(`Broadcastify live search failed, falling back to curated: ${err}`, "routes");
      }

      // Merge with curated results
      const curatedResults = searchScannerFeeds(q, category);

      // Deduplicate by feed ID, preferring live results
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const r of liveResults) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          merged.push(r);
        }
      }
      for (const r of curatedResults) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          merged.push(r);
        }
      }

      // Filter by category if specified
      const filtered = category
        ? merged.filter(r => r.category === category)
        : merged;

      scannerSearchCache.set(cacheKey, filtered);
      return res.json(filtered);
    } catch (error) {
      log(`Error searching scanner feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search scanner feeds" });
    }
  });

  // Search NOAA Weather Radio feeds
  app.get("/api/noaa/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      const results = searchNoaaFeeds(q);
      return res.json(results);
    } catch (error) {
      log(`Error searching NOAA feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search NOAA feeds" });
    }
  });

  // Search railroad feeds
  app.get("/api/railroad/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      const results = searchRailroadFeeds(q);
      return res.json(results);
    } catch (error) {
      log(`Error searching railroad feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search railroad feeds" });
    }
  });

  // Get all SomaFM stations
  app.get("/api/somafm", async (_req: Request, res: Response) => {
    try {
      const feeds = getAllSomaFmFeeds();
      return res.json(feeds);
    } catch (error) {
      log(`Error fetching SomaFM feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to fetch SomaFM feeds" });
    }
  });

  // Search SomaFM stations
  app.get("/api/somafm/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      const results = searchSomaFmFeeds(q);
      return res.json(results);
    } catch (error) {
      log(`Error searching SomaFM feeds: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to search SomaFM feeds" });
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
      
      else if (type === 'scanner' || type === 'noaa' || type === 'railroad') {
        // Scanner, NOAA, and Railroad URLs are direct MP3 streams from Broadcastify
        if (url.includes('broadcastify')) {
          return res.json({ valid: true, url, type });
        } else {
          return res.status(400).json({
            valid: false,
            message: "Invalid Broadcastify URL format"
          });
        }
      }

      else if (type === 'somafm') {
        // SomaFM URLs are direct MP3 streams
        if (url.includes('somafm.com')) {
          return res.json({ valid: true, url, type: 'somafm' });
        } else {
          return res.status(400).json({
            valid: false,
            message: "Invalid SomaFM URL format"
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

  // Get live flight count near an airport
  app.get("/api/flights/:icao", async (req: Request, res: Response) => {
    try {
      const icao = req.params.icao.toUpperCase();
      const coords = getAirportCoords(icao);
      if (!coords) {
        return res.status(404).json({ message: "Airport not found or coordinates unavailable" });
      }

      const result = await getFlightCount(coords.lat, coords.lon);
      if (!result) {
        return res.status(503).json({ message: "Flight data temporarily unavailable" });
      }

      return res.json({ icao, count: result.count, updatedAt: result.updatedAt });
    } catch (error) {
      log(`Error fetching flight count: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to fetch flight count" });
    }
  });

  // Get weather (METAR) data for an airport
  app.get("/api/weather/:icao", async (req: Request, res: Response) => {
    try {
      const icao = req.params.icao.toUpperCase();
      if (!/^[A-Z]{4}$/.test(icao)) {
        return res.status(400).json({ message: "Invalid ICAO code" });
      }

      // Check cache first
      const cached = weatherCache.get(icao);
      if (cached) {
        return res.json(cached);
      }

      const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`);
      if (!response.ok) {
        return res.status(502).json({ message: "Failed to fetch METAR data" });
      }

      const data = await response.json() as Array<{
        temp?: number;
        wdir?: number;
        wspd?: number;
        visib?: number;
        clouds?: Array<{ cover: string; base?: number }>;
        wxString?: string;
        rawOb?: string;
        reportTime?: string;
      }>;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ message: "No METAR data available for this airport" });
      }

      const metar = data[0];
      const { condition, conditionLabel } = parseWeatherCondition(
        metar.wxString || null,
        metar.clouds || null
      );

      const weatherData: WeatherData = {
        icao,
        temp: metar.temp ?? 0,
        windSpeed: metar.wspd ?? 0,
        visibility: metar.visib ?? 10,
        condition,
        conditionLabel,
        rawMetar: metar.rawOb || '',
        reportTime: metar.reportTime || new Date().toISOString(),
      };

      weatherCache.set(icao, weatherData);
      return res.json(weatherData);
    } catch (error) {
      log(`Error fetching weather: ${error}`, "routes");
      return res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  return httpServer;
}
