import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileImage, CheckCircle2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadMultipleDicom } from "@/hooks/useUploadDicom";

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
        <button className="px-5 py-2.5 bg-landing-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Studies
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-[rgba(0,0,0,0.06)]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[24px] text-landing-heading">Upload Studies</DialogTitle>
          <DialogDescription className="text-landing-body">
            Drop DICOM files to begin automatic triage processing
          </DialogDescription>
        </DialogHeader>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom,image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
            isDragging && "border-landing-primary bg-landing-primary/5",
            uploadState === 'idle' && !isDragging && "border-[rgba(0,0,0,0.1)] hover:border-landing-primary",
            uploadState === 'uploading' && "border-landing-primary bg-landing-primary/5 cursor-wait",
            uploadState === 'success' && "border-emerald-500 bg-emerald-50",
            uploadState === 'error' && "border-red-500 bg-red-50"
          )}
        >
          {uploadState === 'uploading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-landing-primary mb-4 animate-spin" />
              <p className="font-medium text-landing-heading">Processing uploads...</p>
              <p className="text-[14px] text-landing-body mt-1">
                Running ML inference on {totalCount} file(s)
              </p>
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-landing-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-landing-primary rounded-full transition-all duration-300"
                  style={{ width: `${(processedCount / totalCount) * 100}%` }}
                />
              </div>
            </>
          )}
          
          {uploadState === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-4" />
              <p className="font-medium text-emerald-700">
                {processedCount} file(s) processed
              </p>
              <div className="flex justify-center gap-4 mt-3 text-[13px]">
                {uploadResults.critical > 0 && (
                  <span className="text-red-600 font-medium">
                    🔴 {uploadResults.critical} Critical
                  </span>
                )}
                {uploadResults.review > 0 && (
                  <span className="text-amber-600 font-medium">
                    🟡 {uploadResults.review} Review
                  </span>
                )}
                {uploadResults.clear > 0 && (
                  <span className="text-emerald-600 font-medium">
                    🟢 {uploadResults.clear} Clear
                  </span>
                )}
              </div>
            </>
          )}
          
          {uploadState === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
              <p className="font-medium text-red-700">Upload failed</p>
              <p className="text-[14px] text-landing-body mt-1">
                Please try again or check your connection
              </p>
            </>
          )}
          
          {uploadState === 'idle' && (
            <>
              <FileImage className="w-12 h-12 mx-auto text-landing-muted mb-4" />
              <p className="font-medium text-landing-heading">Drop DICOM files here</p>
              <p className="text-[14px] text-landing-body mt-1">
                or click to browse your files
              </p>
            </>
          )}
        </div>
        
        <p className="text-[12px] text-landing-muted mt-4">
          Supported: DICOM (.dcm), PNG, JPG/JPEG
          <br />
          <span className="text-landing-primary">ML inference runs automatically after upload</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
