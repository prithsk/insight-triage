import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security headers
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

// Input validation patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
  /(\b(UNION|JOIN)\s+(ALL\s+)?SELECT\b)/i,
  /(-{2}|\/\*|\*\/|;)/,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

function detectMaliciousInput(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(p => p.test(input)) || 
         XSS_PATTERNS.some(p => p.test(input));
}

function sanitizeForHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\n/g, '<br />');
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

interface ContactRequest {
  name: string;
  email: string;
  institution?: string;
  message: string;
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(clientIP)) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIP.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const body = await req.json();
    const { name, email, institution, message }: ContactRequest = body;

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
      );
    }
    if (institution && institution.length > 200) {
      return new Response(
        JSON.stringify({ error: "Institution must be less than 200 characters" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: Check for malicious input
    const allInputs = [name, email, message, institution || ""];
    for (const input of allInputs) {
      if (detectMaliciousInput(input)) {
        console.warn(`[SECURITY] Malicious input detected from IP: ${clientIP.substring(0, 10)}...`);
        return new Response(
          JSON.stringify({ error: "Invalid characters detected in input" }),
          { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Sanitize all inputs for HTML email
    const safeName = sanitizeForHTML(name.trim());
    const safeEmail = sanitizeForHTML(email.trim().toLowerCase());
    const safeInstitution = institution ? sanitizeForHTML(institution.trim()) : null;
    const safeMessage = sanitizeForHTML(message.trim());

    // Send email using Resend API directly
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Kroix Contact <onboarding@resend.dev>",
        to: ["prithvisk2023@gmail.com"],
        subject: `New Contact from ${safeName} - Kroix`,
        html: `
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          ${safeInstitution ? `<p><strong>Institution:</strong> ${safeInstitution}</p>` : ''}
          <hr />
          <h2>Message:</h2>
          <p>${safeMessage}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">This email was sent from the Kroix contact form.</p>
        `,
        reply_to: email.trim().toLowerCase(),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await res.json();
    console.log("Contact email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...securityHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-contact-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders, ...securityHeaders },
      }
    );
  }
};

serve(handler);
