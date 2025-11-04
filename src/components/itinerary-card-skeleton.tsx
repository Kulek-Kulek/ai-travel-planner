import { Skeleton } from "@/components/ui/skeleton";

export function ItineraryCardSkeleton() {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Image skeleton */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <Skeleton className="h-6 w-3/4 mb-3" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        
        {/* Meta info (dates, travelers) */}
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
        
        {/* Bottom section */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

