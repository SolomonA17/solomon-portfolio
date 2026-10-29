/* ==========================================================================
   GitHub project explorer
   Renders assets/data/projects.json (hand-verified against each repo's code)
   into image cards with search, category and technology filters, sorting and
   a detail dialog. The public GitHub API is only used to refresh stats and
   "last updated" dates; if it's unavailable the JSON snapshot is shown.
   ========================================================================== */
(function () {
  "use strict";

  var section = document.querySelector("[data-code]");
  if (!section) return;

  var DATA_URL = "assets/data/projects.json";
  var CACHE_KEY = "portfolio:gh-repos";
  var CACHE_TTL = 30 * 60 * 1000;
  var MAX_PAGES = 5;
  var LANG_COLORS = {
    TypeScript: "#3178c6", JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#563d7c",
    C: "#a8b9cc", Python: "#3572a5", Shell: "#89e051", Ruby: "#cc342d"
  };
  var NOTABLE_TECH = ["Three.js", "NextAuth", "next-pwa"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  var dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function make(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function icon(id) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(ns, "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function formatMonth(iso) { return iso ? monthYear.format(new Date(iso)) : "—"; }

  var ui = {
    grid: $("[data-code-grid]", section),
    q: $("[data-code-q]", section),
    tech: $("[data-code-tech]", section),
    sort: $("[data-code-sort]", section),
    filters: $("[data-code-filters]", section),
    status: $("[data-code-status]", section),
    empty: $("[data-code-empty]", section),
    reset: $("[data-code-reset]", section),
    error: $("[data-code-error]", section),
    note: $("[data-code-note]", section),
    source: $("[data-code-source]", section),
    sourceText: $("[data-code-source-text]", section),
    dialog: $("[data-project-dialog]", section)
  };

  var state = { q: "", cat: "all", tech: "", sort: "relevance" };
  var data = null;
  var projects = [];
  var bySlug = {};
  var cards = {};
  var divider = null;
  var visibleOrder = [];
  var currentSlug = null;

  /* ---- Data helpers ------------------------------------------------------ */

  // "Next.js 16" -> "Next.js", "C (gnu89)" -> "C", "Tailwind CSS v4" -> "Tailwind CSS"
  function techName(s) {
    var name = s.replace(/\s*\([^)]*\)/g, "").replace(/\s+v?\d+(\.\d+)*$/i, "").trim();
    return { HTML5: "HTML", CSS3: "CSS" }[name] || name;
  }

  function repoUrl(p) { return data.profile.url + "/" + p.repo; }
  function isProgramWork(p) { return p.origin === "program" || p.origin === "course"; }

  function prepare(p) {
    var techs = [];
    p.stack.map(techName).concat(p.language ? [p.language] : []).forEach(function (t) {
      if (techs.indexOf(t) < 0) techs.push(t);
    });
    p._tech = techs;
    var catLabels = (p.categories || []).map(function (id) {
      var c = data.categories.filter(function (x) { return x.id === id; })[0];
      return c ? c.label : id;
    });
    p._haystack = [p.name, p.repo, p.tagline, p.summary, p.originLabel, p.language]
      .concat(p.stack, catLabels).join(" ").toLowerCase();
    return p;
  }

  function matches(p) {
    if (state.cat !== "all" && (p.categories || []).indexOf(state.cat) < 0) return false;
    if (state.tech && p._tech.indexOf(state.tech) < 0) return false;
    if (state.q) {
      var tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < tokens.length; i++) if (p._haystack.indexOf(tokens[i]) < 0) return false;
    }
    return true;
  }

  function isCurated() {
    return state.sort === "relevance" && !state.q && state.cat === "all" && !state.tech;
  }

  function compare(a, b) {
    if (state.sort === "recent") return (b.pushedAt || "").localeCompare(a.pushedAt || "") || a.rank - b.rank;
    if (state.sort === "name") return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    return a.rank - b.rank;
  }

  /* ---- Cards ------------------------------------------------------------- */

  function fallbackCover(media, p) {
    var img = $("img", media);
    if (img) img.remove();
    var cover = make("div", "pc-fallback");
    cover.appendChild(make("span", null, p.language || "GitHub"));
    cover.appendChild(make("strong", null, p.name));
    cover.appendChild(make("span", null, "Preview unavailable"));
    media.insertBefore(cover, media.firstChild);
  }

  function metaLine(el, p) {
    el.textContent = "";
    var lang = make("span");
    var dot = make("span", "lang-dot");
    dot.style.setProperty("--lang", LANG_COLORS[p.language] || "#888");
    lang.appendChild(dot);
    lang.appendChild(document.createTextNode(p.language || "—"));
    el.appendChild(lang);
    el.appendChild(make("span", null, "Updated " + formatMonth(p.pushedAt)));
    if (p.commits) el.appendChild(make("span", null, p.commits + (p.commits === 1 ? " commit" : " commits")));
  }

  function buildCard(p) {
    var li = make("li", "project-card");
    li.setAttribute("data-slug", p.slug);
    li.setAttribute("data-featured", String(!!p.featured));
    // Skills panel evidence: the summary carries data-skills; these name its source.
    li.setAttribute("data-source-title", p.name);
    li.setAttribute("data-source-meta", "GitHub · " + p.originLabel);
    li.setAttribute("data-source-target", "#project-" + p.slug);
    li.style.setProperty("view-transition-name", "pc-" + p.slug);

    var media = make("div", "pc-media");
    var img = make("img");
    img.src = p.image.src;
    img.alt = p.image.alt;
    img.width = p.image.width;
    img.height = p.image.height;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () { fallbackCover(media, p); }, { once: true });
    media.appendChild(img);

    var badges = make("span", "pc-badges");
    badges.appendChild(make("span", "tag" + (isProgramWork(p) ? " tag--muted" : ""), p.originLabel));
    if (p.demo) {
      var live = make("span", "tag pc-live");
      live.appendChild(make("span", "dot"));
      live.appendChild(document.createTextNode("Live demo"));
      badges.appendChild(live);
    }
    media.appendChild(badges);
    li.appendChild(media);

    var body = make("div", "pc-body");
    var meta = make("p", "pc-meta");
    metaLine(meta, p);
    body.appendChild(meta);
    body.appendChild(make("h3", "pc-title", p.name));
    body.appendChild(make("p", "pc-tagline", p.tagline));
    var summary = make("p", "pc-summary", p.summary);
    summary.setAttribute("data-skills", p.skills || "");
    body.appendChild(summary);

    var stack = make("ul", "pc-stack");
    stack.setAttribute("aria-label", "Stack");
    p.stack.slice(0, 4).forEach(function (t) { stack.appendChild(make("li", null, t)); });
    if (p.stack.length > 4) stack.appendChild(make("li", null, "+" + (p.stack.length - 4)));
    body.appendChild(stack);

    var actions = make("div", "pc-actions");
    var open = make("button", "pc-open link-arrow", "Details");
    open.type = "button";
    open.setAttribute("aria-label", "Details — " + p.name);
    open.appendChild(icon("i-arrow"));
    open.addEventListener("click", function () { openProject(p.slug, true); });
    actions.appendChild(open);

    var gh = make("a", "pc-icon");
    gh.href = repoUrl(p);
    gh.target = "_blank";
    gh.rel = "noopener";
    gh.setAttribute("aria-label", p.name + " source on GitHub (opens in a new tab)");
    gh.appendChild(icon("i-github"));
    actions.appendChild(gh);

    if (p.demo) {
      var demo = make("a", "pc-icon");
      demo.href = p.demo;
      demo.target = "_blank";
      demo.rel = "noopener";
      demo.setAttribute("aria-label", p.name + " live demo (opens in a new tab)");
      demo.appendChild(icon("i-arrow-ur"));
      actions.appendChild(demo);
    }
    body.appendChild(actions);
    li.appendChild(body);
    return li;
  }

  /* ---- Filters, search, sort --------------------------------------------- */

  function buildFilters() {
    var counts = { all: projects.length };
    projects.forEach(function (p) { (p.categories || []).forEach(function (c) { counts[c] = (counts[c] || 0) + 1; }); });
    var options = [{ id: "all", label: "All" }].concat(data.categories.filter(function (c) { return counts[c.id]; }));
    options.forEach(function (c) {
      var chip = make("button", "chip", c.label + " ");
      chip.type = "button";
      chip.setAttribute("data-cat", c.id);
      chip.setAttribute("aria-pressed", String(c.id === state.cat));
      chip.appendChild(make("span", "mono", String(counts[c.id])));
      chip.addEventListener("click", function () { state.cat = c.id; syncControls(); update(); });
      ui.filters.appendChild(chip);
    });

    // Offer technologies shared by 2+ projects, every primary language, and a few notable one-offs.
    var techCounts = {};
    var languages = {};
    projects.forEach(function (p) {
      languages[p.language] = true;
      p._tech.forEach(function (t) { techCounts[t] = (techCounts[t] || 0) + 1; });
    });
    Object.keys(techCounts)
      .filter(function (t) { return techCounts[t] > 1 || languages[t] || NOTABLE_TECH.indexOf(t) > -1; })
      .sort(function (a, b) { return techCounts[b] - techCounts[a] || a.localeCompare(b); })
      .forEach(function (t) {
        var opt = make("option", null, t + " (" + techCounts[t] + ")");
        opt.value = t;
        ui.tech.appendChild(opt);
      });
  }

  function syncControls() {
    $$("[data-cat]", ui.filters).forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.getAttribute("data-cat") === state.cat));
    });
    ui.tech.value = state.tech;
    ui.sort.value = state.sort;
    if (ui.q.value.trim() !== state.q) ui.q.value = state.q;
  }

  function apply() {
    var curated = isCurated();
    var list = projects.filter(matches).sort(compare);
    if (curated) {
      list = list.filter(function (p) { return p.featured; }).concat(list.filter(function (p) { return !p.featured; }));
    }

    ui.grid.classList.toggle("is-curated", curated);
    var shown = {};
    list.forEach(function (p, i) {
      var card = cards[p.slug];
      if (curated && !p.featured && (i === 0 || list[i - 1].featured)) ui.grid.appendChild(divider);
      card.hidden = false;
      card.classList.toggle("is-lead", curated && i === 0 && p.featured);
      ui.grid.appendChild(card);
      shown[p.slug] = true;
    });
    divider.hidden = !curated || !list.some(function (p) { return !p.featured; });
    projects.forEach(function (p) {
      if (!shown[p.slug]) {
        cards[p.slug].hidden = true;
        cards[p.slug].classList.remove("is-lead");
        ui.grid.appendChild(cards[p.slug]);
      }
    });

    visibleOrder = list.map(function (p) { return p.slug; });
    ui.empty.hidden = list.length > 0;
    var total = projects.length;
    if (curated) {
      ui.status.textContent = "Showing all " + total + " projects · " + list.filter(function (p) { return p.featured; }).length + " featured";
    } else {
      ui.status.textContent = list.length + " of " + total + " projects" + (state.q ? " matching “" + state.q + "”" : "");
    }
  }

  // View transitions animate reordering; they need a rendered frame, so skip them in hidden tabs.
  function update() {
    if (document.startViewTransition && !reduceMotion.matches && !document.hidden) {
      // A newer update can skip a running transition; that rejection is expected.
      document.startViewTransition(apply).ready.catch(function () {});
    } else {
      apply();
    }
  }

  function bindControls() {
    var timer;
    ui.q.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = ui.q.value.trim(); update(); }, 140);
    });
    ui.q.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && ui.q.value) { e.preventDefault(); ui.q.value = ""; state.q = ""; update(); }
    });
    ui.tech.addEventListener("change", function () { state.tech = ui.tech.value; update(); });
    ui.sort.addEventListener("change", function () { state.sort = ui.sort.value; update(); });
    ui.reset.addEventListener("click", function () {
      state = { q: "", cat: "all", tech: "", sort: "relevance" };
      syncControls();
      update();
      ui.q.focus();
    });

    // "/" jumps to search, unless you're typing somewhere or a dialog is open.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      ui.q.focus();
    });
  }

  /* ---- Detail dialog ----------------------------------------------------- */

  function section_(title, content) {
    var s = make("section");
    s.appendChild(make("h4", null, title));
    s.appendChild(content);
    return s;
  }

  function list_(items, className) {
    var ul = make("ul", className);
    items.forEach(function (t) { ul.appendChild(make("li", null, t)); });
    return ul;
  }

  function linkButton(className, href, text, iconId, external) {
    var a = make("a", className, text);
    a.href = href;
    if (external) { a.target = "_blank"; a.rel = "noopener"; a.appendChild(make("span", "visually-hidden", " (opens in a new tab)")); }
    if (iconId) a.appendChild(icon(iconId));
    return a;
  }

  function neighbours(slug) {
    var order = visibleOrder.indexOf(slug) >= 0 ? visibleOrder : projects.map(function (p) { return p.slug; });
    var i = order.indexOf(slug);
    return { prev: bySlug[order[(i - 1 + order.length) % order.length]], next: bySlug[order[(i + 1) % order.length]] };
  }

  function fill(p) {
    var d = ui.dialog;
    var img = $("[data-pd-img]", d);
    img.src = p.image.src;
    img.alt = p.image.alt;
    img.width = p.image.width;
    img.height = p.image.height;

    $("[data-pd-eyebrow]", d).textContent = p.originLabel + " · " + p.repo;
    $("[data-pd-title]", d).textContent = p.name;
    $("[data-pd-tagline]", d).textContent = p.tagline;

    var links = $("[data-pd-links]", d);
    links.textContent = "";
    var src = linkButton("btn btn-light", repoUrl(p), "View source", null, true);
    src.insertBefore(icon("i-github"), src.firstChild);
    links.appendChild(src);
    if (p.demo) links.appendChild(linkButton("btn btn-outline-light", p.demo, "Live demo", "i-arrow-ur", true));
    if (p.writeup) links.appendChild(linkButton("link-arrow", p.writeup, "Write-up", "i-arrow-ur", true));
    if (p.related) {
      var rel = linkButton("link-arrow", p.related.href, p.related.label, "i-arrow", false);
      rel.addEventListener("click", function (e) {
        e.preventDefault();
        d.close();
        location.hash = p.related.href; // main.js opens the case-study dialog on hashchange
      });
      links.appendChild(rel);
    }

    var meta = $("[data-pd-meta]", d);
    meta.textContent = "";
    [["Language", p.language || "—"], ["Last push", formatMonth(p.pushedAt)], ["My commits", p.commits ? String(p.commits) : null], ["Source", p.originLabel]]
      .forEach(function (row) {
        if (row[1] == null) return;
        var wrap = make("div");
        wrap.appendChild(make("dt", null, row[0]));
        wrap.appendChild(make("dd", null, row[1]));
        meta.appendChild(wrap);
      });

    var body = $("[data-pd-body]", d);
    body.textContent = "";
    body.appendChild(section_("The problem", make("p", null, p.problem)));
    body.appendChild(section_("What it does", list_(p.features, "ticks")));
    body.appendChild(section_("Engineering decisions", list_(p.engineering, "ticks")));
    body.appendChild(section_("Stack", list_(p.stack, "pill-list")));
    body.appendChild(section_("My contribution", make("p", null, p.contribution)));

    var n = neighbours(p.slug);
    $("[data-pd-prev-label]", d).textContent = n.prev.name;
    $("[data-pd-next-label]", d).textContent = n.next.name;
    $("[data-pd-prev]", d).setAttribute("aria-label", "Previous project: " + n.prev.name);
    $("[data-pd-next]", d).setAttribute("aria-label", "Next project: " + n.next.name);
  }

  function openProject(slug, focusClose) {
    var p = bySlug[slug];
    if (!p) return;
    currentSlug = slug;
    fill(p);
    var d = ui.dialog;
    if (!d.open) {
      $$("dialog[open]").forEach(function (other) { other.close(); });
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      document.body.classList.add("is-locked");
      focusClose = true;
    }
    $("[data-pd-scroll]", d).scrollTop = 0;
    if (focusClose) $("[data-pd-close]", d).focus();
    if (location.hash !== "#project-" + slug) history.replaceState(null, "", "#project-" + slug);
  }

  function step(dir) {
    var n = neighbours(currentSlug);
    openProject((dir < 0 ? n.prev : n.next).slug, false);
  }

  function bindDialog() {
    var d = ui.dialog;
    $("[data-pd-close]", d).addEventListener("click", function () { d.close(); });
    $("[data-pd-prev]", d).addEventListener("click", function () { step(-1); });
    $("[data-pd-next]", d).addEventListener("click", function () { step(1); });
    $("[data-pd-back]", d).addEventListener("click", function () {
      var slug = currentSlug;
      d.close();
      var card = cards[slug];
      if (card && !card.hidden) {
        card.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
        $(".pc-open", card).focus({ preventScroll: true });
      }
    });

    var downOnBackdrop = false;
    d.addEventListener("pointerdown", function (e) { downOnBackdrop = e.target === d; });
    d.addEventListener("click", function (e) { if (downOnBackdrop && e.target === d) d.close(); downOnBackdrop = false; });

    d.addEventListener("keydown", function (e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    });

    d.addEventListener("close", function () {
      if (!document.querySelector("dialog[open]")) document.body.classList.remove("is-locked");
      if (location.hash.indexOf("#project-") === 0) history.replaceState(null, "", "#code");
    });

    function fromHash() {
      if (location.hash.indexOf("#project-") !== 0) return;
      var slug = decodeURIComponent(location.hash.slice("#project-".length));
      if (bySlug[slug] && (!d.open || currentSlug !== slug)) openProject(slug, true);
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ---- GitHub stats (live, with snapshot fallback) ---------------------- */

  function setSource(stateName, text) {
    ui.source.setAttribute("data-state", stateName);
    ui.sourceText.textContent = text;
  }

  function renderStats(repoCount, lastPush, languages) {
    $("[data-stat='repos']", section).textContent = String(repoCount);
    $("[data-stat='shown']", section).textContent = String(projects.length);
    $("[data-stat='push']", section).textContent = formatMonth(lastPush);
    $("[data-stat='langs']", section).textContent = Object.keys(languages)
      .sort(function (a, b) { return languages[b] - languages[a]; })
      .slice(0, 3).join(" · ");
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      return Date.now() - cached.t < CACHE_TTL ? cached : null;
    } catch (e) { return null; }
  }

  function writeCache(repos) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), repos: repos })); } catch (e) { /* storage full or blocked */ }
  }

  function fetchRepos() {
    var all = [];
    function page(n) {
      var url = "https://api.github.com/users/" + encodeURIComponent(data.profile.login) + "/repos?per_page=100&sort=pushed&page=" + n;
      return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (res) {
        if (res.status === 403 || res.status === 429) {
          var err = new Error("rate limited");
          err.rateLimited = true;
          throw err;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        var link = res.headers.get("Link") || "";
        return res.json().then(function (rows) {
          rows.forEach(function (r) { all.push({ name: r.name, pushed_at: r.pushed_at, language: r.language }); });
          return /rel="next"/.test(link) && n < MAX_PAGES ? page(n + 1) : all;
        });
      });
    }
    return page(1);
  }

  function applyLive(repos, cachedAt) {
    var byName = {};
    var languages = {};
    var lastPush = "";
    repos.forEach(function (r) {
      byName[r.name.toLowerCase()] = r;
      if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
      if (r.pushed_at > lastPush) lastPush = r.pushed_at;
    });
    renderStats(repos.length, lastPush, languages);

    projects.forEach(function (p) {
      var r = byName[p.repo.toLowerCase()];
      if (!r) return;
      p.pushedAt = r.pushed_at ? r.pushed_at.slice(0, 10) : p.pushedAt;
      if (r.language) p.language = r.language;
      metaLine($(".pc-meta", cards[p.slug]), p);
    });
    if (state.sort === "recent") apply();

    var ago = cachedAt ? Math.max(1, Math.round((Date.now() - cachedAt) / 60000)) : 0;
    setSource("live", "Live from the GitHub API · " + (ago ? "checked " + ago + " min ago" : "just now"));
  }

  function refreshFromGitHub() {
    var cached = readCache();
    if (cached) { applyLive(cached.repos, cached.t); return; }
    setSource("loading", "Checking GitHub for updates…");
    fetchRepos().then(function (repos) {
      writeCache(repos);
      applyLive(repos, 0);
    }).catch(function (err) {
      var reason = err && err.rateLimited ? "GitHub API rate limit reached" : "GitHub API unavailable";
      setSource("error", "Snapshot from " + dayMonthYear.format(new Date(data.snapshot.date)) + " · " + reason);
    });
  }

  function whenNear(callback) {
    if (!("IntersectionObserver" in window)) { callback(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); callback(); }
    }, { rootMargin: "600px 0px" });
    io.observe(section);
  }

  /* ---- Boot -------------------------------------------------------------- */

  function init(json) {
    data = json;
    projects = json.projects.map(prepare);
    projects.forEach(function (p) { bySlug[p.slug] = p; });

    ui.grid.textContent = "";
    ui.grid.removeAttribute("aria-busy");
    divider = make("li", "code-divider");
    divider.appendChild(make("h3", null, "More from GitHub · program & course work"));
    projects.forEach(function (p) { cards[p.slug] = buildCard(p); });

    var s = json.snapshot;
    renderStats(s.publicRepos, s.lastPush, s.languages);
    setSource("snapshot", "Snapshot from " + dayMonthYear.format(new Date(s.date)));

    ui.note.textContent = json.selectionNote + " ";
    var all = make("a", null, "See every repository on GitHub");
    all.href = json.profile.reposUrl;
    all.target = "_blank";
    all.rel = "noopener";
    ui.note.appendChild(all);

    buildFilters();
    bindControls();
    apply();
    bindDialog();
    whenNear(refreshFromGitHub);
  }

  function fail() {
    ui.grid.textContent = "";
    ui.grid.hidden = true;
    ui.status.textContent = "";
    ui.error.hidden = false;
    setSource("error", "Project data unavailable");
  }

  fetch(DATA_URL)
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(init)
    .catch(function (err) {
      if (window.console) console.error("[portfolio] projects failed to load", err);
      fail();
    });
})();
