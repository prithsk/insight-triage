-- Create table to store vector embeddings metadata
CREATE TABLE public.embeddings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_type TEXT NOT NULL, -- 'study_finding', 'medical_literature', 'historical_decision'
    source_id UUID, -- Reference to the source record
    content_hash TEXT NOT NULL, -- To avoid duplicate embeddings
    pinecone_id TEXT NOT NULL UNIQUE, -- ID in Pinecone
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- Policies for embeddings
CREATE POLICY "Authenticated users can view embeddings"
ON public.embeddings
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage embeddings"
ON public.embeddings
FOR ALL
USING (true);

-- Create table for medical literature (knowledge base)
CREATE TABLE public.medical_literature (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT, -- e.g., 'ACR Guidelines', 'RadiologyInfo'
    category TEXT, -- e.g., 'chest_xray', 'pulmonary', 'cardiac'
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_literature ENABLE ROW LEVEL SECURITY;

-- Policies for medical literature
CREATE POLICY "Authenticated users can view medical literature"
ON public.medical_literature
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage medical literature"
ON public.medical_literature
FOR ALL
USING (true);

-- Add trigger for updated_at on embeddings
CREATE TRIGGER update_embeddings_updated_at
    BEFORE UPDATE ON public.embeddings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on medical_literature
CREATE TRIGGER update_medical_literature_updated_at
    BEFORE UPDATE ON public.medical_literature
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();