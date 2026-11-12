import { mkdir, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { makeDemoJobs, makeDemoTenders, makeDemoOrganizations } from "./demo-data.mjs";
config({path: new URL("../../.env.local", import.meta.url), quiet: true});
const url = new URL(process.env.SUPABASE_URL ?? "http://invalid");
if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
  throw new Error("Demo seeding is restricted to the local database gateway.");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Local database credentials are not configured.");
const client = createClient(url.href, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
for (const [table,rows] of [["scraped_tenders",makeDemoTenders()], ["organizations",makeDemoOrganizations()]]) {
  for (let start=0; start<rows.length; start+=100) {
    const {error} = await client.from(table).upsert(rows.slice(start,start+100),{onConflict:"id"});
    if(error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${rows.length} synthetic records upserted locally`);
}
await mkdir(new URL("../../supabase/.temp/",import.meta.url),{recursive:true});
await writeFile(new URL("../../supabase/.temp/demo-jobs.json",import.meta.url),JSON.stringify(makeDemoJobs()));
console.log("jobs: 500 synthetic records saved for the local gateway (no Jobs table created)");
