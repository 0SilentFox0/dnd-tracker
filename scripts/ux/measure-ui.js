(() => {
  const vh = innerHeight;
  const limit = vh * 3;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "#000";
    cx.fillStyle = s;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const over = (f, b) => {
    const a = f.a + b.a * (1 - f.a);
    if (!a) return { r: 0, g: 0, b: 0, a: 0 };
    const m = (x, y) => (x * f.a + y * b.a * (1 - f.a)) / a;
    return { r: m(f.r, b.r), g: m(f.g, b.g), b: m(f.b, b.b), a };
  };
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const inRegion = (r) => r.width > 0 && r.height > 0 && r.top + scrollY < limit && r.bottom + scrollY > 0 && r.right > 0 && r.left < innerWidth;
  const shown = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    }
    return true;
  };
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== "none") return null;
      const c = parse(s.backgroundColor);
      if (c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };
  const tally = (m, k, n) => m.set(k, (m.get(k) || 0) + n);
  const sizes = new Map(), fams = new Map();
  const fails = [];
  let total = 0, skippedGradient = 0, checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode()); ) {
    const txt = n.textContent.replace(/\s+/g, " ").trim();
    const el = n.parentElement;
    if (!txt || !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    if (!inRegion(r) || !shown(el)) continue;
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    const len = txt.length;
    total += len;
    tally(sizes, px, len);
    tally(fams, s.fontFamily.split(",")[0].replace(/["']/g, "").trim(), len);
    const bg = bgOf(el);
    if (!bg) { skippedGradient++; continue; }
    checked++;
    const fg0 = parse(s.color);
    const fg = over(fg0, bg);
    const cr = ratio(fg, bg);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (cr < need) {
      fails.push({ ratio: +cr.toFixed(2), need, px, text: txt.slice(0, 30), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), disabled: !!el.closest(":disabled,[aria-disabled=true]") });
    }
  }
  const radii = new Map();
  const heights = new Map();
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!inRegion(r) || !shown(el)) continue;
    const s = getComputedStyle(el);
    const painted = parse(s.backgroundColor).a > 0 || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
    if (painted && s.borderRadius !== "0px" && r.width * r.height > 0) tally(radii, s.borderRadius, 1);
    if (el.matches('button, [role=button], a[data-slot=button]')) tally(heights, Math.round(r.height), 1);
  }
  const obj = (m) => Object.fromEntries([...m].sort((a, b) => a[0] - b[0] || 0));
  const share = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +((v / total) * 100).toFixed(1)]));
  let lt12 = 0, eq12 = 0;
  for (const [k, v] of sizes) { if (k < 12) lt12 += v; else if (k === 12) eq12 += v; }
  fails.sort((a, b) => a.ratio - b.ratio);
  return JSON.stringify({
    w: innerWidth,
    palette: document.documentElement.dataset.palette || null,
    chars: total,
    fontSizeCount: sizes.size,
    fontSizeShare: share(sizes),
    pctLt12: +((lt12 / total) * 100).toFixed(1),
    pctEq12: +((eq12 / total) * 100).toFixed(1),
    radiusCount: radii.size,
    radii: Object.fromEntries(radii),
    buttonHeightCount: heights.size,
    buttonHeights: obj(heights),
    contrastChecked: checked,
    contrastFailCount: fails.length,
    contrastWorst: fails.slice(0, 2),
    skippedGradient,
    fontFamilies: share(fams),
  });
})()
