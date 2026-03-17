export interface NoaaFeed {
  id: string;
  name: string;
  callsign: string;
  city: string;
  state: string;
  frequency: string;
  url: string;
}

export const noaaFeeds: NoaaFeed[] = [
  { id: "31430", name: "NOAA Weather Radio Knoxville", callsign: "WXK46", city: "Knoxville", state: "TN", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/31430" },
  { id: "14747", name: "NOAA Weather Radio New York", callsign: "KEC49", city: "New York", state: "NY", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/14747" },
  { id: "13661", name: "NOAA Weather Radio Los Angeles", callsign: "WXJ58", city: "Los Angeles", state: "CA", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/13661" },
  { id: "9498", name: "NOAA Weather Radio Chicago", callsign: "KHB36", city: "Chicago", state: "IL", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/9498" },
  { id: "22525", name: "NOAA Weather Radio Houston", callsign: "WNG557", city: "Houston", state: "TX", frequency: "162.400 MHz", url: "https://broadcastify.cdnstream1.com/22525" },
  { id: "17810", name: "NOAA Weather Radio Atlanta", callsign: "KEC82", city: "Atlanta", state: "GA", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/17810" },
  { id: "13600", name: "NOAA Weather Radio Dallas", callsign: "WXJ35", city: "Dallas", state: "TX", frequency: "162.400 MHz", url: "https://broadcastify.cdnstream1.com/13600" },
  { id: "25430", name: "NOAA Weather Radio Denver", callsign: "KIG62", city: "Denver", state: "CO", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/25430" },
  { id: "22148", name: "NOAA Weather Radio San Francisco", callsign: "KEC59", city: "San Francisco", state: "CA", frequency: "162.400 MHz", url: "https://broadcastify.cdnstream1.com/22148" },
  { id: "4785", name: "NOAA Weather Radio Des Moines", callsign: "WXL57", city: "Des Moines", state: "IA", frequency: "162.400 MHz", url: "https://broadcastify.cdnstream1.com/4785" },
  { id: "29870", name: "NOAA Weather Radio Miami", callsign: "KEC73", city: "Miami", state: "FL", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/29870" },
  { id: "24115", name: "NOAA Weather Radio Seattle", callsign: "WXK87", city: "Seattle", state: "WA", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/24115" },
  { id: "28000", name: "NOAA Weather Radio Phoenix", callsign: "WXJ27", city: "Phoenix", state: "AZ", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/28000" },
  { id: "6198", name: "NOAA Weather Radio Boston", callsign: "KIG77", city: "Boston", state: "MA", frequency: "162.475 MHz", url: "https://broadcastify.cdnstream1.com/6198" },
  { id: "20720", name: "NOAA Weather Radio Nashville", callsign: "WNG600", city: "Nashville", state: "TN", frequency: "162.400 MHz", url: "https://broadcastify.cdnstream1.com/20720" },
  { id: "32580", name: "NOAA Weather Radio Washington DC", callsign: "KIH25", city: "Washington", state: "DC", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/32580" },
  { id: "4620", name: "NOAA Weather Radio Philadelphia", callsign: "KIG95", city: "Philadelphia", state: "PA", frequency: "162.475 MHz", url: "https://broadcastify.cdnstream1.com/4620" },
  { id: "11272", name: "NOAA Weather Radio Minneapolis", callsign: "WXL43", city: "Minneapolis", state: "MN", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/11272" },
  { id: "11870", name: "NOAA Weather Radio Detroit", callsign: "KEC97", city: "Detroit", state: "MI", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/11870" },
  { id: "31320", name: "NOAA Weather Radio St Louis", callsign: "WXK79", city: "St Louis", state: "MO", frequency: "162.550 MHz", url: "https://broadcastify.cdnstream1.com/31320" },
];

export function searchNoaaFeeds(query: string): NoaaFeed[] {
  const q = query.toLowerCase().trim();
  if (!q) return noaaFeeds;

  return noaaFeeds.filter((feed) =>
    feed.name.toLowerCase().includes(q) ||
    feed.callsign.toLowerCase().includes(q) ||
    feed.city.toLowerCase().includes(q) ||
    feed.state.toLowerCase().includes(q) ||
    feed.frequency.toLowerCase().includes(q)
  );
}
