/**
 * Canonical social + contact directory — the single source of truth for Ancher
 * social handles/URLs and contact emails. Apps own presentation (which subset,
 * icons, order) and derive it from this keyed map. Pure data (no React).
 */

export interface SocialEntry {
  handle?: string
  name: string
  url: string
}

export const SOCIALS = {
  linkedin: {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/company/ancher-ai',
    handle: 'ancher-ai',
  },
  x: { name: 'X', url: 'https://x.com/AncherAI', handle: '@AncherAI' },
  youtube: { name: 'YouTube', url: 'https://www.youtube.com/@Ancher-AI', handle: '@Ancher-AI' },
  reddit: { name: 'Reddit', url: 'https://www.reddit.com/r/AncherAI' },
  discord: { name: 'Discord', url: 'https://discord.gg/ptK4MbXmzf' },
  facebook: { name: 'Facebook', url: 'https://www.facebook.com/ancherai' },
  tiktok: {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@ancherofficial',
    handle: '@ancherofficial',
  },
  instagram: {
    name: 'Instagram',
    url: 'https://www.instagram.com/ancherofficial',
    handle: '@ancherofficial',
  },
  substack: { name: 'Substack', url: 'https://ancherai.substack.com' },
  github: { name: 'GitHub', url: 'https://github.com/ancher-ai', handle: 'ancher-ai' },
} as const satisfies Record<string, SocialEntry>

export const CONTACTS = {
  info: 'info@ancher.ai',
  support: 'support@ancher.ai',
  careers: 'careers@ancher.ai',
  legal: 'legal@ancher.ai',
  privacy: 'privacy@ancher.ai',
  security: 'security@ancher.ai',
  press: 'press@ancher.ai',
} as const
