# Halftime Cuts — website

Marketing site for **Halftime Cuts**, a sports-house barbershop at 3205 E Foothill Blvd, Pasadena, CA 91107.

It's a static site (HTML, CSS and JS) with no build step. It's light-themed and sports-branded: the shop's shield logo, team colors (blue `#223D79`, orange `#D77200`, white), heavy italic sports type, a broadcast-style score bar and a "starting lineup" of barbers. Barber-pole stripes in team colors keep the barbershop feel. Motion is built with [GSAP](https://gsap.com) + ScrollTrigger and [Lenis](https://lenis.darkroom.engineering) smooth scrolling. Every "Book Now" opens the shop's Square booking page.

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
| **Square booking link** | Every `data-book` link in `index.html` (search `s/appointments`) | Right now these go to `https://www.halftimecuts.com/s/appointments`, which is the current Square Online site. **That page goes away when this site replaces it on the same domain.** In the Square Dashboard → Appointments → Online booking, copy the direct booking-site link (it looks like `https://book.squareup.com/appointments/…`) and find-and-replace it across `index.html`. Also update the `ReserveAction` target in the JSON-LD. |
| Instagram handle | Search `instagram.com/halftimecuts` | `@halftimecuts` matches the shop's Facebook and X handles but couldn't be verified directly. |
| Hours | `.hours` table, footer, score bar, CTA copy, `HOURS` in `assets/js/main.js`, JSON-LD | The current site says **Tue–Sat 9am–6pm** (closed Sun & Mon). Some directories still list Mon–Sat. |
| Rating & review count | Score bar, box score, reviews header (search `4.9` and `370`) | Taken from public review aggregators. Match them to the Google Business Profile. |
| Reviews | `#reviews` section | The quotes come from public review snippets. Swap in exact Google reviews (first name + last initial). Each card is a simple `<li class="review-card">`. |
| Barber lineup | `#lineup` section | George (owner), Josh, Robert and Stef come up most in recent reviews. Older listings also mention Lamar, Wilson and Cameron, so confirm who's currently behind the chair. |
| Phone | Search `796-4253` | `(626) 796-4253` is what the current site lists. One directory shows `(626) 514-3143`. |

## Adding photos

Every photo slot has a designed fallback, so the site looks finished without photos. Drop images into `assets/img/` with these names and they appear automatically, with no code changes:

| File | Shows up in | Suggested size |
| --- | --- | --- |
| `shop.jpg` | "The Shop" arch | 1200 × 1560, portrait |
| `barber-george.jpg`, `barber-josh.jpg`, `barber-robert.jpg`, `barber-stef.jpg` | Barber cards | 960 × 1200, portrait |
| `ig-1.jpg` … `ig-6.jpg` | Instagram tiles | 800 × 1000, portrait |

Compress images before uploading (for example with [Squoosh](https://squoosh.app)) and keep each under ~250 KB.

**Logo:** `assets/img/logo.svg` is a vector trace of the shop's shield logo, and it's used everywhere on the site. The original raster file is kept as `assets/img/logo-original.png`. If the shop has the original vector file (AI, EPS, SVG or PDF), swap it in as `logo.svg` for a pixel-perfect match.

## Structure

```
index.html              All content and markup
assets/css/styles.css   Design tokens (brand colors, type, spacing) at the top, then sections in page order
assets/js/main.js       Open/closed status, mobile menu, booking bar, and all scroll animation
assets/vendor/          GSAP 3.15 + ScrollTrigger, Lenis 1.3 (vendored, no CDN)
assets/fonts/           Archivo, upright + italic (variable width + weight), self-hosted (OFL)
assets/img/             Logo (SVG + original PNG), favicons, social share image, and your photos
```

## Notes

- **Accessibility:** semantic landmarks, skip link, visible focus states, and screen-reader text for animated headings. The page also respects `prefers-reduced-motion`, which turns off all animation and leaves a clean static page.
- **Without JavaScript:** everything is still visible and every link works.
- **Live status:** the score bar's LIVE/Closed tag, the "Open now / Closed" pill and the highlighted row in the hours table all use Pasadena time (`America/Los_Angeles`).
- **Map:** the Google Maps embed needs no API key. If it's blocked, an "Open in Google Maps" link shows in its place.
