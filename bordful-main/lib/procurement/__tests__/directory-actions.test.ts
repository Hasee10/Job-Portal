import { describe, expect, it } from "vitest";
import {
  PUBLIC_COLUMNS,
  parseDirectoryFilters,
  sanitizeKeyword,
} from "../directory-actions";

const FILTER_CHARS = /[,()"']/;

describe("sanitizeKeyword (PostgREST filter safety)", () => {
  it("strips the characters that would be read as filter syntax", () => {
    // or() takes a comma-separated filter string, so an unsanitized comma or
    // parenthesis would inject another filter rather than search for text.
    const result = sanitizeKeyword('steel,is_public.eq.false,name.ilike.("x")');
    expect(result).not.toMatch(FILTER_CHARS);
    expect(result).toContain("steel");
  });

  it("strips wildcards so a search cannot widen its own match set", () => {
    expect(sanitizeKeyword("%%%")).toBe("");
    expect(sanitizeKeyword("a*b")).not.toContain("*");
  });

  it("keeps an ordinary keyword intact", () => {
    expect(sanitizeKeyword("  office furniture  ")).toBe("office furniture");
  });
});

describe("parseDirectoryFilters", () => {
  it("defaults to showing both capabilities on page 1", () => {
    expect(parseDirectoryFilters({})).toEqual({
      capability: "all",
      category: "",
      page: 1,
      q: "",
      region: "",
    });
  });

  it("accepts only the known capability values", () => {
    expect(parseDirectoryFilters({ capability: "buyer" }).capability).toBe(
      "buyer"
    );
    expect(parseDirectoryFilters({ capability: "supplier" }).capability).toBe(
      "supplier"
    );
    // Anything else falls back to 'all' rather than reaching the query.
    expect(parseDirectoryFilters({ capability: "owner" }).capability).toBe(
      "all"
    );
  });

  it("clamps a missing or nonsensical page to 1", () => {
    for (const page of ["0", "-3", "abc", undefined]) {
      expect(parseDirectoryFilters({ page }).page).toBe(1);
    }
    expect(parseDirectoryFilters({ page: "4" }).page).toBe(4);
  });
});

describe("PUBLIC_COLUMNS (what an anonymous caller may receive)", () => {
  it("exposes the business fields a buyer needs", () => {
    for (const column of [
      "name",
      "products_services",
      "categories",
      "operating_regions",
      "is_buyer",
      "is_supplier",
    ]) {
      expect(PUBLIC_COLUMNS).toContain(column);
    }
  });

  it("never reaches into membership or procurement data", () => {
    // The directory runs on the service-role client, so the projection is
    // what keeps private rows out of a public response.
    for (const forbidden of [
      "*",
      "organization_members",
      "member_id",
      "member_type",
      "procurement",
      "buyer_id",
      "vendor_id",
      "employers",
    ]) {
      expect(PUBLIC_COLUMNS).not.toContain(forbidden);
    }
  });
});
