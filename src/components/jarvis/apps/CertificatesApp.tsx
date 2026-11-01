'use client';

import Image from 'next/image';
import { useState } from 'react';
import { play } from '@/lib/audio';
import { certGroupLabel, certificateGroups } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

/** Every certificate, filterable by group; a click opens the shared lightbox. */
export function CertificatesApp() {
  const [group, setGroup] = useState<string | null>(null);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const shown = certificateGroups.filter((g) => !group || g.heading === group);
  const total = certificateGroups.reduce((n, g) => n + g.certs.length, 0);

  return (
    <div className="app-certs">
      <div className="app-toolbar">
        <div className="app-tabs" role="tablist" aria-label="Filter certificates">
          <button type="button" role="tab" aria-selected={!group} onClick={() => setGroup(null)}>
            All · {total}
          </button>
          {certificateGroups.map((g) => (
            <button key={g.heading} type="button" role="tab" aria-selected={group === g.heading} onClick={() => setGroup(g.heading)}>
              {certGroupLabel(g.heading)} · {g.certs.length}
            </button>
          ))}
        </div>
      </div>
      <div className="app-certs-body">
        {shown.map((g) => (
          <section key={g.heading}>
            <h3>{g.heading}</h3>
            <div className="app-certs-grid">
              {g.certs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="app-cert"
                  onClick={() => {
                    play('click_primary');
                    openCertificate(c.id);
                  }}
                >
                  <Image src={c.image} alt="" width={320} height={226} sizes="(max-width: 760px) 45vw, 220px" />
                  <strong>{c.title}</strong>
                  <span>
                    {c.issuer} · {c.date}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
