import fetch from 'node-fetch';
import { TTLCache } from '../utils/cache';
import { log } from '../vite';

/**
 * Service to handle fetching and managing audio streams
 */
export class StreamService {
  // Store active stream proxies
  private activeProxies = new Map<number, any>();

  // Cache search results for 10 minutes to avoid repeated probing
  private feedCache = new TTLCache<Array<{ name: string; url: string; label: string }>>(10 * 60 * 1000);

  /**
   * Derive the audio stream URL from a .pls URL without fetching it.
   * LiveATC PLS URLs follow a predictable pattern:
   *   https://www.liveatc.net/play/katl_twr.pls → https://d.liveatc.net/katl_twr
   */
  async getStreamUrlFromPls(plsUrl: string): Promise<string | null> {
    try {
      // Extract the feed name from the PLS URL
      const match = plsUrl.match(/\/play\/(.+)\.pls$/i);
      if (match && match[1]) {
        const feedName = match[1];
        const streamUrl = `https://d.liveatc.net/${feedName}`;
        log(`Derived stream URL: ${streamUrl} from PLS: ${plsUrl}`, 'streamService');
        return streamUrl;
      }

      log(`Could not extract feed name from PLS URL: ${plsUrl}`, 'streamService');
      return null;
    } catch (error) {
      log(`Error deriving stream URL from PLS: ${error}`, 'streamService');
      return null;
    }
  }

  // Common LiveATC feed suffixes and their display names
  private readonly FEED_SUFFIXES: Array<{ suffix: string; label: string }> = [
    { suffix: 'twr', label: 'Tower' },
    { suffix: 'gnd', label: 'Ground' },
    { suffix: 'ground', label: 'Ground' },
    { suffix: 'app', label: 'Approach' },
    { suffix: 'app_n', label: 'Approach North' },
    { suffix: 'app_s', label: 'Approach South' },
    { suffix: 'app_e', label: 'Approach East' },
    { suffix: 'app_w', label: 'Approach West' },
    { suffix: 'dep', label: 'Departure' },
    { suffix: 'atis', label: 'ATIS' },
    { suffix: 'atis_arr', label: 'ATIS Arrivals' },
    { suffix: 'atis_dep', label: 'ATIS Departures' },
    { suffix: 'clnc', label: 'Clearance Delivery' },
    { suffix: 'del', label: 'Clearance Delivery' },
    { suffix: 'ctr', label: 'Center' },
    { suffix: 'efis', label: 'EFIS' },
    { suffix: 'ramp', label: 'Ramp' },
    { suffix: 'unic', label: 'UNICOM' },
  ];

  /**
   * Probe a LiveATC feed by checking if the CDN returns a redirect.
   * Cloudflare blocks HEAD requests, so we use GET with redirect: 'manual'.
   * Valid feeds return 302 to the stream server; invalid ones return 404.
   */
  private async probeFeed(
    url: string,
    icao: string,
    fallbackLabel: string
  ): Promise<{ name: string; url: string; label: string } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      // Derive CDN URL from PLS URL
      const match = url.match(/\/play\/(.+)\.pls$/i);
      if (!match) return null;
      const feedName = match[1];
      const cdnUrl = `https://d.liveatc.net/${feedName}`;

      // GET with redirect: 'manual' — valid feeds return 302, invalid return 404.
      // Using manual redirect avoids downloading actual audio data.
      const resp = await fetch(cdnUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.liveatc.net/',
        },
      });
      log(`Probe ${cdnUrl} → ${resp.status}`, 'streamService');
      if (!(resp.status >= 300 && resp.status < 400)) return null;

      const upperIcao = icao.toUpperCase();
      const name = `${upperIcao} ${fallbackLabel}`;
      return { name, url, label: fallbackLabel };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Search for available LiveATC feeds for a given ICAO airport code.
   * Probes common feed URL patterns and returns the ones that resolve.
   */
  async searchFeeds(icao: string): Promise<Array<{ name: string; url: string; label: string }>> {
    const code = icao.toLowerCase().trim();

    const cached = this.feedCache.get(code);
    if (cached) {
      log(`Cache hit for feed search: ${code}`, 'streamService');
      return cached;
    }

    // Build list of URLs to probe: bare code + all suffixed variants
    const probes: Array<{ url: string; label: string }> = [
      { url: `https://www.liveatc.net/play/${code}.pls`, label: 'Combined' },
      ...this.FEED_SUFFIXES.map(({ suffix, label }) => ({
        url: `https://www.liveatc.net/play/${code}_${suffix}.pls`,
        label,
      })),
    ];

    // Probe sequentially with a delay between requests to avoid CDN 429 rate-limiting.
    // The CDN has strict per-IP rate limits — even batches of 4 trigger it.
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const feeds: Array<{ name: string; url: string; label: string }> = [];
    for (const { url, label } of probes) {
      const result = await this.probeFeed(url, icao, label);
      if (result) feeds.push(result);
      await delay(150);
    }

    this.feedCache.set(code, feeds);
    return feeds;
  }

  /**
   * Get file extension from URL or content type
   */
  getFileExtension(url: string, contentType?: string): string {
    // Try to get extension from content type
    if (contentType) {
      if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) {
        return 'mp3';
      }
      if (contentType.includes('audio/aac')) {
        return 'aac';
      }
      if (contentType.includes('audio/ogg')) {
        return 'ogg';
      }
    }
    
    // Fallback to getting extension from URL
    const urlMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }
    
    // Default to mp3 as it's most common for LiveATC
    return 'mp3';
  }

  /**
   * Handle proxy for a specific stream
   * This creates and returns a function that can be used by Express to proxy the stream
   */
  createStreamProxy(streamUrl: string) {
    return async (req, res) => {
      try {
        // Fetch the stream
        // Audio streams connect directly — CDN servers (d.liveatc.net) typically
        // don't block datacenter IPs, and routing continuous audio through the
        // residential proxy would be expensive per-GB.
        const streamResponse = await fetch(streamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.liveatc.net/',
          },
        });
        
        if (!streamResponse.ok) {
          log(`Stream response not OK: ${streamResponse.status}`, 'streamProxy');
          return res.status(streamResponse.status).send('Failed to connect to stream');
        }
        
        // Get content type and set appropriate headers
        const contentType = streamResponse.headers.get('content-type');
        res.setHeader('Content-Type', contentType || 'audio/mpeg');
        
        // Set other headers to prevent caching issues
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Connection', 'keep-alive');
        
        // Pipe the stream to the response
        streamResponse.body.pipe(res);
        
        // Handle connection close
        req.on('close', () => {
          try {
            // Clean up the connection when client disconnects
            streamResponse.body.destroy();
          } catch (err) {
            log(`Error destroying stream: ${err}`, 'streamProxy');
          }
        });
      } catch (error) {
        log(`Error proxying stream: ${error}`, 'streamProxy');
        res.status(500).send('Stream proxy error');
      }
    };
  }
}

export const streamService = new StreamService();
