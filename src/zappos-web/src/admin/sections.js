// How the admin panel groups and labels the landing content (landing-content.json).
// Every top-level key belongs to one section; unknown keys show up under "Other" automatically.

export const SECTIONS = [
  { id: 'brand', label: 'Brand & contact', icon: 'call', keys: ['brand'], hint: 'Your shop name, phone, email, address and the short "about" text used in the footer.' },
  { id: 'links', label: 'Links', icon: 'arrow', keys: ['links', 'whatsappButton'], hint: 'Where buttons point: Windows installer, app stores, WhatsApp, portal login and social media. "Label" at the bottom is the text of the round WhatsApp button on the right of the page (it only shows once the WhatsApp link is set; empty label hides it).' },
  { id: 'nav', label: 'Top menu', icon: 'menu', keys: ['nav'], hint: 'Links in the floating menu. "Link target" must match a section, e.g. #pricing.' },
  { id: 'hero', label: 'Hero', icon: 'zap', keys: ['hero'], hint: 'The top of the page: headline lines, description, buttons and the Internet switch notes.' },
  { id: 'ticker', label: 'Shop ticker', icon: 'tag', keys: ['ticker'], hint: 'Shop types scrolling in the blue band under the hero.' },
  { id: 'day', label: 'Day timeline', icon: 'sun', keys: ['day'], hint: '"A day at your counter". Times are 12-hour, e.g. 9:00 AM.' },
  { id: 'video', label: 'Demo video', icon: 'video', keys: ['video'], hint: 'The "See ZAP POS at work" video section. To change the video, put the new file in the website\'s public/media folder and change "Video file" here. Leave "Video file" empty to hide the section.' },
  { id: 'counters', label: 'Counter demo', icon: 'monitor', keys: ['counters'], hint: 'The interactive "Sell one" demo with three counters.' },
  { id: 'hardware', label: 'Hardware', icon: 'printer', keys: ['hardware'], hint: 'The hardware stickers.' },
  { id: 'pricing', label: 'Pricing', icon: 'card', keys: ['pricing'], hint: 'Plans printed as receipts, prices and the comparison table. Prices are in PKR.' },
  { id: 'reviews', label: 'Reviews', icon: 'star', keys: ['reviewsSection', 'reviews'], hint: 'Only use real customer reviews. Remove all reviews to hide the section.' },
  { id: 'faq', label: 'FAQ', icon: 'whatsapp', keys: ['faq'], hint: 'Questions shown in the WhatsApp-style chat.' },
  { id: 'finalCta', label: 'Final section', icon: 'moon', keys: ['finalCta'], hint: 'The dark "Ready when the internet isn\'t" section at the bottom.' },
  { id: 'leadForm', label: 'Demo form', icon: 'mail', keys: ['leadForm'], hint: 'The "Book a free demo" form. It opens from every demo button; requests arrive under Leads.' },
  { id: 'account', label: 'Customer account', icon: 'lock', keys: ['account'], hint: 'The /account/ page where shops sign up and log in (same login as the POS app). {email}, {name} and {date} are filled in automatically.' },
  { id: 'invoice', label: 'Invoice page', icon: 'receipt', keys: ['invoice'], hint: 'Words on the invoice your clients open from the link you send (and its PDF). {date} is filled in automatically. Your business details and how to pay are set in Bills → Invoice details.' },
  { id: 'pages', label: 'Extra pages', icon: 'grid', keys: ['pages'], hint: 'The extra pages (zappos.pk/fbr-invoicing, /plans, /download …). Each page has its address, menu name, Google title and description, then its blocks: problems, features, steps, specs, FAQ and the closing box. Leave a block empty to hide it. A new or renamed page reaches Google after the next deploy (Vercel → Redeploy).' },
  { id: 'footer', label: 'Footer', icon: 'layers', keys: ['footer'], hint: 'Footer link columns. Links can point to a page (/plans), a home section (/#faq) or #demo (opens the demo form).' },
]

// Friendly labels for keys (anything not listed is turned from camelCase into words).
const LABELS = {
  reviewsSection: 'Reviews heading',
  reviews: 'Customer reviews',
  titleHighlight: 'Highlighted part (blue)',
  kicker: 'Small label above the title',
  lead: 'Start of line',
  accent: 'Blue part of line',
  monthly: 'Monthly price (Rs per month)',
  annual: 'Yearly total (Rs)',
  unit: 'Priced per (e.g. branch)',
  priceLabel: 'Text when there is no price',
  featured: 'Highlight as "Most picked"',
  saveLabel: '"Save up to" note',
  lines: 'Receipt lines',
  compare: 'Comparison table',
  href: 'Link target',
  q: 'Question',
  a: 'Answer',
  cta: 'Button text',
  primaryCta: 'Main button',
  secondaryCta: 'Second button',
  switchLabel: 'Internet switch label',
  switchNote: 'Note next to the switch',
  offlineNote: 'Note while offline',
  syncedNote: 'Note after syncing',
  trust: 'Small ticks under the buttons',
  windowsInstaller: 'Windows installer link (leave as # to use the newest GitHub release)',
  githubRepo: 'GitHub repository that holds the installer (owner/name)',
  downloadNote: 'Small line under the buttons (version and size are added)',
  googlePlay: 'Google Play link',
  appStore: 'App Store link',
  whatsapp: 'WhatsApp link',
  demo: 'Book a demo link',
  portal: 'Portal login link',
  stops: 'Timeline stops',
  slug: 'Page address (after zappos.pk/, small letters and dashes)',
  menu: 'Page name (breadcrumb, links)',
  seoTitle: 'Google title (about 60 letters)',
  seoDescription: 'Google description (about 155 letters)',
  showPricing: 'Show the plans (Pricing section)',
  showDownload: 'Show the download box',
  solvedLine: 'Line under the problems',
  relatedTitle: 'Title above the links to other pages',
  groups: 'Link columns',
  visual: 'Picture in the card',
  stock: 'Starting stock',
  src: 'Video file (address, e.g. /media/zap-pos-demo.mp4)',
  poster: 'Picture shown before playing',
  videoLabel: 'Video name (for screen readers)',
  playLabel: 'Play button label (for screen readers)',
  playNote: 'Small line on the picture',
  points: 'Ticks under the video',
  searches: 'Popular searches',
  seoColumns: 'Extra link columns',
  business: 'Shop name & city',
}

// Extra help under specific fields.
export const HINTS = {
  monthly: 'Leave empty to show "On request".',
  demo: 'Keep #demo to open the demo form (requests go to Leads). Or paste another link, e.g. a WhatsApp chat.',
  annual: 'Total for one year. Customers see it per month (÷ 12) with "billed yearly"; the yearly total itself is never shown.',
  unit: 'Leave empty for a normal "/month" price.',
  saveLabel: 'Leave empty to calculate it from the prices automatically.',
  time: '12-hour time, e.g. 9:00 AM',
  stock: 'Units in stock when the demo starts.',
  rating: 'Only use a real average rating.',
  phone: 'Shown in the hero, FAQ and footer.',
}

// Fields that pick from a fixed list.
export const CHOICES = {
  visual: ['open', 'counters', 'offline', 'stock', 'phone'],
}

export const humanize = (key) =>
  LABELS[key] ?? String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
