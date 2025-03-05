"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { ResourceListParams } from "@/app/types/resource";
import { Card, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Download } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";

export function ResourceList() {
  const { resources, totalItems, isLoading, fetchResources, getResourceUrl, downloadResource } = useResource();
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [viewLoading, setViewLoading] = useState<number | null>(null);
  const pageSize = 10;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  useEffect(() => {
    const params: ResourceListParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    
    const timer = setTimeout(() => {
      fetchResources(params);
    }, 100);

    return () => clearTimeout(timer);
  }, [page, pageSize, fetchResources]);

  const handleDownload = async (id: number) => {
    try {
      setDownloading(id);
      await downloadResource(id);
    } finally {
      setDownloading(null);
    }
  };

  const handleViewDetails = async (id: number, fileType: string) => {
    try {
      setViewLoading(id);
      const url = await getResourceUrl(id);
      if (!url) return;

      const fileExtension = fileType.toLowerCase();
      let viewerUrl = url;

      if (fileExtension.includes('doc')) {
        viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      } else if (!fileExtension.includes('pdf')) {
        console.warn('Unsupported file type for preview:', fileExtension);
        await downloadResource(id);
        return;
      }

      window.open(viewerUrl, "_blank");
    } catch (error) {
      console.error('Error viewing resource:', error);
    } finally {
      setViewLoading(null);
    }
  };

  if (isLoading && !resources.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6 px-4">
      <div className="grid gap-4">
        {resources.map((resource) => (
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
                    onClick={() => handleViewDetails(resource.id, resource.file_type)}
                    disabled={viewLoading === resource.id}
                  >
                    {viewLoading === resource.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                    ) : (
                      "View Details"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(resource.id)}
                    disabled={downloading === resource.id}
                  >
                    {downloading === resource.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs font-medium">
                  {new Date(resource.created_at).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).replace(/\//g, '-')}
                </p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) handlePageChange(page - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href="#"
                      isActive={page === pageNum}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(pageNum);
                      }}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) handlePageChange(page + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
} 