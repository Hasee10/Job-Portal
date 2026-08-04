// Stub for the "server-only" bare specifier, used only by vitest.config.ts's
// alias. There is no real "server-only" package in node_modules - Next.js
// resolves that import internally via its own bundler as a poison pill that
// errors if pulled into a client bundle. At plain runtime (including this
// test runner) the real package is a no-op, so this empty module is
// behaviorally identical for testing purposes. Not imported by any app code.
export {};
