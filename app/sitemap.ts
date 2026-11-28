import type { MetadataRoute } from 'next'
import { absoluteSiteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const home = absoluteSiteUrl('/')
  const about = absoluteSiteUrl('/about')

  if (!home || !about) return []

  return [
    {
      url: home,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: about,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
