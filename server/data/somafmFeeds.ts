export interface SomaFmFeed {
  id: string;
  name: string;
  description: string;
  genre: string;
  url: string;
  listeners?: number;
}

export const somafmFeeds: SomaFmFeed[] = [
  { id: "dronezone", name: "Drone Zone", description: "Served best chilled, safe with most medications. Alarm-free guaranteed.", genre: "Ambient", url: "https://ice2.somafm.com/dronezone-128-mp3" },
  { id: "groovesalad", name: "Groove Salad", description: "A nicely chilled plate of ambient/downtempo beats and grooves.", genre: "Ambient/Chill", url: "https://ice2.somafm.com/groovesalad-128-mp3" },
  { id: "spacestation", name: "Space Station Soma", description: "Tune in, turn on, space out. Spaced-out ambient and mid-tempo electronica.", genre: "Ambient", url: "https://ice2.somafm.com/spacestation-128-mp3" },
  { id: "defcon", name: "DEF CON Radio", description: "Music for Hackers. Live from the DEF CON Hacker Conference.", genre: "Electronic", url: "https://ice2.somafm.com/defcon-128-mp3" },
  { id: "secretagent", name: "Secret Agent", description: "The soundtrack for your stylish, mysterious, dangerous life.", genre: "Lounge/Spy", url: "https://ice2.somafm.com/secretagent-128-mp3" },
  { id: "lush", name: "Lush", description: "Sensuous and mellow vocals, mostly female, with an electronic influence.", genre: "Electronic/Vocal", url: "https://ice2.somafm.com/lush-128-mp3" },
  { id: "deepspaceone", name: "Deep Space One", description: "Deep ambient electronic, experimental and space music.", genre: "Ambient/Space", url: "https://ice2.somafm.com/deepspaceone-128-mp3" },
  { id: "cliqhop", name: "cliqhop idm", description: "Blips, clicks and beats. Intelligent dance music.", genre: "IDM", url: "https://ice2.somafm.com/cliqhop-128-mp3" },
  { id: "missioncontrol", name: "Mission Control", description: "Celebrating NASA and the space explorers who boldly go.", genre: "Ambient/Space", url: "https://ice2.somafm.com/missioncontrol-128-mp3" },
  { id: "illstreet", name: "Illinois Street Lounge", description: "Classic bachelor pad, exotica and vintage lounge music.", genre: "Lounge", url: "https://ice2.somafm.com/illstreet-128-mp3" },
  { id: "bootliquor", name: "Boot Liquor", description: "Americana roots music for tabletop Jukeboxes.", genre: "Americana/Country", url: "https://ice2.somafm.com/bootliquor-128-mp3" },
  { id: "7soul", name: "Seven Inch Soul", description: "Vintage soul tracks from the original 45 RPM vinyl.", genre: "Soul", url: "https://ice2.somafm.com/7soul-128-mp3" },
  { id: "seventies", name: "Left Coast 70s", description: "Mellow classic rock from the steep steep hills of San Francisco.", genre: "Classic Rock", url: "https://ice2.somafm.com/seventies-128-mp3" },
  { id: "u80s", name: "Underground 80s", description: "Early 80s UK Synthpop and a bit of New Wave.", genre: "Synthpop/New Wave", url: "https://ice2.somafm.com/u80s-128-mp3" },
  { id: "thistle", name: "Thistle Radio", description: "Exploring music from Celtic roots and branches.", genre: "Celtic", url: "https://ice2.somafm.com/thistle-128-mp3" },
  { id: "folkfwd", name: "Folk Forward", description: "Indie folk,(alt) country and singer-songwriter music.", genre: "Folk/Indie", url: "https://ice2.somafm.com/folkfwd-128-mp3" },
  { id: "fluid", name: "Fluid", description: "Delectably deep and smooth: liquid dubstep, future garage and bass.", genre: "Dubstep/Bass", url: "https://ice2.somafm.com/fluid-128-mp3" },
  { id: "vaporwaves", name: "Vaporwaves", description: "All Vaporwave. All the time.", genre: "Vaporwave", url: "https://ice2.somafm.com/vaporwaves-128-mp3" },
  { id: "n5md", name: "n5MD Radio", description: "Ambient, experimental and electronic: music from the n5MD label.", genre: "Ambient/Experimental", url: "https://ice2.somafm.com/n5md-128-mp3" },
  { id: "bagel", name: "BAGeL Radio", description: "What alternative rock radio should sound like.", genre: "Alternative Rock", url: "https://ice2.somafm.com/bagel-128-mp3" },
  { id: "suburbsofgoa", name: "Suburbs of Goa", description: "Desi-influenced Asian world beats and beyond.", genre: "World/Asian", url: "https://ice2.somafm.com/suburbsofgoa-128-mp3" },
  { id: "live", name: "SomaFM Live", description: "Live performances and special events.", genre: "Live", url: "https://ice2.somafm.com/live-128-mp3" },
  { id: "metal", name: "Metal Detector", description: "From black to doom, stoner to sludge, thrash to post, historical to current.", genre: "Metal", url: "https://ice2.somafm.com/metal-128-mp3" },
  { id: "covers", name: "Covers", description: "Just the covers. Songs you know by artists you don't.", genre: "Covers", url: "https://ice2.somafm.com/covers-128-mp3" },
  { id: "synphaera", name: "Synphaera Radio", description: "Synth-based electronic music: ambient to techno.", genre: "Electronic/Synth", url: "https://ice2.somafm.com/synphaera-128-mp3" },
];

export function getAllSomaFmFeeds(): SomaFmFeed[] {
  return somafmFeeds;
}

export function searchSomaFmFeeds(query: string): SomaFmFeed[] {
  const q = query.toLowerCase().trim();
  if (!q) return somafmFeeds;

  return somafmFeeds.filter((feed) =>
    feed.name.toLowerCase().includes(q) ||
    feed.description.toLowerCase().includes(q) ||
    feed.genre.toLowerCase().includes(q)
  );
}
