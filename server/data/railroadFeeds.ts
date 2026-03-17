export interface RailroadFeed {
  id: string;
  name: string;
  railroad: string;
  location: string;
  state: string;
  url: string;
}

export const railroadFeeds: RailroadFeed[] = [
  { id: "45939", name: "Norfolk Southern Road Channel Knoxville", railroad: "Norfolk Southern", location: "Knoxville", state: "TN", url: "https://broadcastify.cdnstream1.com/45939" },
  { id: "14031", name: "BNSF Needles Sub", railroad: "BNSF", location: "Needles", state: "CA", url: "https://broadcastify.cdnstream1.com/14031" },
  { id: "29976", name: "Union Pacific Donner Pass", railroad: "Union Pacific", location: "Donner Pass", state: "CA", url: "https://broadcastify.cdnstream1.com/29976" },
  { id: "1425", name: "CSX Cumberland", railroad: "CSX", location: "Cumberland", state: "MD", url: "https://broadcastify.cdnstream1.com/1425" },
  { id: "15511", name: "BNSF Transcon Gallup", railroad: "BNSF", location: "Gallup", state: "NM", url: "https://broadcastify.cdnstream1.com/15511" },
  { id: "4560", name: "Norfolk Southern Horseshoe Curve", railroad: "Norfolk Southern", location: "Horseshoe Curve", state: "PA", url: "https://broadcastify.cdnstream1.com/4560" },
  { id: "19885", name: "Union Pacific Cheyenne", railroad: "Union Pacific", location: "Cheyenne", state: "WY", url: "https://broadcastify.cdnstream1.com/19885" },
  { id: "28650", name: "BNSF Puget Sound", railroad: "BNSF", location: "Puget Sound", state: "WA", url: "https://broadcastify.cdnstream1.com/28650" },
  { id: "9200", name: "CSX Selkirk", railroad: "CSX", location: "Selkirk", state: "NY", url: "https://broadcastify.cdnstream1.com/9200" },
  { id: "1700", name: "Union Pacific North Platte", railroad: "Union Pacific", location: "North Platte", state: "NE", url: "https://broadcastify.cdnstream1.com/1700" },
  { id: "1685", name: "BNSF Alliance", railroad: "BNSF", location: "Alliance", state: "NE", url: "https://broadcastify.cdnstream1.com/1685" },
  { id: "4558", name: "Norfolk Southern Conway", railroad: "Norfolk Southern", location: "Conway", state: "PA", url: "https://broadcastify.cdnstream1.com/4558" },
  { id: "23400", name: "CSX Jacksonville", railroad: "CSX", location: "Jacksonville", state: "FL", url: "https://broadcastify.cdnstream1.com/23400" },
  { id: "14120", name: "Union Pacific Roseville", railroad: "Union Pacific", location: "Roseville", state: "CA", url: "https://broadcastify.cdnstream1.com/14120" },
  { id: "5890", name: "BNSF Marceline", railroad: "BNSF", location: "Marceline", state: "MO", url: "https://broadcastify.cdnstream1.com/5890" },
  { id: "4625", name: "Amtrak NEC Philadelphia", railroad: "Amtrak", location: "Philadelphia", state: "PA", url: "https://broadcastify.cdnstream1.com/4625" },
  { id: "25445", name: "BNSF La Junta", railroad: "BNSF", location: "La Junta", state: "CO", url: "https://broadcastify.cdnstream1.com/25445" },
  { id: "17920", name: "Norfolk Southern Atlanta", railroad: "Norfolk Southern", location: "Atlanta", state: "GA", url: "https://broadcastify.cdnstream1.com/17920" },
  { id: "763", name: "CSX Chicago", railroad: "CSX", location: "Chicago", state: "IL", url: "https://broadcastify.cdnstream1.com/763" },
  { id: "28010", name: "Union Pacific Tucson", railroad: "Union Pacific", location: "Tucson", state: "AZ", url: "https://broadcastify.cdnstream1.com/28010" },
];

export function searchRailroadFeeds(query: string): RailroadFeed[] {
  const q = query.toLowerCase().trim();
  if (!q) return railroadFeeds;

  return railroadFeeds.filter((feed) =>
    feed.name.toLowerCase().includes(q) ||
    feed.railroad.toLowerCase().includes(q) ||
    feed.location.toLowerCase().includes(q) ||
    feed.state.toLowerCase().includes(q)
  );
}
