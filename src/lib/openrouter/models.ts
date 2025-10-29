export const OPENROUTER_MODEL_VALUES = [
  "google/gemini-2.0-flash-lite-001",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-pro",
  "anthropic/claude-3-haiku",
  "google/gemini-2.5-flash",
] as const;

export type OpenRouterModel = (typeof OPENROUTER_MODEL_VALUES)[number];

export const OPENROUTER_MODEL_OPTIONS: Array<{
  value: OpenRouterModel;
  label: string;
  description: string;
}> = [
  {
    value: "google/gemini-2.0-flash-lite-001",
    label: "Gemini 2.0 Flash Lite (Google)",
    description: "Fast and reliable, great for quick travel plans.",
  },
  {
    value: "openai/gpt-4o-mini",
    label: "GPT-4o mini (OpenAI)",
    description: "Fast and affordable with excellent quality.",
  },
  {
    value: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro (Google)",
    description: "Advanced reasoning and comprehensive planning capabilities.",
  },
  {
    value: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku (Anthropic)",
    description: "Lightning-fast and efficient, perfect for balanced itineraries.",
  },
  {
    value: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (Google)",
    description: "Latest Gemini with enhanced speed and quality.",
  },
];

export const DEFAULT_OPENROUTER_MODEL: OpenRouterModel =
  "google/gemini-2.0-flash-lite-001";

export const OPENROUTER_BUDGET_FIRST_ORDER: OpenRouterModel[] = [
  "google/gemini-2.0-flash-lite-001",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
  "anthropic/claude-3-haiku",
  "google/gemini-2.5-pro",
];
