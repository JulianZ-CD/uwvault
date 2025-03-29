// app/components/ui/star-rating.tsx
"use client";

import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Button } from "@/app/components/ui/button";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  userRating?: number;
  ratingCount?: number;
  className?: string;
  buttonMode?: boolean;
  showOnHover?: boolean;
}

// define custom star rating calculation function
const calculateStarFill = (rating: number, position: number): "full" | "half" | "empty" => {
  const difference = rating - position + 1;
  
  if (difference >= 0.75) {
    return "full";
  } else if (difference >= 0.25) {
    return "half";
  } else {
    return "empty";
  }
};

export function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  onRate,
  readOnly = false,
  userRating = 0,
  ratingCount = 0,
  className,
  buttonMode = false,
  showOnHover = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [showStars, setShowStars] = useState(!showOnHover);

  // render stars
  const renderStars = () => (
    <div className="flex">
      {Array.from({ length: maxRating }).map((_, i) => {
        const position = i + 1;
        let fillType: "full" | "half" | "empty";
        
        if (readOnly) {
          fillType = calculateStarFill(rating, position);
        } else {
          if (hoverRating > 0) {
            fillType = position <= hoverRating ? "full" : "empty";
          } else {
            fillType = calculateStarFill(userRating, position);
          }
        }

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
                  onClick={() => !readOnly && onRate?.(position)}
                  onMouseEnter={() => !readOnly && setHoverRating(position)}
                  onMouseLeave={() => !readOnly && setHoverRating(0)}
                  disabled={readOnly}
                >
                  {fillType === "full" ? (
                    <Star
                      size={size}
                      className="fill-yellow-400 text-yellow-400 transition-colors"
                    />
                  ) : fillType === "half" ? (
                    <StarHalf
                      size={size}
                      className="fill-yellow-400 text-yellow-400 transition-colors"
                    />
                  ) : (
                    <Star
                      size={size}
                      className="fill-none text-muted-foreground transition-colors"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {readOnly 
                  ? `${rating.toFixed(1)} out of ${maxRating}` 
                  : `Rate ${position} out of ${maxRating}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );

  // button mode
  if (buttonMode && !readOnly && !showStars) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className={className}
        onMouseEnter={() => setShowStars(true)}
      >
        Rate
      </Button>
    );
  }

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={() => showOnHover && setShowStars(false)}
    >
      {renderStars()}
      
      {readOnly && ratingCount > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          ({ratingCount} rated)
        </span>
      )}
      
      {!readOnly && !buttonMode && userRating > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          (Your rating: {userRating})
        </span>
      )}
    </div>
  );
}