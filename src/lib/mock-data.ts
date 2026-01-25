// Mock data for Kroix MVP development
import { WorklistItem, RiskBucket, StudyStatus, QueueState, AnalyticsMetric } from "./types";

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const randomRiskScore = (bucket: RiskBucket): number => {
  switch (bucket) {
    case "CRITICAL":
      return 0.85 + Math.random() * 0.14;
    case "REVIEW":
      return 0.5 + Math.random() * 0.34;
    case "CLEAR":
      return Math.random() * 0.49;
  }
};

const randomBucket = (): RiskBucket => {
  const rand = Math.random();
  if (rand < 0.15) return "CRITICAL";
  if (rand < 0.4) return "REVIEW";
  return "CLEAR";
};

const randomStatus = (): StudyStatus => {
  const statuses: StudyStatus[] = ["PENDING", "QUEUED", "PROCESSING", "REVIEWED", "ARCHIVED"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const generateLabFlags = (bucket: RiskBucket) => {
  if (bucket === "CRITICAL") {
    return {
      co2: 55 + Math.random() * 15,
      ph: 7.25 - Math.random() * 0.1,
      o2: 85 + Math.random() * 5,
    };
  }
  if (bucket === "REVIEW") {
    return {
      co2: 45 + Math.random() * 10,
      ph: 7.32 + Math.random() * 0.03,
      o2: 90 + Math.random() * 5,
    };
  }
  return {
    co2: 35 + Math.random() * 10,
    ph: 7.38 + Math.random() * 0.04,
    o2: 95 + Math.random() * 4,
  };
};

export const generateMockWorklistItems = (count: number = 15): WorklistItem[] => {
  const items: WorklistItem[] = [];
  
  for (let i = 0; i < count; i++) {
    const bucket = randomBucket();
    const labs = generateLabFlags(bucket);
    const hasLabs = Math.random() > 0.3;
    const studyTime = new Date(Date.now() - Math.random() * 86400000 * 7);
    const studyId = `STU-${generateId()}`;
    
    items.push({
      study: {
        id: studyId,
        patient_hash: `PAT-${generateId()}`,
        study_time: studyTime.toISOString(),
        modality: "CXR",
        file_path: null,
        thumbnail_path: null,
        status: randomStatus(),
        site_id: "pilot-1",
        created_at: studyTime.toISOString(),
        updated_at: studyTime.toISOString(),
      },
      triage: {
        id: `TRI-${generateId()}`,
        study_id: studyId,
        risk_score: randomRiskScore(bucket),
        risk_bucket: bucket,
        confidence: 0.7 + Math.random() * 0.28,
        roi_heatmap_path: null,
        model_version: "v0.1.2",
        inference_time_ms: Math.floor(Math.random() * 500) + 100,
        created_at: new Date(studyTime.getTime() + 5000).toISOString(),
      },
      labs: hasLabs ? {
        id: `LAB-${generateId()}`,
        study_id: studyId,
        co2: labs.co2,
        ph: labs.ph,
        o2: labs.o2,
        wbc: null,
        crp: null,
        procalcitonin: null,
        timestamp: studyTime.toISOString(),
        source: "csv_upload",
      } : null,
    });
  }
  
  // Sort by risk bucket priority, then by risk score
  return items.sort((a, b) => {
    const bucketOrder = { CRITICAL: 0, REVIEW: 1, CLEAR: 2 };
    const aOrder = bucketOrder[a.triage?.risk_bucket || "CLEAR"];
    const bOrder = bucketOrder[b.triage?.risk_bucket || "CLEAR"];
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.triage?.risk_score || 0) - (a.triage?.risk_score || 0);
  });
};

export const mockQueueState: QueueState = {
  status: "up_to_date",
  pendingCount: 0,
  lastUpdated: new Date(),
};

// Analytics data generators - With Kroix
export const generateMTTRData = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round((1 + Math.random() * 1.9) * 10) / 10, // 1-2.9 minutes
    });
  }
  return data;
};

export const generateThroughputData = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(28 + Math.random() * 7), // 28-35 scans per hour
    });
  }
  return data;
};

export const generateOverrideData = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(Math.random() * 12), // 0-12% override rate
    });
  }
  return data;
};

// Analytics data generators - Without Kroix (baseline)
export const generateMTTRDataBaseline = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round((5 + Math.random() * 2.5) * 10) / 10, // 5-7.5 minutes
    });
  }
  return data;
};

export const generateThroughputDataBaseline = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(8 + Math.random() * 7), // 8-15 scans per hour
    });
  }
  return data;
};

export const generateOverrideDataBaseline = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(20 + Math.random() * 10), // 20-30% override rate
    });
  }
  return data;
};
