import { describe, expect, it } from "vitest";
import { DIALOGUE_END, DIALOGUE_START, LINE_GAP, LINE_TIME, dialogueAt, lineFor } from "./dialogue";

describe("finale dialogue", () => {
  it("plays the three lines in the exact requested order", () => {
    const at = (i: number) => lineFor(dialogueAt(DIALOGUE_START + i * (LINE_TIME + LINE_GAP) + 1));
    expect(at(0)).toEqual({ speaker: "girl", text: "Kifayat.. ek kaam karte hai ?" });
    expect(at(1)).toEqual({ speaker: "boy", text: "Do baatein karte hai?" });
    expect(at(2)).toEqual({ speaker: "girl", text: "Teen lafzon mein apna haal bayaan karte hai" });
  });
  it("waits before starting and completes once, never restarting", () => {
    expect(dialogueAt(0)).toBe("waiting");
    expect(dialogueAt(DIALOGUE_END + 1)).toBe("conversation_complete");
    expect(dialogueAt(DIALOGUE_END + 100)).toBe("conversation_complete");
  });
});
