// Supports the URL shapes YouTube actually produces: youtube.com/watch?v=,
// youtu.be/, and youtube.com/embed/ - covers both hand-curated links and
// whatever the Data API returns.
const YOUTUBE_ID_PATTERNS = [
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
];

export function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}
