import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { parsePlsFile, parsePlsTitle } from '../utils/plsParser';
import { TTLCache } from '../utils/cache';
import { log } from '../vite';

// Bright Data residential proxy for LiveATC requests
function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.BRIGHTDATA_PROXY_URL;
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Service to handle fetching and managing audio streams
 */
export class StreamService {
  // Store active stream proxies
  private activeProxies = new Map<number, any>();

  // Cache search results for 10 minutes to avoid repeated probing
  private feedCache = new TTLCache<Array<{ name: string; url: string; label: string }>>(10 * 60 * 1000);

  /**
   * Fetch the audio stream URL from a .pls file
   * @param plsUrl URL to a .pls file
   */
  async getStreamUrlFromPls(plsUrl: string): Promise<string | null> {
    try {
      const agent = getProxyAgent();
      const response = await fetch(plsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        ...(agent && { agent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PLS file: ${response.status} ${response.statusText}`);
      }

      const plsContent = await response.text();
      log(`PLS content from ${plsUrl}: ${plsContent.substring(0, 200)}`, 'streamService');
      const streamUrls = parsePlsFile(plsContent);

      if (!streamUrls || streamUrls.length === 0) {
        throw new Error(`No valid stream URLs found in PLS file. Content: ${plsContent.substring(0, 200)}`);
      }

      // Return the first stream URL (most PLS files only have one)
      return streamUrls[0];
    } catch (error) {
      log(`Error getting stream URL from PLS: ${error}`, 'streamService');
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
   * Probe a single LiveATC .pls URL. Returns feed info if valid, null otherwise.
   */
  private async probeFeed(
    url: string,
    icao: string,
    fallbackLabel: string
  ): Promise<{ name: string; url: string; label: string } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const agent = getProxyAgent();
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        ...(agent && { agent }),
      });
      if (!resp.ok) return null;
      const text = await resp.text();
      const parsed = parsePlsFile(text);
      if (!parsed || parsed.length === 0) return null;
      // Use the Title from the PLS file if available
      const plsTitle = parsePlsTitle(text);
      const label = plsTitle || fallbackLabel;
      // Use PLS title directly if it already contains the ICAO code, otherwise prefix it
      const upperIcao = icao.toUpperCase();
      const name = plsTitle
        ? (plsTitle.toUpperCase().includes(upperIcao) ? plsTitle : `${upperIcao} ${plsTitle}`)
        : `${upperIcao} ${fallbackLabel}`;
      return { name, url, label };
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

    const results = await Promise.allSettled(
      probes.map(({ url, label }) => this.probeFeed(url, icao, label))
    );

    const feeds = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((r): r is NonNullable<typeof r> => r !== null);

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
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
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
