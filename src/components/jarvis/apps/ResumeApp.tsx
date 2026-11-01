'use client';

import { Bot, Download, ExternalLink, FileText, ListTree } from 'lucide-react';
import { useState } from 'react';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { play } from '@/lib/audio';
import { allProjects, certificateGroups, content, skillCategories } from '@/lib/content';

const DOWNLOAD_NAME = 'Nithesh_Ramachandran_Resume.pdf';

function download() {
  const a = document.createElement('a');
  a.href = content.contact.resumeUrl;
  a.download = DOWNLOAD_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ResumeApp() {
  const [tab, setTab] = useState<'pdf' | 'structured'>('pdf');
  const launch = useLaunchApp();

  return (
    <div className="app-resume">
      <div className="app-toolbar">
        <div className="app-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'pdf'} onClick={() => setTab('pdf')}>
            <FileText size={15} /> Document
          </button>
          <button type="button" role="tab" aria-selected={tab === 'structured'} onClick={() => setTab('structured')}>
            <ListTree size={15} /> Structured
          </button>
        </div>
        <div className="app-actions">
          <button
            type="button"
            className="app-btn"
            onClick={() => launch('jarvis', { prefill: "Give me a 30-second summary of Nithesh's resume and his strongest project." })}
          >
            <Bot size={15} /> Ask JARVIS
          </button>
          <a className="app-btn" href={content.contact.resumeUrl} target="_blank" rel="noopener noreferrer" onClick={() => play('click_secondary')}>
            <ExternalLink size={15} /> Open in tab
          </a>
          <button
            type="button"
            className="app-btn app-btn--primary"
            onClick={() => {
              play('click_primary');
              download();
            }}
          >
            <Download size={15} /> Download
          </button>
        </div>
      </div>

      {tab === 'pdf' ? (
        <iframe className="app-resume-pdf" src={content.contact.resumeUrl} title={`${content.hero.name} résumé`} />
      ) : (
        <article className="app-resume-doc">
          <header>
            <h2>{content.hero.name}</h2>
            <p>
              {content.hero.tagline} · {content.hero.location}
            </p>
          </header>
          <section>
            <h3>Summary</h3>
            <p>{content.about}</p>
          </section>
          <section>
            <h3>Education</h3>
            <p>
              <b>{content.education.degree}</b> — {content.education.school} · Expected {content.education.expected}
            </p>
          </section>
          <section>
            <h3>Experience</h3>
            {content.experience.map((e) => (
              <div key={e.role}>
                <p>
                  <b>{e.role}</b> — {e.org} · {e.period}
                </p>
                <ul>
                  {e.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section>
            <h3>Projects</h3>
            <ul className="app-resume-projects">
              {allProjects.map((p) => (
                <li key={p.id}>
                  <b>{p.name}</b>
                  {p.status ? ` (${p.status})` : ''} — {p.tagline}
                  <span>{p.stack.join(' · ')}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Skills</h3>
            <dl>
              {skillCategories.map((c) => (
                <div key={c.id}>
                  <dt>{c.title}</dt>
                  <dd>{c.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3>Certifications</h3>
            <ul>
              {certificateGroups.flatMap((g) => g.certs).map((c) => (
                <li key={c.id}>
                  {c.title} — {c.issuer}, {c.date}
                </li>
              ))}
            </ul>
          </section>
        </article>
      )}
    </div>
  );
}
