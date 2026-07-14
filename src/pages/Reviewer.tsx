import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BucketBadge } from "@/components/ui/bucket-badge";
import { RiskScore } from "@/components/ui/risk-score";
import { LabFlags } from "@/components/ui/lab-flags";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGE } from "@/lib/constants";
import { useStudy, useSubmitFeedback, FeedbackType } from "@/hooks/useStudies";
import { useDicomImage } from "@/hooks/useDicomImage";
import { useNavigate } from "react-router-dom";
import {
  Check,
  AlertTriangle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  Activity,
  Loader2,
  ImageOff,
  ArrowLeft,
  Beaker,
  MessageSquare,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorklistItem } from "@/lib/types";
import { HeatmapOverlay, useHeatmapType } from "@/components/reviewer/HeatmapOverlay";

// Legacy circle ROI — used only when heatmap type is NOT gradcam
interface ROIRegion { x: number; y: number; intensity: number; label: string }

function parseROIHeatmap(raw: string | null): ROIRegion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(atob(raw));
    if (Array.isArray(parsed)) return (parsed as ROIRegion[]).filter(r => r.label !== 'clear');
    return [];
  } catch { return []; }
}

function getRegionLabel(label: string): string {
  const labels: Record<string, string> = {
    right_lung: 'Right Lung', left_lung: 'Left Lung',
    lower_lobes: 'Lower Lobes', upper_lobes: 'Upper Lobes',
    consolidation: 'Consolidation',
  };
  return labels[label] || LANGUAGE.AREA_OF_INTEREST;
}

export default function Reviewer() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();

  // Fetch study data from database
  const { data: studyData, isLoading } = useStudy(studyId || undefined);
  
  // Fetch DICOM image if file_path exists
  const { imageUrl, isLoading: imageLoading, error: imageError } = useDicomImage(studyData?.file_path || null);
  
  const [showROI, setShowROI] = useState(true);
  const [roiOpacity, setRoiOpacity] = useState([70]);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

  const imgRef     = useRef<HTMLImageElement>(null);
  const submitFeedback = useSubmitFeedback();

  const roiHeatmapRaw = studyData?.triage_results?.[0]?.roi_heatmap_path ?? null;
  const { isGradCam } = useHeatmapType(roiHeatmapRaw);

  // Parse ROI regions from heatmap data - must be before early returns
  const roiRegions = useMemo(() => {
    if (isGradCam) return [];          // gradcam path — circles not needed
    return parseROIHeatmap(roiHeatmapRaw);
  }, [roiHeatmapRaw, isGradCam]);

  const syncImgDims = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setImgDims({ width: Math.round(r.width), height: Math.round(r.height) });
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(syncImgDims);
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [syncImgDims]);
  
  const handleFeedback = (type: FeedbackType) => {
    if (!studyData) return;
    
    const triageResult = studyData.triage_results?.[0];
    
    submitFeedback.mutate({
      studyId: studyData.id,
      triageResultId: triageResult?.id,
      feedbackType: type,
      notes: feedbackNote || undefined
    }, {
      onSuccess: () => {
        setSubmittedFeedback(type);
        setFeedbackNote("");
        setTimeout(() => setSubmittedFeedback(null), 2000);
      }
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-72px)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-landing-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!studyData) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-72px)] flex flex-col items-center justify-center gap-4">
          <p className="text-landing-muted text-lg">No study selected</p>
          <Link 
            to="/dashboard"
            className="px-5 py-2.5 bg-landing-primary text-white rounded-[10px] text-[14px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Transform to WorklistItem format for components
  const latestTriage = studyData.triage_results?.[0];
  const latestLab = studyData.lab_results?.[0];

  const item: WorklistItem = {
    study: {
      id: studyData.id,
      patient_hash: studyData.patient_hash,
      study_time: studyData.study_time,
      modality: studyData.modality,
      file_path: studyData.file_path,
      thumbnail_path: studyData.thumbnail_path,
      status: studyData.status,
      site_id: studyData.site_id,
      created_at: studyData.created_at,
      updated_at: studyData.updated_at
    },
    triage: latestTriage ? {
      id: latestTriage.id,
      study_id: latestTriage.study_id,
      risk_score: Number(latestTriage.risk_score),
      risk_bucket: latestTriage.risk_bucket,
      confidence: Number(latestTriage.confidence),
      roi_heatmap_path: latestTriage.roi_heatmap_path,
      model_version: latestTriage.model_version,
      inference_time_ms: latestTriage.inference_time_ms,
      created_at: latestTriage.created_at
    } : null,
    labs: latestLab ? {
      id: latestLab.id,
      study_id: latestLab.study_id,
      co2: latestLab.co2 ? Number(latestLab.co2) : null,
      ph: latestLab.ph ? Number(latestLab.ph) : null,
      o2: latestLab.o2 ? Number(latestLab.o2) : null,
      wbc: latestLab.wbc ? Number(latestLab.wbc) : null,
      crp: latestLab.crp ? Number(latestLab.crp) : null,
      procalcitonin: latestLab.procalcitonin ? Number(latestLab.procalcitonin) : null,
      source: latestLab.source,
      timestamp: latestLab.timestamp
    } : null
  };
  
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-72px)] flex flex-col">
        {/* Header Bar */}
        <section className="px-8 py-4 bg-white border-b border-[rgba(0,0,0,0.06)]">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                to="/dashboard"
                className="flex items-center gap-2 text-landing-muted hover:text-landing-heading transition-colors text-[14px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              
              <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
              
              <div>
                <h1 className="font-serif text-[20px] text-landing-heading font-medium">
                  {item.study.patient_hash}
                </h1>
                <p className="text-[13px] text-landing-muted font-mono">
                  Study ID: {item.study.id.slice(0, 8)}...
                </p>
              </div>
              
              {item.triage && (
                <BucketBadge bucket={item.triage.risk_bucket} />
              )}

              {/* Ask Assistant with study context */}
              {item.triage && (
                <button
                  onClick={() => navigate(`/assistant?studyId=${item.study.id}`)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[13px] font-medium bg-landing-primary/10 text-landing-primary hover:bg-landing-primary/20 transition-colors"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Ask Assistant
                </button>
              )}
            </div>
            
            {/* Viewer Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleZoomIn}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRotate}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleReset}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white text-landing-body hover:bg-landing-primary/10 hover:text-landing-primary transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {zoom !== 1 && (
                <span className="text-[13px] text-landing-muted font-mono ml-2">{(zoom * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>
        </section>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Image Viewer */}
          <div className="flex-1 flex flex-col bg-[#1a1a1a]">
            <div className="flex-1 relative flex items-center justify-center overflow-hidden p-6">
              <div 
                className="w-full h-full max-w-4xl max-h-full flex items-center justify-center transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                {imageLoading ? (
                  <div className="flex flex-col items-center justify-center text-zinc-500">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span className="text-sm">Loading image...</span>
                  </div>
                ) : imageUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Wrapper keeps overlay perfectly registered to rendered img */}
                    <div className="relative inline-flex">
                      <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="DICOM/Medical Image"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        style={{ filter: 'contrast(1.1) brightness(0.95)', display: 'block' }}
                        onLoad={syncImgDims}
                      />

                      {/* Grad-CAM heatmap overlay (EfficientNet-B4 path) */}
                      {showROI && isGradCam && item.triage && item.triage.risk_bucket !== "CLEAR" && (
                        <HeatmapOverlay
                          roiHeatmap={roiHeatmapRaw}
                          width={imgDims.width}
                          height={imgDims.height}
                          opacity={roiOpacity[0] / 100}
                          className="rounded-xl"
                        />
                      )}
                    </div>

                    {/* Legacy circle overlays (Gemini / synthetic path) */}
                    {showROI && !isGradCam && item.triage && item.triage.risk_bucket !== "CLEAR" && roiRegions.length > 0 &&
                      roiRegions.map((region, index) => {
                        const size = 80 + region.intensity * 60;
                        return (
                          <div
                            key={`roi-${index}-${region.label}`}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${region.x * 100}%`,
                              top: `${region.y * 100}%`,
                              transform: 'translate(-50%, -50%)',
                              opacity: roiOpacity[0] / 100,
                              width: `${size}px`,
                              height: `${size}px`,
                            }}
                          >
                            <div
                              className="w-full h-full rounded-full"
                              style={{
                                border: '3px solid #FF6B00',
                                background: `radial-gradient(circle at center, rgba(255,107,0,${0.25 + region.intensity * 0.2}) 0%, rgba(255,107,0,${0.1 + region.intensity * 0.1}) 60%, transparent 100%)`,
                                boxShadow: `0 0 ${15 + region.intensity * 10}px rgba(255,107,0,0.4), inset 0 0 ${10 + region.intensity * 8}px rgba(255,107,0,0.2)`,
                              }}
                            />
                            <div
                              className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg"
                              style={{ background: 'linear-gradient(135deg,#FF6B00 0%,#E05500 100%)', color: 'white' }}
                            >
                              {getRegionLabel(region.label)}
                            </div>
                          </div>
                        );
                      })
                    }

                    {/* Hard-coded circles when no parsed regions (synthetic fallback) */}
                    {showROI && !isGradCam && item.triage && item.triage.risk_bucket !== "CLEAR" && roiRegions.length === 0 && (
                      <>
                        <div className="absolute pointer-events-none" style={{ left: '35%', top: '55%', transform: 'translate(-50%,-50%)', opacity: roiOpacity[0] / 100, width: '120px', height: '120px' }}>
                          <div className="w-full h-full rounded-full" style={{ border: '3px solid #FF6B00', background: 'radial-gradient(circle at center,rgba(255,107,0,0.35) 0%,rgba(255,107,0,0.15) 60%,transparent 100%)', boxShadow: '0 0 20px rgba(255,107,0,0.4),inset 0 0 15px rgba(255,107,0,0.2)' }} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg" style={{ background: 'linear-gradient(135deg,#FF6B00 0%,#E05500 100%)', color: 'white' }}>Right Lung</div>
                        </div>
                        {item.triage.risk_bucket === "CRITICAL" && (
                          <>
                            <div className="absolute pointer-events-none" style={{ left: '65%', top: '45%', transform: 'translate(-50%,-50%)', opacity: roiOpacity[0] / 100, width: '100px', height: '100px' }}>
                              <div className="w-full h-full rounded-full" style={{ border: '3px solid #FF6B00', background: 'radial-gradient(circle at center,rgba(255,107,0,0.3) 0%,rgba(255,107,0,0.12) 60%,transparent 100%)', boxShadow: '0 0 18px rgba(255,107,0,0.35),inset 0 0 12px rgba(255,107,0,0.18)' }} />
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg" style={{ background: 'linear-gradient(135deg,#FF6B00 0%,#E05500 100%)', color: 'white' }}>Left Lung</div>
                            </div>
                            <div className="absolute pointer-events-none" style={{ left: '50%', top: '70%', transform: 'translate(-50%,-50%)', opacity: roiOpacity[0] / 100, width: '130px', height: '130px' }}>
                              <div className="w-full h-full rounded-full" style={{ border: '3px solid #FF6B00', background: 'radial-gradient(circle at center,rgba(255,107,0,0.4) 0%,rgba(255,107,0,0.18) 60%,transparent 100%)', boxShadow: '0 0 25px rgba(255,107,0,0.45),inset 0 0 18px rgba(255,107,0,0.25)' }} />
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg" style={{ background: 'linear-gradient(135deg,#FF6B00 0%,#E05500 100%)', color: 'white' }}>Lower Lobes</div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-xl overflow-hidden flex items-center justify-center">
                    {imageError ? (
                      <div className="flex flex-col items-center text-zinc-500">
                        <ImageOff className="w-16 h-16 mb-4 opacity-50" />
                        <span className="text-sm">Failed to load image</span>
                        <span className="text-xs text-zinc-600 mt-1">{imageError}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-600">
                        <Activity className="w-32 h-32 opacity-20" />
                        <span className="text-sm mt-4">No image file uploaded</span>
                        <span className="text-xs text-zinc-700 mt-1">Upload a DICOM file to view it here</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right: Sidebar */}
          <div className="w-[340px] border-l border-[rgba(0,0,0,0.06)] bg-white flex flex-col overflow-auto">
            {/* Priority Panel */}
            {item.triage && (
              <div className="p-5 border-b border-[rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-landing-primary" />
                  <span className="text-[12px] font-medium text-landing-muted uppercase tracking-wider">
                    {LANGUAGE.PRIORITY}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <BucketBadge bucket={item.triage.risk_bucket} size="lg" />
                  <RiskScore 
                    score={item.triage.risk_score}
                    bucket={item.triage.risk_bucket}
                    size="lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  <div>
                    <p className="text-[12px] text-landing-muted mb-1">Confidence</p>
                    <p className="font-mono font-medium text-landing-heading">
                      {(item.triage.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-landing-muted mb-1">Model</p>
                    <p className="font-mono text-[13px] text-landing-body">{item.triage.model_version}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* ROI Controls */}
            <div className="p-5 border-b border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-landing-primary" />
                <span className="text-[12px] font-medium text-landing-muted uppercase tracking-wider">
                  ROI Controls
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] text-landing-body">Show {LANGUAGE.AREA_OF_INTEREST}</span>
                <Switch checked={showROI} onCheckedChange={setShowROI} />
              </div>
              {showROI && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-landing-muted">Opacity</span>
                    <span className="font-mono text-landing-body">{roiOpacity[0]}%</span>
                  </div>
                  <Slider
                    value={roiOpacity}
                    onValueChange={setRoiOpacity}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
              <p className="text-[12px] text-landing-muted mt-3">
                {isGradCam
                  ? "Grad-CAM spatial activation map from EfficientNet-B4. "
                  : "Inferred region-of-interest overlay. "}
                {LANGUAGE.NON_DIAGNOSTIC}.
              </p>
            </div>
            
            {/* Lab Panel */}
            <div className="p-5 border-b border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-landing-primary" />
                  <span className="text-[12px] font-medium text-landing-muted uppercase tracking-wider">
                    Lab Values
                  </span>
                </div>
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Simulated — not a real lab draw
                </span>
              </div>
              {item.labs ? (
                <>
                  <LabFlags labs={item.labs} />
                  <p className="text-[12px] text-landing-muted mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                    Source: {item.labs.source || 'Unknown'}
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-landing-muted">{LANGUAGE.EMPTY.LABS}</p>
              )}
            </div>
            
            {/* Feedback Panel */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-landing-primary" />
                <span className="text-[12px] font-medium text-landing-muted uppercase tracking-wider">
                  Feedback
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => handleFeedback("CORRECT_PRIORITY")}
                  disabled={submitFeedback.isPending}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-center transition-colors",
                    submittedFeedback === "CORRECT_PRIORITY" 
                      ? "bg-emerald-50 border-emerald-300" 
                      : "hover:bg-landing-bg"
                  )}
                >
                  <Check className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-[11px] text-landing-body">Correct</span>
                </button>
                <button
                  onClick={() => handleFeedback("FALSE_ALARM")}
                  disabled={submitFeedback.isPending}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-center transition-colors",
                    submittedFeedback === "FALSE_ALARM" 
                      ? "bg-amber-50 border-amber-300" 
                      : "hover:bg-landing-bg"
                  )}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-[11px] text-landing-body">False Alarm</span>
                </button>
                <button
                  onClick={() => handleFeedback("MISSED_URGENCY")}
                  disabled={submitFeedback.isPending}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-center transition-colors",
                    submittedFeedback === "MISSED_URGENCY" 
                      ? "bg-red-50 border-red-300" 
                      : "hover:bg-landing-bg"
                  )}
                >
                  <AlertCircle className="w-4 h-4 text-red-600 mb-1" />
                  <span className="text-[11px] text-landing-body">Missed</span>
                </button>
              </div>
              <Textarea
                placeholder="Add quick note (optional)"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="h-20 resize-none bg-landing-bg border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted rounded-[10px] text-[14px]"
              />
            </div>
            
            {/* Spacer */}
            <div className="flex-1" />
          </div>
        </div>
        
        {/* Footer Disclaimer */}
        <div className="px-8 py-3 bg-white border-t border-[rgba(0,0,0,0.06)] text-center">
          <p className="text-[12px] text-landing-muted">
            {LANGUAGE.DISCLAIMER}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
