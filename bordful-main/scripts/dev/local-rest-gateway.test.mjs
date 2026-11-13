import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";

test("gateway survives an interrupted response and reports unavailable upstreams", async () => {
  const upstream = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    if (request.url === "/broken") {
      response.write('{"partial":');
      setTimeout(() => response.destroy(), 25);
      return;
    }
    response.end('{"healthy":true}');
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const upstreamPort = upstream.address().port;
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const gatewayPort = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const gateway = spawn(process.execPath, ["supabase/local-rest-gateway.mjs"], {
    env: {
      ...process.env,
      LOCAL_DEMO_DATA: "false",
      LOCAL_POSTGREST_PORT: String(upstreamPort),
      LOCAL_REST_GATEWAY_PORT: String(gatewayPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  try {
    await Promise.race([
      once(gateway.stdout, "data"),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("Gateway did not start")), 10000);
        timer.unref();
      }),
    ]);
    const base = `http://127.0.0.1:${gatewayPort}/rest/v1`;
    await assert.rejects(async () => (await fetch(`${base}/broken`)).text());
    assert.deepEqual(await (await fetch(`${base}/healthy`)).json(), { healthy: true });
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
    const unavailable = await fetch(`${base}/healthy`);
    assert.equal(unavailable.status, 502);
    assert.ok((await unavailable.json()).message.includes("PostgREST unreachable"));
    assert.equal(gateway.exitCode, null);
  } finally {
    gateway.kill();
    upstream.closeAllConnections();
    upstream.close();
  }
});
