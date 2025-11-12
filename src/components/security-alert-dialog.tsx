"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";

interface SecurityAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  severity?: 'error' | 'warning' | 'block';
  detectedIssues?: string[];
}

export function SecurityAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  severity = 'error',
  detectedIssues = [],
}: SecurityAlertDialogProps) {

  // Determine icon and colors based on severity
  const getIconAndColors = () => {
    switch (severity) {
      case 'block':
        return {
          icon: <ShieldX className="h-10 w-10 text-destructive" />,
          bgColor: 'bg-destructive/10',
          titleColor: 'text-destructive',
          defaultTitle: 'Security Alert'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-10 w-10 text-amber-500" />,
          bgColor: 'bg-amber-500/10',
          titleColor: 'text-amber-600 dark:text-amber-500',
          defaultTitle: '⚠️ Security Warning'
        };
      default:
        return {
          icon: <ShieldAlert className="h-10 w-10 text-orange-500" />,
          bgColor: 'bg-orange-500/10',
          titleColor: 'text-orange-600 dark:text-orange-500',
          defaultTitle: '🛡️ Security Notice'
        };
    }
  };

  const { icon, bgColor, titleColor, defaultTitle } = getIconAndColors();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${bgColor} ring-4 ring-background`}>
            {icon}
          </div>
          <AlertDialogTitle className={`text-center text-2xl ${titleColor}`}>
            {title || defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {detectedIssues.length > 0 && (
          <div className="my-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="mb-2 text-sm font-semibold text-destructive">
              Issues Detected:
            </p>
            <ul className="space-y-1.5">
              {detectedIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-destructive">•</span>
                  <span className="capitalize">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Our system protects against prompt injection,
            fake destinations, and inappropriate content to ensure a safe travel planning experience.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Yes, I understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

