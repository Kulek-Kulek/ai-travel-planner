'use client';

import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import Link from 'next/link';
import { PaymentButton } from './payment-button';
import { Button } from './ui/button';
import { TIER_CONFIG, CREDIT_PACKS } from '@/lib/config/pricing-models';

interface PricingCardProps {
  tier: 'free' | 'payg' | 'pro';
  name: string;
  price: string;
  priceSubtext?: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  variant: 'default' | 'outline';
  popular?: boolean;
  isAuthenticated?: boolean;
}

export function PricingCard({
  tier,
  name,
  price,
  priceSubtext,
  description,
  icon,
  features,
  cta,
  variant,
  popular = false,
  isAuthenticated = false,
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

      {/* Render different buttons based on tier and auth status */}
      {tier === 'free' && (
        <Button variant={variant} size="lg" className="w-full" asChild>
          <Link href="/sign-up">{cta}</Link>
        </Button>
      )}

      {tier === 'pro' && (
        <>
          {isAuthenticated ? (
            <PaymentButton type="subscription" variant={variant} size="lg" className="w-full">
              {cta}
            </PaymentButton>
          ) : (
            <Button variant={variant} size="lg" className="w-full" asChild>
              <Link href="/sign-up?tier=pro">{cta}</Link>
            </Button>
          )}
        </>
      )}

      {tier === 'payg' && (
        <Button variant={variant} size="lg" className="w-full" asChild>
          <Link href={isAuthenticated ? '#credits' : '/sign-up?tier=payg'}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}

export function CreditPackCards({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <div className="max-w-6xl mx-auto mt-12">
      <h3 className="text-2xl font-bold text-center mb-6" id="credits">
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
            <div className="text-3xl font-bold mb-2">€{pack.amount}</div>
            <div className="text-sm text-muted-foreground mb-4">
              {pack.estimatedPlans.min === pack.estimatedPlans.max 
                ? `${pack.estimatedPlans.min} ${pack.estimatedPlans.min === 1 ? 'plan' : 'plans'}`
                : `~${pack.estimatedPlans.min}-${pack.estimatedPlans.max} plans`
              }
            </div>
            {isAuthenticated ? (
              <PaymentButton
                type="credits"
                amount={pack.amount}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Buy Now
              </PaymentButton>
            ) : (
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/sign-up?tier=payg">Select</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Economy models: €1.00 | Premium models: €1.20-€1.75 | Credits never expire
      </p>
    </div>
  );
}

export function PricingCardsSection({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <>
      <section className="container mt-8 mx-auto px-4 pb-24">
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
            variant="outline"
            isAuthenticated={isAuthenticated}
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
            variant="default"
            popular
            isAuthenticated={isAuthenticated}
          />

          {/* PAYG TIER */}
          <PricingCard
            tier="payg"
            name="Pay as You Go"
            price="€1-€1.75"
            priceSubtext="per plan"
            description="Perfect for occasional travelers"
            icon={<Sparkles className="size-5" />}
            features={TIER_CONFIG.payg.features}
            cta="Buy Credits"
            variant="outline"
            isAuthenticated={isAuthenticated}
          />
        </div>

        <CreditPackCards isAuthenticated={isAuthenticated} />
      </section>
    </>
  );
}

