'use client';

import { motion } from 'framer-motion';
import { APPS, MORE_APPS } from '@/components/jarvis/apps/registry';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { DUR, EASE_OUT, STAGGER } from '@/lib/jarvis/motion';

/** App drawer for the smaller tools. */
export function More() {
  const launch = useLaunchApp();
  return (
    <div className="app-more">
      {MORE_APPS.map((id, i) => {
        const { title, subtitle, Icon } = APPS[id];
        return (
          <motion.button
            key={id}
            type="button"
            className="app-more-tile"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * STAGGER, duration: DUR.standard, ease: EASE_OUT } }}
            onClick={() => launch(id)}
          >
            <span className="app-more-icon">
              <Icon size={30} strokeWidth={1.5} />
            </span>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
