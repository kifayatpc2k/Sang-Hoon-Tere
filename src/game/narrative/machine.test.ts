import { describe, expect, it } from "vitest";
import { catFollowsGirl, transition } from "./machine";

describe("chapter one machine", () => {
  it("the handover cannot start before the girl reaches the boy", () => {
    expect(transition("explore", "GREET_DONE")).toBe("explore");
    expect(transition("explore", "REACH_BOY")).toBe("greeting");
  });
  it("story order: greeting, handover, invite, guided, bench, sitting, ended", () => {
    const steps = [
      "GREET_DONE",
      "HANDOVER_DONE",
      "ACCEPT_INVITE",
      "AT_PARLOUR",
      "ICECREAM_DONE",
      "AT_FLOWERS",
      "FLOWERS_DONE",
      "BOY_AT_BENCH",
      "SIT",
      "SIT_DONE",
    ] as const;
    let s = transition("explore", "REACH_BOY");
    const seen = [s];
    for (const e of steps) seen.push((s = transition(s, e)));
    expect(seen).toEqual([
      "greeting",
      "handover",
      "invite",
      "toParlour",
      "iceCream",
      "toFlowers",
      "flowers",
      "guided",
      "atBench",
      "sitting",
      "ended",
    ]);
  });
  it("the ice-cream stop happens before the walk to the bench and only on arrival", () => {
    expect(transition("invite", "ACCEPT_INVITE")).toBe("toParlour");
    expect(transition("toParlour", "ICECREAM_DONE")).toBe("toParlour");
    expect(transition("toParlour", "BOY_AT_BENCH")).toBe("toParlour");
    expect(catFollowsGirl("iceCream")).toBe(true);
  });
  it("the flower shop comes after the ice cream and before the bench", () => {
    expect(transition("iceCream", "ICECREAM_DONE")).toBe("toFlowers");
    expect(transition("toParlour", "AT_FLOWERS")).toBe("toParlour");
    expect(transition("toFlowers", "FLOWERS_DONE")).toBe("toFlowers");
    expect(transition("flowers", "FLOWERS_DONE")).toBe("guided");
    expect(catFollowsGirl("flowers")).toBe(true);
  });
  it("cannot sit before the boy has led her to the bench", () => {
    expect(transition("guided", "SIT")).toBe("guided");
  });
  it("the chapter ends at the bench — nothing follows 'ended' except restart", () => {
    expect(transition("ended", "SIT")).toBe("ended");
    expect(transition("ended", "RESTART")).toBe("intro");
  });
  it("the kitten follows the girl only after the handover", () => {
    expect(catFollowsGirl("explore")).toBe(false);
    expect(catFollowsGirl("handover")).toBe(false);
    expect(catFollowsGirl("guided")).toBe(true);
  });
});
