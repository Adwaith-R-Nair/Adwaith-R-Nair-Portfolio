import Image from "next/image";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy, identity } from "@/content";
import styles from "./Hero.module.css";

/**
 * Static hero. The portrait is a real image in the server HTML and is the LCP element.
 * Phase 2 mounts the particle canvas over #hero-portrait and fades it in.
 */
export function Hero() {
  return (
    <section id="hero" className={styles.hero} aria-label="Introduction">
      <div className={styles.stage}>
        <Image
          id="hero-portrait"
          className={styles.portrait}
          src="/hero-crop.webp"
          alt={`${identity.name}, head and shoulders`}
          width={739}
          height={900}
          priority
          sizes="(max-width: 720px) 78vw, 46vh"
        />
        <div className={styles.vignette} aria-hidden="true" />
      </div>
      <div className={styles.caption}>
        <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
        <h1 className={styles.name}>{identity.name}</h1>
        <p className={styles.line}>{copy.hero.line}</p>
      </div>
    </section>
  );
}
