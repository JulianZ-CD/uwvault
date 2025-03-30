import { useState } from "react";
import { Resource } from "@/app/types/resource";
import { resourceService } from "@/app/services/resourceService";
import { useAuth } from "./useAuth";

export function useRating() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const rateResource = async (resourceId: number, rating: number) => {
    if (!user) {
      throw new Error("User must be logged in to rate resources");
    }

    try {
      setIsLoading(true);
      const response = await resourceService.rateResource(resourceId, rating);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rate resource");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    rateResource,
  };
} 