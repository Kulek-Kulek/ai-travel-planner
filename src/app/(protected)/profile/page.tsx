import { getUser } from '@/lib/actions/auth-actions';
import { getProfile } from '@/lib/actions/profile-actions';
import { ProfileSettingsForm } from '@/components/profile-settings-form';
import { getUserSubscription } from '@/lib/actions/subscription-actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Sparkles, ArrowRight, BarChart3 } from 'lucide-react';
import { TIER_CONFIG, formatCurrency } from '@/lib/config/pricing-models';

export default async function ProfilePage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  const profileResult = await getProfile();
  const subscription = await getUserSubscription();
  
  if (!profileResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Profile Settings
            </h1>
            <p className="text-red-600">Failed to load profile. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get tier configuration
  const tierConfig = subscription ? TIER_CONFIG[subscription.tier] : TIER_CONFIG.free;
  const isFreeTier = subscription?.tier === 'free';
  const isPaygTier = subscription?.tier === 'payg';
  const isProTier = subscription?.tier === 'pro';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Profile Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Subscription Plan Card */}
        {subscription && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200">
            <div
              className={`p-6 ${
                isProTier
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                  : isPaygTier
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {isProTier ? (
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Crown className="size-8 text-white" />
                    </div>
                  ) : isPaygTier ? (
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                      <CreditCard className="size-8 text-white" />
                    </div>
                  ) : (
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Sparkles className="size-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {tierConfig.displayName} Plan
                    </h2>
                    <p className="text-white/90 text-sm mt-1">
                      {tierConfig.price === 0
                        ? 'Free forever'
                        : `${formatCurrency(tierConfig.price)}/month`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/usage">
                      <BarChart3 className="size-4 mr-2" />
                      View Usage
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Free Tier Stats */}
              {isFreeTier && (
                <>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">Plans Created</span>
                    <span className="font-semibold text-gray-900">
                      {subscription.plansCreatedCount} / 2
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">AI Models</span>
                    <span className="font-semibold text-gray-900">
                      2 economy models
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  {subscription.plansCreatedCount >= 2 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-medium mb-2">
                        🎉 You&apos;ve used all your free plans!
                      </p>
                      <p className="text-sm text-blue-700 mb-3">
                        Upgrade to continue creating amazing itineraries with AI
                      </p>
                      <Button size="sm" className="w-full" asChild>
                        <Link href="/pricing">
                          Upgrade Now
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* PAYG Tier Stats */}
              {isPaygTier && (
                <>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">Credit Balance</span>
                    <span className="font-semibold text-gray-900 text-lg">
                      {formatCurrency(subscription.creditsBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">AI Models</span>
                    <span className="font-semibold text-gray-900">
                      All 4 models unlocked
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">Credits Expire</span>
                    <span className="font-semibold text-gray-900">Never</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  {(subscription.creditsBalance || 0) < 1 && (
                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-sm text-indigo-900 font-medium mb-2">
                        💰 Low Balance
                      </p>
                      <p className="text-sm text-indigo-700 mb-3">
                        Top up your account to continue creating plans
                      </p>
                      <Button size="sm" className="w-full" asChild>
                        <Link href="/pricing">
                          Add Credits
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Pro Tier Stats */}
              {isProTier && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">
                        Economy Plans
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {subscription.monthlyEconomyUsed || 0}
                        <span className="text-sm text-blue-600 font-normal">
                          {' '}
                          / 100
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-indigo-600 font-medium mb-1">
                        Premium Plans
                      </p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {subscription.monthlyPremiumUsed || 0}
                        <span className="text-sm text-indigo-600 font-normal">
                          {' '}
                          / {20 + (subscription.premiumRollover || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">AI Models</span>
                    <span className="font-semibold text-gray-900">
                      All 4 models included
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-gray-600">Premium Rollover</span>
                    <span className="font-semibold text-gray-900">
                      {subscription.premiumRollover || 0} plans
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {subscription.status}
                    </span>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t space-y-2">
                {!isProTier && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/pricing">
                      {isFreeTier ? 'Upgrade to Pro' : 'View All Plans'}
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/usage">
                    View Detailed Usage Statistics
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <ProfileSettingsForm 
          initialName={profileResult.data.name} 
          email={profileResult.data.email} 
        />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Travel Preferences Coming Soon 🚀
          </h2>
          <p className="text-blue-700">
            In the next phase, you&apos;ll be able to customize:
          </p>
          <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
            <li>Travel interests and preferences</li>
            <li>Budget ranges and spending habits</li>
            <li>Dietary requirements and restrictions</li>
            <li>Accessibility needs</li>
            <li>Travel pace (slow, moderate, fast)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


