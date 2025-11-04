'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Crown, ArrowRight, ArrowLeft } from 'lucide-react';
import { TIER_CONFIG, type SubscriptionTier } from '@/lib/config/pricing-models';
import { updateSubscriptionTier } from '@/lib/actions/subscription-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChoosePlanPage() {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free');
  const [isPending, startTransition] = useTransition();
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get itineraryId from URL if present
    const params = new URLSearchParams(window.location.search);
    const id = params.get('itineraryId');
    if (id) {
      setItineraryId(id);
    }
  }, []);

  const handleSelectPlan = () => {
    startTransition(async () => {
      // If free tier, just redirect (already default)
      if (selectedTier === 'free') {
        const redirectUrl = itineraryId ? `/?itineraryId=${itineraryId}` : '/';
        router.push(redirectUrl);
        return;
      }

      // For paid tiers, update subscription
      const result = await updateSubscriptionTier(selectedTier);
      
      if (result.success) {
        toast.success('Plan selected!', {
          description: `Welcome to ${TIER_CONFIG[selectedTier].displayName}`,
        });
        
        const redirectUrl = itineraryId ? `/?itineraryId=${itineraryId}` : '/';
        router.push(redirectUrl);
      } else {
        toast.error('Failed to update plan', {
          description: result.error || 'Please try again',
        });
      }
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
      {/* Background blur effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Navigation */}
        <div className="max-w-6xl mx-auto mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-white/90">
            Start planning your dream trips today. You can change your plan anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
          {/* FREE TIER */}
          <PlanCard
            tier="free"
            name="Free"
            price="€0"
            description="Perfect for trying out AI travel planning"
            icon={<Zap className="size-5" />}
            features={TIER_CONFIG.free.features}
            selected={selectedTier === 'free'}
            onSelect={() => setSelectedTier('free')}
          />

          {/* PRO TIER (Recommended) */}
          <PlanCard
            tier="pro"
            name="Pro"
            price="€9.99"
            priceSubtext="/month"
            description="Best for frequent travelers"
            icon={<Crown className="size-5" />}
            features={TIER_CONFIG.pro.features}
            selected={selectedTier === 'pro'}
            onSelect={() => setSelectedTier('pro')}
            recommended
          />

          {/* PAYG TIER */}
          <PlanCard
            tier="payg"
            name="Pay as You Go"
            price="From €0.15"
            priceSubtext="/plan"
            description="Perfect for occasional travelers"
            icon={<Sparkles className="size-5" />}
            features={TIER_CONFIG.payg.features}
            selected={selectedTier === 'payg'}
            onSelect={() => setSelectedTier('payg')}
          />
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSelectPlan}
            disabled={isPending}
          >
            {isPending ? (
              'Setting up your account...'
            ) : (
              <>
                Continue with {TIER_CONFIG[selectedTier].displayName}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {selectedTier !== 'free' && (
            <p className="text-center text-sm text-gray-600">
              {selectedTier === 'pro' 
                ? '30-day money-back guarantee • Cancel anytime'
                : 'Credits never expire • Pay only for what you use'
              }
            </p>
          )}
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              const redirectUrl = itineraryId ? `/?itineraryId=${itineraryId}` : '/';
              router.push(redirectUrl);
            }}
            className="text-sm text-white/90 hover:text-white hover:underline"
            disabled={isPending}
          >
            I&apos;ll choose later
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 pt-8 border-t border-white/20 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-1">100+</div>
              <div className="text-sm text-white/90">Countries covered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">4 AI Models</div>
              <div className="text-sm text-white/90">Latest technology</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-white/90">Create anytime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlanCardProps {
  tier: SubscriptionTier;
  name: string;
  price: string;
  priceSubtext?: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  selected: boolean;
  onSelect: () => void;
  recommended?: boolean;
}

function PlanCard({
  name,
  price,
  priceSubtext,
  description,
  icon,
  features,
  selected,
  onSelect,
  recommended = false,
}: PlanCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col rounded-xl border-2 bg-white p-6 shadow-sm transition-all hover:shadow-lg text-left ${
        selected 
          ? 'border-primary ring-2 ring-primary ring-offset-2 shadow-xl' 
          : 'border-gray-200 hover:border-gray-300'
      } ${recommended ? 'md:scale-105' : ''}`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          ⭐ Recommended
        </div>
      )}

      {selected && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-2 rounded-lg ${selected ? 'bg-primary/10' : 'bg-gray-100'}`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold">{name}</h3>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          {priceSubtext && (
            <span className="text-sm text-gray-600">{priceSubtext}</span>
          )}
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <ul className="space-y-2 mb-4 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className={`size-4 shrink-0 mt-0.5 ${selected ? 'text-primary' : 'text-gray-400'}`} />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-2 py-2 px-3 rounded-lg text-center text-sm font-medium ${
        selected 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-700'
      }`}>
        {selected ? 'Selected' : 'Select Plan'}
      </div>
    </button>
  );
}

