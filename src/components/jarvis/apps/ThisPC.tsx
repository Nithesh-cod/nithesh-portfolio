'use client';

import {
  ArrowUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Contact,
  Download,
  ExternalLink,
  Eye,
  FileBraces,
  FileImage,
  FileText,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  Monitor,
  Search,
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, type ReactNode } from 'react';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { GitHubIcon } from '@/components/ui/BrandIcons';
import { ProjectIcon } from '@/components/ui/ProjectIcons';
import { play } from '@/lib/audio';
import { allProjects, certGroupLabel, certificateGroups, content, skillCategories, type ShowcaseProject } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

type FolderId = 'home' | 'projects' | 'certificates' | 'documents' | 'media';

type Item =
  | { kind: 'drive'; key: string; folder: Exclude<FolderId, 'home'>; name: string; sub: string }
  | { kind: 'project'; key: string; name: string; sub: string; project: ShowcaseProject }
  | { kind: 'cert'; key: string; name: string; sub: string; certId: string; image: string; issuer: string; date: string }
  | { kind: 'doc'; key: string; name: string; sub: string; doc: 'resume' | 'skills' | 'about' | 'vcard' }
  | { kind: 'image'; key: string; name: string; sub: string; src: string; project: ShowcaseProject };

const FOLDERS: Record<Exclude<FolderId, 'home'>, { name: string; Icon: typeof HardDrive }> = {
  projects: { name: 'C: Projects', Icon: HardDrive },
  certificates: { name: 'D: Certificates', Icon: HardDrive },
  documents: { name: 'Documents', Icon: FolderOpen },
  media: { name: 'Media', Icon: FolderOpen },
};

const certs = certificateGroups.flatMap((g) => g.certs.map((c) => ({ ...c, group: g.heading })));
const shots = allProjects.flatMap((p) => p.screenshots.map((src) => ({ src, project: p })));

const SKILLS_JSON = JSON.stringify(
  Object.fromEntries(skillCategories.map((c) => [c.title.toLowerCase(), c.items])),
  null,
  2,
);

const VCARD = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  `FN:${content.hero.name}`,
  `TITLE:${content.hero.tagline}`,
  `EMAIL:${content.contact.email}`,
  `TEL:${content.contact.phone.replace(/[^+\d]/g, '')}`,
  `URL:${content.liveUrl}`,
  'ADR:;;;Coimbatore;Tamil Nadu;;India',
  'END:VCARD',
].join('\n');

function itemsIn(folder: FolderId): Item[] {
  switch (folder) {
    case 'home':
      return [
        { kind: 'drive', key: 'd-projects', folder: 'projects', name: FOLDERS.projects.name, sub: `${allProjects.length} projects · ${allProjects.filter((p) => p.url).length} live` },
        { kind: 'drive', key: 'd-certs', folder: 'certificates', name: FOLDERS.certificates.name, sub: `${certs.length} certificates · Infosys Springboard` },
        { kind: 'drive', key: 'd-docs', folder: 'documents', name: FOLDERS.documents.name, sub: '4 files · résumé, skills, bio, contact card' },
        { kind: 'drive', key: 'd-media', folder: 'media', name: FOLDERS.media.name, sub: `${shots.length} screenshots from live sites` },
      ];
    case 'projects':
      return allProjects.map((p) => ({
        kind: 'project',
        key: `p-${p.id}`,
        name: p.name,
        sub: p.status ?? (p.url ? 'Live' : 'Source on GitHub'),
        project: p,
      }));
    case 'certificates':
      return certs.map((c) => ({
        kind: 'cert',
        key: `c-${c.id}`,
        name: c.title,
        sub: `${certGroupLabel(c.group)} · ${c.date}`,
        certId: c.id,
        image: c.image,
        issuer: c.issuer,
        date: c.date,
      }));
    case 'documents':
      return [
        { kind: 'doc', key: 'doc-resume', name: 'Resume.pdf', sub: 'One page · PDF', doc: 'resume' },
        { kind: 'doc', key: 'doc-skills', name: 'Skills.json', sub: `${skillCategories.length} groups · JSON`, doc: 'skills' },
        { kind: 'doc', key: 'doc-about', name: 'About.txt', sub: 'Short bio · text', doc: 'about' },
        { kind: 'doc', key: 'doc-vcard', name: 'Contact.vcf', sub: 'Contact card · vCard', doc: 'vcard' },
      ];
    case 'media':
      return shots.map(({ src, project }) => ({
        kind: 'image',
        key: `m-${src}`,
        name: src.split('/').pop() ?? src,
        sub: project.name,
        src,
        project,
      }));
  }
}

const ALL_ITEMS: Item[] = (['projects', 'certificates', 'documents', 'media'] as const).flatMap(itemsIn);

/** File explorer over the portfolio: projects, certificates, documents and screenshots. */
export function ThisPC() {
  const [history, setHistory] = useState<FolderId[]>(['home']);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const folder = history[cursor] ?? 'home';

  const openProject = usePortfolioStore((s) => s.openProject);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const launch = useLaunchApp();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itemsIn(folder);
    const pool = folder === 'home' ? ALL_ITEMS : itemsIn(folder);
    return pool.filter((i) => `${i.name} ${i.sub}`.toLowerCase().includes(q));
  }, [folder, query]);
  const current = items.find((i) => i.key === selected) ?? null;

  const go = (next: FolderId) => {
    if (next === folder) return;
    play('click_secondary');
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor((c) => c + 1);
    setSelected(null);
    setQuery('');
  };
  const step = (d: -1 | 1) => {
    const n = cursor + d;
    if (n < 0 || n >= history.length) return;
    play('click_secondary');
    setCursor(n);
    setSelected(null);
  };

  const openItem = (item: Item) => {
    switch (item.kind) {
      case 'drive':
        return go(item.folder);
      case 'project':
        play('click_primary');
        return openProject(item.project.id);
      case 'cert':
        play('click_primary');
        return openCertificate(item.certId);
      case 'image':
        play('click_primary');
        return openProject(item.project.id);
      case 'doc':
        if (item.doc === 'resume') return launch('resume');
        if (item.doc === 'vcard') return downloadVcard();
        return setSelected(item.key);
    }
  };

  return (
    <div className="app-pc">
      <div className="app-pc-bar">
        <div className="app-pc-nav">
          <button type="button" aria-label="Back" disabled={cursor === 0} onClick={() => step(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label="Forward" disabled={cursor >= history.length - 1} onClick={() => step(1)}>
            <ChevronRight size={16} />
          </button>
          <button type="button" aria-label="Up one level" disabled={folder === 'home'} onClick={() => go('home')}>
            <ArrowUp size={16} />
          </button>
        </div>
        <nav className="app-pc-crumbs" aria-label="Location">
          <button type="button" onClick={() => go('home')}>
            <Monitor size={14} /> This PC
          </button>
          {folder !== 'home' && (
            <>
              <ChevronRight size={13} aria-hidden />
              <span>{FOLDERS[folder].name}</span>
            </>
          )}
        </nav>
        <label className="app-pc-search">
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder={folder === 'home' ? 'Search This PC' : `Search ${FOLDERS[folder].name}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />
        </label>
        <div className="app-pc-views" role="group" aria-label="View">
          <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
            <LayoutGrid size={15} />
          </button>
          <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="app-pc-main">
        <aside className="app-pc-side" aria-label="Places">
          <button type="button" className={folder === 'home' ? 'is-active' : ''} onClick={() => go('home')}>
            <Monitor size={15} /> This PC
          </button>
          {(Object.keys(FOLDERS) as Exclude<FolderId, 'home'>[]).map((f) => {
            const { name, Icon } = FOLDERS[f];
            return (
              <button key={f} type="button" className={folder === f ? 'is-active' : ''} onClick={() => go(f)}>
                <Icon size={15} /> {name}
              </button>
            );
          })}
        </aside>

        <section className={`app-pc-files is-${view}${folder === 'home' && !query ? ' is-home' : ''}`} aria-label={folder === 'home' ? 'This PC' : FOLDERS[folder].name}>
          {items.length === 0 && <p className="app-pc-none">Nothing matches “{query}”.</p>}
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`app-pc-item is-${item.kind}${selected === item.key ? ' is-sel' : ''}`}
              onClick={() => {
                if (selected === item.key && window.matchMedia('(pointer: coarse)').matches) openItem(item);
                else setSelected(item.key);
              }}
              onDoubleClick={() => openItem(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  openItem(item);
                }
              }}
            >
              <span className="app-pc-thumb">
                <ItemThumb item={item} />
              </span>
              <span className="app-pc-name">{item.name}</span>
              <span className="app-pc-sub">{item.sub}</span>
            </button>
          ))}
        </section>

        <aside className="app-pc-details" aria-label="Details">
          {current ? (
            <Details item={current} onOpen={() => openItem(current)} />
          ) : (
            <div className="app-pc-hint">
              <Eye size={22} />
              <p>Select a file to see its details. Double-click or press Enter to open it.</p>
            </div>
          )}
        </aside>
      </div>

      <footer className="app-pc-status">
        <span>
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        {current && <span>1 selected</span>}
      </footer>
    </div>
  );
}

function ItemThumb({ item }: { item: Item }) {
  switch (item.kind) {
    case 'drive':
      return item.folder === 'certificates' ? <Award size={30} /> : item.folder === 'projects' ? <HardDrive size={30} /> : <FolderOpen size={30} />;
    case 'project':
      return <ProjectIcon id={item.project.id} size={28} />;
    case 'cert':
      return <Image src={item.image} alt="" width={120} height={85} sizes="120px" />;
    case 'image':
      return <Image src={item.src} alt="" width={120} height={75} sizes="120px" />;
    case 'doc':
      return item.doc === 'skills' ? <FileBraces size={28} /> : item.doc === 'vcard' ? <Contact size={28} /> : <FileText size={28} />;
  }
}

function Details({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const props = (rows: [string, ReactNode][]) => (
    <dl className="app-pc-props">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );

  switch (item.kind) {
    case 'drive':
      return (
        <div className="app-pc-detail">
          <span className="app-pc-detail-icon">
            <ItemThumb item={item} />
          </span>
          <h3>{item.name}</h3>
          <p>{item.sub}</p>
          <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
            <FolderOpen size={14} /> Open
          </button>
        </div>
      );
    case 'project': {
      const p = item.project;
      return (
        <div className="app-pc-detail">
          <span className="app-pc-detail-icon">
            <ProjectIcon id={p.id} size={30} />
          </span>
          <h3>{p.name}</h3>
          <p>{p.tagline}</p>
          {props([
            ['Status', p.status ?? (p.url ? 'Live' : 'Source only')],
            ['Stack', p.stack.join(' · ')],
          ])}
          <div className="app-pc-actions">
            <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
              <Eye size={14} /> Details
            </button>
            {p.url && (
              <a className="app-btn" href={p.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Live
              </a>
            )}
            {p.repo && (
              <a className="app-btn" href={p.repo} target="_blank" rel="noopener noreferrer">
                <GitHubIcon size={14} /> Code
              </a>
            )}
          </div>
        </div>
      );
    }
    case 'cert':
      return (
        <div className="app-pc-detail">
          <Image className="app-pc-preview" src={item.image} alt={item.name} width={400} height={283} sizes="260px" />
          <h3>{item.name}</h3>
          {props([
            ['Issuer', item.issuer],
            ['Issued', item.date],
          ])}
          <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
            <Award size={14} /> View certificate
          </button>
        </div>
      );
    case 'image':
      return (
        <div className="app-pc-detail">
          <Image className="app-pc-preview" src={item.src} alt={`${item.project.name} screenshot`} width={400} height={250} sizes="260px" />
          <h3>{item.name}</h3>
          {props([
            ['Project', item.project.name],
            ['Type', 'JPEG screenshot'],
          ])}
          <div className="app-pc-actions">
            <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
              <Eye size={14} /> Open project
            </button>
            <a className="app-btn" href={item.src} target="_blank" rel="noopener noreferrer">
              <FileImage size={14} /> Full size
            </a>
          </div>
        </div>
      );
    case 'doc':
      if (item.doc === 'resume')
        return (
          <div className="app-pc-detail">
            <span className="app-pc-detail-icon">
              <FileText size={30} />
            </span>
            <h3>{item.name}</h3>
            {props([
              ['Pages', '1'],
              ['Type', 'PDF document'],
            ])}
            <div className="app-pc-actions">
              <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
                <Eye size={14} /> Open
              </button>
              <a className="app-btn" href={content.contact.resumeUrl} download>
                <Download size={14} /> Download
              </a>
            </div>
          </div>
        );
      if (item.doc === 'vcard')
        return (
          <div className="app-pc-detail">
            <span className="app-pc-detail-icon">
              <Contact size={30} />
            </span>
            <h3>{item.name}</h3>
            <pre className="app-pc-code">{VCARD}</pre>
            <button type="button" className="app-btn app-btn--primary" onClick={onOpen}>
              <Download size={14} /> Save contact
            </button>
          </div>
        );
      return (
        <div className="app-pc-detail">
          <h3>{item.name}</h3>
          <pre className="app-pc-code">{item.doc === 'skills' ? SKILLS_JSON : content.about}</pre>
        </div>
      );
  }
}

function downloadVcard() {
  play('click_primary');
  const url = URL.createObjectURL(new Blob([VCARD], { type: 'text/vcard' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Nithesh-Ramachandran.vcf';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
