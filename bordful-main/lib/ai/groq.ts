import axios from 'axios';
import { AIProviderError } from './types';

// Groq's OpenAI-compatible chat completions endpoint.
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Llama 3.3 70B on Groq - fast enough for interactive resume tailoring and
// free-tier friendly. Override with GROQ_MODEL if a different model fits
// better once real usage patterns are known.
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// Groq's free tier has a fairly low per-key rate limit. The seeker asked
// for 3 keys specifically so one hitting its limit doesn't take the whole
// feature down - each request tries the keys in order and moves to the
// next one on a 429, rather than failing outright.
function getConfiguredKeys(): string[] {
  return [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((key): key is string => Boolean(key));
}

export function isGroqConfigured(): boolean {
  return getConfiguredKeys().length > 0;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function groqChatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const keys = getConfiguredKeys();

  if (keys.length === 0) {
    throw new AIProviderError(
      'No Groq API key is configured on this deployment. Set GROQ_API_KEY_1 ' +
        '(and optionally _2/_3 for rate-limit fallback) to enable AI features.',
      'groq',
      true
    );
  }

  let lastError: unknown;

  for (const key of keys) {
    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: process.env.GROQ_MODEL || DEFAULT_MODEL,
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
        throw new Error('Groq returned an empty response');
      }
      return content;
    } catch (error) {
      lastError = error;
      // Rate-limited or auth-rejected on this key - try the next one.
      const status = axios.isAxiosError(error) ? error.response?.status : null;
      if (status === 429 || status === 401 || status === 403) {
        continue;
      }
      // Any other failure (bad request, network, 5xx) isn't fixed by
      // switching keys - stop trying immediately.
      break;
    }
  }

  const message =
    axios.isAxiosError(lastError) && lastError.response?.data
      ? JSON.stringify(lastError.response.data)
      : lastError instanceof Error
        ? lastError.message
        : 'Failed to reach Groq';
  throw new AIProviderError(`Groq request failed: ${message}`, 'groq');
}
