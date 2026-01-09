import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload,
  FileText,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: "sop" | "guideline" | "lab_pdf" | "report";
  status: "pending" | "processing" | "approved" | "error";
  uploadedAt: Date;
  chunks?: number;
}

const mockDocuments: Document[] = [
  {
    id: "doc-1",
    name: "Respiratory Triage Protocol v2.3.pdf",
    type: "sop",
    status: "approved",
    uploadedAt: new Date(Date.now() - 86400000 * 5),
    chunks: 24,
  },
  {
    id: "doc-2",
    name: "COPD Management Guidelines 2024.pdf",
    type: "guideline",
    status: "approved",
    uploadedAt: new Date(Date.now() - 86400000 * 3),
    chunks: 48,
  },
  {
    id: "doc-3",
    name: "Emergency CXR Workflow SOP.pdf",
    type: "sop",
    status: "processing",
    uploadedAt: new Date(Date.now() - 3600000),
  },
  {
    id: "doc-4",
    name: "Lab Reference Ranges.pdf",
    type: "lab_pdf",
    status: "pending",
    uploadedAt: new Date(),
  },
];

export default function Documents() {
  const [documents] = useState<Document[]>(mockDocuments);
  const [search, setSearch] = useState("");
  
  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const getTypeLabel = (type: Document["type"]) => {
    switch (type) {
      case "sop": return "SOP";
      case "guideline": return "Guideline";
      case "lab_pdf": return "Lab PDF";
      case "report": return "Report";
    }
  };
  
  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "processing": return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case "approved": return <CheckCircle2 className="w-4 h-4 text-clear" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-critical" />;
    }
  };
  
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
          
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
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
                    <p className="text-2xl font-bold">{documents.length}</p>
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
                    <p className="text-2xl font-bold">
                      {documents.filter(d => d.status === "approved").length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {documents.filter(d => d.status === "pending" || d.status === "processing").length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {documents.filter(d => d.chunks).reduce((a, b) => a + (b.chunks || 0), 0)}
                    </p>
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
                            {getTypeLabel(doc.type)}
                          </Badge>
                          {doc.chunks && (
                            <span className="text-xs text-muted-foreground">
                              {doc.chunks} chunks indexed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {doc.uploadedAt.toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        <span className={cn(
                          "text-sm capitalize",
                          doc.status === "approved" && "text-clear",
                          doc.status === "pending" && "text-muted-foreground",
                          doc.status === "processing" && "text-primary",
                          doc.status === "error" && "text-critical"
                        )}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
