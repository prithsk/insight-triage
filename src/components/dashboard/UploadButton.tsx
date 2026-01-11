import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileImage, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadMultipleDicom } from "@/hooks/useUploadDicom";
import { Progress } from "@/components/ui/progress";

export function UploadButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadResults, setUploadResults] = useState<{ critical: number; review: number; clear: number }>({ critical: 0, review: 0, clear: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useUploadMultipleDicom();
  
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
    setTotalCount(fileArray.length);
    setProcessedCount(0);
    setUploadResults({ critical: 0, review: 0, clear: 0 });
    
    try {
      const { results, errors } = await uploadMutation.mutateAsync(fileArray);
      
      // Count results by bucket
      const counts = { critical: 0, review: 0, clear: 0 };
      results.forEach(r => {
        if (r.triageResult?.risk_bucket === 'CRITICAL') counts.critical++;
        else if (r.triageResult?.risk_bucket === 'REVIEW') counts.review++;
        else counts.clear++;
      });
      
      setUploadResults(counts);
      setProcessedCount(results.length);
      setUploadState(errors.length > 0 && results.length === 0 ? 'error' : 'success');
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setUploadState('idle');
        setProcessedCount(0);
        setTotalCount(0);
      }, 3000);
    } catch (error) {
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
  
  const handleOpenChange = (open: boolean) => {
    if (!open && uploadState === 'uploading') {
      return; // Prevent closing during upload
    }
    setIsOpen(open);
    if (!open) {
      setUploadState('idle');
      setProcessedCount(0);
      setTotalCount(0);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Studies
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload DICOM Studies</DialogTitle>
          <DialogDescription>
            Drag and drop DICOM files to begin automatic triage processing.
          </DialogDescription>
        </DialogHeader>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom,image/*"
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
              <p className="font-medium">Processing uploads...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Running ML inference on {totalCount} file(s)
              </p>
              <Progress 
                value={(processedCount / totalCount) * 100} 
                className="mt-4 h-2" 
              />
            </>
          )}
          
          {uploadState === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-clear mb-4" />
              <p className="font-medium text-clear">
                {processedCount} file(s) processed successfully
              </p>
              <div className="flex justify-center gap-4 mt-3 text-sm">
                {uploadResults.critical > 0 && (
                  <span className="text-critical font-medium">
                    🔴 {uploadResults.critical} Critical
                  </span>
                )}
                {uploadResults.review > 0 && (
                  <span className="text-warning font-medium">
                    🟡 {uploadResults.review} Review
                  </span>
                )}
                {uploadResults.clear > 0 && (
                  <span className="text-clear font-medium">
                    🟢 {uploadResults.clear} Clear
                  </span>
                )}
              </div>
            </>
          )}
          
          {uploadState === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-critical mb-4" />
              <p className="font-medium text-critical">Upload failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try again or check your connection
              </p>
            </>
          )}
          
          {uploadState === 'idle' && (
            <>
              <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Drop DICOM files here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse your files
              </p>
            </>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: DICOM (.dcm), medical images (PNG, JPG)
          <br />
          <span className="text-primary">ML inference runs automatically after upload</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
