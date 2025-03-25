import { useState, useEffect } from "react";
import { Resource } from "@/app/types/resource";
import { resourceService } from "@/app/services/resourceService";
import { useAuth } from "./useAuth";

export function useGetResource(resourceId: number) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchResource = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await resourceService.getResourceById(resourceId);
        setResource(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch resource");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResource();
  }, [resourceId, user]);

  return {
    resource,
    isLoading,
    error,
  };
} 