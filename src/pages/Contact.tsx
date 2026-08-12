import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Building2,
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
    `bg-kx-surface2 border-kx-border text-kx-ink placeholder:text-kx-muted h-11 rounded-[8px] hover:border-kx-critical/40 focus:border-kx-critical/40 transition-colors ${
      hasError ? "border-red-400 focus:border-red-400" : ""
    }`;

  const contactInfo = [
    { icon: Mail, label: "Email", value: "hello@kroix.health", description: "General inquiries" },
    { icon: Building2, label: "Partnerships", value: "partners@kroix.health", description: "Hospital integrations" },
    { icon: Clock, label: "Response Time", value: "< 24 hours", description: "Business days" },
  ];

  return (
    <div className="min-h-screen bg-kx-canvas text-kx-ink font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-kx-canvas/85 backdrop-blur-md border-b border-kx-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-kx-critical" />
            <span className="font-grotesk font-semibold tracking-tight text-[20px]">Kroix</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-kx-muted hover:text-kx-ink transition-colors text-[14px]">About</Link>
            <Link to="/contact" className="text-kx-ink text-[14px] font-medium">Contact</Link>
            <Link to="/login">
              <button className="px-4 py-2 rounded-[8px] border border-kx-border text-kx-ink hover:border-kx-critical/50 transition-colors text-[14px] font-mono">
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + Form */}
      <section className="relative pt-40 pb-24 px-8">
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="font-mono text-[12px] text-kx-critical uppercase tracking-wider mb-4 block">
              Get in touch
            </span>
            <h1 className="font-grotesk text-[40px] md:text-[48px] leading-[1.1] mb-6 tracking-[-0.01em]">
              Let's talk about your workflow.
            </h1>
            <p className="text-[17px] text-kx-muted max-w-xl mx-auto">
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
                  className="p-5 rounded-2xl bg-kx-surface border border-kx-border hover:border-kx-critical/30 transition-colors"
                >
                  <item.icon className="w-6 h-6 text-kx-critical mb-3" />
                  <p className="text-[11px] text-kx-muted uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="font-medium text-kx-ink">{item.value}</p>
                  <p className="text-sm text-kx-muted mt-1">{item.description}</p>
                </Reveal>
              ))}

              <Reveal delayMs={270} className="p-5 rounded-2xl bg-kx-surface border border-kx-border">
                <MapPin className="w-6 h-6 text-kx-critical mb-3" />
                <p className="text-[11px] text-kx-muted uppercase tracking-wide mb-1">Location</p>
                <p className="font-medium text-kx-ink">Remote-First</p>
                <p className="text-sm text-kx-muted mt-1">Serving healthcare globally</p>
              </Reveal>
            </div>

            {/* Contact Form */}
            <Reveal delayMs={100} className="md:col-span-2 p-7 rounded-2xl bg-kx-surface border border-kx-border">
              <div className="flex items-center gap-2 mb-6">
                <Send className="w-5 h-5 text-kx-critical" />
                <h2 className="font-grotesk text-xl text-kx-ink">Send a message</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-kx-muted text-[14px]">Name</Label>
                    <Input
                      id="name"
                      placeholder="Dr. Jane Smith"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      maxLength={100}
                      required
                      className={inputClass(!!errors.name)}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-kx-muted text-[14px]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@hospital.org"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      maxLength={255}
                      required
                      className={inputClass(!!errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-kx-muted text-[14px]">Institution (Optional)</Label>
                  <Input
                    id="institution"
                    placeholder="General Hospital"
                    value={formData.institution}
                    onChange={(e) => handleChange("institution", e.target.value)}
                    maxLength={200}
                    className={inputClass(!!errors.institution)}
                    aria-describedby={errors.institution ? "institution-error" : undefined}
                  />
                  {errors.institution && (
                    <p id="institution-error" className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.institution}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-kx-muted text-[14px]">
                    Message
                    <span className="text-kx-muted text-xs ml-2">
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
                    className={`${inputClass(!!errors.message)} resize-none`}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-7 py-3.5 bg-kx-ink text-kx-canvas rounded-[8px] text-[15px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
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
                      Send message
                    </>
                  )}
                </button>
              </form>
            </Reveal>
          </div>

          {/* FAQ Teaser */}
          <Reveal delayMs={150} className="mt-12 text-center p-8 rounded-2xl border border-kx-border bg-kx-surface/40">
            <h3 className="font-grotesk text-lg text-kx-ink mb-2">Common questions</h3>
            <p className="text-kx-muted text-sm max-w-md mx-auto">
              Looking for quick answers about regulatory status, integration requirements, or
              what validation looks like? Check out our documentation or reach out directly.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-kx-canvas border-t border-kx-border text-kx-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
              <span className="font-grotesk font-semibold text-kx-ink tracking-tight text-xl">
                Kroix
              </span>
              <p className="text-[14px] mt-2 max-w-xs">
                Automated triage and worklist prioritization for clinical radiology.
              </p>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <p className="text-[13px] uppercase tracking-wide">Company</p>
                <div className="space-y-3">
                  <Link to="/about" className="block text-[15px] hover:text-kx-ink transition-colors">
                    About
                  </Link>
                  <Link to="/contact" className="block text-[15px] hover:text-kx-ink transition-colors">
                    Contact
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[13px] uppercase tracking-wide">Legal</p>
                <div className="space-y-3">
                  <span className="block text-[15px]">Privacy Policy</span>
                  <span className="block text-[15px]">HIPAA Compliance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-kx-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[14px]">© 2025 Kroix. All rights reserved.</p>
            <p className="text-[13px]">
              Non-diagnostic workflow tool. For clinical decision support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
