// Localhost-only shim that makes standalone PostgREST look like Supabase's
// hosted HTTP API to supabase-js. Development only - it is never imported by
// the application and deliberately lives outside app/, so it cannot be
// reached in a deployed build.
//
// Why it is needed: supabase-js hardcodes `${SUPABASE_URL}/rest/v1` as the
// REST base path, while standalone PostgREST serves tables at the root.
// Hosted Supabase strips that prefix in its Kong gateway; PostgREST itself
// has no path-prefix setting. That single prefix is the whole difference, so
// this strips it and forwards everything else untouched - same method, same
// headers (Authorization, Accept-Profile, Prefer, Range), same body. The
// `apikey` header supabase-js also sends is passed through and ignored by
// PostgREST, which authenticates from the Bearer JWT.
//
//   node supabase/local-rest-gateway.mjs
//
// Then point the app at it: SUPABASE_URL=http://127.0.0.1:3002

import { createServer, request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { demoJobsEnabled, queryDemoJobs } from "./local-demo-jobs.mjs";
config({ path: new URL("../.env.local", import.meta.url), quiet: true });
let demoJobs = null;
if (demoJobsEnabled(process.env)) {
  try { demoJobs = JSON.parse(readFileSync(new URL("./.temp/demo-jobs.json", import.meta.url), "utf8")); }
  catch { throw new Error("Run node scripts/dev/seed-demo-data.mjs before enabling local demo jobs."); }
}

const LISTEN_PORT = Number(process.env.LOCAL_REST_GATEWAY_PORT ?? 3002);
const TARGET_PORT = Number(process.env.LOCAL_POSTGREST_PORT ?? 3001);
const HOST = "127.0.0.1";
const PREFIX = "/rest/v1";

const server = createServer((req, res) => {
  // Bind and check: nothing off this machine may reach the database, even if
  // the listening address is ever widened by mistake.
  const peer = req.socket.remoteAddress ?? "";
  if (!(peer === "127.0.0.1" || peer === "::1" || peer === "::ffff:127.0.0.1")) {
    res.writeHead(403).end("local only");
    return;
  }

  const path = req.url.startsWith(`${PREFIX}/`)
    ? req.url.slice(PREFIX.length)
    : req.url === PREFIX
      ? "/"
      : req.url;

  const parsed = new URL(path, `http://${HOST}:${LISTEN_PORT}`);
  if (demoJobs && parsed.pathname === "/jobs") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "application/json" }).end(JSON.stringify({message:"Demo jobs are read-only."}));
      return;
    }
    const {data,total,offset} = queryDemoJobs(demoJobs,parsed);
    res.writeHead(200, { "content-type": "application/json", "content-range": `${data.length ? `${offset}-${offset+data.length-1}` : "*"}/${total}` });
    res.end(req.method === "HEAD" ? undefined : JSON.stringify(data));
    return;
  }

  const upstream = httpRequest(
    { host: HOST, port: TARGET_PORT, method: req.method, path, headers: { ...req.headers, host: `${HOST}:${TARGET_PORT}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on("error", (err) => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `PostgREST unreachable on ${HOST}:${TARGET_PORT}`, detail: err.message }));
  });
  req.pipe(upstream);
});

server.listen(LISTEN_PORT, HOST, () => {
  console.log(`local REST gateway  http://${HOST}:${LISTEN_PORT}${PREFIX}/  ->  http://${HOST}:${TARGET_PORT}/`);
});
