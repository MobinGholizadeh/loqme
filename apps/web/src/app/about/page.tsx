import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Compass, Store, Leaf, ShieldCheck } from 'lucide-react';
import { CustomerShell } from '@/components/shells/CustomerShell';
import { aboutContent as copy } from '@/content/about';

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: { canonical: '/about' },
  openGraph: { title: copy.title, description: copy.description, url: '/about' },
};

export default function AboutPage() {
  const icons = [Compass, Store, Leaf];
  const businessKeys = (Object.keys(copy.business) as Array<keyof typeof copy.business>).filter(key => copy.business[key].trim());
  return <CustomerShell>
    <article className="about-page">
      <header className="about-hero">
        <div className="about-eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="about-headline">{copy.headline}</p>
        <p className="about-introduction">{copy.introduction}</p>
        <Link href="/explore" className="about-button">{copy.ctaLabel}<ArrowLeft size={20} aria-hidden="true" /></Link>
      </header>
      <section className="about-story" aria-labelledby="about-story">
        <h2 id="about-story">{copy.storyTitle}</h2><p>{copy.story}</p>
      </section>
      <section className="about-section" aria-labelledby="about-steps">
        <h2 id="about-steps">{copy.stepsTitle}</h2>
        <ol className="about-grid">{copy.steps.map(step => <li key={step.number} className="about-step">
          <span className="about-number" aria-hidden="true">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
        </li>)}</ol>
      </section>
      <section className="about-section" aria-labelledby="about-values">
        <h2 id="about-values">{copy.valuesTitle}</h2>
        <div className="about-grid">{copy.values.map((value, index) => {
          const Icon = icons[index];
          return <div key={value.title}><Icon className="about-icon" size={28} aria-hidden="true" /><h3>{value.title}</h3><p>{value.text}</p></div>;
        })}</div>
      </section>
      <section className="about-safety" aria-labelledby="about-safety">
        <ShieldCheck size={32} aria-hidden="true" /><div><h2 id="about-safety">{copy.safetyTitle}</h2><p>{copy.safetyText}</p></div>
      </section>
      {businessKeys.length > 0 && <section className="about-section" aria-labelledby="about-business">
        <h2 id="about-business">{copy.businessTitle}</h2>
        <dl className="about-details">{businessKeys.map(key => <div key={key}><dt>{copy.businessLabels[key]}</dt><dd><bdi>{copy.business[key]}</bdi></dd></div>)}</dl>
      </section>}
      <section className="about-cta" aria-labelledby="about-discover">
        <h2 id="about-discover">{copy.ctaTitle}</h2><p>{copy.ctaText}</p>
        <Link href="/explore" className="about-button">{copy.ctaLabel}<ArrowLeft size={20} aria-hidden="true" /></Link>
      </section>
    </article>
  </CustomerShell>;
}
