/**
 * Parse a .pls file and extract stream URLs
 * PLS format typically looks like:
 * 
 * [playlist]
 * NumberOfEntries=1
 * File1=http://example.com/stream.mp3
 * Title1=Stream Title
 * Length1=-1
 * 
 * @param plsContent - The content of the .pls file as string
 * @returns Array of stream URLs
 */
export function parsePlsFile(plsContent: string): string[] {
  const lines = plsContent.split('\n');
  const fileRegex = /^File\d+=(.+)$/i;
  const streamUrls: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(fileRegex);
    
    if (match && match[1]) {
      const url = match[1].trim();
      if (url && isValidUrl(url)) {
        streamUrls.push(url);
      }
    }
  }
  
  return streamUrls;
}

/**
 * Parse a .pls file and extract the first Title entry
 */
export function parsePlsTitle(plsContent: string): string | null {
  const match = plsContent.match(/^Title\d+=(.+)$/im);
  return match ? match[1].trim() : null;
}

/**
 * Basic URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
