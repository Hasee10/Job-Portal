import { describe, expect, it } from "vitest";
import { validateMessageBody } from "../message-actions";
import { MESSAGE_MAX_LENGTH } from "../message-types";

describe("validateMessageBody", () => {
  it("accepts an ordinary message and trims it", () => {
    const result = validateMessageBody("  can you quote 200 units?  ");
    expect(result).toEqual({ body: "can you quote 200 units?", valid: true });
  });

  it("rejects an empty message", () => {
    expect(validateMessageBody("").valid).toBe(false);
  });

  it("rejects a message that is only whitespace", () => {
    // The database CHECK uses btrim for the same reason: a body of spaces is
    // empty, not a message.
    expect(validateMessageBody("   \n\t  ").valid).toBe(false);
  });

  it("accepts a message exactly at the limit", () => {
    expect(validateMessageBody("x".repeat(MESSAGE_MAX_LENGTH)).valid).toBe(
      true
    );
  });

  it("rejects a message past the limit", () => {
    expect(validateMessageBody("x".repeat(MESSAGE_MAX_LENGTH + 1)).valid).toBe(
      false
    );
  });

  it("measures length after trimming, not before", () => {
    // Padding alone must not push an otherwise valid message over the limit.
    const padded = `  ${"x".repeat(MESSAGE_MAX_LENGTH)}  `;
    expect(validateMessageBody(padded).valid).toBe(true);
  });
});
