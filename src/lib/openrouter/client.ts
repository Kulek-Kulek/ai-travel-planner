import OpenAI from 'openai';

// LOW-1: Add timeout protection (60 seconds)
// Prevents requests from hanging indefinitely and consuming server resources
export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Travel Planner',
  },
  timeout: 60000, // 60 seconds timeout
  maxRetries: 2, // Retry up to 2 times on network errors
});


