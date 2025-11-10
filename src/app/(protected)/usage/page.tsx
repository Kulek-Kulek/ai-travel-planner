import { redirect } from 'next/navigation';
import { getUser } from '@/lib/actions/auth-actions';
import {
  getUserSubscription,
  getUserUsageStats,
} from '@/lib/actions/subscription-actions';
import {
  TIER_CONFIG,
  AI_MODELS,
  formatCurrency,
  type ModelKey,
} from '@/lib/config/pricing-models';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Crown, CreditCard, TrendingUp, Calendar, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Usage Dashboard - AI Travel Planner',
  description: 'View your subscription usage and statistics',
};

export default async function UsagePage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const subscription = await getUserSubscription();
  const stats = await getUserUsageStats();

  if (!subscription || !stats) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p>Unable to load usage information.</p>
        </div>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[subscription.tier];
  const isFreeTier = subscription.tier === 'free';
  const isPaygTier = subscription.tier === 'payg';
  const isProTier = subscription.tier === 'pro';

  // Calculate limits and usage
  const freeLimit = isFreeTier ? 2 : null;
  const economyLimit = isProTier ? 100 : null;
  const premiumLimit = isProTier
    ? 20 + (subscription.premiumRollover || 0)
    : null;

  const economyUsed = subscription.monthlyEconomyUsed || 0;
  const premiumUsed = subscription.monthlyPremiumUsed || 0;
  const economyRemaining =
    economyLimit !== null ? Math.max(0, economyLimit - economyUsed) : null;
  const premiumRemaining =
    premiumLimit !== null ? Math.max(0, premiumLimit - premiumUsed) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Usage Dashboard</h1>
          <p className="text-muted-foreground">
            Track your subscription usage and statistics
          </p>
        </div>

      {/* Current Plan */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Subscription Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {isProTier ? (
              <Crown className="size-8 text-primary" />
            ) : isPaygTier ? (
              <CreditCard className="size-8 text-primary" />
            ) : (
              <Sparkles className="size-8 text-primary" />
            )}
            <div>
              <h3 className="font-semibold text-lg">{tierConfig.displayName}</h3>
              <p className="text-sm text-muted-foreground">
                {tierConfig.price === 0
                  ? 'Free'
                  : `€${tierConfig.price}/month`}
              </p>
            </div>
          </div>

          {isFreeTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Plans used:</span>
                <span className="font-semibold">
                  {subscription.plansCreatedCount} / {freeLimit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((subscription.plansCreatedCount / freeLimit!) * 100, 100)}%`,
                  }}
                />
              </div>
              {subscription.plansCreatedCount >= freeLimit! && (
                <Button size="sm" className="w-full mt-4" asChild>
                  <Link href="/pricing">Upgrade Now</Link>
                </Button>
              )}
            </div>
          )}

          {isPaygTier && (
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold">
                  {formatCurrency(subscription.creditsBalance || 0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Available credits
                </p>
              </div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/pricing">Add Credits</Link>
              </Button>
            </div>
          )}

          {isProTier && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-semibold capitalize">
                  {subscription.status}
                </span>
              </div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/profile">Manage Subscription</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Economy Usage (Pro tier) */}
        {isProTier && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="font-semibold mb-4">Economy Models</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This month:</span>
                <span className="font-semibold">
                  {economyUsed} / {economyLimit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((economyUsed / economyLimit!) * 100, 100)}%`,
                  }}
                />
              </div>
              {economyUsed >= economyLimit! ? (
                <p className="text-xs text-muted-foreground mt-2">
                  ✨ Unlimited economy models now active
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  {economyRemaining} plans remaining
                </p>
              )}
            </div>
          </div>
        )}

        {/* Premium Usage (Pro tier) */}
        {isProTier && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="font-semibold mb-4">Premium Models</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This month:</span>
                <span className="font-semibold">
                  {premiumUsed} / {premiumLimit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((premiumUsed / premiumLimit!) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {premiumRemaining! > 0
                  ? `${premiumRemaining} plans remaining`
                  : 'Add credits for more premium plans'}
              </p>
              {subscription.premiumRollover > 0 && (
                <p className="text-xs text-muted-foreground">
                  (includes {subscription.premiumRollover} rolled over)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="size-5 text-primary" />
            <h3 className="font-semibold">Total Plans</h3>
          </div>
          <div className="text-3xl font-bold">{stats.totalPlans}</div>
          <p className="text-sm text-muted-foreground">All-time</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="size-5 text-primary" />
            <h3 className="font-semibold">This Month</h3>
          </div>
          <div className="text-3xl font-bold">{stats.thisMonthPlans}</div>
          <p className="text-sm text-muted-foreground">
            {stats.thisMonthPlans === 1 ? 'plan' : 'plans'} created
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="font-semibold">Total Cost</h3>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(stats.totalCost)}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(stats.thisMonthCost)} this month
          </p>
        </div>
      </div>

      {/* Model Usage Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4">Model Usage Breakdown</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(stats.modelUsage).map(([modelKey, count]) => {
            const model = AI_MODELS[modelKey as ModelKey];
            if (!model) return null;

            const percentage = (count / stats.totalPlans) * 100;

            return (
              <div key={modelKey} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{model.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {Object.keys(stats.modelUsage).length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">
              No plans created yet
            </p>
          )}
        </div>
      </div>

      {/* Rate Limits Info */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mt-6">
        <h3 className="font-semibold mb-3">Rate Limits</h3>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Per hour: </span>
            <span className="font-semibold">
              {tierConfig.rateLimit.perHour} plans
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Per day: </span>
            <span className="font-semibold">
              {tierConfig.rateLimit.perDay
                ? `${tierConfig.rateLimit.perDay} plans`
                : 'No limit'}
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade CTA for non-pro users */}
      {!isProTier && (
        <div className="mt-8 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl text-center">
          <Crown className="size-12 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Get 100 economy + 20 premium plans per month, all AI models
            included, and priority generation.
          </p>
          <Button size="lg" asChild>
            <Link href="/pricing">View Plans</Link>
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}

