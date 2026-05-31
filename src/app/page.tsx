import dynamic from 'next/dynamic';
import { Hud } from '@/components/ui/Hud';
import { Loader } from '@/components/ui/Loader';
import { Cursor } from '@/components/ui/Cursor';
import { ProjectModal } from '@/components/ui/ProjectModal';
import { AudioController } from '@/components/ui/AudioController';
import { Intro } from '@/components/ui/Intro';
import { Terminal } from '@/components/ui/Terminal';
import { CertificateLightbox } from '@/components/ui/CertificateLightbox';
import { ResumeViewer } from '@/components/ui/ResumeViewer';
import { content, waypoints } from '@/lib/content';

const Scene = dynamic(() => import('@/components/canvas/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <Loader />,
});

export default function Page() {
  return (
    <main className="relative min-h-screen w-full bg-bg-void text-text-primary">
      {/* Canvas root — cursor:none scoped here so the system cursor stays for UI/links. */}
      <div className="fixed inset-0 z-0 canvas-root">
        <Scene />
      </div>

      <Hud />
      <Cursor />
      <ProjectModal />
      <CertificateLightbox />
      <ResumeViewer />
      <AudioController />
      <Terminal />
      <Intro />

      {/* Scroll spine — one screen per camera waypoint; Lenis + GSAP map scrollY → curve t.
          POINTER-EVENTS:NONE is the root-cause fix for 8 rounds of "clicks don't work":
          these full-viewport <section> spacers sit at z-10 over the canvas (z-0) and
          were absorbing every click before the canvas ever saw it. Scroll detection
          uses window scroll + IntersectionObserver, not pointer events on these
          elements — disabling pointer-events here has zero functional cost. */}
      <div className="pointer-events-none relative z-10">
        {waypoints.map((w, i) => (
          <section
            key={w.id}
            data-waypoint={i}
            className="pointer-events-none h-screen w-full"
            aria-label={w.id}
          />
        ))}
      </div>

      {/* DOM résumé fallback — sr-only so the cinematic frame is uninterrupted, but
          full content stays in the tree for SR, SEO, no-JS, and reduced-motion. */}
      <DomFallback />
    </main>
  );
}

function DomFallback() {
  const { hero, about, projects, skills, experience, education, certifications, contact } = content;

  return (
    <article
      id="dom-fallback"
      className="sr-only"
      data-fallback="resume"
    >
      <header className="mb-16">
        <h1 className="font-display text-5xl font-bold tracking-tight text-text-primary">
          {hero.name}
        </h1>
        <p className="mt-2 font-mono text-sm uppercase tracking-[0.2em] text-accent-neon">
          {hero.tagline}
        </p>
        <p className="mt-6 text-lg text-text-muted">{hero.headline}</p>
        <p className="mt-2 text-sm text-text-muted">{hero.location}</p>
      </header>

      <Section title="About">
        <p>{about}</p>
      </Section>

      <Section title="Projects">
        <ul className="space-y-8 not-prose">
          {projects.map((p) => (
            <li key={p.slug}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-white/10 p-6 transition hover:border-accent-emerald/60"
              >
                <h3 className="font-display text-2xl text-text-primary group-hover:text-accent-neon">
                  {p.name}
                </h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-accent-emerald">
                  {p.stack.join(' · ')}
                </p>
                <p className="mt-3 text-text-muted">{p.summary}</p>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Skills">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 not-prose sm:grid-cols-2">
          {Object.entries(skills).map(([group, items]) => (
            <div key={group}>
              <dt className="font-mono text-xs uppercase tracking-wider text-accent-emerald">
                {group}
              </dt>
              <dd className="mt-1 text-text-muted">{items.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Experience">
        {experience.map((e) => (
          <div key={e.role} className="mb-6">
            <h3 className="font-display text-lg text-text-primary">{e.role}</h3>
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              {e.org} · {e.period}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Education">
        <p className="font-display text-lg text-text-primary">{education.degree}</p>
        <p className="text-text-muted">{education.school}</p>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Expected {education.expected}
        </p>
      </Section>

      <Section title="Certifications">
        <ul className="list-disc pl-5 text-text-muted">
          {certifications.map((c) => (
            <li key={c.name}>
              {c.name} — {c.issuer} · {c.date}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Contact">
        <ul className="space-y-2 not-prose">
          <li>
            <a className="text-accent-neon hover:underline" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </li>
          <li className="text-text-muted">{contact.phone}</li>
          <li>
            <a
              className="text-accent-neon hover:underline"
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </li>
          <li>
            {contact.github ? (
              <a
                className="text-accent-neon hover:underline"
                href={contact.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            ) : (
              <span className="text-text-muted" title="Coming soon">
                GitHub — coming soon
              </span>
            )}
          </li>
          <li>
            <a
              className="inline-block rounded-full border border-accent-emerald/70 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-accent-neon transition hover:bg-accent-emerald/10"
              href={contact.resumeUrl}
              download
            >
              Download résumé
            </a>
          </li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-emerald">
        {title}
      </h2>
      <div className="text-text-primary/90">{children}</div>
    </section>
  );
}
