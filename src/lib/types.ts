// Kroix Core Types

export type RiskBucket = "CRITICAL" | "REVIEW" | "CLEAR";

export type StudyStatus = "pending" | "triaged" | "reviewed" | "archived" | "error";

export interface Study {
  id: string;
  patientHash: string;
  studyTime: Date;
  modality: string;
  status: StudyStatus;
  createdAt: Date;
}

export interface TriageResult {
  id: string;
  studyId: string;
  riskScore: number;
  riskBucket: RiskBucket;
  confidence: number;
  modelVersion: string;
  createdAt: Date;
  roiHeatmapUrl?: string;
}

export interface LabResult {
  id: string;
  studyId: string;
  co2: number | null;
  ph: number | null;
  o2: number | null;
  timestamp: Date;
  source: "csv_upload" | "manual" | "hl7";
}

export interface FeedbackEvent {
  id: string;
  studyId: string;
  userId: string;
  feedbackType: "correct_priority" | "false_alarm" | "missed_urgency";
  note?: string;
  createdAt: Date;
}

// Combined view for worklist
export interface WorklistItem {
  study: Study;
  triage: TriageResult | null;
  labs: LabResult | null;
  thumbnailUrl?: string;
}

// Analytics types
export interface AnalyticsMetric {
  date: string;
  value: number;
}

export interface MTTRMetrics {
  critical: AnalyticsMetric[];
  review: AnalyticsMetric[];
  clear: AnalyticsMetric[];
}

export interface ThroughputMetrics {
  scansPerHour: AnalyticsMetric[];
  totalScans: number;
  avgTimeToReview: number;
}

// Queue status
export type QueueStatus = "triaging" | "up_to_date" | "degraded";

export interface QueueState {
  status: QueueStatus;
  pendingCount: number;
  lastUpdated: Date;
}
