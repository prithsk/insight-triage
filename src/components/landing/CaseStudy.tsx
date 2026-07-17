import { Quote } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function CaseStudy() {
  return (
    <Reveal className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-8 md:p-10">
      <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <Quote className="w-8 h-8 text-landing-primary/30 mb-4" />
          <p className="font-serif text-xl md:text-2xl leading-[1.4] text-landing-heading mb-6">
            Automated prioritization means the studies that matter reach the top of the list
            <em className="not-italic text-landing-primary"> before</em> a radiologist has to go looking for them.
          </p>
          <div>
            <p className="text-[15px] font-medium text-landing-heading">Pilot deployment, regional imaging network</p>
            <p className="text-[13px] text-landing-muted">Early-stage worklist triage pilot</p>
          </div>
        </div>

        <div className="flex md:flex-col gap-6 md:gap-8 md:border-l md:border-[rgba(0,0,0,0.06)] md:pl-10">
          <div>
            <p className="font-serif text-4xl font-medium text-landing-primary">&lt;1s</p>
            <p className="text-[13px] text-landing-muted mt-1">To score each scan</p>
          </div>
          <div>
            <p className="font-serif text-4xl font-medium text-landing-primary">1st</p>
            <p className="text-[13px] text-landing-muted mt-1">Where critical cases land</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
