// Kroix Language Constants - Non-Diagnostic Compliance
// NEVER use diagnosis-related words in UI

export const LANGUAGE = {
  // Allowed terminology
  RISK_SCORE: "Risk Score",
  PRIORITY: "Priority",
  NEEDS_REVIEW: "Needs Review",
  AREA_OF_INTEREST: "Area of Interest",
  SUGGESTED_PRIORITY: "Suggested Priority",
  WORKFLOW_ONLY: "For workflow prioritization only",
  NON_DIAGNOSTIC: "Non-diagnostic",
  
  // Disclaimer - ALWAYS visible on reviewer
  DISCLAIMER: "Non-diagnostic. For workflow prioritization only.",
  
  // Bucket labels
  BUCKETS: {
    CRITICAL: "CRITICAL",
    REVIEW: "REVIEW", 
    CLEAR: "CLEAR",
  },
  
  // Status labels
  STATUS: {
    PENDING: "Pending",
    TRIAGED: "Triaged",
    REVIEWED: "Reviewed",
    ARCHIVED: "Archived",
    ERROR: "Error",
  },
  
  // Empty states
  EMPTY: {
    WORKLIST: "No studies in queue",
    PREVIEW: "Select a study to review",
    LABS: "No lab data available for this study",
    EXPLANATION: "Explanation temporarily unavailable",
  },
  
  // Queue status
  QUEUE: {
    TRIAGING: "Triaging...",
    UP_TO_DATE: "Up to date",
    DEGRADED: "Service degraded",
  },
} as const;

// Forbidden words - for validation/linting
export const FORBIDDEN_WORDS = [
  "diagnosis",
  "diagnosed",
  "detected",
  "confirmed",
  "you have",
  "this is COPD",
  "pneumonia found",
  "positive",
  "negative",
] as const;
