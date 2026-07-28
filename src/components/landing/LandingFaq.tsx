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
    q: "Is patient data HIPAA-compliant?",
    a: "We're in active pilot testing with de-identified data. Production deployment with real PHI requires BAA-covered infrastructure, which is part of our clinical rollout plan.",
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
