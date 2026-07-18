import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Building2,
  MessageSquare,
  Send,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  contactFormSchema,
  sanitizeString,
  logSecurityEvent,
  checkRateLimit,
} from "@/lib/security";
import { z } from "zod";
import { Reveal } from "@/components/ui/reveal";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: "",
  });

  const validateField = (field: keyof typeof formData, value: string) => {
    try {
      const fieldSchema = contactFormSchema.shape[field];
      fieldSchema.parse(value);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [field]: error.errors[0]?.message || "Invalid input",
        }));
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    const sanitized = sanitizeString(value);
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
    setTimeout(() => validateField(field, sanitized), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateLimit = checkRateLimit("contact-form", 3, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      toast.error("Too many submissions. Please wait a few minutes.");
      logSecurityEvent("rate_limit", { form: "contact", remainingMs: rateLimit.resetInMs });
      return;
    }

    try {
      const validatedData = contactFormSchema.parse(formData);
      setErrors({});
      setIsSubmitting(true);

      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: validatedData.name,
          email: validatedData.email,
          institution: validatedData.institution || undefined,
          message: validatedData.message,
        },
      });

      if (error) throw new Error(error.message || "Failed to send message");

      toast.success("Message sent! We'll get back to you within 24 hours.");
      setFormData({ name: "", email: "", institution: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        logSecurityEvent("validation_failure", { form: "contact", fields: Object.keys(fieldErrors) });
        toast.error("Please fix the errors in the form");
      } else {
        console.error("Contact form error:", error);
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors ${
      hasError ? "border-[#B4453A] focus:border-[#B4453A]" : ""
    }`;

  const contactInfo = [
    { icon: Mail, label: "Email", value: "hello@kroix.health", description: "General inquiries" },
    { icon: Building2, label: "Partnerships", value: "partners@kroix.health", description: "Hospital integrations" },
    { icon: Clock, label: "Response Time", value: "< 24 hours", description: "Business days" },
  ];

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
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
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">
              Kroix
            </span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">
              About
            </Link>
            <Link to="/contact" className="text-landing-heading font-medium text-[15px]">
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

      {/* Hero + Form */}
      <section className="relative pt-40 pb-24 px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#EDF1EF]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-landing-accent text-[13px] font-medium tracking-wide uppercase mb-4 block">
              Get in Touch
            </span>
            <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.1] text-landing-heading mb-6 tracking-[-0.01em]">
              Let's talk about your workflow.
            </h1>
            <p className="text-lg text-landing-body max-w-xl mx-auto">
              Whether you're exploring AI triage for your radiology department or have
              questions about our platform, we'd love to hear from you.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact Cards */}
            <div className="md:col-span-1 space-y-4">
              {contactInfo.map((item, index) => (
                <Reveal
                  key={item.label}
                  delayMs={index * 90}
                  className="p-5 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] hover:border-landing-primary/30 transition-colors"
                >
                  <item.icon className="w-7 h-7 text-landing-primary mb-3" />
                  <p className="text-[11px] text-landing-muted uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="font-medium text-landing-heading">{item.value}</p>
                  <p className="text-sm text-landing-body mt-1">{item.description}</p>
                </Reveal>
              ))}

              <Reveal delayMs={270} className="p-5 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)]">
                <MapPin className="w-7 h-7 text-landing-primary mb-3" />
                <p className="text-[11px] text-landing-muted uppercase tracking-wide mb-1">Location</p>
                <p className="font-medium text-landing-heading">Remote-First</p>
                <p className="text-sm text-landing-body mt-1">Serving healthcare globally</p>
              </Reveal>
            </div>

            {/* Contact Form */}
            <Reveal delayMs={100} className="md:col-span-2 p-7 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-6">
                <Send className="w-5 h-5 text-landing-primary" />
                <h2 className="font-serif text-xl text-landing-heading">Send a Message</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-landing-body text-[14px]">Name</Label>
                    <Input
                      id="name"
                      placeholder="Dr. Jane Smith"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      maxLength={100}
                      required
                      className={`bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors ${errors.name ? "border-red-400" : ""}`}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-landing-body text-[14px]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@hospital.org"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      maxLength={255}
                      required
                      className={`bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors ${errors.email ? "border-red-400" : ""}`}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-landing-body text-[14px]">Institution (Optional)</Label>
                  <Input
                    id="institution"
                    placeholder="General Hospital"
                    value={formData.institution}
                    onChange={(e) => handleChange("institution", e.target.value)}
                    maxLength={200}
                    className={`bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted h-11 rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors ${errors.institution ? "border-red-400" : ""}`}
                    aria-describedby={errors.institution ? "institution-error" : undefined}
                  />
                  {errors.institution && (
                    <p id="institution-error" className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.institution}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-landing-body text-[14px]">
                    Message
                    <span className="text-landing-muted text-xs ml-2">
                      ({formData.message.length}/2000)
                    </span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your radiology workflow challenges or how we can help..."
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    maxLength={2000}
                    required
                    rows={5}
                    className={`bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 transition-colors resize-none ${errors.message ? "border-red-400" : ""}`}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-7 py-3.5 bg-landing-primary text-white rounded-[10px] text-[15px] font-medium hover:bg-[#265A4C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </Reveal>
          </div>

          {/* FAQ Teaser */}
          <Reveal delayMs={150} className="mt-12 text-center p-8 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white/60">
            <h3 className="font-serif text-lg text-landing-heading mb-2">Common Questions</h3>
            <p className="text-landing-body text-sm max-w-md mx-auto">
              Looking for quick answers about HIPAA compliance, integration requirements, or
              pilot programs? Check out our documentation or reach out directly.
            </p>
          </Reveal>
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
                Automated triage and worklist prioritization for clinical radiology.
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
            <p className="text-[14px] text-white/40">© 2025 Kroix. All rights reserved.</p>
            <p className="text-[13px] text-white/40">
              Non-diagnostic workflow tool. For clinical decision support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
