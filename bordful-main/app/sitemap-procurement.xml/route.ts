import { NextResponse } from 'next/server';

// A manual route handler rather than the app/sitemap.ts metadata-file
// convention - that special convention only recognizes a file literally
// named `sitemap.ts`, it does not extend to arbitrarily-named sibling files.
// Kept separate from the main job-board sitemap on purpose (proc.md §2 "SEO
// isolation") - procurement never competes with or dilutes the job board's
// existing search equity. Only the public landing page is indexable; every
// other /procurement/* route is gated buyer/vendor content.
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const lastModified = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/procurement</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/procurement/vendors</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/procurement/tenders</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
