// Read-only fixture adapter for the standalone localhost gateway. Never imported
// by the Next.js app, and never writes to a Jobs database or issues a session.
export function demoJobsEnabled(env) {
  return env.NODE_ENV !== "production" && env.LOCAL_DEMO_DATA === "true";
}
export function queryDemoJobs(rows, url) {
  let result = rows.filter(row => {
    for (const [field, value] of url.searchParams) {
      if (value.startsWith("eq.") && String(row[field]) !== value.slice(3)) return false;
    }
    return true;
  });
  const orders = (url.searchParams.get("order") ?? "id.asc").split(",");
  result.sort((a,b) => {
    for (const order of orders) {
      const [key,direction] = order.split(".");
      if (a[key] == null && b[key] == null) continue;
      if (a[key] == null) return 1;
      if (b[key] == null) return -1;
      const compared = String(a[key]).localeCompare(String(b[key]));
      if (compared) return direction === "desc" ? -compared : compared;
    }
    return 0;
  });
  const total = result.length;
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = url.searchParams.has("limit") ? Math.max(0,Number(url.searchParams.get("limit")) || 0) : total;
  result = result.slice(offset,offset+limit);
  const fields = url.searchParams.get("select");
  if (fields && fields !== "*") result = result.map(row => Object.fromEntries(fields.split(",").map(key => [key,row[key]])));
  return {data:result,total,offset};
}
