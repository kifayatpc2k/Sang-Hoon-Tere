// Pure chapter state machine. World controllers dispatch events; only valid transitions apply.
export type NarrativeState =
  | "loading"
  | "intro"
  | "explore"
  | "greeting"
  | "handover"
  | "invite"
  | "toParlour"
  | "iceCream"
  | "toFlowers"
  | "flowers"
  | "guided"
  | "atBench"
  | "sitting"
  | "ended";

export type NarrativeEvent =
  | "ASSETS_READY"
  | "INTRO_DONE"
  | "REACH_BOY"
  | "GREET_DONE"
  | "HANDOVER_DONE"
  | "ACCEPT_INVITE"
  | "AT_PARLOUR"
  | "ICECREAM_DONE"
  | "AT_FLOWERS"
  | "FLOWERS_DONE"
  | "BOY_AT_BENCH"
  | "SIT"
  | "SIT_DONE"
  | "RESTART";

const table: Partial<Record<NarrativeState, Partial<Record<NarrativeEvent, NarrativeState>>>> = {
  loading: { ASSETS_READY: "intro" },
  intro: { INTRO_DONE: "explore" },
  explore: { REACH_BOY: "greeting" },
  greeting: { GREET_DONE: "handover" },
  handover: { HANDOVER_DONE: "invite" },
  invite: { ACCEPT_INVITE: "toParlour" },
  toParlour: { AT_PARLOUR: "iceCream" },
  iceCream: { ICECREAM_DONE: "toFlowers" },
  toFlowers: { AT_FLOWERS: "flowers" },
  flowers: { FLOWERS_DONE: "guided" },
  guided: { BOY_AT_BENCH: "atBench" },
  atBench: { SIT: "sitting" },
  sitting: { SIT_DONE: "ended" },
};

export function transition(state: NarrativeState, event: NarrativeEvent): NarrativeState {
  if (event === "RESTART") return state === "loading" ? state : "intro";
  return table[state]?.[event] ?? state;
}

/** States where the player steers the girl. */
export const isPlayable = (s: NarrativeState) =>
  s === "explore" ||
  s === "invite" ||
  s === "toParlour" ||
  s === "toFlowers" ||
  s === "guided" ||
  s === "atBench";

/** The kitten belongs to the girl from the end of the handover onward. */
export const catFollowsGirl = (s: NarrativeState) =>
  s === "invite" ||
  s === "toParlour" ||
  s === "iceCream" ||
  s === "toFlowers" ||
  s === "flowers" ||
  s === "guided" ||
  s === "atBench";
