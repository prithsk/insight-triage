import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "guerrillamail.com", "10minutemail.com", "mailinator.com",
  "throwaway.email", "fakeinbox.com", "sharklasers.com", "spam4.me",
  "grr.la", "guerrillamail.info", "pokemail.net", "getnada.com",
  "tempail.com", "mohmal.com", "yopmail.com", "dispostable.com",
  "maildrop.cc", "mailnesia.com", "mintemail.com", "temp-mail.org",
  "trashmail.com", "bugmenot.com", "spamgourmet.com", "mailcatch.com",
  "mytemp.email", "tempr.email", "discard.email", "tmpmail.org",
  "tmpmail.net", "moakt.com", "emailondeck.com", "throwawaymail.com",
  "jetable.org", "spamex.com", "deadfake.com", "anonymbox.com",
  "getairmail.com", "mailsac.com", "meltmail.com", "tmail.com",
  "temp-mail.io", "emailfake.com", "fakermail.com", "tempmailaddress.com",
  "tempmailo.com", "fakemail.net", "tempmails.net", "tempinbox.com",
  "burnermail.io", "33mail.com", "protonmail.com", "tutanota.com",
  "mailbox.org", "cock.li", "tfwno.gf", "horsefucker.org", "waifu.club",
  "420blaze.it", "cucks.me", "dicksinhisan.us", "loves.dicksinhisan.us",
  "wants.dicksinhisan.us", "gg.aa.com.tr", "erine.email", "zetmail.com"
]);

// Suspicious TLDs commonly used for spam/attacks
const SUSPICIOUS_TLDS = new Set([
  ".xyz", ".top", ".click", ".gq", ".ml", ".cf", ".ga", ".tk",
  ".work", ".date", ".racing", ".download", ".stream", ".trade",
  ".accountant", ".science", ".party", ".cricket", ".faith", ".review"
]);

interface ValidationResult {
  valid: boolean;
  reason?: string;
  riskLevel: "low" | "medium" | "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ valid: false, reason: "Email is required", riskLevel: "high" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await validateEmail(email.toLowerCase().trim());
    
    return new Response(
      JSON.stringify(result),
      { status: result.valid ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, reason: "Validation failed", riskLevel: "high" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function validateEmail(email: string): Promise<ValidationResult> {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "Invalid email format", riskLevel: "high" };
  }

  const domain = email.split("@")[1];
  
  // Check against disposable email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: "Disposable email addresses are not allowed", riskLevel: "high" };
  }

  // Check for suspicious TLDs
  for (const tld of SUSPICIOUS_TLDS) {
    if (domain.endsWith(tld)) {
      return { valid: false, reason: "This email domain is not trusted", riskLevel: "high" };
    }
  }

  // Check for obvious spam patterns
  const spamPatterns = [
    /^test[\d]*@/i,
    /^admin[\d]*@/i,
    /^spam[\d]*@/i,
    /^fake[\d]*@/i,
    /^hack[\d]*@/i,
    /^bot[\d]*@/i,
    /^null[\d]*@/i,
    /^void[\d]*@/i,
    /^random[\d]*@/i,
    /^noreply[\d]*@/i,
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(email)) {
      return { valid: false, reason: "This email address appears suspicious", riskLevel: "medium" };
    }
  }

  // Check for excessive numbers (common in bot accounts)
  const localPart = email.split("@")[0];
  const numberCount = (localPart.match(/\d/g) || []).length;
  if (numberCount > 8) {
    return { valid: false, reason: "Email address appears to be auto-generated", riskLevel: "medium" };
  }

  // Check domain MX records (DNS lookup)
  try {
    const mxCheck = await checkMXRecords(domain);
    if (!mxCheck.valid) {
      return { valid: false, reason: mxCheck.reason, riskLevel: "high" };
    }
  } catch (e) {
    // If MX check fails, allow with warning
    console.warn("MX record check failed:", e);
  }

  return { valid: true, riskLevel: "low" };
}

async function checkMXRecords(domain: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Use Cloudflare's DNS-over-HTTPS to check MX records
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
      { headers: { "Accept": "application/dns-json" } }
    );
    
    if (!response.ok) {
      return { valid: true }; // Allow if check fails
    }

    const data = await response.json();
    
    // Check if domain has MX records
    if (!data.Answer || data.Answer.length === 0) {
      return { valid: false, reason: "Email domain does not accept emails" };
    }

    return { valid: true };
  } catch {
    return { valid: true }; // Allow if check fails
  }
}
