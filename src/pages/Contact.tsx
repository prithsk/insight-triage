import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Building2, Clock, MapPin, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  contactFormSchema,
  sanitizeString,
  logSecurityEvent,
  checkRateLimit,
} from "@/lib/security";
import { z } from "zod";

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
    { icon: Clock, label: "Response time", value: "< 24 hours", description: "Business days" },
    { icon: MapPin, label: "Location", value: "Remote-first", description: "Serving healthcare globally" },
  ];

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 bg-landing-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-semibold text-landing-heading tracking-tight">Kroix</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/about" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">About</Link>
            <Link to="/contact" className="text-landing-heading text-[15px]">Contact</Link>
            <Link to="/login" className="text-landing-body hover:text-landing-heading transition-colors text-[15px]">Login</Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-landing-bg via-landing-bg to-[#E8EBE4]" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="font-serif text-[44px] md:text-[52px] leading-[1.05] tracking-[-0.01em] mb-4">
              Let's talk about your <em className="italic text-landing-primary">workflow</em>.
            </h1>
            <p className="text-landing-body text-[17px] max-w-xl mx-auto leading-relaxed">
              Whether you're exploring AI triage for your radiology department or have
              questions about our platform, we'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact info */}
            <div className="md:col-span-1 space-y-4">
              {contactInfo.map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm hover:border-landing-primary/30 transition-colors"
                >
                  <item.icon className="w-7 h-7 text-landing-primary mb-3" />
                  <p className="text-[11px] text-landing-muted uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-landing-heading text-[15px] font-medium">{item.value}</p>
                  <p className="text-landing-body text-[13px] mt-1">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-8 shadow-sm">
              <h2 className="font-serif text-[24px] tracking-[-0.01em] mb-6">Send a message</h2>
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
                      className={inputClass(!!errors.name)}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-[12px] text-[#B4453A] flex items-center gap-1">
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
                      className={inputClass(!!errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-[12px] text-[#B4453A] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-landing-body text-[14px]">Institution (optional)</Label>
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
                    <p id="institution-error" className="text-[12px] text-[#B4453A] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.institution}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-landing-body text-[14px]">
                    Message
                    <span className="text-landing-muted text-[12px] ml-2">({formData.message.length}/2000)</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your radiology workflow challenges or how we can help…"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    maxLength={2000}
                    required
                    rows={5}
                    className={`bg-landing-bg/50 border-[rgba(0,0,0,0.06)] text-landing-heading placeholder:text-landing-muted rounded-[10px] hover:border-landing-primary focus:border-landing-primary focus-visible:ring-landing-primary/20 resize-none transition-colors ${
                      errors.message ? "border-[#B4453A] focus:border-[#B4453A]" : ""
                    }`}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" className="text-[12px] text-[#B4453A] flex items-center gap-1">
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
                      Sending…
                    </>
                  ) : (
                    <>
                      Send message
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="text-[13px] text-landing-muted text-center mt-10">
            Non-diagnostic workflow tool. For clinical decision support only.
          </p>
        </div>
      </section>
    </div>
  );
}
