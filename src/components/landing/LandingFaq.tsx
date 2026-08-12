import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";

const FAQS = [
  {
    q: "Does Kroix replace the radiologist's read?",
    a: "No. Kroix is a non-diagnostic workflow tool. It reorders the worklist by estimated urgency so critical cases are read first. The radiologist makes every diagnostic decision.",
  },
  {
    q: "What does the model actually detect?",
    a: "A 3-model ensemble (DenseNet121, GoogLeNet, ResNet18) trained on chest X-rays flags findings consistent with pneumonia and related respiratory patterns, producing a risk score used purely for queue ordering.",
  },
  {
    q: "How fast is a single study processed?",
    a: "Inference across all three models plus Grad-CAM overlay generation typically completes in under a second on GPU, well under the sub-5-second budget needed to avoid disrupting PACS workflows.",
  },
  {
    q: "How does Kroix fit into our existing PACS?",
    a: "Studies arrive as DICOM, get scored, and the priority order is reflected directly in the worklist, no changes to your existing viewer or reporting software.",
  },
  {
    // Said "We're in active pilot testing with de-identified data." There is no
    // pilot. Same fabrication as the CaseStudy testimonial and the README line.
    q: "Is patient data HIPAA-compliant?",
    a: "Kroix is not deployed and handles no patient data today. Production use with real PHI would require BAA-covered infrastructure across hosting, database, and the ML service — that is not in place, and it is a prerequisite rather than a plan.",
  },
  {
    q: "Is Kroix FDA-cleared?",
    a: "No. Software that scores images and reorders a worklist is computer-assisted triage under 21 CFR 892.2080 — Class II, 510(k) required. Being non-diagnostic is what places it in that category, not what exempts it. Kroix is pre-clearance and is not for clinical use.",
  },
];

export function LandingFaq() {
  return (
    <Reveal className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`} className="border-kx-border">
            <AccordionTrigger className="text-left font-grotesk text-lg text-kx-ink hover:no-underline py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-kx-muted leading-relaxed !pt-0 !pb-5">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Reveal>
  );
}
