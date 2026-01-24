import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Clock
} from "lucide-react";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setFormData({ name: "", email: "", institution: "", message: "" });
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "hello@kroix.health",
      description: "General inquiries"
    },
    {
      icon: Building2,
      label: "Partnerships",
      value: "partners@kroix.health",
      description: "Hospital integrations"
    },
    {
      icon: Clock,
      label: "Response Time",
      value: "< 24 hours",
      description: "Business days"
    },
  ];

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Get in Touch</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Let's Talk About Your Workflow
            </h1>
            
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you're exploring AI triage for your radiology department or have 
              questions about our platform, we'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Cards */}
            <div className="md:col-span-1 space-y-4">
              {contactInfo.map((item, index) => (
                <Card 
                  key={index} 
                  className="bg-surface border-border hover:border-primary/30 transition-colors"
                >
                  <CardContent className="pt-6">
                    <item.icon className="w-8 h-8 text-primary mb-3" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p className="font-medium text-foreground">{item.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
              
              {/* Location Card */}
              <Card className="bg-surface border-border">
                <CardContent className="pt-6">
                  <MapPin className="w-8 h-8 text-primary mb-3" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Location
                  </p>
                  <p className="font-medium text-foreground">Remote-First</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Serving healthcare globally
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="md:col-span-2 bg-surface border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Send a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Dr. Jane Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="bg-background border-border"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@hospital.org"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution (Optional)</Label>
                    <Input
                      id="institution"
                      placeholder="General Hospital"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us about your radiology workflow challenges or how we can help..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="bg-background border-border resize-none"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Teaser */}
          <div className="mt-12 text-center p-8 rounded-lg border border-border bg-surface/50">
            <h3 className="text-lg font-semibold mb-2">Common Questions</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Looking for quick answers about HIPAA compliance, integration requirements, 
              or pilot programs? Check out our documentation or reach out directly.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}