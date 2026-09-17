import { Section } from "@/components/ui/Section";
import { copy, identity } from "@/content";

/** One line, by instruction. Not featured. */
export function OpenSource() {
  return (
    <Section id="oss" title={copy.oss.title}>
      <p>{identity.openSource}</p>
    </Section>
  );
}
