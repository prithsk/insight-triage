import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Brain, 
  Clock, 
  HeartPulse, 
  Shield, 
  TrendingUp, 
  Users,
  Stethoscope,
  AlertTriangle
} from "lucide-react";

export default function About() {
  const stats = [
    { value: "2.4M", label: "Pneumonia deaths annually worldwide" },
    { value: "30%", label: "Misdiagnosis rate in busy ERs" },
    { value: "72hrs", label: "Average delay for critical findings" },
  ];

  const features = [
    {
      icon: Clock,
      title: "Time-Critical Triage",
      description: "Every minute counts in respiratory emergencies. AI-powered prioritization ensures critical cases are seen first."
    },
    {
      icon: Brain,
      title: "Intelligent Analysis",
      description: "Deep learning models trained on millions of chest X-rays to detect subtle patterns invisible to the human eye."
    },
    {
      icon: HeartPulse,
      title: "Life-Saving Impact",
      description: "Faster detection of pneumonia, COPD exacerbations, and other respiratory conditions means better patient outcomes."
    },
    {
      icon: Shield,
      title: "Clinical Safety",
      description: "Non-diagnostic AI assistance that augments radiologist expertise while maintaining full physician control."
    },
  ];

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-critical/5" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-critical/10 text-critical px-4 py-2 rounded-full mb-6">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">A Healthcare Crisis</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Radiology Workflow is{" "}
              <span className="text-critical">Broken</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every day, critical findings get buried in overflowing worklists. Radiologists are overwhelmed.
              Patients suffer delays. We're building the solution.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 px-6 border-y border-border bg-surface/50">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-4xl font-bold text-primary mb-2">{stat.value}</p>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Stethoscope className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold">The Challenge</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-surface border-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-warning">Radiologist Burnout</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The average radiologist reads 50+ studies per day. Critical findings can be missed 
                    when buried among routine scans. Fatigue leads to errors.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-critical">Delayed Diagnoses</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Without intelligent prioritization, urgent pneumonia cases wait in queue 
                    while routine studies are processed first. Time lost is lives lost.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-16 px-6 bg-surface/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Brain className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold">Our Solution</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="bg-background border-border group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
                >
                  <CardContent className="pt-6">
                    <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Users className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold">Our Vision</h2>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              We envision a future where no critical finding goes unnoticed. Where AI augments 
              human expertise to deliver faster, more accurate diagnoses. Where every patient 
              receives timely care.
            </p>
            
            <div className="inline-flex items-center gap-2 text-clear">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">30% faster time to diagnosis in pilot studies</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            Kroix is a non-diagnostic workflow tool designed to assist radiologists. 
            All final clinical decisions are made by qualified physicians.
          </p>
        </footer>
      </div>
    </AppLayout>
  );
}