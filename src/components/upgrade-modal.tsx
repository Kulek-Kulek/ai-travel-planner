'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';
import { CREDIT_PACKS, formatCurrency } from '@/lib/config/pricing-models';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: 'free-limit' | 'locked-model' | 'insufficient-credits';
  requiredAmount?: number;
  modelName?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  trigger,
  requiredAmount,
  modelName,
}: UpgradeModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(5);

  const getContent = () => {
    switch (trigger) {
      case 'free-limit':
        return {
          icon: <Sparkles className="size-12 text-primary mx-auto mb-4" />,
          title: "You've used your 2 free plans! 🎉",
          description:
            "You're loving AI travel planning! Upgrade to continue creating amazing itineraries.",
        };
      case 'locked-model':
        return {
          icon: <Lock className="size-12 text-primary mx-auto mb-4" />,
          title: `${modelName} is a premium model`,
          description:
            'Unlock access to premium AI models with better quality and more detailed itineraries.',
        };
      case 'insufficient-credits':
        return {
          icon: <CreditCard className="size-12 text-primary mx-auto mb-4" />,
          title: 'Insufficient credits',
          description: `You need ${formatCurrency(requiredAmount || 0)} to generate this plan. Top up your account to continue.`,
        };
      default:
        return {
          icon: <Sparkles className="size-12 text-primary mx-auto mb-4" />,
          title: 'Upgrade to continue',
          description: 'Choose a plan to unlock more features.',
        };
    }
  };

  const content = getContent();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          {content.icon}
          <AlertDialogTitle className="text-2xl text-center">
            {content.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 mt-6">
          {/* Pro Plan Option */}
          <div className="relative border-2 border-primary rounded-lg p-6 bg-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Recommended
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Crown className="size-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Go Pro - €9.99/month</h3>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• 100 economy + 20 premium plans/month</li>
                  <li>• All 4 AI models included</li>
                  <li>• Unused plans roll over</li>
                  <li>• Priority generation</li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/sign-up?tier=pro">Upgrade to Pro</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* PAYG Option */}
          <div className="border rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <CreditCard className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Pay as You Go</h3>
                <p className="text-sm text-muted-foreground">
                  No subscription. Pay per plan. Credits never expire.
                </p>
              </div>
            </div>

            {/* Credit Pack Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.amount}
                  onClick={() => setSelectedAmount(pack.amount)}
                  className={`relative border-2 rounded-lg p-4 text-center transition-all ${
                    selectedAmount === pack.amount
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${pack.popular ? 'ring-2 ring-primary/20' : ''}`}
                >
                  {pack.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      Popular
                    </div>
                  )}
                  <div className="font-bold text-lg">
                    {formatCurrency(pack.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{pack.estimatedPlans.min}-{pack.estimatedPlans.max} plans
                  </div>
                </button>
              ))}
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href={`/sign-up?tier=payg&amount=${selectedAmount}`}>
                Add {formatCurrency(selectedAmount)} Credits
              </Link>
            </Button>
          </div>

          {/* Compare Plans Link */}
          <div className="text-center">
            <Button variant="link" asChild>
              <Link href="/pricing">Compare all plans →</Link>
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Simplified version for quick upgrades
interface QuickUpgradeAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  actionText?: string;
  actionLink?: string;
}

export function QuickUpgradeAlert({
  open,
  onOpenChange,
  message,
  actionText = 'Upgrade',
  actionLink = '/pricing',
}: QuickUpgradeAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild>
            <Link href={actionLink}>{actionText}</Link>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

