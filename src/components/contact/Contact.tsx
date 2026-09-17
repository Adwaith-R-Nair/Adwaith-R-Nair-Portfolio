import { copy, identity } from "@/content";
import styles from "./Contact.module.css";

export function Contact() {
  const [a, em, b] = copy.contact.heading;
  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.inner}>
        <h2 id="contact-title" className={styles.heading}>
          {a}<em>{em}</em>{b}
        </h2>
        <p className={styles.body}>{copy.contact.body}</p>
        <a className={styles.email} href={`mailto:${identity.email}`}>{identity.email}</a>
        <ul className={styles.links}>
          <li><a href={identity.github} rel="me noopener">GitHub</a></li>
          <li><a href={identity.linkedin} rel="me noopener">LinkedIn</a></li>
          <li><a href={identity.x} rel="me noopener">X</a></li>
          <li><a href={identity.resume}>Résumé, PDF</a></li>
        </ul>
        <p className={styles.foot}>{identity.location}. {identity.study}.</p>
      </div>
    </section>
  );
}
