import type { MetadataRoute } from 'next';
import { content } from '@/lib/content';

const SITE = content.liveUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
  ];
}
