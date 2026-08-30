export interface EcosystemNode {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
}

export const ECOSYSTEM_NODES: EcosystemNode[] = [
  { eyebrow: '01', title: 'Score', description: 'Capture every moment with confidence.', icon: '◌' },
  { eyebrow: '02', title: 'Organize', description: 'Bring teams, events and operations together.', icon: '⌁' },
  { eyebrow: '03', title: 'Understand', description: 'Turn cricket activity into useful intelligence.', icon: '✦' },
  { eyebrow: '04', title: 'Broadcast', description: 'Take the experience beyond the boundary.', icon: '↗' }
];

export const AUDIENCES = [
  'Players', 'Teams & Clubs', 'Tournament Organizers', 'Scorers',
  'Academies', 'Broadcasters', 'Analysts', 'Cricket Communities'
];

export const PRODUCT_PILLARS = [
  { title: 'One connected identity', copy: 'A cricket journey should not restart every time the format, team or competition changes.' },
  { title: 'Real-time by design', copy: 'The platform is designed around events, decisions and information that move with the game.' },
  { title: 'Built beyond today', copy: 'A flexible foundation for products, workflows and intelligence that do not exist yet.' }
];