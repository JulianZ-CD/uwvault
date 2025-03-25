import { useState } from "react";
import { Resource } from "@/app/types/resource";
import { resourceService } from "@/app/services/resourceService";
import { useAuth } from "./useAuth";

export function useUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const uploadResource = async (data: FormData) => {
    if (!user) {
      throw new Error("User must be logged in to upload resources");
    }

    try {
      setIsLoading(true);
      const response = await resourceService.createResource(data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resource");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    uploadResource,
  };
} 