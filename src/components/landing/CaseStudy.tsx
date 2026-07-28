import { Quote } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

/** A bold ink-colored quote block, distinct from the light bordered cards elsewhere on the page. */
export function CaseStudy() {
  return (
    <Reveal className="rounded-2xl bg-kx-ink p-8 md:p-12 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(600px circle at 100% 0%, rgba(59,91,255,0.25), transparent 70%)" }}
      />
      <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center relative z-10">
        <div>
          <Quote className="w-8 h-8 text-kx-accent2 mb-4" />
          <p className="font-grotesk text-xl md:text-2xl leading-[1.4] text-white mb-6">
            Automated prioritization means the studies that matter reach the top of the list
            <span className="text-emerald-400"> before</span> a radiologist has to go looking for them.
          </p>
          <div>
            <p className="text-[15px] font-medium text-white">Pilot deployment, regional imaging network</p>
            <p className="text-[13px] text-white/50">Early-stage worklist triage pilot</p>
          </div>
        </div>

        <div className="flex md:flex-col gap-6 md:gap-8 md:border-l md:border-white/15 md:pl-10">
          <div>
            <p className="font-mono text-4xl font-medium text-kx-accent2">&lt;1s</p>
            <p className="text-[13px] text-white/50 mt-1">To score each scan</p>
          </div>
          <div>
            <p className="font-mono text-4xl font-medium text-emerald-400">1st</p>
            <p className="text-[13px] text-white/50 mt-1">Where critical cases land</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
