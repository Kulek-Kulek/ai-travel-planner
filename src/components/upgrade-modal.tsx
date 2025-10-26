"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Crown, Sparkles, Zap } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  features?: string[];
}

export function UpgradeModal({
  open,
  onOpenChange,
  title = "Free Tier Limit Reached",
  description = "You've used all 2 free itineraries. Upgrade to continue creating amazing travel plans!",
  features = [
    "Unlimited AI-powered itineraries",
    "All AI models (including premium)",
    "Priority generation",
    "Unlimited edits & regenerations",
    "Save & organize all your plans",
  ],
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                {index < 2 ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Zap className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild size="lg" className="w-full">
            <Link href="/pricing">
              <Crown className="mr-2 h-4 w-4" />
              View Plans & Pricing
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
