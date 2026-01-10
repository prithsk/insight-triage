// Kroix Core Types - aligned with database schema

export type RiskBucket = "CRITICAL" | "REVIEW" | "CLEAR";

export type StudyStatus = "PENDING" | "QUEUED" | "PROCESSING" | "REVIEWED" | "ARCHIVED";

export type FeedbackType = "CORRECT_PRIORITY" | "FALSE_ALARM" | "MISSED_URGENCY";

export interface Study {
  id: string;
  patient_hash: string;
  study_time: string;
  modality: string | null;
  file_path: string | null;
  thumbnail_path: string | null;
  status: StudyStatus;
  site_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriageResult {
  id: string;
  study_id: string;
  risk_score: number;
  risk_bucket: RiskBucket;
  confidence: number;
  roi_heatmap_path: string | null;
  model_version: string | null;
  inference_time_ms: number | null;
  created_at: string;
}

export interface LabResult {
  id: string;
  study_id: string;
  co2: number | null;
  ph: number | null;
  o2: number | null;
  wbc: number | null;
  crp: number | null;
  procalcitonin: number | null;
  source: string | null;
  timestamp: string;
}

export interface FeedbackEvent {
  id: string;
  study_id: string;
  user_id: string | null;
  feedback_type: FeedbackType;
  notes: string | null;
  created_at: string;
}

// Combined view for worklist
export interface WorklistItem {
  study: Study;
  triage: TriageResult | null;
  labs: LabResult | null;
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
export type QueueStatusType = "triaging" | "up_to_date" | "degraded";

export interface QueueState {
  status: QueueStatusType;
  pendingCount: number;
  lastUpdated: Date;
}
