import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileImage, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Simulate upload
    const files = e.dataTransfer.files;
    setUploadedCount(files.length);
    setTimeout(() => {
      setUploadedCount(0);
      setIsOpen(false);
    }, 2000);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Drag and drop DICOM files or folders to begin triage processing.
          </DialogDescription>
        </DialogHeader>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-muted-foreground",
            uploadedCount > 0 && "border-clear bg-clear/5"
          )}
        >
          {uploadedCount > 0 ? (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-clear mb-4" />
              <p className="font-medium text-clear">
                {uploadedCount} file(s) uploaded successfully
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Processing will begin shortly...
              </p>
            </>
          ) : (
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
          Supported formats: DICOM (.dcm), DICOM folders
        </p>
      </DialogContent>
    </Dialog>
  );
}
