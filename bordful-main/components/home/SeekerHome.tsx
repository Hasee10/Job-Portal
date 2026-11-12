"use client";

import dynamic from "next/dynamic";

// Keep the interactive search/filter bundle behind a client-side split point.
// A server-only conditional import does not split Client Components in Next.js.
export const SeekerHome = dynamic(() =>
  import("./HomePage").then((module) => module.HomePage)
);
