'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { timeAgo, useGithubActivity } from '@/components/jarvis/useGithubActivity';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { GitHubIcon } from '@/components/ui/BrandIcons';
import { allProjects, certificateGroups, content } from '@/lib/content';
import { DUR, EASE_OUT } from '@/lib/jarvis/motion';

const projectCount = allProjects.length;
const liveCount = allProjects.filter((p) => p.url).length;
const certCount = certificateGroups.reduce((n, g) => n + g.certs.length, 0);

/** Floor widgets. Counts come from the portfolio's own data and pushes from
 *  GitHub itself; with no GitHub data that widget simply isn't there. */
export function HomeWidgets({ delay = 0 }: { delay?: number }) {
  const launch = useLaunchApp();
  const pushes = useGithubActivity();
  const enter = { opacity: 1, y: 0, transition: { delay, duration: DUR.slow, ease: EASE_OUT } };

  return (
    <div className="jos-widgets">
      <motion.section className="jos-widget" aria-label="Portfolio at a glance" initial={{ opacity: 0, y: 16 }} animate={enter}>
        <h3>Portfolio</h3>
        <div className="jos-widget-stats">
          <button type="button" onClick={() => launch('thispc')}>
            <b>{projectCount}</b> Projects
          </button>
          <button type="button" onClick={() => launch('thispc')}>
            <b>{liveCount}</b> Live
          </button>
          <button type="button" onClick={() => launch('certificates')}>
            <b>{certCount}</b> Certificates
          </button>
        </div>
      </motion.section>

      {/* The fetch can land while the OS is exiting, so this needs its own
          presence boundary: see the note in OSSidebar. */}
      <AnimatePresence>
        {pushes && (
          <motion.section key="github" className="jos-widget" aria-label="Latest on GitHub" initial={{ opacity: 0, y: 16 }} animate={enter}>
            <h3>
              <GitHubIcon size={13} /> Latest pushes
            </h3>
            <ul className="jos-widget-pushes">
              {pushes.map((push) => (
                <li key={push.name}>
                  <a href={push.url} target="_blank" rel="noopener noreferrer">
                    <span>{push.name}</span>
                    <small>
                      {push.language ? `${push.language} · ` : ''}
                      {timeAgo(push.pushedAt)}
                    </small>
                    <ExternalLink size={11} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            {content.contact.github && (
              <a className="jos-widget-more" href={content.contact.github} target="_blank" rel="noopener noreferrer">
                All repositories
              </a>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
