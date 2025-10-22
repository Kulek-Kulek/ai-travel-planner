export const OPENROUTER_MODEL_VALUES = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro-exp",
  "openai/gpt-5",
  "openai/gpt-4o-mini",
  "google/gemini-1.5-flash",
  "deepseek/deepseek-chat",
  "anthropic/claude-3-haiku",
] as const;

export type OpenRouterModel = (typeof OPENROUTER_MODEL_VALUES)[number];

export const OPENROUTER_MODEL_OPTIONS: Array<{
  value: OpenRouterModel;
  label: string;
  description: string;
}> = [
  {
    value: "google/gemini-2.5-flash",
    label: "Gemini Flash 2.5 (Google)",
    description: "Very fast and low-cost; great for structured trip plans.",
  },
  {
    value: "google/gemini-2.5-pro-exp",
    label: "Gemini 2.5 Pro (Google)",
    description: "High quality and detailed planning; experimental version.",
  },
  {
    value: "openai/gpt-5",
    label: "GPT-5 (OpenAI)",
    description: "Most advanced OpenAI model with exceptional reasoning.",
  },
  {
    value: "openai/gpt-4o-mini",
    label: "GPT-4o mini (OpenAI)",
    description: "Fast, affordable, and solid general performance.",
  },
  {
    value: "google/gemini-1.5-flash",
    label: "Gemini Flash 1.5 (Google)",
    description: "Budget-friendly alternative; good for itineraries.",
  },
  {
    value: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    description: "Analytical model with detail-oriented suggestions.",
  },
  {
    value: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku (Anthropic)",
    description: "Efficient option with strong clarity for summaries.",
  },
];

export const DEFAULT_OPENROUTER_MODEL: OpenRouterModel =
  "google/gemini-2.5-flash";

export const OPENROUTER_BUDGET_FIRST_ORDER: OpenRouterModel[] = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "google/gemini-1.5-flash",
  "deepseek/deepseek-chat",
  "anthropic/claude-3-haiku",
  "google/gemini-2.5-pro-exp",
  "openai/gpt-5",
];
