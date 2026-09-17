import { Prose } from "@/components/ui/Prose";
import { Section } from "@/components/ui/Section";
import { copy } from "@/content";

/** Four short paragraphs. Drafted by Claude from the project evidence, corrected by Adwaith. */
export function HowIBuild() {
  return (
    <Section id="how" title={copy.how.title}>
      <Prose>
        {copy.how.paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </Prose>
    </Section>
  );
}
