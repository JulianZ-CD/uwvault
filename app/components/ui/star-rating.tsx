// app/components/ui/star-rating.tsx
"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  userRating?: number;
  ratingCount?: number;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  onRate,
  readOnly = false,
  userRating = 0,
  ratingCount = 0,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: maxRating }).map((_, i) => {
          const value = i + 1;
          const filled = readOnly
            ? value <= Math.round(rating)
            : value <= (hoverRating || userRating);

          return (
            <TooltipProvider key={i} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "p-0.5 focus:outline-none transition-colors",
                      readOnly ? "cursor-default" : "cursor-pointer"
                    )}
                    onClick={() => !readOnly && onRate?.(value)}
                    onMouseEnter={() => !readOnly && setHoverRating(value)}
                    onMouseLeave={() => !readOnly && setHoverRating(0)}
                    disabled={readOnly}
                  >
                    <Star
                      size={size}
                      className={cn(
                        "transition-colors",
                        filled ? "fill-yellow-400 text-yellow-400" : "fill-none text-muted-foreground"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {readOnly ? `${rating.toFixed(1)} out of ${maxRating}` : `Rate ${value} out of ${maxRating}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      {readOnly && ratingCount > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          ({ratingCount})
        </span>
      )}
      {!readOnly && userRating > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          (Your rating: {userRating})
        </span>
      )}
    </div>
  );
}