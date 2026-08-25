export type Accessory =
  | "none"
  | "cap"
  | "ribbon"
  | "headband"
  | "crown"
  | "antenna"
  | "horns"
  | "halo"
  | "sprout"
  | "ears"
  | "headphones"
  | "flower"
  | "goggles";

export type TrailKind = "puff" | "spark" | "flame" | "star";

/** What a turn looks like for this character. */
export type TurnFx =
  | "ring"      // expanding shockwave square
  | "poof"      // soft smoke puffs
  | "sparkle"   // twinkling stars
  | "flame"     // fire burst
  | "zap"       // electric crackle
  | "confetti"  // multicolour squares
  | "bubble"    // rising bubbles
  | "stardust"; // big cosmic stars

/** What a turn sounds like for this character. */
export type TurnSnd =
  | "pop" | "woosh" | "chirp" | "zap" | "bling" | "whistle" | "buzz" | "chime";

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  blurb: string;
  body: string;
  belly: string;
  outline: string;
  accent: string;
  trail: string;
  trailKind: TrailKind;
  accessory: Accessory;
  freckles?: boolean;
  turnFx: TurnFx;
  turnSnd: TurnSnd;
  turnColor: string;
  /** Milestone reward: unlocked forever the first time you climb this many stairs in one run. */
  unlockAt?: number;
}

export const SKINS: SkinDef[] = [
  {
    id: "bloo",
    name: "Bloo",
    price: 0,
    blurb: "The default little climber. Small blob, big dreams.",
    body: "#45d6e6",
    belly: "#c9f7ff",
    outline: "#0e7f9e",
    accent: "#0e7f9e",
    trail: "#9ef2ff",
    trailKind: "puff",
    accessory: "none",
    turnFx: "ring",
    turnSnd: "pop",
    turnColor: "#9ef2ff",
  },
  {
    id: "scout",
    name: "Scout",
    price: 50,
    blurb: "Trail-blazing orange rookie with a lucky cap.",
    body: "#ff8c42",
    belly: "#ffe3c2",
    outline: "#b04c12",
    accent: "#e3502f",
    trail: "#ffd9a0",
    trailKind: "puff",
    accessory: "cap",
    turnFx: "confetti",
    turnSnd: "whistle",
    turnColor: "#ff8c42",
  },
  {
    id: "momo",
    name: "Momo",
    price: 120,
    blurb: "Bubblegum speedster. The bow is aerodynamic. Probably.",
    body: "#ff7bac",
    belly: "#ffd3e4",
    outline: "#b03a68",
    accent: "#e8467f",
    trail: "#ffb1cf",
    trailKind: "spark",
    accessory: "ribbon",
    turnFx: "sparkle",
    turnSnd: "chirp",
    turnColor: "#ffb1cf",
  },
  {
    id: "kage",
    name: "Kage",
    price: 250,
    blurb: "Silent feet, crimson headband, zero wasted hops.",
    body: "#4a5878",
    belly: "#aab6d6",
    outline: "#232c44",
    accent: "#ff4757",
    trail: "#8fa0ff",
    trailKind: "spark",
    accessory: "headband",
    turnFx: "zap",
    turnSnd: "zap",
    turnColor: "#8fa0ff",
  },
  {
    id: "rey",
    name: "Rey",
    price: 450,
    blurb: "Claims every staircase is a throne room staircase.",
    body: "#8f6fe8",
    belly: "#e0d4ff",
    outline: "#4b3290",
    accent: "#ffd23f",
    trail: "#d3b8ff",
    trailKind: "spark",
    accessory: "crown",
    turnFx: "sparkle",
    turnSnd: "bling",
    turnColor: "#ffd23f",
  },
  {
    id: "unit7",
    name: "Unit-7",
    price: 700,
    blurb: "Calibrated for verticality. Antenna pings the summit.",
    body: "#8fa8bd",
    belly: "#dceaf5",
    outline: "#3d5163",
    accent: "#ffd23f",
    trail: "#aefcff",
    trailKind: "spark",
    accessory: "antenna",
    turnFx: "zap",
    turnSnd: "buzz",
    turnColor: "#aefcff",
  },
  {
    id: "ember",
    name: "Ember",
    price: 1000,
    blurb: "Leaves a scorch mark on every riser. Very sorry about it.",
    body: "#ff5c3d",
    belly: "#ffc9a3",
    outline: "#8a2413",
    accent: "#5c130a",
    trail: "#ffb347",
    trailKind: "flame",
    accessory: "horns",
    turnFx: "flame",
    turnSnd: "woosh",
    turnColor: "#ffb347",
  },
  {
    id: "nova",
    name: "Nova",
    price: 1500,
    blurb: "Fallen from the top of the sky. Climbing back up.",
    body: "#3a2a6e",
    belly: "#7a5fc0",
    outline: "#191138",
    accent: "#ffe9a3",
    trail: "#fff3b0",
    trailKind: "star",
    accessory: "halo",
    freckles: true,
    turnFx: "stardust",
    turnSnd: "chime",
    turnColor: "#fff3b0",
  },
  {
    id: "pip",
    name: "Pip",
    price: 300,
    blurb: "A cheerful sprout who grows a little with every floor.",
    body: "#6fce5a",
    belly: "#d6f7c3",
    outline: "#2e7a2a",
    accent: "#3a8a30",
    trail: "#c9f7a0",
    trailKind: "puff",
    accessory: "sprout",
    turnFx: "bubble",
    turnSnd: "chirp",
    turnColor: "#aef29e",
  },
  {
    id: "sunny",
    name: "Sunny",
    price: 650,
    blurb: "Woke up before the sun. Has never been late since.",
    body: "#ffd23f",
    belly: "#fff0bd",
    outline: "#b07a12",
    accent: "#ff8c42",
    trail: "#ffe9a3",
    trailKind: "spark",
    accessory: "ears",
    turnFx: "sparkle",
    turnSnd: "pop",
    turnColor: "#ffe9a3",
  },
  {
    id: "dash",
    name: "Dash",
    price: 1000,
    blurb: "Climbs at 180 BPM. The headphones are not optional.",
    body: "#ff6a5e",
    belly: "#ffd0c9",
    outline: "#a02c24",
    accent: "#2f3340",
    trail: "#ffb3a8",
    trailKind: "spark",
    accessory: "headphones",
    turnFx: "zap",
    turnSnd: "buzz",
    turnColor: "#ff9d94",
  },
  {
    id: "luna",
    name: "Luna",
    price: 1300,
    blurb: "Keeps a pressed flower from every sunrise she outruns.",
    body: "#b79df0",
    belly: "#e6dcff",
    outline: "#5e4496",
    accent: "#ff7bac",
    trail: "#d9c9ff",
    trailKind: "star",
    accessory: "flower",
    freckles: true,
    turnFx: "stardust",
    turnSnd: "chime",
    turnColor: "#e6dcff",
  },

  /* ------------------ milestone climbers (earned by climbing) ------------------ */
  {
    id: "zip",
    name: "Zip",
    price: 0,
    blurb: "The 100-stair rookie. Goggles on, never late.",
    body: "#b6f04a",
    belly: "#eaffc0",
    outline: "#5f8f1e",
    accent: "#3c5a14",
    trail: "#eaffb0",
    trailKind: "spark",
    accessory: "goggles",
    turnFx: "zap",
    turnSnd: "buzz",
    turnColor: "#d8ff7a",
    unlockAt: 100,
  },
  {
    id: "bubba",
    name: "Bubba",
    price: 0,
    blurb: "Soft paws, steady pace. Reached stair 200.",
    body: "#c08a56",
    belly: "#f2dcb8",
    outline: "#6e4a24",
    accent: "#8f6234",
    trail: "#f2dcb8",
    trailKind: "puff",
    accessory: "ears",
    turnFx: "ring",
    turnSnd: "pop",
    turnColor: "#f2dcb8",
    unlockAt: 200,
  },
  {
    id: "sarge",
    name: "Sarge",
    price: 0,
    blurb: "Drills stairs before breakfast. Stair 300 checked in.",
    body: "#8a9c52",
    belly: "#d8e8a0",
    outline: "#43522a",
    accent: "#3c4a26",
    trail: "#d8e8a0",
    trailKind: "spark",
    accessory: "cap",
    turnFx: "confetti",
    turnSnd: "whistle",
    turnColor: "#c8e06a",
    unlockAt: 300,
  },
  {
    id: "wisp",
    name: "Wisp",
    price: 0,
    blurb: "Barely touches the steps. Met at stair 400.",
    body: "#cfe4ff",
    belly: "#ffffff",
    outline: "#7a9cc8",
    accent: "#8fb8e8",
    trail: "#e8f4ff",
    trailKind: "star",
    accessory: "halo",
    freckles: true,
    turnFx: "sparkle",
    turnSnd: "chime",
    turnColor: "#ffffff",
    unlockAt: 400,
  },
  {
    id: "rex",
    name: "Rex",
    price: 0,
    blurb: "Tiny arms, enormous ambition. Tamed at stair 500.",
    body: "#58c24a",
    belly: "#c9f0a8",
    outline: "#22702a",
    accent: "#2e7d32",
    trail: "#ff8c42",
    trailKind: "flame",
    accessory: "horns",
    turnFx: "flame",
    turnSnd: "woosh",
    turnColor: "#ffb347",
    unlockAt: 500,
  },
];

export const skinById = (id: string): SkinDef =>
  SKINS.find((s) => s.id === id) ?? SKINS[0];
