# Halftime Cuts — website

Marketing site for **Halftime Cuts**, a sports-house barbershop at 3205 E Foothill Blvd, Pasadena, CA 91107.

It's a static site (HTML, CSS and JS) with no build step. It's light-themed and sports-branded: the shop's shield logo, team colors (blue `#223D79`, orange `#D77200`, white), heavy italic sports type, a broadcast-style score bar and a "starting lineup" of barbers. Barber-pole stripes in team colors keep the barbershop feel. Motion is built with [GSAP](https://gsap.com) + ScrollTrigger on native browser scrolling (no scroll-jacking, so the page responds instantly to wheel, trackpad and touch). Every "Book Now" opens the shop's Square booking page.

## Run it locally

```bash
npx http-server -p 8080 .     # or: python3 -m http.server 8080
```

Then open http://localhost:8080.

## Deploy

Upload the repo contents to any static host:

- **GitHub Pages**: Settings → Pages → deploy from branch, root folder.
- **Netlify / Vercel / Cloudflare Pages**: import the repo. Leave the build command empty and set the output directory to `/`.

Point `halftimecuts.com` at the host once it's live.

## Before launch: things to confirm with the shop

| What | Where | Why |
| --- | --- | --- |
| **Square booking link** | Search `s/appointments` in `index.html` and `accessibility.html` | Right now these go to `https://www.halftimecuts.com/s/appointments`, which is the current Square Online site. **That page goes away when this site replaces it on the same domain.** In the Square Dashboard → Appointments → Online booking, copy the direct booking-site link (it looks like `https://book.squareup.com/appointments/…`) and find-and-replace just that base address in both files. The search also catches the `ReserveAction` target in the structured data. Each button keeps its short tag (`?service=haircut`, `?barber=josh`, `?ref=hero`), so every link stays distinct. That matters for accessibility checkers, and it shows which button people use. If Square gives you direct links for individual services or barbers, use those on the matching rows and cards. |
| Instagram handle | Search `instagram.com/halftimecuts` | `@halftimecuts` matches the shop's Facebook and X handles but couldn't be verified directly. |
| Hours | `.hours` table, footer, score bar, CTA copy, FAQ, `HOURS` in `assets/js/main.js`, JSON-LD | The current site says **Tue–Sat 9am–6pm** (closed Sun & Mon). Some directories still list Mon–Sat. |
| Rating & review count | Score bar, box score, reviews header (search `4.9` and `370`) | Taken from public review aggregators. Match them to the Google Business Profile. |
| Reviews | `#reviews` section | The quotes come from public review snippets. The Cameron and Fernando M. cards are condensed from search summaries rather than copied word for word, so replace them first. Swap in exact Google reviews (first name + last initial). Each card is a simple `<li class="review-card">`. |
| Barber bios | `#lineup` section | The lineup is George (owner), Josh, Wilson, Cameron and Kevin. George's, Josh's and Cameron's bios come from reviews. Wilson's uses the shop's own "our chill guy" line. Kevin's is generic because nothing about him is published, so swap in a line or two from each barber. |
| Phone | Search `796-4253` | `(626) 796-4253` is what the current site lists. One directory shows `(626) 514-3143`. |
| Walk-ins / parking | `#faq` section + FAQ in the JSON-LD | Not published anywhere I could find, so the FAQ doesn't mention them. If they take walk-ins or have parking, add a question. These are common local searches. |

## Adding photos

Every photo slot has a designed fallback, so the site looks finished without photos. Drop images into `assets/img/` with these names and they appear automatically, with no code changes:

| File | Shows up in | Suggested size |
| --- | --- | --- |
| `shop.jpg` | "The Shop" arch | 1200 × 1560, portrait |
| `barber-george.jpg`, `barber-josh.jpg`, `barber-wilson.jpg`, `barber-cameron.jpg`, `barber-kevin.jpg` | Barber cards | 960 × 1200, portrait |
| `ig-1.jpg` … `ig-6.jpg` | Instagram tiles (decorative; clicking anywhere on the grid opens Instagram, and the "Follow us" button is the accessible link) | 800 × 1000, portrait |

Compress images before uploading (for example with [Squoosh](https://squoosh.app)) and keep each under ~250 KB.

**Logo:** `assets/img/logo.svg` is a vector trace of the shop's shield logo, and it's used everywhere on the site. The original raster file is kept as `assets/img/logo-original.png`. If the shop has the original vector file (AI, EPS, SVG or PDF), swap it in as `logo.svg` for a pixel-perfect match.

## Structure

```
index.html              All content and markup
accessibility.html      Accessibility statement (linked in the footer)
404.html                Branded "page not found"
site.webmanifest        App name, colors and icons
assets/css/styles.css   Design tokens (brand colors, type, spacing) at the top, then sections in page order
assets/js/main.js       Open/closed status, menu, booking bar, pause control, focus handling, scroll animation
assets/vendor/          GSAP 3.15 + ScrollTrigger (vendored, no CDN)
assets/fonts/           Archivo upright + italic, self-hosted (OFL), trimmed to Latin and the weights/widths in use
assets/img/             Logo (SVG + original PNG), favicons, social share image, and your photos
```

## SEO

What's built in:

- **Title, description and one H1:** each targets "barbershop in Pasadena" plus services. There's a canonical URL, Open Graph and Twitter cards with a 1200×630 share image, and a web app manifest with icons.
- **Structured data (JSON-LD):**
  - `HairSalon`: name, address, phone, hours, map, area served, social profiles, booking action, and a service catalog with prices.
  - `WebSite`.
  - `FAQPage`.
- **Local content:** service names, neighborhoods (East Pasadena, Sierra Madre, Arcadia, Altadena) and a visible FAQ that answers real search questions.
- **Crawling:** `robots.txt` and `sitemap.xml`, plus a branded `404.html`. The github.io preview adds a `noindex` tag at runtime, so only the real domain ranks.
- **Core Web Vitals:**
  - The first-paint animation is pure CSS, so the hero renders without waiting on JavaScript.
  - Fonts are self-hosted and trimmed to the characters the site uses.
  - Lighthouse (with compression, like GitHub Pages): mobile 94 performance and 100 SEO; desktop 99 and 100.

**After launch (most of local SEO happens off the site):**

1. **Google Business Profile:**
   - Set the website to `https://www.halftimecuts.com/`.
   - Use "Barber shop" as the primary category.
   - Make the hours match the site.
   - Add photos, post occasionally, and reply to reviews.
2. **Google Search Console:** verify the domain and submit `https://www.halftimecuts.com/sitemap.xml`. Do the same in Bing Webmaster Tools.
3. **Consistent name, address and phone everywhere:** fix the conflicting phone number and hours on Yelp, Facebook, Apple Maps (Apple Business Connect), Nextdoor and directories so they match the site exactly.
4. **Keep asking happy clients for Google reviews.** Volume and recency both help.
5. **When you edit the FAQ, services or hours:** update the matching JSON-LD in `<head>` too, so search engines see the same facts.

## Accessibility (ADA / WCAG 2.2 AA)

The site targets **WCAG 2.2 Level AA**, the standard ADA website cases are measured against. It was tested with:

- axe-core: 0 violations at 320–1920px, with and without reduced motion.
- Lighthouse Accessibility: 100.
- A re-implementation of WAVE's checks: 0 errors, 0 contrast errors, 0 alerts.
- A scripted keyboard pass of every tab stop.
- 400% zoom (320px) and the WCAG text-spacing test.

WAVE's AIM score counts *alerts* as well as errors. To keep it high:

- Don't put several links to the same address next to each other.
- Use real headings (`h2`/`h3`) for anything that looks like a heading.
- Keep text above 10px.
- Don't add "screen-reader-only" text squeezed into a 1px box (the usual `.visually-hidden` / `sr-only` trick). WAVE reports every one as "Very small text". This site gives screen readers extra words without it:
  - Links that open a new tab get `target="_blank" rel="noopener" aria-describedby="new-tab"`. That points at one hidden "Opens in a new tab" note at the top of the page.
  - Icon-only buttons and links get an `aria-label`.
  - Headings animated letter by letter get their full text as an `aria-label` (added automatically by `main.js`).
- Never hide text with `opacity` or transparent colors while it's on the page. WAVE counts see-through text as a contrast error. Scroll reveals here use a clip "wipe" instead, so text is always solid.

What's in place:

- **Navigation and keyboard:**
  - Skip link and landmarks, with a single logical heading outline.
  - Every control is reachable by keyboard, with a visible focus ring that's never hidden under the sticky header or booking bar.
  - In-page links move keyboard focus.
  - The mobile menu blocks everything behind it while open, closes with Esc, and returns focus.
  - In the pinned barber section, tabbing scrolls to the barber card being focused.
- **Contrast and visibility:**
  - Text and controls pass AA contrast.
  - Content that fades in on scroll appears instantly when it receives focus, or when you arrive by link or find-in-page.
  - Windows High Contrast mode is supported.
- **Motion:**
  - `prefers-reduced-motion` is honored.
  - A **Pause animations** button (header, mobile menu, footer) stops every looping animation and remembers the choice.
- **Screen readers:**
  - Animated headings are announced as normal text. Counters always expose their final number; the ticking digits are a decorative layer on top.
  - Links that open a new tab say so (as a description, after the link text).
  - The "Today" marker in the hours is real text.
- **Touch and layout:** tap targets are at least 24×24px, and grids and headings reflow down to 320px without cutting off content.
- **Accessibility statement:** [`accessibility.html`](accessibility.html) is linked in the footer and includes a phone and email contact for anyone who has trouble.

Keeping it compliant as the site changes:

- Copy an existing link when you add one that opens Square, Instagram or Maps. It already has the new-tab description.
- Give every new photo a short, specific `alt` (for example, "Skin fade with a hard part by Josh"). Use `alt=""` only for decorative images.
- Stick to the color tokens in `styles.css`. Orange text on white is only allowed at large sizes.
- Caption any video you add, and don't add autoplaying sound.
- Re-test after big changes. Run [axe DevTools](https://www.deque.com/axe/devtools/) or Lighthouse in Chrome, and try the page with only a keyboard.
- Update the review date in `accessibility.html` once a year.

No website can promise legal immunity. The parts outside our control are Square booking, Google Maps and the social sites. The statement page covers this by offering phone booking.

## Notes

- **Without JavaScript:** everything is still visible and every link works.
- **Live status:** the score bar's LIVE/Closed tag, the "Open now / Closed" pill and the highlighted row in the hours table all use Pasadena time (`America/Los_Angeles`).
- **Map:** the Google Maps embed needs no API key. If it's blocked, an "Open in Google Maps" link shows in its place.
