// app/resources/components/ResourceItem.tsx
"use client";

import { Resource } from "@/app/types/resource";
import { Card, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Download } from "lucide-react";

interface ResourceItemProps {
  resource: Resource;
  onView: (id: number, fileType: string) => void;
  onDownload: (id: number) => void;
  viewLoading: number | null;
  downloadLoading: number | null;
}

export function ResourceItem({ 
  resource, 
  onView, 
  onDownload,
  viewLoading,
  downloadLoading
}: ResourceItemProps) {
  return (
    <Card key={resource.id} className="hover:bg-accent/5 transition-colors">
      <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2 px-6">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">
            <span className="text-primary/80">{resource.course_id || 'N/A'}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span>{resource.title}</span>
          </CardTitle>
          <p className="text-muted-foreground text-sm pl-[2px]">
            {resource.description || "No description provided"}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(resource.id, resource.file_type)}
              disabled={viewLoading === resource.id}
            >
              {viewLoading === resource.id ? (
                <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
              ) : (
                "查看详情"
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onDownload(resource.id)}
              disabled={downloadLoading === resource.id}
            >
              {downloadLoading === resource.id ? (
                <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs font-medium">
            {new Date(resource.created_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-')}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}