"use client";

/**
 * User Tier Manager (Admin Component)
 * 
 * Allows admins to view and change user subscription tiers.
 * Use this for testing or manual tier assignments.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { UserTier } from "@/lib/config/extraction-models";

interface UserTierManagerProps {
  userId: string;
  currentTier: UserTier;
  onTierChange?: (newTier: UserTier) => void;
}

export function UserTierManager({
  userId,
  currentTier,
  onTierChange,
}: UserTierManagerProps) {
  const [selectedTier, setSelectedTier] = useState<UserTier>(currentTier);
  const [isUpdating, setIsUpdating] = useState(false);

  const tiers: { value: UserTier; label: string; description: string }[] = [
    {
      value: "free",
      label: "Free",
      description: "Regex extraction, 5 generations/month",
    },
    {
      value: "basic",
      label: "Basic",
      description: "AI extraction (Gemini Flash), 20 generations/month",
    },
    {
      value: "premium",
      label: "Premium",
      description: "AI extraction (Claude Haiku), 100 generations/month",
    },
    {
      value: "enterprise",
      label: "Enterprise",
      description: "Best AI models, unlimited generations",
    },
  ];

  const handleUpdate = async () => {
    if (selectedTier === currentTier) {
      toast.info("Tier is already set to " + selectedTier);
      return;
    }

    setIsUpdating(true);

    try {
      // Call your API to update the tier
      const response = await fetch("/api/admin/update-user-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: selectedTier }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tier");
      }

      toast.success(`Tier updated to ${selectedTier}`);
      onTierChange?.(selectedTier);
    } catch (error) {
      console.error("Error updating tier:", error);
      toast.error("Failed to update tier");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Subscription Tier
        </h3>
        <p className="text-sm text-slate-500">
          Current tier: <span className="font-medium">{currentTier}</span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Select New Tier
        </label>
        <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as UserTier)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((tier) => (
              <SelectItem key={tier.value} value={tier.value}>
                <div className="flex flex-col text-left">
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-xs text-slate-500">
                    {tier.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={isUpdating || selectedTier === currentTier}
        className="w-full"
      >
        {isUpdating ? "Updating..." : "Update Tier"}
      </Button>

      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <p className="font-medium text-slate-700 mb-2">Tier Comparison:</p>
        <ul className="space-y-1 text-slate-600">
          <li>• Free: Regex extraction, no AI costs</li>
          <li>• Basic: Gemini Flash (~$0.0001/extraction)</li>
          <li>• Premium: Claude Haiku (~$0.0002/extraction)</li>
          <li>• Enterprise: Best models available</li>
        </ul>
      </div>
    </div>
  );
}

