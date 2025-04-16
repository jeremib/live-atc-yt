import fetch from 'node-fetch';
import { parsePlsFile } from '../utils/plsParser';
import { log } from '../vite';

/**
 * Service to handle fetching and managing audio streams
 */
export class StreamService {
  // Store active stream proxies
  private activeProxies = new Map<number, any>();

  /**
   * Fetch the audio stream URL from a .pls file
   * @param plsUrl URL to a .pls file
   */
  async getStreamUrlFromPls(plsUrl: string): Promise<string | null> {
    try {
      const response = await fetch(plsUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PLS file: ${response.status} ${response.statusText}`);
      }
      
      const plsContent = await response.text();
      const streamUrls = parsePlsFile(plsContent);
      
      if (!streamUrls || streamUrls.length === 0) {
        throw new Error('No valid stream URLs found in PLS file');
      }
      
      // Return the first stream URL (most PLS files only have one)
      return streamUrls[0];
    } catch (error) {
      log(`Error getting stream URL from PLS: ${error}`, 'streamService');
      return null;
    }
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
        const streamResponse = await fetch(streamUrl);
        
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
