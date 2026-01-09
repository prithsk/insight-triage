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
  const statuses: StudyStatus[] = ["pending", "triaged", "reviewed", "archived"];
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
    
    items.push({
      study: {
        id: `STU-${generateId()}`,
        patientHash: `PAT-${generateId()}`,
        studyTime,
        modality: "CXR",
        status: randomStatus(),
        createdAt: studyTime,
      },
      triage: {
        id: `TRI-${generateId()}`,
        studyId: `STU-${generateId()}`,
        riskScore: randomRiskScore(bucket),
        riskBucket: bucket,
        confidence: 0.7 + Math.random() * 0.28,
        modelVersion: "v0.1.2",
        createdAt: new Date(studyTime.getTime() + 5000),
      },
      labs: hasLabs ? {
        id: `LAB-${generateId()}`,
        studyId: `STU-${generateId()}`,
        co2: labs.co2,
        ph: labs.ph,
        o2: labs.o2,
        timestamp: studyTime,
        source: "csv_upload",
      } : null,
    });
  }
  
  // Sort by risk bucket priority, then by risk score
  return items.sort((a, b) => {
    const bucketOrder = { CRITICAL: 0, REVIEW: 1, CLEAR: 2 };
    const aOrder = bucketOrder[a.triage?.riskBucket || "CLEAR"];
    const bOrder = bucketOrder[b.triage?.riskBucket || "CLEAR"];
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.triage?.riskScore || 0) - (a.triage?.riskScore || 0);
  });
};

export const mockQueueState: QueueState = {
  status: "up_to_date",
  pendingCount: 0,
  lastUpdated: new Date(),
};

export const generateMTTRData = (): AnalyticsMetric[] => {
  const data: AnalyticsMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(8 + Math.random() * 15), // minutes
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
      value: Math.round(12 + Math.random() * 8), // scans per hour
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
      value: Math.round(Math.random() * 12), // override percentage
    });
  }
  return data;
};
