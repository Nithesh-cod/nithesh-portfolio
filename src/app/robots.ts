import type { MetadataRoute } from 'next';
import { content } from '@/lib/content';

const SITE = content.liveUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
