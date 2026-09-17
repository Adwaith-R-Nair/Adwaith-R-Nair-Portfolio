import { SiteHeader } from "@/components/header/SiteHeader";
import { Hero } from "@/components/hero/Hero";
import { Thesis } from "@/components/thesis/Thesis";
import { Graph } from "@/components/graph/Graph";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Thesis />
        <Graph />
      </main>
    </>
  );
}
