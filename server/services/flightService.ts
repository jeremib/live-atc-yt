import { TTLCache } from '../utils/cache';
import { log } from '../vite';

interface FlightResult {
  count: number;
  updatedAt: string;
}

// Cache flight counts for 1 minute
const flightCache = new TTLCache<FlightResult>(60 * 1000);

/**
 * Fetch the number of aircraft currently in a ~1-degree bounding box
 * around the given coordinates using the OpenSky Network API.
 *
 * Returns null if the API is unavailable or returns an error.
 */
export async function getFlightCount(
  lat: number,
  lon: number
): Promise<FlightResult | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  const cached = flightCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lamin = lat - 1;
  const lamax = lat + 1;
  const lomin = lon - 1;
  const lomax = lon + 1;

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      log(`OpenSky API returned ${response.status}`, 'flightService');
      return null;
    }

    const data = (await response.json()) as { states: unknown[] | null };
    const count = data.states ? data.states.length : 0;
    const result: FlightResult = {
      count,
      updatedAt: new Date().toISOString(),
    };

    flightCache.set(cacheKey, result);
    return result;
  } catch (error) {
    log(`OpenSky API error: ${error}`, 'flightService');
    return null;
  }
}
