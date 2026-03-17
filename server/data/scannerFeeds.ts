export interface ScannerFeed {
  id: string;
  name: string;
  city: string;
  state: string;
  county: string;
  category: 'police' | 'fire' | 'ems' | 'multi';
  url: string;
  tags: string[];
}

export const scannerFeeds: ScannerFeed[] = [
  // New York
  { id: "9082", name: "NYPD Citywide 1", city: "New York", state: "NY", county: "New York", category: "police", url: "https://broadcastify.cdnstream1.com/9082", tags: ["nypd", "police", "manhattan"] },
  { id: "32396", name: "FDNY Citywide", city: "New York", state: "NY", county: "New York", category: "fire", url: "https://broadcastify.cdnstream1.com/32396", tags: ["fdny", "fire", "rescue"] },

  // Los Angeles
  { id: "809", name: "LAPD Dispatch", city: "Los Angeles", state: "CA", county: "Los Angeles", category: "police", url: "https://broadcastify.cdnstream1.com/809", tags: ["lapd", "police"] },
  { id: "14435", name: "LAFD Dispatch", city: "Los Angeles", state: "CA", county: "Los Angeles", category: "fire", url: "https://broadcastify.cdnstream1.com/14435", tags: ["lafd", "fire", "ems"] },

  // Chicago
  { id: "763", name: "Chicago Police Zone 1", city: "Chicago", state: "IL", county: "Cook", category: "police", url: "https://broadcastify.cdnstream1.com/763", tags: ["cpd", "police", "zone 1"] },
  { id: "5765", name: "Chicago Fire Dispatch", city: "Chicago", state: "IL", county: "Cook", category: "fire", url: "https://broadcastify.cdnstream1.com/5765", tags: ["cfd", "fire"] },

  // Houston
  { id: "14439", name: "Houston Police Dispatch", city: "Houston", state: "TX", county: "Harris", category: "police", url: "https://broadcastify.cdnstream1.com/14439", tags: ["hpd", "police"] },
  { id: "14440", name: "Houston Fire Dispatch", city: "Houston", state: "TX", county: "Harris", category: "fire", url: "https://broadcastify.cdnstream1.com/14440", tags: ["hfd", "fire", "ems"] },

  // Phoenix
  { id: "28341", name: "Phoenix Police Dispatch", city: "Phoenix", state: "AZ", county: "Maricopa", category: "police", url: "https://broadcastify.cdnstream1.com/28341", tags: ["police"] },

  // Philadelphia
  { id: "4603", name: "Philadelphia Police", city: "Philadelphia", state: "PA", county: "Philadelphia", category: "police", url: "https://broadcastify.cdnstream1.com/4603", tags: ["police"] },

  // San Antonio
  { id: "23286", name: "San Antonio Police", city: "San Antonio", state: "TX", county: "Bexar", category: "police", url: "https://broadcastify.cdnstream1.com/23286", tags: ["sapd", "police"] },

  // San Diego
  { id: "29096", name: "San Diego Police Dispatch", city: "San Diego", state: "CA", county: "San Diego", category: "police", url: "https://broadcastify.cdnstream1.com/29096", tags: ["sdpd", "police"] },

  // Dallas
  { id: "14038", name: "Dallas Police Dispatch", city: "Dallas", state: "TX", county: "Dallas", category: "police", url: "https://broadcastify.cdnstream1.com/14038", tags: ["dpd", "police"] },
  { id: "36498", name: "Dallas Fire Rescue", city: "Dallas", state: "TX", county: "Dallas", category: "fire", url: "https://broadcastify.cdnstream1.com/36498", tags: ["dfr", "fire", "ems"] },

  // Austin
  { id: "24403", name: "Austin-Travis County EMS", city: "Austin", state: "TX", county: "Travis", category: "ems", url: "https://broadcastify.cdnstream1.com/24403", tags: ["atcems", "ems", "ambulance"] },

  // Denver
  { id: "25490", name: "Denver Police", city: "Denver", state: "CO", county: "Denver", category: "police", url: "https://broadcastify.cdnstream1.com/25490", tags: ["police"] },

  // Atlanta
  { id: "17918", name: "Atlanta Police Zone 5", city: "Atlanta", state: "GA", county: "Fulton", category: "police", url: "https://broadcastify.cdnstream1.com/17918", tags: ["apd", "police"] },
  { id: "32284", name: "DeKalb County Fire", city: "Atlanta", state: "GA", county: "DeKalb", category: "fire", url: "https://broadcastify.cdnstream1.com/32284", tags: ["fire", "ems"] },

  // Miami
  { id: "22380", name: "Miami Police", city: "Miami", state: "FL", county: "Miami-Dade", category: "police", url: "https://broadcastify.cdnstream1.com/22380", tags: ["police"] },

  // Seattle
  { id: "20713", name: "Seattle Police", city: "Seattle", state: "WA", county: "King", category: "police", url: "https://broadcastify.cdnstream1.com/20713", tags: ["spd", "police"] },
  { id: "28657", name: "Seattle Fire", city: "Seattle", state: "WA", county: "King", category: "fire", url: "https://broadcastify.cdnstream1.com/28657", tags: ["sfd", "fire"] },

  // Boston
  { id: "6254", name: "Boston Police", city: "Boston", state: "MA", county: "Suffolk", category: "police", url: "https://broadcastify.cdnstream1.com/6254", tags: ["bpd", "police"] },
  { id: "3654", name: "Boston Fire Dispatch", city: "Boston", state: "MA", county: "Suffolk", category: "fire", url: "https://broadcastify.cdnstream1.com/3654", tags: ["bfd", "fire"] },

  // Las Vegas
  { id: "21847", name: "Las Vegas Metro Police", city: "Las Vegas", state: "NV", county: "Clark", category: "police", url: "https://broadcastify.cdnstream1.com/21847", tags: ["lvmpd", "police"] },

  // Nashville
  { id: "29095", name: "Nashville Fire/EMS", city: "Nashville", state: "TN", county: "Davidson", category: "multi", url: "https://broadcastify.cdnstream1.com/29095", tags: ["fire", "ems", "dispatch"] },

  // San Francisco
  { id: "31498", name: "San Francisco Police", city: "San Francisco", state: "CA", county: "San Francisco", category: "police", url: "https://broadcastify.cdnstream1.com/31498", tags: ["sfpd", "police"] },
  { id: "32914", name: "San Francisco Fire", city: "San Francisco", state: "CA", county: "San Francisco", category: "fire", url: "https://broadcastify.cdnstream1.com/32914", tags: ["sffd", "fire"] },

  // Washington DC
  { id: "31415", name: "DC Police", city: "Washington", state: "DC", county: "District of Columbia", category: "police", url: "https://broadcastify.cdnstream1.com/31415", tags: ["mpdc", "police"] },
  { id: "9350", name: "DC Fire/EMS", city: "Washington", state: "DC", county: "District of Columbia", category: "multi", url: "https://broadcastify.cdnstream1.com/9350", tags: ["fire", "ems"] },
];

export function searchScannerFeeds(query: string, category?: string): ScannerFeed[] {
  const q = query.toLowerCase().trim();
  if (!q && !category) return scannerFeeds;

  return scannerFeeds.filter((feed) => {
    // Category filter
    if (category && feed.category !== category) return false;

    // Text search across multiple fields
    if (!q) return true;

    return (
      feed.name.toLowerCase().includes(q) ||
      feed.city.toLowerCase().includes(q) ||
      feed.state.toLowerCase().includes(q) ||
      feed.county.toLowerCase().includes(q) ||
      feed.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}
