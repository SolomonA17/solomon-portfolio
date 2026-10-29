# Solomon Aberra Melesse — Portfolio

A single-page, interactive portfolio built on the supplied **“Brutalist editorial showroom on warm gray”** design system: a warm `#e5e5e5` canvas, flat white and black surfaces, oversized uppercase condensed type, with mint and voltage-yellow used only as accents.

It is a **zero-dependency static site** (semantic HTML, CSS and vanilla JavaScript), with no build step and nothing to install.

- **Why not React/Next.js?** This machine has no Node.js. Plain HTML also fits the brand. Every word is in the HTML that crawlers receive. There is no framework runtime, and the only third-party request is Google Fonts. That matches the portfolio's own promise: *fast, crawlable, measurable*. If you want a Next.js version later, the markup and CSS port almost one-to-one into components.

---

## Project structure

```
.
├── README.md                 ← you are here
├── serve.ps1                 ← local preview server for Windows (no installs)
├── tools/
│   ├── generate-images.ps1           ← rebuilds og-image.png, the PNG icons and favicon.ico
│   └── generate-project-covers.ps1   ← rebuilds the code-preview / illustration covers
├── vercel.json              ← tells Vercel to publish the site/ folder
└── site/                     ← the website: deploy THIS folder
    ├── index.html            ← all content (sections are clearly commented)
    ├── 404.html
    ├── favicon.ico
    ├── robots.txt
    ├── sitemap.xml
    ├── site.webmanifest
    └── assets/
        ├── css/tokens.css    ← design tokens (from your variables.css / tokens.json) + dark theme
        ├── css/main.css      ← components, layout, motion, responsive rules
        ├── js/main.js        ← interactions (progressive enhancement)
        ├── js/projects.js    ← GitHub project explorer
        ├── data/projects.json ← verified project data for the explorer
        ├── img/projects/     ← one preview image per GitHub project
        ├── cv/Solomon_Aberra_Melesse_CV.pdf
        ├── cv/Solomon_Aberra_Melesse_CV.docx
        └── img/              ← solomon-aberra-melesse.webp (portrait), favicons, icons, og-image.png
```

---

## Run it locally

**Windows (nothing to install):**

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:5173. Use `-Port 8080` to change the port.

**Any machine with Node.js or Python:**

```bash
npx serve site
```

```bash
python -m http.server 5173 --directory site
```

> Opening `site/index.html` straight from disk should work for a quick look, because all its paths are relative (this wasn't tested). Use a server for a faithful preview, including the 404 page.

---

## Deploy

There is no build command. The publish directory is `site`.

### Netlify
1. Drag and drop: go to https://app.netlify.com/drop and drop the **`site`** folder. You get a live URL straight away.
2. Or with Git: push this project to GitHub, choose **Add new site → Import an existing project**, leave the build command empty and set the **publish directory** to `site`.
3. Netlify serves `404.html` for missing pages automatically.

### Vercel
1. Push the project to GitHub, then **Add New → Project** and import it.
2. The root-level `vercel.json` sets the output directory to `site`. Keep the Vercel **Root Directory** set to the repository root, choose **Other** as the Framework Preset, and leave the Build Command empty.
3. Alternatively, set Vercel’s **Root Directory** to `site`; in that setup, the output directory should be `.` (not `site`).

### After the first deploy
1. Replace every `https://YOUR-DOMAIN.example` with your real URL (search the project for `YOUR-DOMAIN`). It appears in `index.html` (canonical, Open Graph, Twitter and JSON-LD), `robots.txt` and `sitemap.xml`.
2. Add the site to **Google Search Console** and submit `sitemap.xml`.
3. Check the share preview with the LinkedIn Post Inspector and https://www.opengraph.xyz.
4. Run Lighthouse and PageSpeed Insights on the live URL.

---

## Editing content

Most content lives in `site/index.html`, in order: Hero → Highlights → About → Skills → Work (cards + case-study dialogs) → Code (GitHub explorer, data in `assets/data/projects.json`) → Experience → Credentials → Contact. Each section starts with a comment banner.

| To change… | Edit |
|---|---|
| Colours, fonts, spacing, radii | `assets/css/tokens.css` (layer 1 = your supplied tokens, layer 2 = semantic roles) |
| A role or its bullets | the `<li class="role">` blocks in **04 · Experience** |
| A project card | the `<li class="work-card">` blocks in **03 · Selected work**. `data-categories` sets which filters it appears under (`engineering`, `seo`, `marketing`) |
| A case study | the matching `<dialog class="case" id="case-…">`. The card links to it with `href="#case-…"`, and that URL is shareable |
| The CV | replace the files in `assets/cv/` and keep the same filenames, or update the links |
| Your photo | replace `assets/img/solomon-aberra-melesse.webp`. If the new photo has a different shape, update `width`/`height` on both `<img>` tags in **01 · About** and the `aspect-ratio` in `.portrait-frame` (`main.css`) |

### The portrait
The About photo is shown as a grayscale print.
- **With a mouse:** a lens follows the pointer and shows the photo in colour, and the card tilts slightly. Clicking floods the whole photo with colour from that point; clicking again returns to grayscale.
- **On touch screens:** tapping does the same.
- **For keyboard users:** the **Colour** button is the equivalent, and it reports its on/off state to screen readers.
- **On scroll:** the card wipes in as you reach it.
- **With reduced motion:** the tilt and easing are off, but the colour toggle still works.

The same image file is used for both layers, so it downloads once (77 KB, lazy-loaded). The JSON-LD `image` also points to it.

### How the Skills “evidence” panel works
Skills shown as outlined buttons have a `data-skill="key"`. Any bullet anywhere on the page with `data-skills="key …"` becomes evidence for that skill. The panel shows the bullet's text, the role or project it belongs to (`data-source-title` on the parent) and a link to it. The CV text therefore stays the single source of truth. To link a new skill:

```html
<button class="skill" type="button" data-skill="graphql" aria-pressed="false">GraphQL</button>
…
<li data-skills="graphql rest">Built a GraphQL layer for …</li>
```

A skill with no evidence should stay a plain `<span class="skill">`.

---

## Contact form

No form backend is configured, so the form **does not send anything by itself**. It validates the fields, then opens the visitor's email app with the message addressed to you (`mailto:`), and the page says so. To receive submissions directly:

- **Netlify Forms** (when hosted on Netlify): add `name="contact" data-netlify="true"` to the `<form>`, add `<input type="hidden" name="form-name" value="contact">`, change `action` to `/thanks` (or remove it), and remove the `mailto` step in `initForm()` in `main.js` (submit the form with `fetch`, or let it post natively).
- **Formspree** (any host): create a form at formspree.io, set `action="https://formspree.io/f/<your-id>"` with `method="POST"`, and in `initForm()` replace the `mailto` redirect with `fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })`. Show the existing status message on success and on error.

---

## Placeholders you still need to fill

Placeholders on the page use a **dashed outline and a yellow “TO ADD” label**, so they can't be mistaken for real content. Search `index.html` for `placeholder` to find them all.

| # | What | Where |
|---|---|---|
| 1 | **Your live domain** (replaces `YOUR-DOMAIN.example`) | `index.html` head and JSON-LD, `robots.txt`, `sitemap.xml` |
| 2 | RideFlow: sprint dates and a measurable outcome | `#case-rideflow` |
| 3 | Heleph Coffee: Search Console figures, Core Web Vitals before/after, site and Farmer Success Stories links | `#case-heleph` |
| 4 | ConsultCXM: a client build you can show, screenshots, Lighthouse reports | `#case-consultcxm` |
| 5 | Freelance: 2–3 featured builds (name, link, screenshot, outcome — with permission) | `#case-freelance` |
| 6 | Simen Land Tours: dates, website link, outcome | `#case-simen` |
| 7 | Tess Coffee: dates, links, campaign results | `#case-tess` |
| 8 | *Optional:* credential verification links, a form backend, licensed Suisse Int'l fonts | see above |

LinkedIn (`linkedin.com/in/solomon-aberra-a5506a3a2`) and GitHub (`github.com/SolomonA17`) are linked in the Contact section, the footer, the mobile menu and the JSON-LD `sameAs`. If either URL changes, update all four. Your CV still says “LinkedIn URL · GitHub URL”, so you may want to add the real links there too.

Nothing on the site was invented. Every role, bullet, date, number (4+, 20+, 90+, 50+), certificate and language comes from your CV. Case-study “objectives” only restate goals your CV describes, and results appear only where the CV records them.

---

## GitHub project explorer (04 · Code)

The **Code** section showcases 12 of the 64 public repos, chosen by reading their source. Left out: forks, a repo mostly committed by others, a duplicate build, setup and practice repos, tests, AI-builder scaffolds and an earlier portfolio.

- **Data:** `site/assets/data/projects.json` holds the verified content for each project: summary, problem, features, engineering decisions, stack, contribution, links and image. Edit this file to change cards; the HTML doesn't need touching. `featured: true` and `rank` control the curated layout, and `skills` links a project to the Skills panel.
- **Interactions:**
  - **Search:** by name, tech or language (press `/` to jump to it).
  - **Filters and sort:** filter by category or technology; sort by relevance, recently updated or name.
  - **Detail dialog:** shareable as `#project-<slug>`, with ←/→ to step through projects.
  - **States:** loading skeletons, an empty state and an error state.
- **Live stats:** when the section comes into view, the browser calls the public GitHub API once, unauthenticated with no token, and caches the result for 30 minutes. That refreshes the repo count, last push, top languages and each card's "updated" date. If GitHub is rate-limited or unreachable, the snapshot in the JSON is shown and labelled as such.
- **Previews** (every card has one) are in `site/assets/img/projects/`:
  - real screenshots of the working live demos
  - the repository's own screenshot for Little Lemon
  - code previews built from real source lines for the C and Python projects
  - an illustration for SolarVue, whose demo is currently down

  `tools/generate-project-covers.ps1` rebuilds the generated ones. If an image ever fails to load, the card shows a typographic fallback.
- **Skills:** group G ("Also in my code") and the TypeScript, Tailwind CSS and React Router tags now link to these projects as evidence.

**Things to fix in your repos:**
- **CineDiscover:** `.env.local` is committed with a real value. Rotate that TMDB key, then delete the file from the repo.
- **SolarVue:** the live demo fails because `package.json` sets a GitHub Pages `"homepage"`. Remove it (or set it to `"."`) and redeploy.
- **Forecastify:** the repo's Website field points to a dead deployment. Use `https://forecastify-azure.vercel.app`.
- **Heleph homepage:** it has no `<title>` tag.

## Design system notes

- **Tokens:** `tokens.css` copies your `variables.css` palette, type scale, spacing and radii. Range values such as `24-32px` became fluid `clamp()` tokens.
- **Fonts:** SuisseIntl is commercial, so the reference's suggested substitutes are used: **Archivo** (variable width, condensed to 64%) for display, **Inter** (supports the 450 weight) for UI, and **Geist Mono** for labels. If you license Suisse, put it first in the font stacks and remove `--display-stretch`.
- **Hero render:** the reference uses photorealistic 3D cubes with brand logos. Those images aren't yours to use, so the hero has CSS-built 3D blocks with procedural concrete and wood textures, labelled with your stack. They tilt with the pointer and use no image files.
- **Deliberate deviations:**
  - Long paragraphs use line-height 1.5 instead of the reference's 1.25, for readability.
  - Smoke (`#979797`) is only used on black, because it fails contrast on the gray canvas.
  - The header stays fixed and compacts on scroll.
- **Dark theme:** it follows the visitor's system setting, and the moon/sun toggle overrides it (remembered in `localStorage` when available). Surfaces get lighter as they lift, and inverted blocks stay pure black.

## Accessibility and performance

- Semantic landmarks, one `h1`, ordered `h2`/`h3`/`h4`, a skip link, and visible `:focus-visible` rings.
- Native `<dialog>` for the menu and case studies: focus is trapped, Esc closes, and focus returns to the trigger.
- The accordion uses `aria-expanded`/`aria-controls`. Toggles use `aria-pressed`. Live regions announce filter, evidence and form results.
- `prefers-reduced-motion` turns off reveals, count-ups, floating, parallax and smooth scrolling.
- The site works without JavaScript: `<noscript>` rules show every case study and role inline.
- The only photo is the 77 KB WebP portrait. It's lazy-loaded and has fixed dimensions, so it doesn't shift the layout. The CSS and JS are small, handwritten files, and fonts use `display=swap` with preconnect.

## What was tested

These checks ran in a Chromium browser against the local server, at 1440 × 900, 768 × 1024 (tablet) and 375 × 812 (mobile), in light and dark mode:

- navigation, active-section highlighting, the mobile menu and section scrolling
- the work filter and its counts
- case dialogs: deep links, Esc, backdrop click and the close button
- the skill evidence panel, including its placement on mobile
- accordion expand and collapse
- the theme toggle
- copy-to-clipboard, including the error toast
- form validation
- the CV PDF and DOCX links, all icons, the manifest, robots.txt, the sitemap and the 404 page
- the external ConsultCXM link
- the GitHub explorer:
  - search, category and technology filters, the three sorts, and the empty state with reset
  - the detail dialog: deep links, ←/→ and previous/next, close and back
  - the case-study link inside the dialog, and skill evidence opening a project
  - all 12 preview images loading
  - live GitHub stats and the cached refresh
  - the 6 live demos (opened while this was built)
- horizontal overflow (none) and duplicate IDs or broken anchors (none)

**Not verified here:**

- the reduced-motion and no-JavaScript modes (they couldn't be emulated in this browser)
- a real `mailto:` hand-off (I didn't want to open your email app)
- Safari and Firefox rendering
- Lighthouse scores, which need the live URL
