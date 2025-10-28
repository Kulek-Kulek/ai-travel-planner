export const OPENROUTER_MODEL_VALUES = [
  "google/gemini-flash-1.5-8b",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "deepseek/deepseek-chat",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "openai/gpt-4o",
  "anthropic/claude-3-sonnet",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
] as const;

export type OpenRouterModel = (typeof OPENROUTER_MODEL_VALUES)[number];

export const OPENROUTER_MODEL_OPTIONS: Array<{
  value: OpenRouterModel;
  label: string;
  description: string;
}> = [
  {
    value: "google/gemini-flash-1.5-8b",
    label: "Gemini Flash 1.5 8B (Google)",
    description: "Ultra-fast and cost-effective, great for quick itineraries.",
  },
  {
    value: "openai/gpt-4o-mini",
    label: "GPT-4o mini (OpenAI)",
    description: "Fast and affordable with excellent quality.",
  },
  {
    value: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku (Anthropic)",
    description: "Lightning-fast and efficient, perfect for balanced itineraries.",
  },
  {
    value: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    description: "Budget-friendly with solid analytical performance.",
  },
  {
    value: "google/gemini-2.0-flash-exp:free",
    label: "Gemini 2.0 Flash (Google)",
    description: "Latest Gemini with enhanced reasoning and quality.",
  },
  {
    value: "google/gemini-2.0-flash-thinking-exp:free",
    label: "Gemini 2.0 Flash Thinking (Google)",
    description: "Advanced Gemini 2.0 with deep reasoning capabilities.",
  },
  {
    value: "openai/gpt-4o",
    label: "GPT-4o (OpenAI)",
    description: "Premium quality with advanced reasoning for complex trips.",
  },
  {
    value: "anthropic/claude-3-sonnet",
    label: "Claude 3 Sonnet (Anthropic)",
    description: "Balanced performance with excellent creative planning.",
  },
  {
    value: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet (Anthropic)",
    description: "Latest Anthropic model with exceptional reasoning and detail.",
  },
  {
    value: "anthropic/claude-3-opus",
    label: "Claude 3 Opus (Anthropic)",
    description: "Top-tier flagship model for the most sophisticated itineraries.",
  },
];

export const DEFAULT_OPENROUTER_MODEL: OpenRouterModel =
  "google/gemini-flash-1.5-8b";

export const OPENROUTER_BUDGET_FIRST_ORDER: OpenRouterModel[] = [
  "google/gemini-flash-1.5-8b",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "deepseek/deepseek-chat",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "openai/gpt-4o",
  "anthropic/claude-3-sonnet",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
];
