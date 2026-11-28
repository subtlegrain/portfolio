const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_NAME = 'Sudip Khatri'
export const SITE_TITLE = 'Sudip Khatri | AI Engineer & Python Backend Developer'
export const SITE_DESCRIPTION =
  'AI Engineer and Python Backend Developer building LLM-powered applications, intelligent systems, and reliable backend services.'

/**
 * The production origin must be configured with NEXT_PUBLIC_SITE_URL.
 * Without it, canonical and social URLs are omitted rather than guessed.
 */
export function getSiteUrl(): URL | null {
  if (!rawSiteUrl) return null

  try {
    const url = new URL(rawSiteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

export function absoluteSiteUrl(path: string): string | undefined {
  const siteUrl = getSiteUrl()
  return siteUrl ? new URL(path, siteUrl).toString() : undefined
}
