export type DiscoverySite = {
  id: string;
  title: string;
  domain: string;
  url: string;
  blurb: string;
  tag: string;
  // Sites that send X-Frame-Options / CSP frame-ancestors can't be embedded.
  // They are never rejected -- SiteViewer renders the branded preview card
  // instead. Milestone 8 replaces this flag with a real check at submit time.
  embeddable: boolean;
};

/** Temporary local seed. Milestone 8 replaces this with the real pipeline. */
export const SEED_SITES: DiscoverySite[] = [
  {
    id: "s1",
    title: "The Museum of Obsolete Sounds",
    domain: "conserve-the-sound.de",
    url: "https://www.conserve-the-sound.de",
    blurb:
      "An audio archive of machines nobody uses anymore: dial tones, shutters, typewriter carriages.",
    tag: "Archive",
    embeddable: true,
  },
  {
    id: "s2",
    title: "Radio Garden",
    domain: "radio.garden",
    url: "https://radio.garden",
    blurb: "Spin a globe and listen to whatever a local station is broadcasting right now.",
    tag: "Sound",
    embeddable: false,
  },
  {
    id: "s3",
    title: "Windows 93",
    domain: "windows93.net",
    url: "https://windows93.net",
    blurb: "A fictional operating system that never shipped, fully clickable in your browser.",
    tag: "Toy",
    embeddable: false,
  },
  {
    id: "s4",
    title: "Old Maps Online",
    domain: "oldmapsonline.org",
    url: "https://www.oldmapsonline.org",
    blurb: "Centuries of cartography, searchable by the place you are standing in today.",
    tag: "Maps",
    embeddable: true,
  },
  {
    id: "s5",
    title: "The Public Domain Review",
    domain: "publicdomainreview.org",
    url: "https://publicdomainreview.org",
    blurb: "Essays on the strangest artefacts that have quietly fallen out of copyright.",
    tag: "Essays",
    embeddable: true,
  },
  {
    id: "s6",
    title: "Zoom Quilt",
    domain: "zoomquilt.org",
    url: "https://zoomquilt.org",
    blurb: "A painting that falls into itself forever, stitched by dozens of illustrators.",
    tag: "Art",
    embeddable: true,
  },
  {
    id: "s7",
    title: "Bureau of Linguistical Reality",
    domain: "bureauoflinguisticalreality.com",
    url: "https://bureauoflinguisticalreality.com",
    blurb: "New vocabulary invented for feelings the changing planet keeps producing.",
    tag: "Language",
    embeddable: true,
  },
  {
    id: "s8",
    title: "Stars in Their Eyes",
    domain: "stellarium-web.org",
    url: "https://stellarium-web.org",
    blurb: "A planetarium in a tab: set a date, look up, and see exactly what was overhead.",
    tag: "Sky",
    embeddable: true,
  },
  {
    id: "s9",
    title: "Internet Artifacts",
    domain: "neal.fun",
    url: "https://neal.fun/internet-artifacts/",
    blurb: "A guided walk through the objects that built the network, one decade at a time.",
    tag: "History",
    embeddable: true,
  },
  {
    id: "s10",
    title: "Library of Babel",
    domain: "libraryofbabel.info",
    url: "https://libraryofbabel.info",
    blurb: "Every possible page of text, already written, waiting to be located.",
    tag: "Oddity",
    embeddable: true,
  },
  {
    id: "s11",
    title: "Bird Song Explorer",
    domain: "xeno-canto.org",
    url: "https://xeno-canto.org",
    blurb: "Field recordings of birds from everywhere, contributed by people with microphones.",
    tag: "Nature",
    embeddable: true,
  },
  {
    id: "s12",
    title: "Paper Website Typography",
    domain: "practicaltypography.com",
    url: "https://practicaltypography.com",
    blurb: "An opinionated book about setting type, typeset exactly as it argues you should.",
    tag: "Craft",
    embeddable: true,
  },
];
