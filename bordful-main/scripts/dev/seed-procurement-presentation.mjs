import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import {
  makeProcurementPresentation,
  PRESENTATION_EMAIL,
} from "./procurement-presentation-data.mjs";

config({
  path: new URL("../../.env.presentation.local", import.meta.url),
  quiet: true,
});
const endpoint = new URL(process.env.SUPABASE_URL ?? "http://invalid");
if (
  process.env.NODE_ENV === "production" ||
  endpoint.hostname !== "127.0.0.1" ||
  endpoint.port !== "55432"
) {
  throw new Error(
    "Presentation seeding requires the isolated local database gateway on 127.0.0.1:55432."
  );
}
if (!process.env.PRESENTATION_PASSWORD) {
  throw new Error(
    "Start npm run dev:presentation to configure the local login."
  );
}
const client = createClient(
  endpoint.href,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const fixtures = makeProcurementPresentation();
async function upsert(table, rows) {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await client
      .from(table)
      .upsert(rows.slice(offset, offset + 100), { onConflict: "id" });
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
  console.log(`${table}: ${rows.length} presentation records`);
}
const { data: existing, error } = await client
  .from("employers")
  .select("id")
  .eq("email", PRESENTATION_EMAIL)
  .maybeSingle();
if (error) {
  throw error;
}
if (existing && existing.id !== fixtures.ownerId) {
  throw new Error(
    "A different local account already uses this email; refusing to replace it."
  );
}
if (!existing) {
  await upsert("employers", [
    {
      company_name: "IntegCubes Presentation",
      email: PRESENTATION_EMAIL,
      id: fixtures.ownerId,
      industry: "Technology & Procurement",
      location: "Karachi, Pakistan",
      password_hash: await bcrypt.hash(process.env.PRESENTATION_PASSWORD, 12),
    },
  ]);
}
for (const [table, rows] of [
  ["organizations", fixtures.organizations],
  ["organization_members", fixtures.members],
  ["organization_connections", fixtures.connections],
  ["organization_messages", fixtures.messages],
  ["organization_invitations", fixtures.teamInvitations],
  ["procurement_requests", fixtures.requests],
  ["procurement_invitations", fixtures.invitations],
  ["procurement_responses", fixtures.responses],
  ["procurement_evaluations", fixtures.evaluations],
  ["procurement_audit_log", fixtures.audit],
]) {
  await upsert(table, rows);
}
for (const award of fixtures.awards) {
  const { error: awardError } = await client
    .from("procurement_requests")
    .update({ awarded_response_id: award.awarded_response_id })
    .eq("id", award.id);
  if (awardError) {
    throw awardError;
  }
}
console.log(
  `Ready: four private businesses for ${PRESENTATION_EMAIL}. All presentation records are synthetic.`
);
