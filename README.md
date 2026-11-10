# JPOND website — jpond.org

The website of the **Janakpur Parents' Organisation for Neurodevelopmental Disabilities (JPOND)**
(जनकपुर स्नायु विकास सम्बन्धी अपाङ्गता अभिभावक संघ), Janakpurdham-8, Dhanusha, Nepal.
*Early intervention. Lifelong inclusion.* — Serving families since 1990.

It is a fast, static, mobile-first site in British English with a Nepali toggle. It has no
frameworks or web fonts, so it loads quickly on slow mobile networks. It needs no server and
can be hosted for free on GitHub Pages, Netlify or Cloudflare Pages.

## Structure

```
src/site.json        ← contact details, numbers and settings (edit this first)
src/pages/*.html     ← the content of each page (English + Nepali side by side)
build.mjs            ← adds the shared header, footer and SEO tags; writes to public/
public/              ← the finished website (this folder is what gets published)
  assets/css/styles.css
  assets/js/main.js  ← language toggle, menu, forms, donation picker, map
  assets/img/        ← logo, Open Graph image, Janaki Mandir silhouette
  assets/docs/       ← put registration / annual / audit report PDFs here
```

## Editing

1. Change the text in `src/pages/` or the settings in `src/site.json`.
2. Run `node build.mjs` (Node 18 or later; there are no dependencies to install).
3. Commit both `src/` and `public/`.

To preview the site locally, run `cd public && python3 -m http.server 8000` and open http://localhost:8000.

### Bilingual content
Each piece of text is written twice:

```html
<span class="en">English text</span><span class="ne" lang="ne">नेपाली पाठ</span>
```

English is shown by default. The **नेपाली** button switches every page, and the browser remembers the
choice. **The Nepali translations should be reviewed by a native speaker before launch.**

### Placeholders
Nothing has been invented. Missing information appears on the site as a highlighted
`[placeholder]`. Most of these are filled in automatically from `src/site.json`:

| Key | Shown as |
|---|---|
| `phone`, `email`, `whatsapp`, `facebook` | Contact details in the footer and on the Contact and Donate pages |
| `contactPersonTitle` | Satyendra Yadav's title (currently "[Chairperson – confirm title]") |
| `swcAffiliationNo`, `panNo` | Footer and Transparency page |
| `familiesServed` | Impact number on the Home page |
| `amountRaisedNpr`, `fundraisingGoalNpr` | Fundraising progress bars (the percentage is calculated for you) |
| `goalUsdApprox` | "≈ USD …" next to the NPR 40–50 lakh goal |
| `giftNpr1000` | "What your gift does" for NPR 1,000 |
| `formEndpoint` | Where form submissions are sent (see below) |
| `turnstileSiteKey` | Optional Cloudflare Turnstile anti-spam widget |

Other placeholders are in the page files themselves. To find them all, run `grep -rn "\[" src/pages`. They include:
- About page: milestones and board members
- The Centre page: the cost of each budget item and the timeline dates
- Training page: course details
- Partners page: the full name of MHS and partner logos
- Donate page: eSewa, Khalti, Fonepay QR and bank details, the international option, and what NPR 300 and 500 provide
- Transparency page: links to the PDFs
- Policies: the safeguarding lead's contact details and the full policy
- Contact page: the exact map location of the Ward 8 office

**Photos:** every image is a labelled `[Replace with real photo]` box. Never use identifiable photos or
names of children without written parental consent. Compress photos before uploading them (WebP or JPEG,
under about 200 KB, at most 1600 px wide), then add `loading="lazy"`, `width`/`height` and meaningful `alt` text.

**Sample news:** the three posts on `news.html` are clearly marked as samples. Replace or remove them.

## Forms and spam protection
The Contact, Volunteer and Partner enquiry forms include:
- a hidden honeypot field (bots fill it in; people never see it),
- a time trap (anything submitted within 4 seconds of loading is rejected),
- accessible validation, and required consent to the privacy and safeguarding policies,
- optional Cloudflare Turnstile (set `turnstileSiteKey`).

To receive submissions, create a free form at a service such as [Formspree](https://formspree.io), then put its
URL in `formEndpoint` and rebuild. Until you do this, the forms offer to send the message by email instead,
using the `email` setting, so no message is lost.

## Deploying to jpond.org
**GitHub Pages:** `.github/workflows/deploy.yml` builds the site and publishes `public/` every time you push to `main`.
1. In the repository, go to Settings → Pages → Source and choose **GitHub Actions**.
2. At your domain registrar, point `jpond.org` to GitHub Pages: add A records for `185.199.108.153`,
   `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and a `www` CNAME to `<user>.github.io`.
   `public/CNAME` already contains `jpond.org`.
3. Turn on "Enforce HTTPS".

If you use `jpond.org.np` instead, change `siteUrl` in `src/site.json` and rebuild. This updates the canonical
URLs, the sitemap, the Open Graph tags and the CNAME file.

**Netlify / Cloudflare Pages:** set the build command to `node build.mjs` and the publish directory to `public`.

## Accessibility and SEO
- Built to WCAG 2.1 AA. Every page passes axe-core automated checks in both English and Nepali.
- The site has a skip link, visible focus styles, a keyboard-accessible menu and tabs, an 18 px base font
  and high-contrast colours, and it respects the reduced-motion setting.
- Each page has its own title, meta description and keywords (for example "autism centre Janakpur",
  "neurodevelopmental disabilities Nepal" and "therapy centre Madhesh"), plus a canonical URL,
  Open Graph and Twitter card tags, NGO structured data (JSON-LD), `sitemap.xml` and `robots.txt`.
- The map loads only when someone asks for it, which saves mobile data.
