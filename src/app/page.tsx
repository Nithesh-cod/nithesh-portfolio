import dynamic from 'next/dynamic';
import { Loader } from '@/components/ui/Loader';
import { Cursor } from '@/components/ui/Cursor';
import { ProjectModal } from '@/components/ui/ProjectModal';
import { AudioController } from '@/components/ui/AudioController';
import { Intro } from '@/components/ui/Intro';
import { Terminal } from '@/components/ui/Terminal';
import { CertificateLightbox } from '@/components/ui/CertificateLightbox';
import { ResumeViewer } from '@/components/ui/ResumeViewer';
import { CategoryDetailModal } from '@/components/ui/CategoryDetailModal';
import { TopBar, LeftRail, RightRail, CapsuleOverlays, ServicesStrip } from '@/components/hud/Dashboard';
import { CursorTrackerMount } from '@/components/hud/CursorTrackerMount';
import { NavPill } from '@/components/ui/NavPill';
import { content } from '@/lib/content';

const Scene = dynamic(() => import('@/components/canvas/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <Loader />,
});

export default function Page() {
  return (
    <main className="hud-stage relative min-h-screen w-full overflow-hidden bg-bg-base text-text-prim">
      {/* V9.0 — Canvas as the centerpiece. HUD overlay is DOM positioned
          OVER the canvas at higher z-index. canvas-root keeps the cursor
          style scoped. V9.3 — `hud-stage` adds the 3D perspective root. */}
      <div className="fixed inset-0 z-0 canvas-root">
        <Scene />
      </div>

      <CursorTrackerMount />
      <TopBar />
      <LeftRail />
      <CapsuleOverlays />
      <RightRail />
      <NavPill />
      <ServicesStrip />

      <Cursor />
      <ProjectModal />
      <CertificateLightbox />
      <ResumeViewer />
      <CategoryDetailModal />
      <AudioController />
      <Terminal />
      <Intro />

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
