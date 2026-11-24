(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Motion tokens ---------- */
  const M = {
    d1: 120, d2: 200, d3: 320, d4: 480, stagger: 35,
    out: "cubic-bezier(.2, .8, .2, 1)",
    soft: "cubic-bezier(.3, 1.25, .5, 1)",
    inOut: "cubic-bezier(.65, 0, .35, 1)",
    in: "cubic-bezier(.4, 0, 1, 1)",
    spring: "cubic-bezier(.34, 1.56, .64, 1)",
  };
  // ?ms=8 slows every duration for frame capture
  const scale = Number(new URLSearchParams(location.search).get("ms")) || 1;
  root.style.setProperty("--ms", scale);
  const T = (ms) => ms * scale;
  const osReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => root.dataset.motion === "reduce" || (root.dataset.motion !== "full" && osReduce.matches);
  const anim = (el, frames, opts) => el.animate(frames, { ...opts, duration: T(opts.duration), delay: T(opts.delay || 0) });

  /* ---------- Data ---------- */
  const ABIL = [
    { k: "СИЛ", name: "Сила", mod: 1, score: 13, save: 1 },
    { k: "СПР", name: "Спритність", mod: 2, score: 14, save: 2 },
    { k: "ТІЛ", name: "Тілобудова", mod: 3, score: 16, save: 3 },
    { k: "ІНТ", name: "Інтелект", mod: 5, score: 21, save: 11, prof: true, primary: true },
    { k: "МУД", name: "Мудрість", mod: 4, score: 18, save: 10, prof: true },
    { k: "ХАР", name: "Харизма", mod: 1, score: 12, save: 1 },
  ];
  const SKILLS = [
    ["Акробатика", "СПР", 2], ["Атлетика", "СИЛ", 1], ["Виживання", "МУД", 4, 1],
    ["Виступ", "ХАР", 1], ["Залякування", "ХАР", 1], ["Історія", "ІНТ", 5, 1],
    ["Магія", "ІНТ", 5, 1], ["Медицина", "МУД", 4, 1], ["Обман", "ХАР", 1],
    ["Переконання", "ХАР", 1], ["Поводження з тваринами", "МУД", 4, 1], ["Природа", "ІНТ", 5, 1],
    ["Проникливість", "МУД", 4, 1], ["Релігія", "ІНТ", 5, 1], ["Розслідування", "ІНТ", 5, 1],
    ["Скритність", "СПР", 2], ["Спритність рук", "СПР", 2], ["Сприйняття", "МУД", 4, 1],
  ];
  const sign = (v) => (v >= 0 ? "+" : "−") + Math.abs(v);
  const dieIcon = '<svg class="i"><use href="#i-die"/></svg>';

  $("#abilities").innerHTML = ABIL.map((a) => `
    <button class="ab${a.prof ? " ab--prof" : ""}" type="button" data-roll="Перевірка: ${a.name}" data-mod="${a.mod}" aria-label="${a.name}: модифікатор ${sign(a.mod)}, значення ${a.score}, рятунок ${sign(a.save)}${a.prof ? ", володіння" : ""}. Кинути перевірку">
      ${a.primary ? '<span class="ab__tag">Основна</span>' : ""}
      <span class="ab__hint" aria-hidden="true">${dieIcon}</span>
      <span class="ab__name">${a.k}</span>
      <span class="ab__mod" data-count="${a.mod}" data-sign>${sign(a.mod)}</span>
      <span class="ab__score">значення <b>${a.score}</b></span>
      <span class="ab__save"><span class="mark${a.prof ? " mark--on" : ""}" aria-hidden="true"></span>Рятунок <b>${sign(a.save)}</b></span>
    </button>`).join("");
  const skillHtml = SKILLS.map(([n, ab, v, p]) => `
    <li><button class="skill${p ? " skill--on" : ""}" type="button" data-roll="${n}" data-mod="${v}">
      <span class="mark${p ? " mark--on" : ""}" aria-hidden="true"></span>
      <span class="skill__name">${n}${p ? '<span class="sr-only">, володіння</span>' : ""}<span class="skill__hint" aria-hidden="true">${dieIcon}</span></span>
      <span class="skill__ab">${ab}</span><span class="skill__val" data-count="${v}" data-sign>${sign(v)}</span></button></li>`).join("");
  $$("[data-skills]").forEach((el) => (el.innerHTML = skillHtml));
  const tpl = $("#combat-tpl").innerHTML;
  $('[data-panel="combat"]').innerHTML = tpl;
  $("#combat-demo").innerHTML = tpl;
  const SLOTS = [4, 3, 3, 3, 3, 2, 2, 1, 1], USED = [1, 0, 1, 0, 0, 1, 0, 0, 0];
  $("#slots").innerHTML = SLOTS.map((n, i) => `<div class="slot"><b>${i + 1}</b><div class="slot__dots">${Array.from({ length: n }, (_, j) => `<i class="dot${j < USED[i] ? " dot--used" : ""}"></i>`).join("")}</div></div>`).join("");

  /* ---------- Count-up (useCountUp) ---------- */
  const fmt = (el, v) => {
    if (el.hasAttribute("data-sign")) return sign(v);
    if (el.hasAttribute("data-group")) return v.toLocaleString("uk-UA");
    return String(v);
  };
  function countUp(el, { delay = 0, duration = 640 } = {}) {
    const to = Number(el.dataset.count);
    if (reduced()) { el.textContent = fmt(el, to); return; }
    const t0 = performance.now() + T(delay), d = T(duration);
    el.textContent = fmt(el, 0);
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / d));
      el.textContent = fmt(el, Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Odometer (HP) ---------- */
  const odo = $("#hp-odo");
  function odoSet(value, { stagger = 0, instant = false, delay = 0 } = {}) {
    const s = String(value);
    if (odo.children.length !== s.length) {
      odo.innerHTML = [...s].map(() => `<span class="odo__col">${Array.from({ length: 10 }, (_, d) => `<span>${d}</span>`).join("")}</span>`).join("");
      instant = true;
    }
    [...odo.children].forEach((col, i) => {
      const d = Number(s[i]), from = Number(col.dataset.d || 0);
      col.dataset.d = d;
      col.getAnimations().forEach((a) => a.cancel());
      col.style.transform = `translateY(${-d}em)`;
      if (instant || reduced() || from === d) return;
      anim(col, [{ transform: `translateY(${-from}em)` }, { transform: `translateY(${-d}em)` }], { duration: M.d4 + 120, delay: delay + i * stagger, easing: M.soft, fill: "backwards" });
    });
  }
  function odoFromZero(value, delay) {
    odoSet(value, { instant: true });
    [...odo.children].forEach((col) => (col.dataset.d = 0));
    [...odo.children].forEach((col) => (col.style.transform = "translateY(0)"));
    odoSet(value, { stagger: M.stagger * 2, delay });
  }

  /* ---------- HP state ---------- */
  const hp = { cur: 274, max: 274, temp: 0 };
  const fill = $("#hp-fill"), ghost = $("#hp-ghost"), tempBar = $("#hp-tempbar"), flash = $("#hp-flash");
  const ratio = () => hp.cur / hp.max;
  function renderHpStatic() {
    fill.style.transform = ghost.style.transform = `scaleX(${ratio()})`;
    $("#hp-sr").textContent = `${hp.cur} з ${hp.max}${hp.temp ? `, тимчасові ${hp.temp}` : ""}`;
    $("#hpbar").setAttribute("aria-valuenow", hp.cur);
    $("#hp-temp").textContent = hp.temp;
    $("#vitals").classList.toggle("hp-low", ratio() < .25);
    placeTemp();
  }
  function placeTemp() {
    tempBar.hidden = hp.temp === 0;
    if (!hp.temp) return;
    const w = Math.min(hp.temp, hp.max) / hp.max;
    const right = Math.max(ratio(), w);
    tempBar.style.left = `${(right - w) * 100}%`;
    tempBar.style.width = `${w * 100}%`;
  }
  const amount = () => Math.max(0, parseInt($("#hp-amt").value, 10) || 0);

  function damage(n) {
    if (!n) return;
    const before = ratio();
    const absorbed = Math.min(hp.temp, n);
    hp.temp -= absorbed;
    hp.cur = Math.max(0, hp.cur - (n - absorbed));
    const after = ratio();
    renderHpStatic();
    odoSet(hp.cur, { stagger: M.stagger });
    if (reduced()) return;
    // bar snaps down, the ghost lingers then drains: reads as "this much was lost"
    anim(fill, [{ transform: `scaleX(${before})` }, { transform: `scaleX(${after})` }], { duration: M.d2, easing: M.out });
    anim(ghost, [{ transform: `scaleX(${before})` }, { transform: `scaleX(${before})`, offset: .35 }, { transform: `scaleX(${after})` }], { duration: M.d4 + 260, easing: M.inOut });
    anim(flash, [{ opacity: 0 }, { opacity: .55 }, { opacity: 0 }], { duration: M.d3, easing: M.out });
    anim($("#hp-nums"), [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: M.d3, easing: M.out });
    if (absorbed) pop($("#hp-temp"));
  }
  function heal(n) {
    if (!n) return;
    const before = ratio();
    hp.cur = Math.min(hp.max, hp.cur + n);
    const after = ratio();
    renderHpStatic();
    odoSet(hp.cur, { stagger: M.stagger });
    if (reduced()) return;
    anim(fill, [{ transform: `scaleX(${before})` }, { transform: `scaleX(${after})` }], { duration: M.d4, easing: M.out });
    anim(ghost, [{ transform: `scaleX(${before})` }, { transform: `scaleX(${after})` }], { duration: M.d4, easing: M.out });
    anim($("#hp-nums"), [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }], { duration: M.d4, easing: M.spring });
  }
  function giveTemp(n) {
    if (!n) return;
    const had = hp.temp;
    hp.temp = Math.max(hp.temp, n); // 5e: temporary HP doesn't stack
    renderHpStatic();
    if (reduced() || hp.temp === had) return;
    anim(tempBar, [{ transform: "scaleX(0)", opacity: 0 }, { transform: "scaleX(1)", opacity: 1 }], { duration: M.d4, easing: M.spring });
    pop($("#hp-temp"));
  }
  function pop(el) {
    if (reduced()) return;
    anim(el, [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: M.d3, easing: M.spring });
  }
  $("#hp-dmg").addEventListener("click", () => damage(amount()));
  $("#hp-heal").addEventListener("click", () => heal(amount()));
  $("#hp-temp-btn").addEventListener("click", () => giveTemp(amount()));

  /* ---------- Tabs (TabRail + TabPanelTransition) ---------- */
  const tabs = $("#tabs-main"), ink = $(".tabs__ink", tabs), panels = $("#panels");
  const visibleTabs = () => $$(".tab", tabs).filter((t) => getComputedStyle(t).display !== "none");
  let current = "stats", gen = 0;
  const seen = new Set();

  const inkGeom = (tab) => ({ x: tab.offsetLeft + 10, w: tab.offsetWidth - 20 });
  const inkTf = ({ x, w }) => `translateX(${x}px) scaleX(${w / 100})`;
  function placeInk(rail, tab, fromTab) {
    const inkEl = $(".tabs__ink", rail), to = inkGeom(tab);
    inkEl.style.transform = inkTf(to);
    if (!fromTab || reduced()) return;
    const from = inkGeom(fromTab);
    const l = Math.min(from.x, to.x), r = Math.max(from.x + from.w, to.x + to.w);
    // stretch over the union of both tabs, then contract onto the target with a little overshoot
    anim(inkEl, [
      { transform: inkTf(from), easing: M.inOut },
      { transform: inkTf({ x: l, w: r - l }), offset: .42, easing: M.spring },
      { transform: inkTf(to) },
    ], { duration: M.d3 + 120 });
  }

  const blocksOf = (panel) => $$(".section-title, .ab, .card, .slot", panel).filter((el) => !el.closest(".ab") || el.classList.contains("ab"));
  function staggerIn(els, { dx = 0, dy = 10, delay = 0, step = M.stagger, max = 12 } = {}) {
    els.forEach((el, i) => anim(el, [{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, transform: "none" }], { duration: M.d3, delay: delay + Math.min(i, max) * step, easing: M.out, fill: "backwards" }));
  }
  function popMarks(scope, delay = 0) {
    if (reduced()) return;
    $$(".mark--on", scope).forEach((m, i) => anim(m, [{ transform: "rotate(45deg) scale(0)" }, { transform: "rotate(45deg) scale(1)" }], { duration: M.d3, delay: delay + i * 20, easing: M.spring, fill: "backwards" }));
  }

  function select(name, { focus = false } = {}) {
    const vis = visibleTabs();
    const next = vis.find((t) => t.dataset.tab === name) || vis[0];
    name = next.dataset.tab;
    if (name === current) { if (focus) next.focus(); return; }
    const prevTab = $(`[data-tab="${current}"]`, tabs);
    const dir = vis.indexOf(next) > vis.indexOf(prevTab) ? 1 : -1;
    $$(".tab", tabs).forEach((t) => { const on = t === next; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    if (focus) next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
    placeInk(tabs, next, prevTab);

    const oldP = $(`[data-panel="${current}"]`, panels), newP = $(`[data-panel="${name}"]`, panels);
    current = name;
    const my = ++gen;
    panels.getAnimations({ subtree: true }).forEach((a) => a.cancel());

    if (reduced()) {
      $$(".tabpanel", panels).forEach((el) => { el.classList.remove("is-leaving"); el.hidden = el !== newP; });
      newP.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      return;
    }
    const h0 = panels.offsetHeight;
    // old panel leaves in place (taken out of flow) while the new one enters: no blank frame between them
    $$(".tabpanel.is-leaving", panels).forEach((el) => { el.classList.remove("is-leaving"); el.hidden = true; });
    oldP.style.top = `${oldP.offsetTop}px`;
    oldP.classList.add("is-leaving");
    newP.hidden = false;
    const h1 = panels.offsetHeight;
    anim(oldP, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-24 * dir}px)` }], { duration: M.d1 + 40, easing: M.in }).finished
      .then(() => { if (my === gen) { oldP.classList.remove("is-leaving"); oldP.hidden = true; } }, () => {});
    // height follows content so the page below doesn't jump
    if (h0 !== h1) anim(panels, [{ height: `${h0}px` }, { height: `${h1}px` }], { duration: M.d3, easing: M.out });
    anim(newP, [{ opacity: 0, transform: `translateX(${32 * dir}px)` }, { opacity: 1, transform: "none" }], { duration: M.d3, delay: 60, easing: M.out, fill: "backwards" });
    staggerIn(blocksOf(newP), { dx: 12 * dir, dy: 0, delay: 90 });
    if (!seen.has(name)) { seen.add(name); popMarks(newP, 160); }
  }

  tabs.addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) select(t.dataset.tab); });
  tabs.addEventListener("keydown", (e) => {
    const vis = visibleTabs(), i = vis.indexOf(document.activeElement);
    if (i < 0) return;
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: vis.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const j = (map[e.key] + vis.length) % vis.length;
    select(vis[j].dataset.tab, { focus: true });
  });

  // phone: horizontal swipe on the panel switches tabs
  let sw = null;
  panels.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") sw = { x: e.clientX, y: e.clientY }; });
  panels.addEventListener("pointerup", (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const vis = visibleTabs(), i = vis.findIndex((t) => t.dataset.tab === current);
    const j = i + (dx < 0 ? 1 : -1);
    if (vis[j]) select(vis[j].dataset.tab);
  });
  panels.addEventListener("pointercancel", () => (sw = null));

  // sticky rail gets its surface only once it is actually stuck
  const wrap = $("#tabs-wrap");
  const sentinel = document.createElement("div");
  wrap.before(sentinel);
  new IntersectionObserver(([en]) => wrap.classList.toggle("is-stuck", !en.isIntersecting)).observe(sentinel);

  function placeAllInks() {
    placeInk(tabs, $('.tab[aria-selected="true"]', tabs));
    const demo = $("#tabs-demo");
    placeInk(demo, $('.tab[aria-selected="true"]', demo));
  }

  /* ---------- Roll (useRollAnimation) ---------- */
  const tray = $("#roll-tray"), die = $("#die"), total = $("#roll-total");
  let rollTimer = 0, tumbleTimer = 0, forced = null;
  function roll(label, mod) {
    const d = forced ?? 1 + Math.floor(Math.random() * 20);
    forced = null;
    const sum = d + mod;
    clearTimeout(rollTimer); clearInterval(tumbleTimer);
    tray.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    tray.classList.remove("is-crit", "is-fumble");
    $("#roll-label").textContent = label;
    $("#roll-formula").textContent = `к20 (${d}) ${mod >= 0 ? "+" : "−"} ${Math.abs(mod)}`;
    $("#roll-verdict").textContent = "";
    total.textContent = "";
    const wasHidden = tray.hidden;
    tray.hidden = false;
    const settle = () => {
      clearInterval(tumbleTimer);
      die.textContent = d;
      total.dataset.count = sum;
      countUp(total, { duration: M.d3 });
      if (d === 20) {
        tray.classList.add("is-crit");
        $("#roll-verdict").textContent = "Критичний успіх";
        if (!reduced()) {
          anim(total, [{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: M.d4, delay: M.d2, easing: M.spring });
          anim(die, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: M.d4, easing: M.spring });
          anim(die, [{ opacity: .8, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.5)" }], { duration: M.d4 + 200, easing: M.out, pseudoElement: "::after" });
        }
      } else if (d === 1) {
        tray.classList.add("is-fumble");
        $("#roll-verdict").textContent = "Критичний провал";
        if (!reduced()) anim(die, [{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(5deg)" }, { transform: "rotate(0)" }], { duration: M.d3, easing: M.out });
      }
      rollTimer = setTimeout(hideTray, T(4200));
    };
    if (reduced()) {
      if (wasHidden) tray.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      settle();
      return;
    }
    if (wasHidden) anim(tray, [{ opacity: 0, transform: "translate(-50%, 16px) scale(.98)" }, { opacity: 1, transform: "translate(-50%, 0) scale(1)" }], { duration: M.d3, easing: M.out });
    tumbleTimer = setInterval(() => (die.textContent = 1 + Math.floor(Math.random() * 20)), T(60));
    anim(die, [
      { transform: "rotate(0) scale(.7)", easing: M.out },
      { transform: "rotate(220deg) scale(1.08)", offset: .55, easing: M.out },
      { transform: "rotate(350deg) scale(.96)", offset: .82 },
      { transform: "rotate(360deg) scale(1)" },
    ], { duration: M.d4 + 80 });
    setTimeout(settle, T(M.d4 + 80));
  }
  function hideTray() {
    if (tray.hidden) return;
    if (reduced()) { tray.hidden = true; return; }
    anim(tray, [{ opacity: 1, transform: "translate(-50%, 0)" }, { opacity: 0, transform: "translate(-50%, 12px)" }], { duration: M.d2, easing: M.in }).finished.then(() => (tray.hidden = true), () => {});
  }
  $("#roll-close").addEventListener("click", hideTray);
  tray.addEventListener("pointerenter", () => clearTimeout(rollTimer));
  tray.addEventListener("pointerleave", () => (rollTimer = setTimeout(hideTray, T(2000))));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-roll]");
    if (b && !b.closest("#combat-demo")) roll(b.dataset.roll, Number(b.dataset.mod));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTray(); });

  /* ---------- Portrait tilt ---------- */
  const portrait = $(".portrait");
  portrait.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reduced()) return;
    const r = portrait.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
    portrait.style.setProperty("--ry", `${nx * 6}deg`);
    portrait.style.setProperty("--rx", `${-ny * 6}deg`);
    portrait.style.setProperty("--px", `${-nx * 8}px`);
    portrait.style.setProperty("--py", `${-ny * 8}px`);
  });
  portrait.addEventListener("pointerleave", () => ["--rx", "--ry", "--px", "--py"].forEach((p) => portrait.style.removeProperty(p)));

  document.addEventListener("pointermove", (e) => {
    const el = e.pointerType === "mouse" && e.target.closest(".ab, .vitals");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  /* ---------- Entrance ---------- */
  function entrance() {
    document.getAnimations().forEach((a) => a.cancel());
    const lvl = $("#lvlup");
    lvl.classList.remove("is-pulsing");
    portrait.classList.remove("is-sweep");
    const xp = $("#xp-fill");
    const counted = [...$$("[data-count]", $(".sheet"))].filter((el) => el.closest("#combat-demo") === null && el.offsetParent !== null);
    renderHpStatic();
    if (reduced()) {
      $(".shell").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      odoSet(hp.cur, { instant: true });
      counted.forEach((el) => (el.textContent = fmt(el, Number(el.dataset.count))));
      return;
    }
    const seq = [...$$("[data-enter]"), ...blocksOf($(`[data-panel="${current}"]`))];
    seq.forEach((el, i) => anim(el, [{ opacity: 0, transform: el === portrait ? "scale(.96)" : "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: M.d4, delay: Math.min(i, 14) * M.stagger, easing: M.out, fill: "backwards" }));
    odoFromZero(hp.cur, 180);
    anim(fill, [{ transform: "scaleX(0)" }, { transform: `scaleX(${ratio()})` }], { duration: 720, delay: 220, easing: M.out, fill: "backwards" });
    anim(ghost, [{ transform: "scaleX(0)" }, { transform: `scaleX(${ratio()})` }], { duration: 720, delay: 220, easing: M.out, fill: "backwards" });
    anim(xp, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 720, delay: 140, easing: M.out, fill: "backwards" });
    counted.forEach((el) => {
      const i = seq.findIndex((b) => b.contains(el));
      countUp(el, { delay: 120 + Math.max(0, i) * M.stagger, duration: 560 });
    });
    popMarks($(`[data-panel="${current}"]`), 420);
    seen.add(current);
    requestAnimationFrame(() => portrait.classList.add("is-sweep"));
    setTimeout(() => lvl.classList.add("is-pulsing"), T(1100));
  }

  /* ---------- Prototype controls ---------- */
  const motionBtn = $("#motion");
  const syncMotionBtn = () => motionBtn.setAttribute("aria-pressed", reduced());
  motionBtn.addEventListener("click", () => { root.dataset.motion = reduced() ? "full" : "reduce"; syncMotionBtn(); });
  $("#replay").addEventListener("click", entrance);
  $$("[data-demo]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.demo;
    if (k === "nat20" || k === "nat1") { forced = k === "nat20" ? 20 : 1; roll("Перевірка: Інтелект", 5); }
    if (k === "low") damage(hp.cur + hp.temp - Math.floor(hp.max * .2));
    if (k === "full") { hp.temp = 0; heal(hp.max); }
  }));
  function setPalette(p) {
    root.dataset.palette = p;
    $$("[data-pal]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pal === p)));
  }
  $$("[data-pal]").forEach((b) => b.addEventListener("click", () => setPalette(b.dataset.pal)));

  const params = new URLSearchParams(location.search);
  setPalette(params.get("palette") || "tavern");
  if (params.get("motion")) root.dataset.motion = params.get("motion");
  syncMotionBtn();
  $$(".tab", tabs).forEach((t) => (t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1));
  const startTab = params.get("tab");
  if (startTab) {
    const t = visibleTabs().find((x) => x.dataset.tab === startTab);
    if (t) {
      $$(".tab", tabs).forEach((x) => { x.setAttribute("aria-selected", x === t); x.tabIndex = x === t ? 0 : -1; });
      $$(".tabpanel", panels).forEach((p) => (p.hidden = p.dataset.panel !== startTab));
      current = startTab;
    }
  }
  odoSet(hp.cur, { instant: true });
  renderHpStatic();
  const start = () => { placeAllInks(); if (!params.has("still")) entrance(); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
  addEventListener("resize", placeAllInks);

  // hooks for the frame-capture script
  window.__proto = { select, damage, heal, giveTemp, roll: (d) => { forced = d; roll("Перевірка: Інтелект", 5); } };
})();
