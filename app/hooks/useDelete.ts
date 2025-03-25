import { useState } from "react";
import { resourceService } from "@/app/services/resourceService";
import { useAuth } from "./useAuth";

export function useDelete() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const deleteResource = async (resourceId: number) => {
    if (!user) {
      throw new Error("User must be logged in to delete resources");
    }

    try {
      setIsLoading(true);
      await resourceService.deleteResource(resourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete resource");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    deleteResource,
  };
} 