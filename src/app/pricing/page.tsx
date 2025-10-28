import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Crown, Lock } from 'lucide-react';
import Link from 'next/link';
import {
  TIER_CONFIG,
  CREDIT_PACKS,
  AI_MODELS,
  formatCurrency,
  type SubscriptionTier,
} from '@/lib/config/pricing-models';

export const metadata = {
  title: 'Pricing - AI Travel Planner',
  description:
    'Choose the perfect plan for your travel planning needs. Free, Pay-as-you-go, or Pro.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your travel planning needs. Upgrade or
          downgrade anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* FREE TIER */}
          <PricingCard
            tier="free"
            name="Free"
            price="€0"
            description="Perfect for trying out AI travel planning"
            icon={<Zap className="size-5" />}
            features={TIER_CONFIG.free.features}
            cta="Get Started Free"
            ctaLink="/sign-up"
            variant="outline"
          />

          {/* PRO TIER (Most Popular) */}
          <PricingCard
            tier="pro"
            name="Pro"
            price="€9.99"
            priceSubtext="/month"
            description="Best for frequent travelers and planners"
            icon={<Crown className="size-5" />}
            features={TIER_CONFIG.pro.features}
            cta="Start Pro"
            ctaLink="/sign-up?tier=pro"
            variant="default"
            popular
          />

          {/* PAYG TIER */}
          <PricingCard
            tier="payg"
            name="Pay as You Go"
            price="€0.15"
            priceSubtext="per plan"
            description="Perfect for occasional travelers"
            icon={<Sparkles className="size-5" />}
            features={TIER_CONFIG.payg.features}
            cta="Buy Credits"
            ctaLink="/sign-up?tier=payg"
            variant="outline"
          />
        </div>

        {/* PAYG Credit Packs */}
        <div className="max-w-4xl mx-auto mt-12">
          <h3 className="text-2xl font-bold text-center mb-6">
            Pay-as-you-go Credit Packs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.amount}
                className={`relative bg-card border rounded-lg p-6 text-center ${
                  pack.popular ? 'ring-2 ring-primary' : ''
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Popular
                  </div>
                )}
                <div className="text-3xl font-bold mb-2">
                  {formatCurrency(pack.amount)}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  ~{pack.estimatedPlans.min}-{pack.estimatedPlans.max} plans
                </div>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link href="/sign-up?tier=payg">Select</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Plan count depends on AI model chosen. Credits never expire.
          </p>
        </div>
      </section>

      {/* AI Models Comparison */}
      <section className="container mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          AI Models & Pricing
        </h2>
        <div className="max-w-4xl mx-auto bg-card rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-4 px-6 text-left font-semibold">AI Model</th>
                <th className="py-4 px-4 text-center font-semibold">Quality</th>
                <th className="py-4 px-4 text-center font-semibold">
                  PAYG Cost
                </th>
                <th className="py-4 px-4 text-center font-semibold">
                  Free Tier
                </th>
                <th className="py-4 px-4 text-center font-semibold">
                  Pro Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(AI_MODELS).map((model) => (
                <tr key={model.key} className="border-b last:border-0">
                  <td className="py-3 px-6">
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        model.tier === 'premium'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {model.badge}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold">
                    {formatCurrency(model.cost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {model.freeAccess ? (
                      <Check className="size-5 text-primary mx-auto" />
                    ) : (
                      <Lock className="size-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Check className="size-5 text-primary mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Pro tier: 100 economy + 20 premium plans/month. Unlimited economy
          after limit.
        </p>
      </section>

      {/* Feature Comparison Table */}
      <section className="container mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Compare All Features
        </h2>
        <div className="max-w-5xl mx-auto bg-card rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-4 px-6 text-left font-semibold">Feature</th>
                <th className="py-4 px-4 text-center font-semibold">Free</th>
                <th className="py-4 px-4 text-center font-semibold bg-primary/5">
                  Pro
                </th>
                <th className="py-4 px-4 text-center font-semibold">PAYG</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                feature="Plans per month"
                values={['2 total', '100 economy + 20 premium', 'Pay per plan']}
              />
              <ComparisonRow
                feature="AI Models"
                values={['2 economy models', 'All 4 models', 'All 4 models']}
              />
              <ComparisonRow
                feature="Edits per plan"
                values={['1 edit', 'Unlimited', 'Unlimited']}
              />
              <ComparisonRow
                feature="Credits rollover"
                values={[false, 'Premium plans', 'Never expire']}
              />
              <ComparisonRow
                feature="Save plans"
                values={[true, true, true]}
              />
              <ComparisonRow
                feature="Private plans"
                values={[true, true, true]}
              />
              <ComparisonRow
                feature="PDF downloads"
                values={[true, true, true]}
              />
              <ComparisonRow
                feature="Share & like"
                values={[true, true, true]}
              />
              <ComparisonRow
                feature="Bucket list"
                values={[true, true, true]}
              />
              <ComparisonRow
                feature="Priority generation"
                values={[false, true, false]}
              />
              <ComparisonRow
                feature="Batch create"
                values={[false, 'Coming soon', false]}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <FAQItem
            question="Can I change my plan later?"
            answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately. PAYG credits never expire."
          />
          <FAQItem
            question="What happens after I use my 2 free plans?"
            answer="You can upgrade to Pay-as-you-go (buy credits) or Pro subscription to continue creating itineraries. You'll still have full access to your existing plans."
          />
          <FAQItem
            question="How does Pay-as-you-go pricing work?"
            answer="Add credits to your account, then pay per itinerary based on the AI model you choose (€0.15-€0.50 per plan). Credits never expire."
          />
          <FAQItem
            question="What's the difference between economy and premium AI models?"
            answer="Economy models (Gemini Flash, GPT-4o Mini) are fast and cost-effective. Premium models (Claude Haiku, GPT-4o) provide more detailed, nuanced itineraries."
          />
          <FAQItem
            question="What happens if I exceed my Pro plan limits?"
            answer="After using your 100 economy plans, you get unlimited economy models. For premium models, unused plans roll over (max 40). After that, they cost €0.20 each."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="Yes, we offer a 30-day money-back guarantee for Pro subscriptions. PAYG credits are non-refundable but never expire."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards, debit cards, and digital wallets through Stripe."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pb-24">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Plan Your Next Adventure?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join travelers using AI to create perfect itineraries
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link href="/sign-up">Start Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components

interface PricingCardProps {
  tier: SubscriptionTier;
  name: string;
  price: string;
  priceSubtext?: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  ctaLink: string;
  variant: 'default' | 'outline';
  popular?: boolean;
}

function PricingCard({
  // tier,
  name,
  price,
  priceSubtext,
  description,
  icon,
  features,
  cta,
  ctaLink,
  variant,
  popular = false,
}: PricingCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-8 shadow-sm transition-all hover:shadow-lg ${
        popular ? 'ring-2 ring-primary shadow-xl scale-105' : ''
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h3 className="text-2xl font-bold">{name}</h3>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-5xl font-bold">{price}</span>
          {priceSubtext && (
            <span className="text-muted-foreground">{priceSubtext}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="size-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button variant={variant} size="lg" className="w-full" asChild>
        <Link href={ctaLink}>{cta}</Link>
      </Button>
    </div>
  );
}

function ComparisonRow({
  feature,
  values,
}: {
  feature: string;
  values: (string | boolean)[];
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-3 px-6 text-sm font-medium">{feature}</td>
      {values.map((value, index) => (
        <td
          key={index}
          className={`py-3 px-4 text-center text-sm ${
            index === 1 ? 'bg-primary/5' : ''
          }`}
        >
          {typeof value === 'boolean' ? (
            value ? (
              <Check className="size-5 text-primary mx-auto" />
            ) : (
              <span className="text-muted-foreground">-</span>
            )
          ) : (
            <span
              className={
                value.includes('Unlimited') || value.includes('100')
                  ? 'font-semibold text-primary'
                  : ''
              }
            >
              {value}
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="font-semibold text-lg mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  );
}

