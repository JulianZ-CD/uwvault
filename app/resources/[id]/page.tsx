"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/app/hooks/use-toast";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getResource, downloadResource, actions } = useResource();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  useEffect(() => {
    const fetchResource = async () => {
      try {
        const id = Number(params.id);
        if (isNaN(id)) {
          toast({
            variant: "destructive",
            title: "Invalid resource ID",
            description: "The resource ID is not valid."
          });
          router.push("/resources");
          return;
        }
        
        const resourceData = await getResource(id);
        setResource(resourceData);
      } catch (error) {
        console.error("Error fetching resource:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load resource details."
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchResource();
  }, [params.id, getResource, toast, router]);
  
  const handleDownload = async () => {
    if (!resource) return;
    
    setDownloading(true);
    try {
      await downloadResource(resource.id);
      toast({
        title: "Success",
        description: "Resource downloaded successfully."
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the resource."
      });
    } finally {
      setDownloading(false);
    }
  };
  
  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }
  
  if (!resource) {
    return (
      <main className="min-h-screen">
        <div className="container py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center p-4">
                <h2 className="text-xl font-semibold mb-2">Resource not found</h2>
                <p className="text-muted-foreground mb-4">The requested resource could not be found.</p>
                <Button onClick={() => router.push("/resources")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Resources
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <Button 
          variant="outline" 
          onClick={() => router.push("/resources")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resources
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>{resource.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Description</h3>
                <p className="text-muted-foreground">{resource.description || "No description provided."}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Uploaded by</h3>
                <p className="text-muted-foreground">{resource.uploader_name || "Unknown"}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Upload date</h3>
                <p className="text-muted-foreground">
                  {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : "Unknown"}
                </p>
              </div>
              
              {actions?.can_download && (
                <Button 
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto mt-4"
                >
                  {downloading ? (
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Resource
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}