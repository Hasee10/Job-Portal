// Windows localhost stack. Uses an isolated cluster and never loads hosted credentials.
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

if (process.env.NODE_ENV === "production") {
  throw new Error("Presentation mode is development only.");
}
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const cache = path.join(root, "node_modules/.cache/procurement-presentation");
const data = path.join(cache, "data");
const pgBin = process.env.PRESENTATION_PG_BIN ?? "D:/PostgreSQL/18/bin";
const restExe = path.join(cache, "bin-v16.5/postgrest.exe");
mkdirSync(cache, { recursive: true });
const localEnvFile = path.join(root, ".env.presentation.local");
let local;
if (existsSync(localEnvFile)) {
  local = parse(readFileSync(localEnvFile));
} else {
  const secret = randomBytes(48).toString("base64url");
  const jwt = (role) => {
    const body = [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url"
      ),
      Buffer.from(
        JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + 31_536_000,
          role,
        })
      ).toString("base64url"),
    ].join(".");
    return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  };
  local = {
    AUTH_SECRET: randomBytes(48).toString("base64url"),
    AUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXTAUTH_URL: "http://localhost:3000",
    PRESENTATION_JWT_SECRET: secret,
    PRESENTATION_PASSWORD: `Present!${randomBytes(9).toString("base64url")}`,
    SUPABASE_ANON_KEY: jwt("anon"),
    SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"),
    SUPABASE_URL: "http://127.0.0.1:55432",
  };
  writeFileSync(
    localEnvFile,
    `${Object.entries(local)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`
  );
}
if (local.SUPABASE_URL !== "http://127.0.0.1:55432") {
  throw new Error(
    "Presentation database must use the isolated loopback gateway."
  );
}
const env = {
  ...process.env,
  ...local,
  AUTH_GOOGLE_ID: "",
  AUTH_GOOGLE_SECRET: "",
  AUTH_LINKEDIN_ID: "",
  AUTH_LINKEDIN_SECRET: "",
  GMAIL_APP_PASSWORD: "",
  GMAIL_USER: "",
  LOCAL_DEMO_DATA: "false",
  LOCAL_POSTGREST_PORT: "55431",
  LOCAL_REST_GATEWAY_PORT: "55432",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: "development",
  PATH: `${pgBin};${process.env.PATH}`,
};
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, {
    cwd: root,
    encoding: "utf8",
    env,
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${path.basename(exe)} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`
    );
  }
  return result.stdout;
}
if (!existsSync(path.join(data, "PG_VERSION"))) {
  run(path.join(pgBin, "initdb.exe"), [
    "-D",
    data,
    "-U",
    "presentation_admin",
    "--auth=trust",
    "--encoding=UTF8",
    "--locale=C",
  ]);
}
if (!existsSync(restExe)) {
  throw new Error(
    `Install official PostgREST v16.5 (Windows x86-64) at ${restExe}. See scripts/dev/README.md.`
  );
}
const pgCtl = path.join(pgBin, "pg_ctl.exe");
const pgStatus = spawnSync(pgCtl, ["-D", data, "status"], {
  env,
  windowsHide: true,
});
if (pgStatus.status !== 0) {
  run(
    pgCtl,
    [
      "-D",
      data,
      "-l",
      path.join(cache, "postgres.log"),
      "-o",
      "-h 127.0.0.1 -p 55433",
      "-w",
      "start",
    ],
    { stdio: "ignore" }
  );
}
const psql = path.join(pgBin, "psql.exe");
const sqlArgs = [
  "-h",
  "127.0.0.1",
  "-p",
  "55433",
  "-U",
  "presentation_admin",
  "-w",
  "-v",
  "ON_ERROR_STOP=1",
];
const bootstrap = `DO $$ BEGIN
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF;
END $$;
GRANT anon, authenticated, service_role TO authenticator;
SELECT 'CREATE DATABASE presentation' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='presentation')\n\\gexec\n`;
run(psql, [...sqlArgs, "-d", "postgres", "-f", "-"], { input: bootstrap });
const migrationNames = [
  "20260816_procurement_schema.sql",
  "20261108_organization_identity.sql",
  "20261108_organization_marketplace_discovery.sql",
  "20260816_scraped_tenders.sql",
  "20261107_scraped_tenders_publication_order_idx.sql",
  "20261109_organization_network.sql",
  "20261110_organization_messages.sql",
  "20261111_organization_owned_rfqs.sql",
  "20261112_organization_quotations.sql",
  "20261113_organization_evaluation_award.sql",
];
const schema = [
  readFileSync("supabase/local-dev-baseline.sql", "utf8"),
  ...migrationNames.map((name) =>
    readFileSync(`supabase/migrations/${name}`, "utf8")
  ),
  "GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; NOTIFY pgrst, 'reload schema';",
].join("\n");
run(psql, [...sqlArgs, "-d", "presentation", "-f", "-"], { input: schema });
const conf = path.join(cache, "postgrest.conf");
writeFileSync(
  conf,
  `db-uri = "postgresql://authenticator@127.0.0.1:55433/presentation"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${local.PRESENTATION_JWT_SECRET}"\nserver-host = "127.0.0.1"\nserver-port = 55431\n`
);
const children = [];
function background(exe, args, name) {
  const out = openSync(path.join(cache, `${name}.log`), "a");
  const child = spawn(exe, args, {
    cwd: root,
    env,
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  closeSync(out);
  child.on("error", (error) => console.error(`${name}: ${error.message}`));
  children.push(child);
  return child;
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Service failed to start: ${url}. Check ${cache}.`);
}
async function reachable(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}
if (!(await reachable("http://127.0.0.1:55431/"))) {
  background(restExe, [conf], "postgrest");
}
await waitFor("http://127.0.0.1:55431/");
if (!(await reachable("http://127.0.0.1:55432/rest/v1/"))) {
  background(process.execPath, ["supabase/local-rest-gateway.mjs"], "gateway");
}
await waitFor("http://127.0.0.1:55432/rest/v1/");
console.log(
  run(process.execPath, ["scripts/dev/seed-procurement-presentation.mjs"])
);
const next = background(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  "next"
);
console.log(
  "Starting presentation at http://localhost:3000/demo (automatic local sign-in)"
);
console.log(
  "Login: ihaseebarshad10@gmail.com. Local password is in .env.presentation.local (PRESENTATION_PASSWORD)."
);
console.log(`Logs: ${cache}`);
const stop = () => {
  for (const child of children) {
    child.kill();
  }
  process.exit();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", (code) => {
  for (const child of children) {
    if (child !== next) {
      child.kill();
    }
  }
  process.exitCode = code ?? 1;
});
