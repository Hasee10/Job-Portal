import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "app.example.test" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/components/auth/SignUpForm", () => ({
  SignUpForm: () => React.createElement("div", null, "new business form"),
}));
vi.mock("@/components/auth/SignInForm", () => ({ SignInForm: () => null }));
vi.mock("@/components/auth/RecruiterSignInForm", () => ({
  RecruiterSignInForm: () => null,
}));
vi.mock("@/components/auth/SeekerSignInButtons", () => ({
  SeekerSignInButtons: () => null,
}));
import SignUpPage from "@/app/sign-up/page";
import SignInPage from "@/app/sign-in/page";
import RecruiterSignInPage from "@/app/recruiter/sign-in/page";
import SeekerSignInPage from "@/app/account/sign-in/page";
import {
  PROCUREMENT_WORKSPACE,
  existingAccountHref,
} from "@/lib/auth/procurement-onboarding";
beforeEach(() => {
  state.session = null;
  vi.stubGlobal("React", React);
});
describe("Procurement uses existing verified identities", () => {
  it.each(["employer", "recruiter", "seeker"])(
    "redirects authenticated %s without rendering signup",
    async (role) => {
      state.session = {
        user: { id: `${role}-id`, role, email: "same@example.test" },
      };
      for (const Page of [
        SignUpPage,
        SignInPage,
        RecruiterSignInPage,
        SeekerSignInPage,
      ]) {
        await expect(
          Page({
            searchParams: Promise.resolve({
              callbackUrl: PROCUREMENT_WORKSPACE,
            }),
          })
        ).rejects.toThrow(`REDIRECT:${PROCUREMENT_WORKSPACE}`);
      }
    }
  );
  it.each([
    ["employer", "/dashboard"],
    ["recruiter", "/recruiter/dashboard"],
    ["seeker", "/account"],
  ])("redirects %s safely for a general signup visit", async (role, path) => {
    state.session = { user: { id: "existing-id", role } };
    await expect(
      SignUpPage({
        searchParams: Promise.resolve({ callbackUrl: "https://evil.example" }),
      })
    ).rejects.toThrow(`REDIRECT:${path}`);
  });
  it("offers all existing sign-in methods without discovering an email", async () => {
    const html = renderToStaticMarkup(
      await SignUpPage({
        searchParams: Promise.resolve({ callbackUrl: PROCUREMENT_WORKSPACE }),
      })
    );
    for (const path of ["/sign-in", "/recruiter/sign-in", "/account/sign-in"]) {
      expect(html).toContain(existingAccountHref(path, PROCUREMENT_WORKSPACE));
    }
    expect(html).toContain("new business form");
    expect(html).toContain("Google or LinkedIn");
  });
  it("does not redirect an unverified identity based on its email", async () => {
    state.session = { user: { role: "seeker", email: "same@example.test" } };
    const html = renderToStaticMarkup(
      await SignUpPage({
        searchParams: Promise.resolve({ callbackUrl: PROCUREMENT_WORKSPACE }),
      })
    );
    expect(html).toContain("new business form");
  });
});
