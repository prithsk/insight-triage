import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/ui/reveal";

/**
 * Landing-page waitlist.
 *
 * Writes straight to `public.waitlist_signups`, which grants `anon` INSERT and
 * nothing else (see 20260730120000_waitlist.sql). The client therefore cannot
 * read the list back, and deliberately never tries — a successful insert returns
 * no row, and asking for one would only produce a confusing RLS error.
 *
 * COPY CONSTRAINTS. This section sits on a public marketing page for an uncleared
 * Class II CADt device (21 CFR 892.2080). It must not promise availability,
 * clearance, or clinical benefit. "Currently in validation" is the accurate
 * framing and should survive any rewrite.
 */

const ROLES = ["Radiologist", "Imaging / IT lead", "Investor", "Other"];

type Status = "idle" | "sending" | "done" | "error";

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError("");

    const { error: insertError } = await supabase.from("waitlist_signups").insert({
      email: email.trim(),
      name: name.trim() || null,
      organisation: organisation.trim() || null,
      role: role || null,
      source: "landing",
    });

    if (insertError) {
      // 23505 is the unique index on lower(email). Someone signing up twice has
      // done nothing wrong, so treat it as success rather than surfacing a
      // database error — and it avoids the form doubling as a membership oracle.
      if (insertError.code === "23505") {
        setStatus("done");
        return;
      }
      setStatus("error");
      setError("Something went wrong. Try again, or email us directly.");
      return;
    }

    setStatus("done");
  }

  return (
    <section id="waitlist" className="py-28 md:py-36 px-6 bg-kx-surface2 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background: "radial-gradient(900px circle at 50% 0%, rgba(59,91,255,0.10), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-[720px] mx-auto text-center">
        <Reveal>
          <span className="text-kx-accent2 text-[12.5px] font-mono font-medium tracking-wide uppercase mb-4 block">
            Early access
          </span>
          <h2 className="font-display text-[38px] md:text-[50px] leading-[1.04] tracking-[-0.025em] text-kx-ink mb-5">
            Kroix is in validation.
          </h2>
          <p className="text-[17.5px] text-kx-muted leading-relaxed max-w-xl mx-auto mb-10">
            We're measuring, on departments' own historical worklists, whether reordering
            actually brings studies inside their read-time targets. Join the list and we'll
            share what we find — including if it turns out to be nothing.
          </p>
        </Reveal>

        {status === "done" ? (
          <Reveal className="rounded-2xl bg-white border border-kx-border p-8 md:p-10 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)]">
            <p className="font-display text-[24px] text-kx-ink mb-2">You're on the list.</p>
            <p className="text-[15px] text-kx-muted leading-relaxed">
              We'll be in touch when there's something worth your time — results first,
              product second.
            </p>
          </Reveal>
        ) : (
          <Reveal delayMs={80}>
            <form
              onSubmit={onSubmit}
              className="rounded-2xl bg-white border border-kx-border p-7 md:p-9 shadow-[0_20px_60px_-30px_rgba(18,21,26,0.2)] text-left"
            >
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
                <Field
                  label="Organisation"
                  value={organisation}
                  onChange={setOrganisation}
                  placeholder="Hospital, group, or firm"
                />
              </div>

              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                required
                className="mb-5"
              />

              <fieldset className="mb-6">
                <legend className="font-mono text-[11px] uppercase tracking-wider text-kx-muted mb-2.5">
                  You are a
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(role === r ? "" : r)}
                      aria-pressed={role === r}
                      className={`px-3.5 py-2 rounded-full text-[13px] border transition-colors ${
                        role === r
                          ? "bg-kx-ink text-white border-kx-ink"
                          : "bg-transparent text-kx-muted border-kx-border hover:border-kx-ink/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-kx-ink text-white py-3.5 text-[15px] font-medium hover:bg-kx-ink/90 transition-colors disabled:opacity-60"
              >
                {status === "sending" ? "Joining…" : "Join the waitlist"}
              </button>

              {error && (
                <p role="alert" className="text-[13px] text-kx-critical mt-3.5 text-center">
                  {error}
                </p>
              )}

              <p className="text-[12.5px] text-kx-muted leading-relaxed mt-5 text-center">
                No patient data, ever. We'll only email about Kroix.
              </p>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-[11px] uppercase tracking-wider text-kx-muted mb-2 block">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-kx-border bg-kx-surface px-4 py-3 text-[15px] text-kx-ink placeholder:text-kx-muted/60 focus:outline-none focus:border-kx-accent2 transition-colors"
      />
    </label>
  );
}
