import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Upload,
  FileText,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Loader2,
  FileImage,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUploadMultipleDocuments } from "@/hooks/useUploadDocument";
import { format } from "date-fns";
import { sampleDocuments, MockDocument } from "@/lib/mock-documents";

interface Document {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  created_at: string;
  file_path: string | null;
  approved: boolean;
}

type CombinedDocument = Document | MockDocument;

function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Document[];
    }
  });
}

export default function Documents() {
  const { data: dbDocuments = [], isLoading } = useDocuments();
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useUploadMultipleDocuments();
  
  // Combine real documents with sample documents (samples shown when no real docs match)
  const allDocuments: CombinedDocument[] = useMemo(() => {
    // Filter out sample docs that have the same name as real docs
    const realNames = new Set(dbDocuments.map(d => d.name.toLowerCase()));
    const filteredSamples = sampleDocuments.filter(s => !realNames.has(s.name.toLowerCase()));
    return [...dbDocuments, ...filteredSamples];
  }, [dbDocuments]);
  
  const filteredDocs = allDocuments.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "sop": return "SOP";
      case "guideline": return "Guideline";
      case "lab_pdf": return "Lab PDF";
      case "report": return "Report";
      default: return type;
    }
  };
  
  const getStatusIcon = (status: string, approved: boolean) => {
    if (approved) return <CheckCircle2 className="w-4 h-4 text-clear" />;
    switch (status) {
      case "PENDING": return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "PROCESSING": return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case "APPROVED": return <CheckCircle2 className="w-4 h-4 text-clear" />;
      case "ERROR": return <AlertTriangle className="w-4 h-4 text-critical" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    setUploadState('uploading');
    
    try {
      const { results, errors } = await uploadMutation.mutateAsync(fileArray);
      setUploadState(errors.length > 0 && results.length === 0 ? 'error' : 'success');
      
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadState('idle');
      }, 2000);
    } catch {
      setUploadState('error');
    }
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };
  
  const handleClick = () => {
    if (uploadState === 'idle') {
      fileInputRef.current?.click();
    }
  };

  const approvedCount = allDocuments.filter(d => d.approved || d.status === 'APPROVED').length;
  const pendingCount = allDocuments.filter(d => !d.approved && (d.status === 'PENDING' || d.status === 'PROCESSING')).length;
  
  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h1 className="text-xl font-semibold">Admin Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage SOPs, guidelines, and knowledge base documents
            </p>
          </div>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Drag and drop PDF, DOCX, DOC, or TXT files to upload.
                </DialogDescription>
              </DialogHeader>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className={cn(
                  "mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragging && "border-primary bg-primary/5",
                  uploadState === 'idle' && !isDragging && "border-border hover:border-muted-foreground",
                  uploadState === 'uploading' && "border-primary bg-primary/5 cursor-wait",
                  uploadState === 'success' && "border-clear bg-clear/5",
                  uploadState === 'error' && "border-critical bg-critical/5"
                )}
              >
                {uploadState === 'uploading' && (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
                    <p className="font-medium">Uploading documents...</p>
                    <Progress value={50} className="mt-4 h-2" />
                  </>
                )}
                
                {uploadState === 'success' && (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto text-clear mb-4" />
                    <p className="font-medium text-clear">Documents uploaded successfully</p>
                  </>
                )}
                
                {uploadState === 'error' && (
                  <>
                    <AlertTriangle className="w-12 h-12 mx-auto text-critical mb-4" />
                    <p className="font-medium text-critical">Upload failed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please try again or check your connection
                    </p>
                  </>
                )}
                
                {uploadState === 'idle' && (
                  <>
                    <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">Drop documents here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse your files
                    </p>
                  </>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: PDF, DOCX, DOC, TXT (max 50MB per file)
              </p>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6">
          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface border-border"
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-surface border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{allDocuments.length}</p>
                    <p className="text-xs text-muted-foreground">Total Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-surface border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-clear/10">
                    <FileCheck className="w-5 h-5 text-clear" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approvedCount}</p>
                    <p className="text-xs text-muted-foreground">Approved & Indexed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-surface border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-surface border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-xs text-muted-foreground">Total Chunks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Document List */}
          <Card className="bg-surface border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Document Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {allDocuments.length === 0 
                    ? "No documents uploaded yet. Click 'Upload Document' to get started."
                    : "No documents match your search."
                  }
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocs.map(doc => (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border border-border",
                        "hover:bg-muted/30 transition-colors cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(doc.doc_type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        </span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status, doc.approved)}
                          <span className={cn(
                            "text-sm capitalize",
                            (doc.approved || doc.status === "APPROVED") && "text-clear",
                            doc.status === "PENDING" && "text-muted-foreground",
                            doc.status === "PROCESSING" && "text-primary",
                            doc.status === "ERROR" && "text-critical"
                          )}>
                            {doc.approved ? 'approved' : doc.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
