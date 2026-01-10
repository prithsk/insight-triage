-- Create enum for risk buckets
CREATE TYPE public.risk_bucket AS ENUM ('CRITICAL', 'REVIEW', 'CLEAR');

-- Create enum for study status
CREATE TYPE public.study_status AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'REVIEWED', 'ARCHIVED');

-- Create enum for feedback type
CREATE TYPE public.feedback_type AS ENUM ('CORRECT_PRIORITY', 'FALSE_ALARM', 'MISSED_URGENCY');

-- Studies table (chest X-ray studies)
CREATE TABLE public.studies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_hash TEXT NOT NULL,
    study_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    modality TEXT DEFAULT 'CXR',
    file_path TEXT,
    thumbnail_path TEXT,
    status public.study_status NOT NULL DEFAULT 'PENDING',
    site_id TEXT DEFAULT 'pilot-1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Triage results table (AI inference outputs)
CREATE TABLE public.triage_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    risk_score DECIMAL(4,3) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_bucket public.risk_bucket NOT NULL,
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    roi_heatmap_path TEXT,
    model_version TEXT DEFAULT 'v0.1.0',
    inference_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lab results table (COPD biomarkers)
CREATE TABLE public.lab_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    co2 DECIMAL(5,2),
    ph DECIMAL(4,3),
    o2 DECIMAL(5,2),
    wbc DECIMAL(5,2),
    crp DECIMAL(6,2),
    procalcitonin DECIMAL(6,3),
    source TEXT DEFAULT 'manual',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feedback events table (radiologist feedback)
CREATE TABLE public.feedback_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    triage_result_id UUID REFERENCES public.triage_results(id) ON DELETE CASCADE,
    user_id UUID,
    feedback_type public.feedback_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents table (for RAG/OCR)
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    file_path TEXT,
    status TEXT DEFAULT 'PENDING',
    approved BOOLEAN DEFAULT false,
    site_id TEXT DEFAULT 'pilot-1',
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read all data (pilot mode)
CREATE POLICY "Authenticated users can view studies" ON public.studies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert studies" ON public.studies
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update studies" ON public.studies
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view triage results" ON public.triage_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert triage results" ON public.triage_results
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view lab results" ON public.lab_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert lab results" ON public.lab_results
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view feedback" ON public.feedback_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert feedback" ON public.feedback_events
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view documents" ON public.documents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage documents" ON public.documents
    FOR ALL TO authenticated USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_studies_updated_at
    BEFORE UPDATE ON public.studies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for worklist updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.studies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_results;