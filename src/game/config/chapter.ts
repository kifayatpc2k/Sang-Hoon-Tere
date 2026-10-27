// Chapter 1 configuration: world anchors and the few lines of story text.
// Characters face +Z in model space; rotation.y = atan2(dx, dz) faces a direction.

export const WATER_LEVEL = -0.22;
export const SHORE_Z = 3; // sand meets water around here (water is z < SHORE_Z)
export const PROMENADE_Z = 30; // promenade starts here (z > PROMENADE_Z)

export const WALK_BOUNDS = { minX: -54, maxX: 54, minZ: 3.6, maxZ: 38.5 };

export const GIRL_SPAWN = { x: 15, z: 34.5, facing: Math.PI * 1.08 };
export const BOY_START = { x: 2, z: 6.8, facing: Math.PI * 1.15 };
/** Kitten waits on the sand just behind/beside the boy at the start. */
export const CAT_START_OFFSET = { x: -0.45, z: 0.55 };

/** Scenic bench at the water's edge, facing the Bosphorus (-Z). */
export const BENCH = { x: -26, z: 6.4, facing: Math.PI };
export const SEAT_HEIGHT = 0.46;
/** Facing -Z the characters' right is +X. Girl on the left seat, boy on the right.
 *  Seats sit a touch forward of the bench centre so a backpack clears the backrest. */
export const GIRL_SEAT = { x: BENCH.x - 0.42, z: BENCH.z - 0.08 };
export const BOY_SEAT = { x: BENCH.x + 0.42, z: BENCH.z - 0.08 };
export const CAT_REST = { x: BENCH.x - 1.15, z: BENCH.z - 0.75 };

/** "Sweet Scoops" kiosk a few steps from the meeting spot; its counter faces the water (-Z). */
export const PARLOUR = { x: -7, z: 13.6, w: 3, d: 2 };
export const PARLOUR_BOY_SPOT = { x: -6.25, z: 11.75 };
export const PARLOUR_GIRL_SPOT = { x: -7.65, z: 11.7 };
export const PARLOUR_PAUSE = 6.5; // seconds of the ice-cream moment once both have arrived
export const FLAVOURS = [
  { name: "Pistachio", color: "#b9c99a" },
  { name: "Strawberry", color: "#e6aeb0" },
  { name: "Vanilla", color: "#f1e6c8" },
];

/** "Petal & Bloom" flower boutique, a short walk on from Sweet Scoops toward the bench. Front faces -Z. */
export const FLOWER_SHOP = { x: -14.2, z: 13.5, w: 3.2, d: 2 };
export const FLOWER_BOY_SPOT = { x: -13.6, z: 11.2 }; // beside her, where he ties the bow on
export const FLOWER_GIRL_SPOT = { x: -14.6, z: 11.75 }; // at the counter, admiring the display
/** Where the bow waits on the counter before he picks it up. */
export const BOW_ON_COUNTER = { x: -14.0, z: 12.32 };
export const BOW_PAUSE = 3.2;

/** How far beside the girl the boy walks (metres, to her right). */
export const COMPANION_SIDE = 0.85;
/** Girl must be this close to a destination spot for the stop to start. */
export const ARRIVE_RADIUS = 1.8;

/** Route hint across the waterfront to the bench (used for the destination marker only). */
export const GUIDE_PATH = [
  { x: -3, z: 8.4 },
  { x: -10, z: 9.2 },
  { x: -17, z: 8.8 },
  { x: -22.5, z: 7.9 },
  { x: BENCH.x + 1.0, z: BENCH.z + 1.3 },
];

// All player-facing text (captions, prompts, dialogue) lives in
// src/game/config/gameContent.ts — edit it there, not here.
