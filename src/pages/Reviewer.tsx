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

  /** True when the model returned something to draw. Drives honest empty copy. */
  const hasLocalization = isGradCam ? Boolean(roiHeatmapRaw) : roiRegions.length > 0;

  /**
   * Keyboard shortcuts. This screen is used for a full shift; reaching for the
   * mouse to confirm every study is the wrong ergonomic. Ignored while typing so
   * the note field still behaves normally.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "1": handleFeedback("CORRECT_PRIORITY"); break;
        case "2": handleFeedback("FALSE_ALARM"); break;
        case "3": handleFeedback("MISSED_URGENCY"); break;
        case "h": case "H": setShowROI(v => !v); break;
        case "r": case "R": handleReset(); break;
        case "+": case "=": handleZoomIn(); break;
        case "-": case "_": handleZoomOut(); break;
        case "[": handleRotate(); break;
        case "Escape": navigate("/dashboard"); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyData, feedbackNote]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-72px)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-kx-accent3" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!studyData) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-72px)] flex flex-col items-center justify-center gap-4">
          <p className="text-kx-muted text-lg">No study selected</p>
          <Link 
            to="/dashboard"
            className="px-5 py-2.5 bg-kx-accent3 text-white rounded-[10px] text-[14px] font-medium hover:opacity-90 transition-colors flex items-center gap-2"
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
        <section className="px-8 py-4 bg-white border-b border-kx-border">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                to="/dashboard"
                className="flex items-center gap-2 text-kx-muted hover:text-kx-ink transition-colors text-[14px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              
              <div className="h-6 w-px bg-kx-border" />
              
              <div>
                <h1 className="font-display text-[20px] text-kx-ink font-medium">
                  {item.study.patient_hash}
                </h1>
                <p className="text-[13px] text-kx-muted font-mono">
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[13px] font-medium bg-kx-accent3/10 text-kx-accent3 hover:bg-kx-accent3/20 transition-colors"
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
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-kx-border bg-white text-kx-muted hover:bg-kx-accent3/10 hover:text-kx-accent3 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-kx-border bg-white text-kx-muted hover:bg-kx-accent3/10 hover:text-kx-accent3 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRotate}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-kx-border bg-white text-kx-muted hover:bg-kx-accent3/10 hover:text-kx-accent3 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleReset}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] border border-kx-border bg-white text-kx-muted hover:bg-kx-accent3/10 hover:text-kx-accent3 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {zoom !== 1 && (
                <span className="text-[13px] text-kx-muted font-mono ml-2">{(zoom * 100).toFixed(0)}%</span>
              )}
              <span
                className="hidden xl:inline font-mono text-[11px] text-kx-muted ml-3"
                title="1 correct · 2 over-called · 3 under-called · H heatmap · R reset · +/− zoom · [ rotate · Esc back"
              >
                ⌨ shortcuts
              </span>
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
                                border: '3px solid #E8503A',
                                background: `radial-gradient(circle at center, rgba(232,80,58,${0.25 + region.intensity * 0.2}) 0%, rgba(232,80,58,${0.1 + region.intensity * 0.1}) 60%, transparent 100%)`,
                                boxShadow: `0 0 ${15 + region.intensity * 10}px rgba(232,80,58,0.4), inset 0 0 ${10 + region.intensity * 8}px rgba(232,80,58,0.2)`,
                              }}
                            />
                            <div
                              className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg"
                              style={{ background: 'linear-gradient(135deg,#E8503A 0%,#C43A26 100%)', color: 'white' }}
                            >
                              {getRegionLabel(region.label)}
                            </div>
                          </div>
                        );
                      })
                    }

                    {/* REMOVED: hardcoded "synthetic fallback" ROI circles.
                        When no heatmap data existed, this drew circles at fixed
                        coordinates (35%/55% "Right Lung", plus two more for
                        CRITICAL) over the real patient image. A radiologist
                        reading that sees the model localizing a finding it never
                        localized. Absence of localization is now stated in the
                        sidebar instead of illustrated with invented regions. */}
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
          
          {/* Right: Sidebar. Scrolls, but the decision bar below it does not —
              confirming or overruling the call is the actual job and should never
              require hunting for it. */}
          <div className="w-[360px] border-l border-kx-border bg-white flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
            {/* Priority Panel */}
            {item.triage && (
              <div className="p-5 border-b border-kx-border">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-kx-accent3" />
                  <span className="text-[12px] font-medium text-kx-muted uppercase tracking-wider">
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
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-kx-border">
                  <div>
                    <p className="text-[12px] text-kx-muted mb-1">Confidence</p>
                    <p className="font-mono font-medium text-kx-ink">
                      {(item.triage.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-kx-muted mb-1">Inference</p>
                    <p className="font-mono font-medium text-kx-ink">
                      {item.triage.inference_time_ms != null
                        ? `${item.triage.inference_time_ms}ms`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-kx-muted mb-1">Model</p>
                    <p className="font-mono text-[12px] text-kx-muted truncate" title={item.triage.model_version ?? ""}>
                      {item.triage.model_version ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* ROI Controls */}
            <div className="p-5 border-b border-kx-border">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-kx-accent3" />
                <span className="text-[12px] font-medium text-kx-muted uppercase tracking-wider">
                  ROI Controls
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] text-kx-muted">Show {LANGUAGE.AREA_OF_INTEREST}</span>
                <Switch checked={showROI} onCheckedChange={setShowROI} />
              </div>
              {showROI && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-kx-muted">Opacity</span>
                    <span className="font-mono text-kx-muted">{roiOpacity[0]}%</span>
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
              {/* State what evidence actually exists. Previously, when no
                  localization data was available, the viewer drew invented
                  circles rather than saying so. */}
              {hasLocalization ? (
                <p className="text-[12px] text-kx-muted mt-3">
                  {isGradCam
                    ? "Grad-CAM spatial activation map from EfficientNet-B4. "
                    : "Inferred region-of-interest overlay. "}
                  {LANGUAGE.NON_DIAGNOSTIC}.
                </p>
              ) : (
                <p className="text-[12px] text-kx-muted mt-3">
                  <span className="text-kx-ink font-medium">No localization for this study.</span>{" "}
                  The score stands on its own; the model did not return a region map, so
                  nothing is highlighted on the image. {LANGUAGE.NON_DIAGNOSTIC}.
                </p>
              )}
            </div>

            {/* Lab Panel */}
            <div className="p-5 border-b border-kx-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-kx-accent3" />
                  <span className="text-[12px] font-medium text-kx-muted uppercase tracking-wider">
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
                  <p className="text-[12px] text-kx-muted mt-4 pt-4 border-t border-kx-border">
                    Source: {item.labs.source || 'Unknown'}
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-kx-muted">{LANGUAGE.EMPTY.LABS}</p>
              )}
            </div>
            
            {/* Feedback Panel */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-kx-accent3" />
                <span className="text-[12px] font-medium text-kx-muted uppercase tracking-wider">
                  Feedback
                </span>
              </div>
              <Textarea
                placeholder="Add a note (optional) — attached to whichever call you make below"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="h-20 resize-none bg-kx-surface border-kx-border text-kx-ink placeholder:text-kx-muted rounded-[10px] text-[14px]"
              />
            </div>
            </div>

            {/* Decision bar — pinned. Confirming or overruling the model is the
                task; it should not sit below a scroll. */}
            <div className="border-t border-kx-border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-kx-muted uppercase tracking-wider">
                  Your call
                </span>
                <span className="font-mono text-[11px] text-kx-muted">1 · 2 · 3</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: "CORRECT_PRIORITY", key: "1", Icon: Check, label: "Correct", on: "bg-kx-accent3 border-kx-accent3", tint: "text-kx-accent3" },
                  { type: "FALSE_ALARM", key: "2", Icon: AlertTriangle, label: "Over-called", on: "bg-amber-500 border-amber-500", tint: "text-amber-600" },
                  { type: "MISSED_URGENCY", key: "3", Icon: AlertCircle, label: "Under-called", on: "bg-kx-critical border-kx-critical", tint: "text-kx-critical" },
                ] as const).map(({ type, key, Icon, label, on, tint }) => {
                  const active = submittedFeedback === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleFeedback(type)}
                      disabled={submitFeedback.isPending}
                      title={`${label}  (${key})`}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-colors disabled:opacity-50",
                        active ? `${on} text-white` : "border-kx-border hover:bg-kx-surface"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", active ? "text-white" : tint)} />
                      <span className={cn("text-[12px] font-medium", active ? "text-white" : "text-kx-ink")}>
                        {label}
                      </span>
                      <span className={cn("absolute top-1.5 right-2 font-mono text-[10px]", active ? "text-white/60" : "text-kx-muted/60")}>
                        {key}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11.5px] text-kx-muted mt-3 leading-relaxed">
                Over-called and under-called are the ones that improve the model. Disagreement
                is the signal.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer Disclaimer */}
        <div className="px-8 py-3 bg-white border-t border-kx-border text-center">
          <p className="text-[12px] text-kx-muted">
            {LANGUAGE.DISCLAIMER}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
