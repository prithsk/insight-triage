import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Clock, TrendingUp, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Feature images
import featureAnalysis from "@/assets/landing/feature-analysis.jpg";
import workflowDicom from "@/assets/landing/workflow-dicom.jpg";
import workflowReport from "@/assets/landing/workflow-report.jpg";

// Animated Ellipses Component
const AnimatedEllipses = () => (
  <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3">
    {[0, 1, 2].map((i) => (
      <div 
        key={i} 
        className="w-8 h-8 rounded-full border-2 border-landing-primary/40 relative overflow-hidden"
      >
        {/* Animated dot inside each ellipse */}
        <div 
          className="absolute w-2 h-2 bg-landing-primary rounded-full animate-orbit"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      </div>
    ))}
  </div>
);

// Generate mock data for throughput comparison
const generateThroughputData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    withKroix: Math.floor(Math.random() * 15) + 35,
    withoutKroix: Math.floor(Math.random() * 10) + 18,
  }));
};

// Generate mock data for accuracy comparison
const generateAccuracyData = () => {
  return [
    { category: 'Critical Detection', withKroix: 95, withoutKroix: 78 },
    { category: 'False Positive Rate', withKroix: 8, withoutKroix: 22 },
    { category: 'Missed Urgency', withKroix: 3, withoutKroix: 15 },
    { category: 'Overall Accuracy', withKroix: 94, withoutKroix: 81 },
  ];
};

const Landing = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: "Hi, I'm interested in learning more about Kroix for my radiology practice.",
  });

  const throughputData = useMemo(() => generateThroughputData(), []);
  const accuracyData = useMemo(() => generateAccuracyData(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: formData,
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you within 24 hours.");
      setFormData({
        name: "",
        email: "",
        institution: "",
        message: "Hi, I'm interested in learning more about Kroix for my radiology practice.",
      });
      setIsContactOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      {/* Orbit animation for ellipses */}
      <style>{`
        @keyframes orbit {
          0% { transform: translate(0, 0); }
          25% { transform: translate(16px, 8px); }
          50% { transform: translate(20px, 16px); }
          75% { transform: translate(8px, 20px); }
          100% { transform: translate(0, 0); }
        }
        .animate-orbit {
          animation: orbit 2s ease-in-out infinite;
        }
      `}</style>

      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-landing-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">
              Kroix
            </span>
          </div>
          <div className="flex items-center gap-8">
            <Link 
              to="/about" 
              className="text-landing-body hover:text-landing-heading transition-colors text-[15px]"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-landing-body hover:text-landing-heading transition-colors text-[15px]"
            >
              Contact
            </Link>
            <Link to="/login">
              <button className="px-5 py-2.5 rounded-[10px] border border-landing-primary text-landing-primary hover:bg-landing-primary hover:text-white transition-colors text-[15px]">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-32">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="max-w-xl relative">
              <h1 className="font-serif text-[64px] lg:text-[72px] leading-[1.05] font-medium text-landing-heading mb-8 tracking-[-0.02em]">
                Next-generation AI for <em className="not-italic underline decoration-landing-primary/30 decoration-2 underline-offset-4">clinical radiology</em>.
              </h1>
              <AnimatedEllipses />
              <p className="text-xl text-landing-body leading-relaxed mb-10">
                Intelligent triage prioritization that moves <strong className="font-semibold text-landing-heading">critical respiratory cases</strong> to the front—delivering faster reads with <em>measurable accuracy</em>.
              </p>
              <div className="flex flex-wrap gap-4">
                <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                  <DialogTrigger asChild>
                    <button className="px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2">
                      Request demo
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-landing-bg border-[rgba(0,0,0,0.06)]">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl text-landing-heading">Request a Demo</DialogTitle>
                      <DialogDescription className="text-landing-body">
                        Fill out the form below and we'll get back to you within 24 hours.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-landing-body">Name</Label>
                        <Input
                          id="contact-name"
                          placeholder="Dr. Jane Smith"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-landing-body">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="jane@hospital.org"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-institution" className="text-landing-body">Institution (Optional)</Label>
                        <Input
                          id="contact-institution"
                          placeholder="General Hospital"
                          value={formData.institution}
                          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message" className="text-landing-body">Message</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us about your radiology workflow..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={3}
                          className="bg-white border-[rgba(0,0,0,0.06)] text-landing-heading"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          "Send Message"
                        )}
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Link to="/dashboard">
                  <button className="px-7 py-3.5 border border-landing-primary text-landing-primary rounded-[10px] text-[15px] font-medium hover:bg-landing-primary hover:text-white transition-colors">
                    See how it works
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Abstract visual */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-[480px] h-[480px]">
                {/* Organic flowing gradient */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-landing-secondary/20 via-landing-primary/10 to-landing-bg blur-3xl" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-landing-primary/15 to-landing-secondary/5 blur-2xl" />
                {/* Central abstract form */}
                <div className="absolute inset-16 rounded-full border border-landing-primary/10 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 rounded-full bg-gradient-to-br from-landing-primary/8 to-transparent" />
                </div>
                {/* Subtle scan silhouette lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 480 480">
                  <ellipse cx="240" cy="200" rx="100" ry="120" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                  <ellipse cx="240" cy="220" rx="80" ry="100" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                  <path d="M 180 320 Q 240 380 300 320" fill="none" stroke="#2F6F5E" strokeWidth="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Feature 1 - Comprehensive Analysis */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Analysis
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                <strong>Comprehensive</strong> Analysis
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                AI-powered detection that identifies <em>critical findings</em> across every chest X-ray study.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  <strong className="font-medium text-landing-heading">Pneumonia</strong> and COPD pattern recognition
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Consolidation and <em>opacity mapping</em>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Integrated biomarker correlation
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden">
              <img 
                src={featureAnalysis} 
                alt="AI-powered chest X-ray analysis visualization" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Feature 2 - Real-time Processing with Chart */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 lg:order-1 relative h-[400px] rounded-2xl overflow-hidden bg-landing-bg/50 border border-[rgba(0,0,0,0.06)] p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-landing-heading mb-1">Scans Reviewed per Hour</h4>
                <p className="text-xs text-landing-muted">7-day comparison: with vs. without Kroix</p>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="withKroixGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6F5E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2F6F5E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="withoutKroixGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C8B85" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#7C8B85" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#7C8B85"
                    tick={{ fill: '#7C8B85', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  />
                  <YAxis 
                    stroke="#7C8B85"
                    tick={{ fill: '#7C8B85', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F6F7F4', 
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="withKroix" 
                    name="With Kroix"
                    stroke="#2F6F5E" 
                    fill="url(#withKroixGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="withoutKroix" 
                    name="Without Kroix"
                    stroke="#7C8B85" 
                    fill="url(#withoutKroixGradient)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="order-1 lg:order-2 max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Speed
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                Real-time <em className="not-italic underline decoration-landing-primary/30 decoration-2 underline-offset-4">Processing</em>
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                Sub-5 second inference times that fit <strong className="font-semibold text-landing-heading">seamlessly</strong> into existing workflows.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  <strong className="font-medium text-landing-heading">Immediate</strong> priority scoring
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Automatic worklist reordering
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  <em>Zero</em> workflow disruption
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Clinical-grade Accuracy with Comparison Chart */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-lg">
              <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
                Precision
              </span>
              <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
                Clinical-grade <strong>Accuracy</strong>
              </h2>
              <p className="text-lg text-landing-body leading-relaxed mb-6">
                Validated performance metrics that meet the demands of <em>clinical environments</em>.
              </p>
              <ul className="space-y-3 text-landing-body">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  <strong className="font-semibold text-landing-heading">95%</strong> critical case detection
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Continuous model refinement
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-landing-primary" />
                  Transparent <em>confidence scoring</em>
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden bg-landing-bg/50 border border-[rgba(0,0,0,0.06)] p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-landing-heading mb-1">Accuracy Comparison</h4>
                <p className="text-xs text-landing-muted">Radiologist performance: with vs. without Kroix (%)</p>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={accuracyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    stroke="#7C8B85"
                    tick={{ fill: '#7C8B85', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    stroke="#7C8B85"
                    tick={{ fill: '#4A5A54', fontSize: 10 }}
                    width={100}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F6F7F4', 
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="withKroix" 
                    name="With Kroix"
                    fill="#2F6F5E" 
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                  <Bar 
                    dataKey="withoutKroix" 
                    name="Without Kroix"
                    fill="#C4CCC8" 
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section - With Kroix logo */}
      <section className="py-24 px-8 bg-landing-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
              Workflow
            </span>
            <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em]">
              <em className="not-italic">Seamless</em> Integration
            </h2>
          </div>
          
          {/* Workflow strip with images */}
          <div className="flex items-center justify-center gap-6 lg:gap-12">
            {/* Input - DICOM */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white overflow-hidden">
                <img 
                  src={workflowDicom} 
                  alt="DICOM chest X-ray scan" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[14px] text-landing-body">DICOM Scan</span>
            </div>

            {/* Arrow */}
            <div className="hidden sm:block flex-shrink-0">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-landing-muted">
                <path d="M0 12H44M44 12L38 6M44 12L38 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            {/* AI - Kroix Logo */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl border border-landing-primary/20 bg-landing-primary/5 flex items-center justify-center">
                <span className="text-3xl lg:text-4xl font-serif font-semibold text-landing-primary tracking-tight">
                  Kroix
                </span>
              </div>
              <span className="text-[14px] text-landing-primary font-medium">AI Processing</span>
            </div>

            {/* Arrow */}
            <div className="hidden sm:block flex-shrink-0">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-landing-muted">
                <path d="M0 12H44M44 12L38 6M44 12L38 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Output - Report */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white overflow-hidden">
                <img 
                  src={workflowReport} 
                  alt="Priority triage report" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[14px] text-landing-body">Priority Report</span>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Impact Section */}
      <section className="py-32 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
              Clinical Impact
            </span>
            <h2 className="font-serif text-[40px] lg:text-[48px] leading-[1.1] text-landing-heading tracking-[-0.01em] mb-6">
              <strong>Measurable</strong> Outcomes
            </h2>
            <p className="text-lg text-landing-body max-w-2xl mx-auto">
              Real performance metrics that demonstrate the <em>value of AI-assisted triage</em> in clinical workflows.
            </p>
          </div>

          {/* 2x2 Metrics Grid with varied heights */}
          <div className="grid md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto">
            {/* Metric 1 - Taller */}
            <div className="text-center p-8 pb-12 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-landing-bg/50">
              <div className="w-12 h-12 rounded-xl border border-landing-primary flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-landing-primary" />
              </div>
              <div className="text-5xl font-serif font-medium text-landing-heading mb-3">40%</div>
              <div className="text-landing-heading font-medium text-[16px] mb-2">Faster Mean Time to Review</div>
              <p className="text-landing-muted text-sm">Critical cases reach radiologists sooner, reducing diagnostic delays.</p>
            </div>

            {/* Metric 2 - Shorter */}
            <div className="text-center p-8 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-landing-bg/50">
              <div className="w-12 h-12 rounded-xl border border-landing-primary flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-landing-primary" />
              </div>
              <div className="text-5xl font-serif font-medium text-landing-heading mb-3">25%</div>
              <div className="text-landing-heading font-medium text-[16px]">Increase in Throughput</div>
            </div>

            {/* Metric 3 - Shorter */}
            <div className="text-center p-8 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-landing-bg/50">
              <div className="w-12 h-12 rounded-xl border border-landing-primary flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-landing-primary" />
              </div>
              <div className="text-5xl font-serif font-medium text-landing-heading mb-3">95%</div>
              <div className="text-landing-heading font-medium text-[16px]">Critical Case Detection</div>
            </div>

            {/* Metric 4 - Taller */}
            <div className="text-center p-8 pb-12 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-landing-bg/50">
              <div className="w-12 h-12 rounded-xl border border-landing-primary flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-landing-primary" />
              </div>
              <div className="text-5xl font-serif font-medium text-landing-heading mb-3">&lt;5s</div>
              <div className="text-landing-heading font-medium text-[16px] mb-2">Average Inference Time</div>
              <p className="text-landing-muted text-sm">Near-instant analysis that doesn't slow down your workflow.</p>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h3 className="font-serif text-xl text-landing-heading"><strong>Reduce</strong> Delayed Diagnoses</h3>
              <p className="text-landing-body leading-relaxed">
                Critical respiratory findings are <em>automatically surfaced</em>, ensuring high-acuity cases receive immediate attention rather than waiting in FIFO queues.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl text-landing-heading"><strong>Optimize</strong> Radiologist Time</h3>
              <p className="text-landing-body leading-relaxed">
                Focus cognitive effort where it matters most. Kroix handles the initial triage, allowing radiologists to concentrate on <em>interpretation and diagnosis</em>.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl text-landing-heading"><strong>Quantify</strong> Workflow Improvements</h3>
              <p className="text-landing-body leading-relaxed">
                Built-in analytics track MTTR, throughput, and accuracy metrics—providing <strong className="font-semibold">clear ROI data</strong> for department leadership and administration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-landing-bg">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-[40px] lg:text-[56px] leading-[1.1] text-landing-heading mb-8 tracking-[-0.02em]">
            Ready to <em className="not-italic underline decoration-landing-primary/30 decoration-2 underline-offset-4">transform</em> your workflow?
          </h2>
          <p className="text-xl text-landing-body mb-10 max-w-xl mx-auto">
            Join leading radiology practices using Kroix to <strong className="font-semibold text-landing-heading">prioritize critical cases</strong> and improve patient outcomes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
              <DialogTrigger asChild>
                <button className="px-8 py-4 bg-landing-primary text-white rounded-[10px] text-[16px] font-medium hover:bg-[#265A4C] transition-colors flex items-center gap-2">
                  Request demo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </DialogTrigger>
            </Dialog>
            <Link to="/contact">
              <button className="px-8 py-4 border border-landing-primary text-landing-primary rounded-[10px] text-[16px] font-medium hover:bg-landing-primary hover:text-white transition-colors">
                Contact sales
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-landing-dark text-white/80">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
              <span className="text-2xl font-serif font-semibold text-white tracking-tight">
                Kroix
              </span>
              <p className="text-white/50 text-[14px] mt-2 max-w-xs">
                Next-generation AI for clinical radiology triage and prioritization.
              </p>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <p className="text-white/50 text-[13px] uppercase tracking-wide">Company</p>
                <div className="space-y-3">
                  <Link to="/about" className="block text-[15px] hover:text-white transition-colors">
                    About
                  </Link>
                  <Link to="/contact" className="block text-[15px] hover:text-white transition-colors">
                    Contact
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-white/50 text-[13px] uppercase tracking-wide">Legal</p>
                <div className="space-y-3">
                  <span className="block text-[15px] text-white/60">Privacy Policy</span>
                  <span className="block text-[15px] text-white/60">HIPAA Compliance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[14px] text-white/40">
              © 2025 Kroix. All rights reserved.
            </p>
            <p className="text-[13px] text-white/40">
              Non-diagnostic workflow tool. For clinical decision support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
