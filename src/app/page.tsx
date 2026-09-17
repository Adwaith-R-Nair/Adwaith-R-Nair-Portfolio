import { SiteHeader } from "@/components/header/SiteHeader";
import { Hero } from "@/components/hero/Hero";
import { Thesis } from "@/components/thesis/Thesis";
import { Graph } from "@/components/graph/Graph";
import { CaseList } from "@/components/cases/CaseList";
import { AlsoBuilt } from "@/components/also/AlsoBuilt";
import { OpenSource } from "@/components/oss/OpenSource";
import { Stack } from "@/components/stack/Stack";
import { HowIBuild } from "@/components/how/HowIBuild";
import { Contact } from "@/components/contact/Contact";
import { HeroEnhancer } from "@/hero/HeroEnhancer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <HeroEnhancer />
      <main id="main">
        <Hero />
        <Thesis />
        <Graph />
        <CaseList />
        <AlsoBuilt />
        <OpenSource />
        <Stack />
        <HowIBuild />
        <Contact />
      </main>
    </>
  );
}
