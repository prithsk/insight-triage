export interface MockDocument {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  created_at: string;
  file_path: string | null;
  approved: boolean;
}

export const sampleDocuments: MockDocument[] = [
  {
    id: "sample-1",
    name: "Chest X-Ray Interpretation Guidelines v2.4",
    doc_type: "guideline",
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    file_path: null,
    approved: true,
  },
  {
    id: "sample-2",
    name: "COPD Severity Assessment Protocol",
    doc_type: "sop",
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    file_path: null,
    approved: true,
  },
  {
    id: "sample-3",
    name: "Pneumonia Detection Workflow SOP",
    doc_type: "sop",
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    file_path: null,
    approved: true,
  },
  {
    id: "sample-4",
    name: "Lab Integration Reference - ABG Values",
    doc_type: "lab_pdf",
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    file_path: null,
    approved: true,
  },
  {
    id: "sample-5",
    name: "Triage Priority Classification Standards",
    doc_type: "guideline",
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    file_path: null,
    approved: true,
  },
  {
    id: "sample-6",
    name: "Radiology Department QA Report Q4 2025",
    doc_type: "report",
    status: "PENDING",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    file_path: null,
    approved: false,
  },
  {
    id: "sample-7",
    name: "Emergency CXR Escalation Protocol",
    doc_type: "sop",
    status: "PROCESSING",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    file_path: null,
    approved: false,
  },
];
