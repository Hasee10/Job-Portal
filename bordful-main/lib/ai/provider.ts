import axios from 'axios';
import { AIProviderError } from './types';

// Mistral's OpenAI-compatible chat completions endpoint.
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_MISTRAL_MODEL = 'mistral-large-latest';

// OpenRouter as a last-resort fallback if all Mistral keys are exhausted.
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ChatOptions = { temperature?: number; maxTokens?: number };

// Mistral's free tier has a fairly low per-key rate limit, same reasoning
// as the old Groq setup - 3 keys tried in order, moving to the next one
// on a 429/401/403 rather than failing outright.
function getMistralKeys(): string[] {
  return [
    process.env.MISTRAL_API_KEY_1,
    process.env.MISTRAL_API_KEY_2,
    process.env.MISTRAL_API_KEY_3,
  ].filter((key): key is string => Boolean(key));
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || undefined;
}

export function isAIConfigured(): boolean {
  return getMistralKeys().length > 0 || Boolean(getOpenRouterKey());
}

function isRetryableStatus(status: number | null | undefined): boolean {
  return status === 429 || status === 401 || status === 403;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    return JSON.stringify(error.response.data);
  }
  return error instanceof Error ? error.message : fallback;
}

async function callMistral(
  key: string,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<string> {
  const response = await axios.post(
    MISTRAL_API_URL,
    {
      model: process.env.MISTRAL_MODEL || DEFAULT_MISTRAL_MODEL,
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens ?? 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Mistral returned an empty response');
  }
  return content;
}

async function callOpenRouter(
  key: string,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joblo.app';
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens ?? 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': siteUrl,
        'X-Title': 'JobLo',
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty response');
  }
  return content;
}

// Tries each configured Mistral key in turn, falling back to OpenRouter
// (if configured) only after every Mistral key has failed.
export async function aiChatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const mistralKeys = getMistralKeys();
  const openRouterKey = getOpenRouterKey();

  if (mistralKeys.length === 0 && !openRouterKey) {
    throw new AIProviderError(
      'No AI provider is configured on this deployment. Set MISTRAL_API_KEY_1 ' +
        '(and optionally _2/_3 for rate-limit fallback) or OPENROUTER_API_KEY ' +
        'to enable AI features.',
      'mistral',
      true
    );
  }

  let lastError: unknown;
  let lastProvider = 'mistral';

  for (const key of mistralKeys) {
    try {
      return await callMistral(key, messages, options);
    } catch (error) {
      lastError = error;
      const status = axios.isAxiosError(error) ? error.response?.status : null;
      if (isRetryableStatus(status)) {
        continue;
      }
      // Non-retryable failure (bad request, network, 5xx) - stop trying
      // other Mistral keys, but OpenRouter can still be tried below.
      break;
    }
  }

  if (openRouterKey) {
    try {
      return await callOpenRouter(openRouterKey, messages, options);
    } catch (error) {
      lastError = error;
      lastProvider = 'openrouter';
    }
  }

  const message = extractErrorMessage(lastError, 'Failed to reach AI provider');
  throw new AIProviderError(`AI request failed: ${message}`, lastProvider);
}
