/* ==========================================================================
   Solomon Aberra Melesse — portfolio interactions
   Vanilla JS, no dependencies. Every feature enhances HTML that already
   works without JavaScript (see the <noscript> rules in index.html).
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function onChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: the theme simply isn't remembered */ }
    return null;
  }

  function make(tag, className, text) {
    var el = doc.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function icon(id) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = doc.createElementNS(ns, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = doc.createElementNS(ns, "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function byHash(hash) {
    if (!hash || hash.length < 2) return null;
    try { return doc.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return null; }
  }

  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  function flash(el) {
    el.classList.add("is-flash");
    setTimeout(function () { el.classList.remove("is-flash"); }, 1400);
  }

  /* ---- Dialog helpers (menu + case studies) ----------------------------- */
  function lockScroll() { doc.body.classList.add("is-locked"); }
  function unlockScroll() { if (!$("dialog[open]")) doc.body.classList.remove("is-locked"); }

  function openDialog(d) {
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); }
    else d.setAttribute("open", "");
    lockScroll();
  }

  function closeDialog(d) {
    if (typeof d.close === "function") d.close();
    else { d.removeAttribute("open"); unlockScroll(); }
  }

  // Close on backdrop click, but not when a text selection drag ends outside.
  function closeOnBackdrop(d) {
    var downOnBackdrop = false;
    d.addEventListener("pointerdown", function (e) { downOnBackdrop = e.target === d; });
    d.addEventListener("click", function (e) {
      if (downOnBackdrop && e.target === d) closeDialog(d);
      downOnBackdrop = false;
    });
  }

  /* ---- Toast -------------------------------------------------------------- */
  var toastTimer;
  function toast(message) {
    var el = $("[data-toast]");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () { el.textContent = ""; }, 300);
    }, 2400);
  }

  /* ---- 1. Theme toggle ---------------------------------------------------- */
  function initTheme() {
    var btn = $("[data-theme-toggle]");
    if (!btn) return;

    function current() {
      return root.getAttribute("data-theme") || (prefersDark.matches ? "dark" : "light");
    }
    function sync() {
      var dark = current() === "dark";
      btn.setAttribute("aria-pressed", String(dark));
      var bg = getComputedStyle(root).getPropertyValue("--bg").trim();
      if (root.hasAttribute("data-theme") && bg) {
        $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", bg); });
      }
    }

    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("theme", next);
      sync();
    });
    onChange(prefersDark, sync);
    sync();
  }

  /* ---- 2. Header: compact on scroll -------------------------------------- */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---- 3. Mobile menu ----------------------------------------------------- */
  function initMenu() {
    var menu = $("#menu");
    var openBtn = $("[data-menu-open]");
    if (!menu || !openBtn) return;

    openBtn.setAttribute("aria-expanded", "false");
    openBtn.addEventListener("click", function () {
      openDialog(menu);
      openBtn.setAttribute("aria-expanded", "true");
    });
    menu.addEventListener("close", function () {
      openBtn.setAttribute("aria-expanded", "false");
      unlockScroll();
    });
    $("[data-menu-close]", menu).addEventListener("click", function () { closeDialog(menu); });

    $$("a[href^='#']", menu).forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = byHash(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        closeDialog(menu);
        history.replaceState(null, "", link.getAttribute("href"));
        requestAnimationFrame(function () { scrollToEl(target); });
      });
    });

    onChange(window.matchMedia("(min-width: 981px)"), function (mq) {
      if (mq.matches && menu.open) closeDialog(menu);
    });
  }

  /* ---- 4. Active section in the nav pill --------------------------------- */
  function initActiveNav() {
    var links = $$("[data-nav]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    links.forEach(function (l) { byId[l.getAttribute("href").slice(1)] = l; });

    var io = new IntersectionObserver(function (entries) {
      entries
        .sort(function (a, b) { return a.isIntersecting - b.isIntersecting; })
        .forEach(function (entry) {
          var link = byId[entry.target.id];
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.removeAttribute("aria-current"); });
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(byId).forEach(function (id) {
      var section = doc.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* ---- 5. Scroll reveal (skipped entirely with reduced motion) ----------- */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length || reduceMotion.matches || !("IntersectionObserver" in window)) return;

    var fold = window.innerHeight * 0.92;
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < fold) el.classList.add("is-in");
      // Stagger siblings that reveal together.
      var siblings = $$(":scope > [data-reveal]", el.parentNode);
      var i = siblings.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 70 + "ms";
    });
    root.classList.add("reveal-ready");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    items.forEach(function (el) { if (!el.classList.contains("is-in")) io.observe(el); });
  }

  /* ---- 6. Count-up for the headline numbers ------------------------------ */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length || reduceMotion.matches || !("IntersectionObserver" in window)) return;

    function run(el) {
      if (doc.hidden) return; // nobody is watching: keep the real number
      var finalText = el.textContent;
      var end = parseInt(el.getAttribute("data-count"), 10);
      var suffix = finalText.replace(/[0-9]/g, "");
      var start = null;
      function frame(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / 1100);
        el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3))) + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      // Background tabs pause rAF; never leave a partial number on screen.
      setTimeout(function () { el.textContent = finalText; }, 1600);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---- 7. Hero render follows the pointer (fine pointers only) ----------- */
  function initParallax() {
    var world = $("[data-world]");
    var hero = $(".hero");
    if (!world || !hero || reduceMotion.matches || !window.matchMedia("(pointer: fine)").matches) return;

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function step() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      world.style.setProperty("--ry", (-38 + cx * 16).toFixed(2) + "deg");
      world.style.setProperty("--rx", (-24 - cy * 8).toFixed(2) + "deg");
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(step) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      kick();
    });
    hero.addEventListener("pointerleave", function () { tx = 0; ty = 0; kick(); });
  }

  /* ---- 7b. Portrait: colour lens, tap/click to flood colour, tilt -------- */
  function initPortrait() {
    var fig = $("[data-portrait]");
    if (!fig) return;
    var frame = $("[data-portrait-frame]", fig);
    var toggle = $("[data-portrait-toggle]", fig);
    var hint = $("[data-portrait-hint]", fig);
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var LENS = 92; // lens radius in px
    var keys = ["x", "y", "r", "tx", "ty"];
    var now = { x: 50, y: 40, r: 0, tx: 0, ty: 0 };   // x/y in % of the frame
    var goal = { x: 50, y: 40, r: 0, tx: 0, ty: 0 };
    var full = false, hovering = false, raf = 0;

    function coverRadius() {
      var b = frame.getBoundingClientRect();
      return Math.ceil(Math.sqrt(b.width * b.width + b.height * b.height));
    }

    function paint() {
      frame.style.setProperty("--mx", now.x.toFixed(2) + "%");
      frame.style.setProperty("--my", now.y.toFixed(2) + "%");
      frame.style.setProperty("--r", now.r.toFixed(1) + "px");
      frame.style.setProperty("--lens-o", full || now.r < 4 ? "0" : "1");
      fig.style.setProperty("--tilt-x", now.tx.toFixed(2) + "deg");
      fig.style.setProperty("--tilt-y", now.ty.toFixed(2) + "deg");
      fig.style.setProperty("--px", (now.ty / 10).toFixed(3));
      fig.style.setProperty("--py", (-now.tx / 8).toFixed(3));
    }

    function step() {
      var k = reduceMotion.matches ? 1 : 0.16;
      var moving = false;
      keys.forEach(function (p) {
        now[p] += (goal[p] - now[p]) * k;
        if (Math.abs(goal[p] - now[p]) > 0.05) moving = true;
        else now[p] = goal[p];
      });
      paint();
      raf = moving ? requestAnimationFrame(step) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    function local(e) {
      var b = frame.getBoundingClientRect();
      return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
    }

    function setFull(on, x, y) {
      full = on;
      toggle.setAttribute("aria-pressed", String(on));
      if (x != null) { goal.x = x; goal.y = y; }
      goal.r = on ? coverRadius() : (hovering ? LENS : 0);
      kick();
    }

    frame.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var p = local(e);
      hovering = true;
      goal.x = p.x * 100;
      goal.y = p.y * 100;
      if (!full) goal.r = LENS;
      if (!reduceMotion.matches) {
        goal.ty = (p.x - 0.5) * 10;
        goal.tx = (0.5 - p.y) * 8;
      }
      kick();
    });

    frame.addEventListener("pointerleave", function () {
      hovering = false;
      if (!full) goal.r = 0;
      goal.tx = 0;
      goal.ty = 0;
      kick();
    });

    // Click (mouse) or tap (touch) on the photo floods it with colour from that point.
    frame.addEventListener("click", function (e) {
      if (e.target.closest("[data-portrait-toggle]")) return;
      var p = local(e);
      setFull(!full, p.x * 100, p.y * 100);
    });

    // Keyboard and screen-reader equivalent.
    toggle.addEventListener("click", function () {
      setFull(!full, full ? null : 50, full ? null : 40);
    });

    window.addEventListener("resize", function () {
      if (full) { goal.r = now.r = coverRadius(); paint(); }
    });

    function setHint() {
      if (hint) hint.textContent = finePointer.matches ? "Hover for colour · click to keep it" : "Tap the photo for colour";
    }
    onChange(finePointer, setHint);
    setHint();
    paint();
  }

  /* ---- 8. Local time in Addis Ababa -------------------------------------- */
  function initClock() {
    var el = $("[data-clock]");
    if (!el || !window.Intl) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
    } catch (e) { return; }
    function tick() { el.textContent = "Local time " + fmt.format(new Date()) + " · GMT+3"; }
    tick();
    setInterval(tick, 30000);
  }

  /* ---- 9. Skills → evidence panel ----------------------------------------
     Evidence comes from data-skills attributes on bullets elsewhere on the
     page, so the CV text stays the single source of truth. */
  function initSkills() {
    var panel = $("[data-skill-panel]");
    var buttons = $$("button[data-skill]");
    if (!panel || !buttons.length) return;

    var title = $("[data-skill-title]", panel);
    var body = $("[data-skill-body]", panel);
    var emptyState = body.firstElementChild.cloneNode(true);
    var home = panel.parentNode;
    var narrow = window.matchMedia("(max-width: 980px)");
    var active = null;

    // Roles first, then education, then case studies; DOM order within each.
    function rank(el) {
      var source = el.closest("[data-source-target]");
      var target = source ? source.getAttribute("data-source-target") : "";
      return target.indexOf("#exp-") === 0 ? 0 : target.indexOf("#edu-") === 0 ? 1
        : target.indexOf("#case-") === 0 ? 2 : 3;
    }

    function evidenceFor(key) {
      return $$("[data-skills]")
        .filter(function (el) {
          return (" " + el.getAttribute("data-skills") + " ").indexOf(" " + key + " ") > -1;
        })
        .map(function (el, i) { return { el: el, rank: rank(el), i: i }; })
        .sort(function (a, b) { return a.rank - b.rank || a.i - b.i; })
        .map(function (entry) { return entry.el; });
    }

    function render(btn) {
      var items = evidenceFor(btn.getAttribute("data-skill"));
      title.textContent = btn.textContent.trim();
      body.textContent = "";

      if (!items.length) {
        body.appendChild(make("p", "skill-panel-empty", "No linked evidence yet for this skill."));
        return;
      }

      body.appendChild(make("p", "evidence-count mono", items.length + (items.length === 1 ? " place" : " places") + " on record"));
      var list = make("ul", "evidence-list");
      items.forEach(function (item) {
        var source = item.closest("[data-source-title]");
        var li = make("li", "evidence");
        li.appendChild(make("p", "evidence-source", source ? source.getAttribute("data-source-title") : "CV"));
        if (source && source.getAttribute("data-source-meta")) {
          li.appendChild(make("span", "evidence-meta mono", source.getAttribute("data-source-meta")));
        }
        li.appendChild(make("p", "evidence-quote", item.textContent.replace(/\s+/g, " ").trim()));

        var target = source && source.getAttribute("data-source-target");
        if (target) {
          var label = target.indexOf("#case-") === 0 ? "Open case study"
            : target.indexOf("#project-") === 0 ? "Open project" : "Show on page";
          var link = make("a", "link-arrow", label);
          link.href = target;
          link.appendChild(icon("i-arrow"));
          link.addEventListener("click", function (e) {
            e.preventDefault();
            goToSource(target);
          });
          li.appendChild(link);
        }
        list.appendChild(li);
      });
      body.appendChild(list);
    }

    // On small screens the panel sits directly under the group you tapped.
    function place() {
      if (narrow.matches && active) {
        var group = active.closest(".skill-group");
        if (group.nextElementSibling !== panel) group.parentNode.insertBefore(panel, group.nextSibling);
      } else if (panel.parentNode !== home) {
        home.appendChild(panel);
      }
    }

    function select(btn) {
      active = btn;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      if (btn) render(btn);
      else {
        title.textContent = "Pick a skill";
        body.textContent = "";
        body.appendChild(emptyState.cloneNode(true));
      }
      place();
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        select(b.getAttribute("aria-pressed") === "true" ? null : b);
      });
    });
    onChange(narrow, place);
  }

  function goToSource(selector) {
    // GitHub projects open in their own dialog, owned by projects.js (it listens for the hash).
    if (selector.indexOf("#project-") === 0) { location.hash = selector; return; }
    var target = byHash(selector);
    if (!target) return;
    if (target.tagName === "DIALOG") { openCase(target); return; }
    if (target.classList.contains("role")) setRole(target, true);
    scrollToEl(target);
    flash(target);
  }

  /* ---- 10. Work filter ---------------------------------------------------- */
  function initWorkFilter() {
    var chips = $$("[data-filter]");
    var cards = $$("[data-work-grid] > .work-card");
    var status = $("[data-work-status]");
    var empty = $("[data-work-empty]");
    if (!chips.length || !cards.length) return;

    function inCategory(card, f) {
      return f === "all" || (" " + card.getAttribute("data-categories") + " ").indexOf(" " + f + " ") > -1;
    }

    function apply(f) {
      var shown = 0;
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === f)); });
      cards.forEach(function (card) {
        var show = inCategory(card, f);
        var wasHidden = card.hidden;
        card.hidden = !show;
        if (!show) return;
        shown++;
        card.classList.add("is-in");
        if (wasHidden && !reduceMotion.matches) {
          card.classList.remove("is-entering");
          void card.offsetWidth; // restart the entrance animation
          card.classList.add("is-entering");
        }
      });
      if (empty) empty.hidden = shown !== 0;
      if (status) status.textContent = "Showing " + shown + " of " + cards.length;
    }

    chips.forEach(function (chip) {
      var f = chip.getAttribute("data-filter");
      var count = $("[data-filter-count]", chip);
      if (count) count.textContent = cards.filter(function (c) { return inCategory(c, f); }).length;
      chip.addEventListener("click", function () { apply(f); });
    });
    if (status) status.textContent = "Showing " + cards.length + " of " + cards.length;
  }

  /* ---- 11. Case-study dialogs (deep-linkable as #case-…) ----------------- */
  // Case studies are dialog.case with id "case-…"; the GitHub project dialog shares the
  // styling but is managed by projects.js.
  var CASE_DIALOGS = "dialog.case[id^='case-']";

  function openCase(d) {
    $$("dialog[open]").forEach(function (other) { if (other !== d) closeDialog(other); });
    openDialog(d);
    var inner = $(".case-inner", d);
    if (inner) inner.scrollTop = 0;
    var close = $("[data-case-close]", d);
    if (close) close.focus();
    history.replaceState(null, "", "#" + d.id);
  }

  function initCases() {
    var dialogs = $$(CASE_DIALOGS);
    if (!dialogs.length) return;

    $$("[data-case-open]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var d = byHash(link.getAttribute("href"));
        if (!d || d.tagName !== "DIALOG") return;
        e.preventDefault();
        openCase(d);
      });
    });

    dialogs.forEach(function (d) {
      $("[data-case-close]", d).addEventListener("click", function () { closeDialog(d); });
      closeOnBackdrop(d);
      d.addEventListener("close", function () {
        unlockScroll();
        if (location.hash === "#" + d.id) history.replaceState(null, "", "#work");
      });
    });

    function fromHash() {
      var linked = byHash(location.hash);
      if (linked && linked.matches(CASE_DIALOGS) && !linked.open) openCase(linked);
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ---- 12. Experience accordion ------------------------------------------ */
  function setRole(role, open) {
    role.classList.toggle("is-collapsed", !open);
    var btn = $(".role-toggle", role);
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }

  function initExperience() {
    var roles = $$(".role");
    var toggleAll = $("[data-exp-toggle-all]");
    if (!roles.length) return;

    function sync() {
      if (!toggleAll) return;
      var allOpen = roles.every(function (r) { return !r.classList.contains("is-collapsed"); });
      toggleAll.textContent = allOpen ? "Collapse all" : "Expand all";
    }

    roles.forEach(function (role) {
      // Start with the most recent role in each group open.
      setRole(role, role === role.parentNode.firstElementChild);
      $(".role-toggle", role).addEventListener("click", function () {
        setRole(role, role.classList.contains("is-collapsed"));
        sync();
      });
    });

    if (toggleAll) {
      toggleAll.addEventListener("click", function () {
        var open = roles.some(function (r) { return r.classList.contains("is-collapsed"); });
        roles.forEach(function (r) { setRole(r, open); });
        sync();
      });
    }

    var linked = byHash(location.hash);
    if (linked && linked.classList.contains("role")) setRole(linked, true);
    sync();
  }

  /* ---- 13. Copy email ----------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = make("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.select();
      try { if (doc.execCommand("copy")) resolve(); else reject(new Error("copy failed")); }
      catch (err) { reject(err); }
      finally { ta.remove(); }
    });
  }

  function initCopy() {
    $$("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy");
        copyText(text).then(function () {
          btn.classList.add("is-done");
          toast("Copied " + text);
          setTimeout(function () { btn.classList.remove("is-done"); }, 1800);
        }, function () {
          toast("Couldn’t copy — please select the address instead");
        });
      });
    });
  }

  /* ---- 14. Contact form: validate, then compose an email (mailto) --------
     No submission service is configured, so nothing is sent from the page.
     See README.md to connect Netlify Forms or Formspree instead. */
  function initForm() {
    var form = $("[data-contact-form]");
    if (!form) return;
    var status = $("[data-form-status]", form);
    var to = "solomonaberra75@gmail.com";

    var rules = {
      "f-name": function (v) {
        return v.trim().length >= 2 ? "" : "Please enter your name.";
      },
      "f-email": function (v) {
        v = v.trim();
        if (!v) return "Please enter your email address.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "That email address doesn’t look right.";
      },
      "f-message": function (v) {
        var n = v.trim().length;
        if (!n) return "Please write a message.";
        return n >= 20 ? "" : "Please write at least 20 characters (" + n + " so far).";
      }
    };

    function check(input) {
      var message = rules[input.id](input.value);
      var error = $('[data-error-for="' + input.id + '"]', form);
      if (error) error.textContent = message;
      input.setAttribute("aria-invalid", message ? "true" : "false");
      return !message;
    }

    Object.keys(rules).forEach(function (id) {
      var input = doc.getElementById(id);
      input.addEventListener("blur", function () { if (input.value) check(input); });
      input.addEventListener("input", function () { if (input.getAttribute("aria-invalid") === "true") check(input); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";

      var firstInvalid = null;
      Object.keys(rules).forEach(function (id) {
        var input = doc.getElementById(id);
        if (!check(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        status.classList.add("is-error");
        status.textContent = "Please fix the highlighted fields.";
        firstInvalid.focus();
        return;
      }

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var reason = form.elements.reason.value;
      var message = form.elements.message.value.trim();
      var subject = reason + " — from " + name;
      var bodyText = message + "\n\n— " + name + " (" + email + ")";

      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyText);

      var mail = make("a", null, to);
      mail.href = "mailto:" + to;
      status.appendChild(doc.createTextNode("Your email app should open with this message ready to send. If it didn’t, email "));
      status.appendChild(mail);
      status.appendChild(doc.createTextNode(" directly."));
    });
  }

  /* ---- 15. Footer year ---------------------------------------------------- */
  function initYear() {
    var el = $("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  [
    initTheme, initHeader, initMenu, initActiveNav, initReveal, initCounters,
    initParallax, initPortrait, initClock, initSkills, initWorkFilter, initCases,
    initExperience, initCopy, initForm, initYear
  ].forEach(function (init) {
    try { init(); }
    catch (err) { if (window.console) console.error("[portfolio] " + init.name + " failed", err); }
  });
})();
