import 'server-only';

import axios from 'axios';
import {
  insertDraftMasterclass,
  listAllMasterclassVideoUrls,
} from './masterclass-actions';
import {
  MASTERCLASS_CATEGORY_KEYWORDS,
  MASTERCLASS_CHANNEL_ALLOWLIST,
  MASTERCLASS_RELEVANCE_KEYWORDS,
  type MasterclassChannel,
} from './masterclass-channels';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const UPLOADS_PER_CHANNEL = 5;
const MAX_NEW_DRAFTS_PER_RUN = 3;

type YouTubeUploadsPlaylistResponse = {
  items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
};

type YouTubePlaylistItem = {
  contentDetails?: { videoId?: string };
  snippet?: { title?: string; description?: string; publishedAt?: string };
};

type YouTubePlaylistItemsResponse = { items?: YouTubePlaylistItem[] };

type YouTubeVideoDetail = {
  id?: string;
  contentDetails?: { duration?: string };
};

type YouTubeVideosResponse = { items?: YouTubeVideoDetail[] };

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const response = await axios.get<YouTubeUploadsPlaylistResponse>(
    `${YOUTUBE_API_BASE}/channels`,
    {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: getApiKey(),
      },
      timeout: 15_000,
    }
  );
  return (
    response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null
  );
}

async function getRecentUploads(
  playlistId: string
): Promise<YouTubePlaylistItem[]> {
  const response = await axios.get<YouTubePlaylistItemsResponse>(
    `${YOUTUBE_API_BASE}/playlistItems`,
    {
      params: {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: UPLOADS_PER_CHANNEL,
        key: getApiKey(),
      },
      timeout: 15_000,
    }
  );
  return response.data.items ?? [];
}

// ISO 8601 duration ("PT14M32S", "PT1H2M") to whole minutes, rounded down.
// YouTube's Data API only ever returns this format for video durations.
function parseIso8601DurationToMinutes(duration: string): number | null {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes > 0 ? Math.round(totalMinutes) : null;
}

async function getVideoDurationsMinutes(
  videoIds: string[]
): Promise<Map<string, number | null>> {
  if (videoIds.length === 0) return new Map();
  const response = await axios.get<YouTubeVideosResponse>(
    `${YOUTUBE_API_BASE}/videos`,
    {
      params: {
        part: 'contentDetails',
        id: videoIds.join(','),
        key: getApiKey(),
      },
      timeout: 15_000,
    }
  );
  const durations = new Map<string, number | null>();
  for (const item of response.data.items ?? []) {
    if (!item.id) continue;
    durations.set(
      item.id,
      item.contentDetails?.duration
        ? parseIso8601DurationToMinutes(item.contentDetails.duration)
        : null
    );
  }
  return durations;
}

function isRelevant(title: string, description: string): boolean {
  const haystack = `${title} ${description}`.toLowerCase();
  return MASTERCLASS_RELEVANCE_KEYWORDS.some((keyword) =>
    haystack.includes(keyword)
  );
}

function categorize(title: string, channel: MasterclassChannel): string {
  const lowerTitle = title.toLowerCase();
  for (const [keyword, category] of MASTERCLASS_CATEGORY_KEYWORDS) {
    if (lowerTitle.includes(keyword)) return category;
  }
  return channel.defaultCategory;
}

export type DiscoverMasterclassesResult = {
  created: { title: string; channel: string }[];
  notConfigured: boolean;
};

// Called by the monthly discovery cron. Walks the fixed channel allowlist,
// pulls each channel's most recent uploads, filters for relevance, skips
// anything already in the DB, and drafts up to MAX_NEW_DRAFTS_PER_RUN -
// same "isolate one source's failure" pattern as the job scraper and the
// guide generator: one channel erroring doesn't stop the others.
export async function discoverNewMasterclasses(): Promise<DiscoverMasterclassesResult> {
  if (!getApiKey()) {
    return { created: [], notConfigured: true };
  }

  const existingUrls = await listAllMasterclassVideoUrls();
  const created: { title: string; channel: string }[] = [];

  for (const channel of MASTERCLASS_CHANNEL_ALLOWLIST) {
    if (created.length >= MAX_NEW_DRAFTS_PER_RUN) break;

    try {
      const uploadsPlaylistId = await getUploadsPlaylistId(channel.channelId);
      if (!uploadsPlaylistId) continue;

      const uploads = await getRecentUploads(uploadsPlaylistId);
      const candidates = uploads.filter((item) => {
        const videoId = item.contentDetails?.videoId;
        const title = item.snippet?.title ?? '';
        const description = item.snippet?.description ?? '';
        if (!(videoId && title)) return false;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        if (existingUrls.has(url)) return false;
        return isRelevant(title, description);
      });

      if (candidates.length === 0) continue;

      const videoIds = candidates
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));
      const durations = await getVideoDurationsMinutes(videoIds);

      for (const item of candidates) {
        if (created.length >= MAX_NEW_DRAFTS_PER_RUN) break;
        const videoId = item.contentDetails?.videoId;
        const title = item.snippet?.title;
        if (!(videoId && title)) continue;

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const masterclass = await insertDraftMasterclass({
          title,
          description: item.snippet?.description?.slice(0, 300) || null,
          instructorName: channel.name,
          instructorTitle: null,
          videoUrl: url,
          durationMinutes: durations.get(videoId) ?? null,
          category: categorize(title, channel),
        });
        created.push({ title: masterclass.title, channel: channel.name });
        existingUrls.add(url);
      }
    } catch (error) {
      console.error(
        `[masterclass-discovery] Failed for channel "${channel.name}":`,
        error
      );
    }
  }

  return { created, notConfigured: false };
}
