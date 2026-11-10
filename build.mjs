#!/usr/bin/env node
/*
 * JPOND static site builder — zero dependencies.
 *
 *   node build.mjs
 *
 * Reads page bodies from src/pages/*.html, wraps each one in the shared
 * layout (header, footer, SEO and Open Graph tags), fills in values from
 * src/site.json and writes the finished pages to public/.
 *
 * Any empty value in site.json is rendered as a visible [placeholder] so
 * nothing is ever invented.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'public');
const cfg = JSON.parse(readFileSync(join(SRC, 'site.json'), 'utf8'));
const SITE = cfg.siteUrl.replace(/\/$/, '');

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ph = (en, ne) =>
  `<span class="ph"><span class="en">[${en}]</span><span class="ne" lang="ne">[${ne || en}]</span></span>`;
const t = (en, ne) => `<span class="en">${en}</span><span class="ne" lang="ne">${ne}</span>`;
const fmtNpr = (n) => Number(n).toLocaleString('en-IN');

/* ---------- Janaki Mandir silhouette (generated, single colour) ---------- */
function dome(cx, y, r, h) {
  return `M${cx - r},${y} C${cx - r * 1.35},${y - h * 0.45} ${cx - r * 0.25},${y - h * 0.72} ${cx},${y - h} ` +
    `C${cx + r * 0.25},${y - h * 0.72} ${cx + r * 1.35},${y - h * 0.45} ${cx + r},${y} Z ` +
    `M${cx - 1.5},${y - h} h3 v-${Math.round(h * 0.28)} h-3 Z`;
}
function arches(x0, x1, yBase, w, h, n) {
  const gap = (x1 - x0 - n * w) / (n + 1);
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + gap + i * (w + gap);
    d += `M${x},${yBase} v-${h - w / 2} a${w / 2},${w / 2} 0 0 1 ${w},0 v${h - w / 2} Z `;
  }
  return d;
}
function templeSvg(cls = 'temple') {
  const solid = [
    'M0,252 h800 v8 h-800 Z',
    'M110,246 h580 v6 h-580 Z',
    'M120,170 h560 v76 h-560 Z',
    'M200,132 h400 v38 h-400 Z',
    'M345,92 h110 v40 h-110 Z',
    'M104,112 h56 v134 h-56 Z',
    'M640,112 h56 v134 h-56 Z',
    'M228,118 h44 v14 h-44 Z', 'M528,118 h44 v14 h-44 Z',
    dome(400, 92, 52, 84),
    dome(132, 112, 30, 54), dome(668, 112, 30, 54),
    dome(250, 118, 22, 40), dome(550, 118, 22, 40),
    dome(310, 132, 15, 28), dome(490, 132, 15, 28),
    dome(185, 170, 13, 24), dome(615, 170, 13, 24),
  ].join(' ');
  const holes = arches(130, 670, 240, 26, 50, 13) + arches(210, 590, 166, 18, 26, 11) + arches(355, 445, 128, 16, 26, 3) +
    arches(112, 152, 160, 16, 30, 1) + arches(648, 688, 160, 16, 30, 1);
  return `<svg class="${cls}" viewBox="0 0 800 260" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet"><defs><mask id="${cls}-m"><rect width="800" height="260" fill="#fff"/><path d="${holes}" fill="#000"/></mask></defs><path d="${solid}" fill="currentColor" mask="url(#${cls}-m)"/></svg>`;
}

/* ---------- tokens available inside pages as {{NAME}} ---------- */
const tel = cfg.phone.replace(/[^\d+]/g, '');
const wa = cfg.whatsapp.replace(/[^\d]/g, '');
const raised = Number(cfg.amountRaisedNpr || 0);
const goal = Number(cfg.fundraisingGoalNpr || 5000000);
const pct = cfg.amountRaisedNpr ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

const tokens = {
  YEAR: String(new Date().getFullYear()),
  SITE_URL: SITE,
  PHONE: cfg.phone ? `<a href="tel:${tel}">${esc(cfg.phone)}</a>` : ph('Phone number – to be added', 'फोन नम्बर – थपिँदै'),
  EMAIL: cfg.email ? `<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>` : ph('Email address – to be added', 'इमेल ठेगाना – थपिँदै'),
  EMAIL_RAW: esc(cfg.email),
  WHATSAPP: wa ? `<a href="https://wa.me/${wa}" rel="noopener">${esc(cfg.whatsapp)}</a>` : ph('WhatsApp number – to be added', 'व्हाट्सएप नम्बर – थपिँदै'),
  FACEBOOK: cfg.facebook ? `<a href="${esc(cfg.facebook)}" rel="noopener">Facebook</a>` : ph('Facebook page – to be added', 'फेसबुक पेज – थपिँदै'),
  CONTACT_PERSON: esc(cfg.contactPerson),
  CONTACT_TITLE: cfg.contactPersonTitle ? t(esc(cfg.contactPersonTitle), esc(cfg.contactPersonTitle)) : ph('Chairperson – confirm title', 'अध्यक्ष – पद पुष्टि गर्नुहोस्'),
  SWC_NO: cfg.swcAffiliationNo ? esc(cfg.swcAffiliationNo) : ph('to be added', 'थपिँदै'),
  PAN_NO: cfg.panNo ? esc(cfg.panNo) : ph('to be added', 'थपिँदै'),
  FAMILIES: cfg.familiesServed ? esc(cfg.familiesServed) : '<span class="ph">[ ]</span>',
  GOAL_USD: cfg.goalUsdApprox ? `≈ USD ${esc(cfg.goalUsdApprox)}` : ph('approx. USD equivalent – confirm at current rate', 'लगभग अमेरिकी डलर – हालको दरमा पुष्टि गर्नुहोस्'),
  RAISED: cfg.amountRaisedNpr ? `NPR ${fmtNpr(raised)}` : ph('amount raised – to be updated', 'संकलित रकम – अद्यावधिक हुँदै'),
  RAISED_PCT: String(pct),
  GOAL_NPR: `NPR ${fmtNpr(goal)}`,
  GIFT_1000: cfg.giftNpr1000 ? esc(cfg.giftNpr1000) : ph('one therapy session – confirm', 'एक थेरापी सत्र – पुष्टि गर्नुहोस्'),
  FORM_ENDPOINT: esc(cfg.formEndpoint),
  TURNSTILE: cfg.turnstileSiteKey
    ? `<div class="cf-turnstile" data-sitekey="${esc(cfg.turnstileSiteKey)}"></div>`
    : '',
  TEMPLE: templeSvg('temple'),
  TEMPLE_BG: templeSvg('temple-bg'),
};

/* ---------- simple line icons: {{ICON_NAME}} ---------- */
const ICONS = {
  SPEECH: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  SENSORY: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><circle cx="12" cy="12" r="1.5"/>',
  EDUCATION: '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0z"/><path d="M21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
  OT: '<path d="M9 3h6v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 1-4 0H3V9h4a2 2 0 1 0 0-4V3z" transform="translate(3 3)"/>',
  PHYSIO: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7l-3 7M12 14l3 7M7 10l5-2 5 2"/>',
  MUSIC: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  SPORTS: '<circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 3 15 0 18M3 12h18M5 6c4 2 10 2 14 0M5 18c4-2 10-2 14 0"/>',
  CRAFT: '<path d="M4 20l9-9M14 4l6 6-3 3-6-6z"/><path d="M4 14l6 6"/>',
  PLAY: '<rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/>',
  PARENT: '<circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="8" r="2"/><path d="M3 20v-4a5 5 0 0 1 10 0v4M13 20v-3a3 3 0 0 1 6 0v3"/>',
  HEART: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z"/>',
  GRAD: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
  HANDS: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.5L7 14"/>',
  BUILDING: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5M9 11h.01M15 11h.01"/>',
  BOX: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  DOC: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
  PHOTO: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/>',
  GLOBE: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  PHONE: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  MAIL: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  PIN: '<path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  CAR: '<path d="M3 16v-4l2-5h14l2 5v4z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M3 12h18"/>',
  BOLT: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
};
for (const [k, v] of Object.entries(ICONS)) {
  tokens['ICON_' + k] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${v}</svg>`;
}

/* ---------- photo placeholders: <!--photo:shape|English caption|Nepali caption--> ---------- */
function photo(shape, en, ne) {
  const cls = shape && shape !== 'default' ? ` ${shape}` : '';
  return `<div class="photo-ph${cls}" role="img" aria-label="Photo placeholder: ${esc(en)}">${tokens.ICON_PHOTO}` +
    `<strong>${t('[Replace with real photo]', '[वास्तविक तस्बिर राख्नुहोस्]')}</strong>` +
    `<span>${t(en, ne || en)}</span></div>`;
}

/* ---------- navigation ---------- */
const NAV = [
  ['about', 'about.html', 'About us', 'हाम्रो बारेमा'],
  ['services', 'what-we-do.html', 'What we do', 'हाम्रा सेवा'],
  ['centre', 'the-centre.html', 'The centre', 'केन्द्र योजना'],
  ['training', 'training.html', 'Training', 'तालिम'],
  ['partners', 'partners.html', 'Partners', 'साझेदार'],
  ['news', 'news.html', 'Stories &amp; news', 'कथा र समाचार'],
  ['contact', 'contact.html', 'Contact', 'सम्पर्क'],
];

function header(active) {
  const items = NAV.map(([key, href, en, ne]) =>
    `<li><a href="/${href}"${key === active ? ' aria-current="page"' : ''}>${t(en, ne)}</a></li>`).join('');
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="JPOND home">
      <img src="/assets/img/logo-mark.svg" alt="" width="44" height="44">
      <span class="brand-text"><span class="brand-name">JPOND</span><span class="brand-sub">${t('Janakpur · Since 1990', 'जनकपुर · वि.सं. २०४७ देखि')}</span></span>
    </a>
    <button class="lang-toggle" type="button" data-lang-toggle aria-label="Switch language to Nepali / नेपाली भाषामा हेर्नुहोस्"><span class="en" lang="ne">नेपाली</span><span class="ne" lang="en">English</span></button>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bars" aria-hidden="true"></span><span class="en">Menu</span><span class="ne" lang="ne">मेनु</span></button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>${items}</ul>
      <div class="nav-cta">
        <a class="btn btn-outline" href="/get-involved.html"${active === 'involved' ? ' aria-current="page"' : ''}>${t('Get involved', 'सहभागी हुनुहोस्')}</a>
        <a class="btn btn-accent" href="/donate.html"${active === 'donate' ? ' aria-current="page"' : ''}>${t('Donate', 'दान गर्नुहोस्')}</a>
      </div>
    </nav>
  </div>
  <div class="mithila-border" aria-hidden="true"></div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="mithila-border" aria-hidden="true"></div>
  <div class="footer-temple" aria-hidden="true">${templeSvg('temple-foot')}</div>
  <div class="container footer-grid">
    <div>
      <p class="footer-brand">JPOND</p>
      <p>${t("Janakpur Parents' Organisation for Neurodevelopmental Disabilities", 'जनकपुर स्नायु विकास सम्बन्धी अपाङ्गता अभिभावक संघ')}</p>
      <p class="footer-motto" lang="ne">सेवा नै धर्म हो <span class="en" lang="en">— “Service is our duty”</span></p>
      <p class="est-badge">${t('Est. 2047 BS (1990)', 'स्थापना वि.सं. २०४७ (सन् १९९०)')}</p>
    </div>
    <div>
      <h2 class="footer-h">${t('Visit or write to us', 'ठेगाना')}</h2>
      <address>${t('Janakpurdham Sub-Metropolitan City-8,<br>Dhanusha, Madhesh Province, Nepal', 'जनकपुरधाम उपमहानगरपालिका-८,<br>धनुषा, मधेश प्रदेश, नेपाल')}</address>
      <ul class="footer-contact">
        <li>${t('Phone', 'फोन')}: {{PHONE}}</li>
        <li>${t('Email', 'इमेल')}: {{EMAIL}}</li>
        <li>WhatsApp: {{WHATSAPP}}</li>
        <li>{{FACEBOOK}}</li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">${t('Registration', 'दर्ता विवरण')}</h2>
      <ul class="footer-list">
        <li>${t('District Administration Office, Dhanusha', 'जिल्ला प्रशासन कार्यालय, धनुषा')}<br>${t('Reg. No. 26-047/048', 'दर्ता नं. २६-०४७/०४८')}</li>
        <li>${t('Social Welfare Council affiliation no.', 'समाज कल्याण परिषद् आबद्धता नं.')}: {{SWC_NO}}</li>
        <li>${t('PAN no.', 'स्थायी लेखा नं. (प्यान)')}: {{PAN_NO}}</li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">${t('Policies &amp; more', 'नीति तथा थप')}</h2>
      <ul class="footer-list">
        <li><a href="/transparency.html">${t('Transparency', 'पारदर्शिता')}</a></li>
        <li><a href="/child-safeguarding.html">${t('Child safeguarding policy', 'बाल संरक्षण नीति')}</a></li>
        <li><a href="/privacy-policy.html">${t('Privacy policy', 'गोपनीयता नीति')}</a></li>
        <li><a href="/get-involved.html">${t('Volunteer with us', 'स्वयंसेवक बन्नुहोस्')}</a></li>
        <li><a href="/donate.html">${t('Donate', 'दान गर्नुहोस्')}</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© {{YEAR}} JPOND. ${t('All rights reserved.', 'सर्वाधिकार सुरक्षित।')}</p>
    <p>${t('Photos on this site are placeholders. We never publish identifiable photos or names of children without written parental consent.', 'यस साइटका तस्बिरहरू नमुना मात्र हुन्। अभिभावकको लिखित सहमतिबिना हामी कुनै पनि बालबालिकाको पहिचान खुल्ने तस्बिर वा नाम प्रकाशित गर्दैनौँ।')}</p>
  </div>
</footer>`;
}

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'NGO',
  name: "Janakpur Parents' Organisation for Neurodevelopmental Disabilities",
  alternateName: ['JPOND', 'जनकपुर स्नायु विकास सम्बन्धी अपाङ्गता अभिभावक संघ'],
  url: SITE + '/',
  logo: SITE + '/assets/img/logo-mark.svg',
  foundingDate: '1990',
  slogan: 'Early intervention. Lifelong inclusion.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Janakpurdham Sub-Metropolitan City-8',
    addressLocality: 'Janakpurdham',
    addressRegion: 'Madhesh Province',
    addressCountry: 'NP',
  },
  areaServed: 'Janakpur and the Mithila region, Nepal',
  ...(cfg.email ? { email: cfg.email } : {}),
  ...(cfg.phone ? { telephone: cfg.phone } : {}),
  ...(cfg.facebook ? { sameAs: [cfg.facebook] } : {}),
};

/* ---------- layout ---------- */
const DEFAULT_KEYWORDS = 'autism centre Janakpur, neurodevelopmental disabilities Nepal, therapy centre Madhesh, JPOND, Down syndrome Nepal, cerebral palsy therapy Janakpur, special education Janakpur, speech therapy Nepal, Mithila';

function layout(meta, body) {
  const url = meta.path === 'index.html' ? SITE + '/' : `${SITE}/${meta.path}`;
  const fullTitle = meta.path === 'index.html' ? meta.title : `${meta.title} | JPOND`;
  const jsonld = meta.path === 'index.html'
    ? `<script type="application/ld+json">${JSON.stringify(ORG_JSONLD)}</script>`
    : '';
  const turnstile = cfg.turnstileSiteKey && meta.forms
    ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'
    : '';
  return `<!doctype html>
<html lang="en" data-lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="keywords" content="${esc(meta.keywords || DEFAULT_KEYWORDS)}">
${meta.noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0f5e63">
<meta property="og:type" content="website">
<meta property="og:site_name" content="JPOND">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="JPOND — Early intervention. Lifelong inclusion. Serving families in Janakpur since 1990.">
<meta property="og:locale" content="en_GB">
<meta property="og:locale:alternate" content="ne_NP">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/logo-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/assets/css/styles.css">
<script>document.documentElement.classList.remove('no-js');try{if(localStorage.getItem('jpond-lang')==='ne'){document.documentElement.setAttribute('data-lang','ne');}}catch(e){}</script>
<script src="/assets/js/main.js" defer></script>
${turnstile}
${jsonld}
</head>
<body>
<a class="skip-link" href="#main">${t('Skip to main content', 'मुख्य सामग्रीमा जानुहोस्')}</a>
${header(meta.nav)}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
</body>
</html>
`;
}

/* ---------- build ---------- */
function fill(html, file) {
  html = html.replace(/<!--photo:([^|]*)\|([^|]*)\|([^>]*?)-->/g, (m, a, b, c) => photo(a.trim(), b.trim(), c.trim()));
  const out = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
    if (!(k in tokens)) throw new Error(`${file}: unknown token ${m}`);
    return tokens[k];
  });
  return out;
}

const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
const sitemap = [];
for (const file of pages) {
  const raw = readFileSync(join(SRC, 'pages', file), 'utf8');
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = { path: file, ...JSON.parse(m[1]) };
  const html = fill(layout(meta, m[2]), file);
  const dest = join(OUT, meta.path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  if (!meta.noindex) sitemap.push(meta.path === 'index.html' ? `${SITE}/` : `${SITE}/${meta.path}`);
  console.log('built', meta.path);
}

writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.sort().map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(join(OUT, 'CNAME'), new URL(SITE).hostname + '\n');
writeFileSync(join(OUT, 'assets', 'img', 'temple.svg'),
  templeSvg('t').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, '#0f5e63'));
console.log(`done: ${pages.length} pages`);
