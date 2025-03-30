import { useState } from "react";
import { Resource } from "@/app/types/resource";
import { resourceService } from "@/app/services/resourceService";
import { useAuth } from "./useAuth";

export function useUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const updateResource = async (resourceId: number, data: FormData) => {
    if (!user) {
      throw new Error("User must be logged in to update resources");
    }

    try {
      setIsLoading(true);
      const response = await resourceService.updateResource(resourceId, data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update resource");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    updateResource,
  };
} 