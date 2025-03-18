"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Download, Eye } from "lucide-react";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";

interface ResourceActionsProps {
  resourceId: number;
  fileType?: string;
}

export function ResourceActions({ resourceId, fileType }: ResourceActionsProps) {
  const { actions, downloadResource, getResourceUrl } = useResource();
  const [downloading, setDownloading] = useState<boolean>(false);
  const [viewing, setViewing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const success = await downloadResource(resourceId);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Download failed",
          description: "Please check your permissions or try again later",
        });
      }
    } catch (error) {
      console.error("Error downloading resource:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Please check your permissions or try again later",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleViewDetails = async () => {
    setViewing(true);
    try {
      const url = await getResourceUrl(resourceId);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error("Error viewing resource:", error);
      toast({
        variant: "destructive",
        title: "View failed",
        description: "Could not open the resource",
      });
    } finally {
      setViewing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewDetails}
        disabled={viewing}
      >
        {viewing ? (
          <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </>
        )}
      </Button>
      
      {actions?.can_download && (
        <Button
          variant="default"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
