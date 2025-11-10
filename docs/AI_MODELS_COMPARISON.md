# AI Models Cost Comparison for Travel Info Extraction

## Current Setup
**Model:** Claude 3.5 Sonnet (`anthropic/claude-3.5-sonnet`)

## Task Complexity
Extracting travel info (destination, days, travelers) is a **simple structured extraction task**. It doesn't require:
- Complex reasoning
- Creative writing
- Multi-step problem solving
- Large context windows

This means **cheaper models work just as well!**

---

## Model Options (OpenRouter Pricing)

### Tier 1: Premium Models (Overkill for extraction)
| Model | Input Cost | Output Cost | Use Case |
|-------|-----------|-------------|-----------|
| Claude 3.5 Sonnet | $3/1M tokens | $15/1M tokens | ❌ Too expensive for extraction |
| GPT-4o | $2.50/1M | $10/1M | ❌ Too expensive for extraction |

**Cost per extraction:** ~$0.002-0.003

---

### Tier 2: Mid-Range Models (Good Balance) ⭐ RECOMMENDED
| Model | Input Cost | Output Cost | Use Case |
|-------|-----------|-------------|-----------|
| Claude 3.5 Haiku | $0.25/1M | $1.25/1M | ✅ **BEST CHOICE** - Fast & cheap |
| GPT-4o Mini | $0.15/1M | $0.60/1M | ✅ Great alternative |
| Gemini 1.5 Flash | $0.075/1M | $0.30/1M | ✅ Cheapest quality option |

**Cost per extraction:** ~$0.0002-0.0005 (90% cheaper!)

---

### Tier 3: Budget Models (Ultra Cheap)
| Model | Input Cost | Output Cost | Use Case |
|-------|-----------|-------------|-----------|
| Gemini 1.5 Flash-8B | $0.0375/1M | $0.15/1M | ✅ Dirt cheap, still good |
| Llama 3.1 8B | $0.06/1M | $0.06/1M | ✅ Open source, very cheap |

**Cost per extraction:** ~$0.0001 (95% cheaper!)

---

## Cost Savings Examples

### Scenario: 10,000 extractions/month

| Model | Monthly Cost | Savings vs Sonnet |
|-------|--------------|-------------------|
| Claude 3.5 Sonnet | **$25** | Baseline |
| Claude 3.5 Haiku ⭐ | **$3** | Save $22/mo (88% cheaper) |
| GPT-4o Mini | **$2** | Save $23/mo (92% cheaper) |
| Gemini Flash | **$1** | Save $24/mo (96% cheaper) |
| Gemini Flash-8B | **$0.50** | Save $24.50/mo (98% cheaper) |

---

## Recommended Strategy: Tiered Approach

### Free Users
**Model:** Regex extraction (no AI cost)
- ✅ Fast, free, works for 70-80% of cases
- ✅ Fallback to manual fields if needed

### Basic/Trial Users
**Model:** Gemini 1.5 Flash (`google/gemini-flash-1.5`)
- ✅ Very cheap ($0.0001 per extraction)
- ✅ Good accuracy for simple extraction
- ✅ Great for testing if users like AI extraction

### Premium Users
**Model:** Claude 3.5 Haiku (`anthropic/claude-3.5-haiku`)
- ✅ Best balance of cost/quality
- ✅ 90% cheaper than Sonnet
- ✅ Same accuracy as Sonnet for extraction tasks
- ✅ Faster response time

### Enterprise/Itinerary Generation
**Model:** Claude 3.5 Sonnet (keep for actual itinerary creation)
- ✅ Use the expensive model where it matters
- ✅ Full itinerary generation needs creativity
- ✅ Complex reasoning, storytelling

---

## My Recommendation

### Immediate Change
Switch AI extraction to **Claude 3.5 Haiku**:
- 90% cost reduction
- Same accuracy for extraction
- Faster (lower latency)
- Easy 1-line code change

### Future Paid Plans Structure

**Free Tier:**
- Regex extraction only
- Manual field fallback
- Cost: $0

**Basic Tier ($5/mo):**
- AI extraction with Gemini Flash
- Unlimited extractions
- 10 itinerary generations/month
- Cost to you: ~$0.10/user/month

**Premium Tier ($15/mo):**
- AI extraction with Claude Haiku
- Unlimited extractions
- 50 itinerary generations/month with Sonnet
- Cost to you: ~$2-3/user/month

**Enterprise Tier ($50/mo):**
- AI extraction with Claude Haiku
- Unlimited extractions
- Unlimited itinerary generations with Sonnet
- Priority support
- Cost to you: ~$10-15/user/month (still profitable!)

---

## Implementation

I can create:
1. ✅ Model configuration by user tier
2. ✅ Easy model switching in code
3. ✅ Cost tracking per user
4. ✅ Fallback to cheaper models if quota exceeded

Want me to implement the tiered model system?

