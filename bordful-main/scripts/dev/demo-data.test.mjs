import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemoJobs, makeDemoTenders, makeDemoOrganizations } from "./demo-data.mjs";
import { demoJobsEnabled, queryDemoJobs } from "../../supabase/local-demo-jobs.mjs";

test("fixtures have stable unique identities, realistic variation and no real actions", () => {
  const jobs=makeDemoJobs(); const tenders=makeDemoTenders(); const organizations=makeDemoOrganizations();
  for(const rows of [jobs,tenders,organizations]) {
    assert.equal(rows.length,500);
    assert.equal(new Set(rows.map(row=>row.id)).size,500);
  }
  assert.equal(new Set(jobs.map(row=>`${row.title}|${row.company}`)).size,500);
  assert.equal(new Set(jobs.map(row=>row.type)).size,4);
  assert.equal(new Set(tenders.flatMap(row=>row.cpv_codes)).size,6);
  assert.ok(tenders.filter(row=>row.source==="ppra").every(row=>row.country==="PAK"));
  assert.ok(jobs.every(row=>!row.accepts_applications && !row.apply_url && !row.employer_id));
  assert.ok(organizations.every(row=>row.name.startsWith("Demo ") && !row.public_contact_email && (row.is_buyer||row.is_supplier)));
  assert.deepEqual(jobs.map(row=>row.id),makeDemoJobs().map(row=>row.id));
});
test("gateway preview cannot activate in production or without explicit opt-in", () => {
  assert.equal(demoJobsEnabled({NODE_ENV:"production",LOCAL_DEMO_DATA:"true"}),false);
  assert.equal(demoJobsEnabled({NODE_ENV:"development"}),false);
  assert.equal(demoJobsEnabled({LOCAL_DEMO_DATA:"true"}),true);
});
test("gateway honors pagination, full counts, selection and detail lookup", () => {
  const rows=makeDemoJobs();
  const page=queryDemoJobs(rows,new URL("http://localhost/jobs?select=id,title&is_active=eq.true&order=id.asc&offset=20&limit=20"));
  assert.equal(page.total,500);assert.equal(page.data.length,20);assert.equal(page.data[0].id,rows[20].id);
  assert.deepEqual(Object.keys(page.data[0]),["id","title"]);
  const detail=queryDemoJobs(rows,new URL(`http://localhost/jobs?id=eq.${rows[42].id}`));
  assert.equal(detail.total,1);assert.equal(detail.data[0].description,rows[42].description);
  assert.equal(queryDemoJobs(rows,new URL("http://localhost/jobs?offset=9999")).data.length,0);
});
