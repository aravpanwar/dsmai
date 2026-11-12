(function () {
  "use strict";

  const DATA = window.DSMAI;
  const SVGNS = "http://www.w3.org/2000/svg";
  const $ = (s) => document.querySelector(s);

  // Geometry, in map units.
  const ROW = 23;
  const FIELD_ROW = 30;
  const GROUP_HEAD = 26;
  const GROUP_GAP = 22;
  const GAP = 104;
  const PAD_X = 72;
  const PAD_TOP = 24;
  const MARK = 13;
  const SWEEPS = 23;
  const K_MIN = 0.2, K_MAX = 2.5;

  const HEAD = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
  const isField = (n) => n.L.id === "fields";
  const fontFor = (n) => (isField(n) ? `700 15px ${HEAD}` : `500 13px ${HEAD}`);
  const pad2 = (i) => String(i + 1).padStart(2, "0");

  /* ---------------- graph ---------------- */

  const layers = DATA.layers.map((l, i) => ({ ...l, i, groups: [], nodes: [] }));
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const byId = new Map();
  const nodes = [];

  for (const raw of DATA.nodes) {
    if (byId.has(raw.id)) { console.warn(`expected unique ids, saw "${raw.id}" twice`); continue; }
    const L = layerById.get(raw.layer);
    if (!L) { console.warn(`expected a known layer for "${raw.id}", got "${raw.layer}"`); continue; }
    const n = { ...raw, L, parents: [], children: [], inE: [], outE: [] };
    let g = L.groups.find((x) => x.name === n.group);
    if (!g) { g = { name: n.group, nodes: [] }; L.groups.push(g); }
    g.nodes.push(n);
    L.nodes.push(n);
    byId.set(n.id, n);
    nodes.push(n);
  }

  const edges = [];
  for (const n of nodes) {
    for (const pid of n.needs) {
      const p = byId.get(pid);
      if (!p) { console.warn(`expected a known node "${pid}" in the needs of "${n.id}"`); continue; }
      if (p.L.i > n.L.i) { console.warn(`refusing a forward dependency: "${n.id}" needs "${pid}"`); continue; }
      const e = { s: p, t: n };
      edges.push(e);
      n.parents.push(p); n.inE.push(e);
      p.children.push(n); p.outE.push(e);
    }
  }

  // The set is stored before it is filled, so a cycle that slipped past
  // scripts/check.js ends the recursion instead of overflowing the stack.
  function closure(n, key, memo) {
    if (memo.has(n)) return memo.get(n);
    const out = new Set();
    memo.set(n, out);
    for (const m of n[key]) {
      out.add(m);
      for (const x of closure(m, key, memo)) out.add(x);
    }
    return out;
  }
  const upMemo = new Map(), downMemo = new Map(), depthMemo = new Map();
  const anc = (n) => closure(n, "parents", upMemo);
  const desc = (n) => closure(n, "children", downMemo);
  function depth(n) {
    if (depthMemo.has(n)) return depthMemo.get(n);
    depthMemo.set(n, 0);
    const d = n.parents.length ? 1 + Math.max(...n.parents.map(depth)) : 0;
    depthMemo.set(n, d);
    return d;
  }

  // A concept without a year of its own arrives with its newest dependency,
  // the earliest it could have existed. Concepts that are older than every
  // year on the timeline (most of the mathematics) are there from the start.
  const bornMemo = new Map();
  function born(n) {
    if (bornMemo.has(n)) return bornMemo.get(n);
    bornMemo.set(n, -Infinity);
    const y = n.year != null ? n.year : Math.max(-Infinity, ...n.parents.map(born));
    bornMemo.set(n, y);
    return y;
  }
  let era = Infinity;
  const seen = (n) => born(n) <= era;

  const embed = new URLSearchParams(location.search).has("embed");
  if (embed) document.documentElement.classList.add("embed");

  const maxReach = Math.max(...nodes.map((n) => desc(n).size));
  for (const n of nodes) n.r = 2.6 + 3.6 * Math.sqrt(desc(n).size / maxReach);

  const byPlace = (a, b) => a.L.i - b.L.i || a.y - b.y;

  /* ---------------- layout ---------------- */

  let W = 0, H = 0;
  const ctx = document.createElement("canvas").getContext("2d");

  function measure() {
    for (const n of nodes) {
      ctx.font = fontFor(n);
      n.w = Math.ceil(ctx.measureText(n.label).width);
    }
  }

  function columns() {
    let x = PAD_X;
    for (const L of layers) {
      L.w = MARK + Math.max(...L.nodes.map((n) => n.w));
      L.x = x;
      x += L.w + GAP;
    }
    W = x - GAP + PAD_X;
  }

  function stack(L) {
    const row = L.id === "fields" ? FIELD_ROW : ROW;
    let y = PAD_TOP;
    for (const g of L.groups) {
      g.y = y;
      y += GROUP_HEAD;
      for (const n of g.nodes) { n.y = y + row / 2; y += row; }
      y += GROUP_GAP;
    }
    L.h = y;
  }

  // Barycentre ordering, as in Sugiyama-style layered drawings: each concept
  // moves towards the average height of its neighbours in other columns.
  // Groups keep their authored order because that order carries meaning
  // (linear algebra before calculus), so only the concepts inside a group move.
  // The two ends of the map are read as lists (vectors before matrices, AI
  // before deep learning), so they keep their authored order as well.
  const FIXED = new Set(["math", "fields"]);
  function sweep(order) {
    for (const L of order) {
      if (FIXED.has(L.id)) continue;
      for (const g of L.groups) {
        const bc = new Map();
        for (const n of g.nodes) {
          let sum = 0, k = 0;
          for (const m of n.parents) if (m.L !== L) { sum += m.y; k++; }
          for (const m of n.children) if (m.L !== L) { sum += m.y; k++; }
          bc.set(n, k ? sum / k : n.y);
        }
        g.nodes.sort((a, b) => bc.get(a) - bc.get(b));
      }
      stack(L);
    }
  }

  const tangle = () => edges.reduce((s, e) => s + Math.abs(e.s.y - e.t.y), 0);
  const snapshot = () => layers.map((L) => L.groups.map((g) => g.nodes.slice()));

  // Barycentre passes can oscillate between two orderings, so the best one
  // seen (by total vertical edge length) wins rather than whichever came last.
  function layout() {
    columns();
    layers.forEach(stack);
    let best = tangle(), kept = snapshot();
    for (let i = 0; i < SWEEPS; i++) {
      sweep(i % 2 ? layers.slice().reverse() : layers);
      const c = tangle();
      if (c < best) { best = c; kept = snapshot(); }
    }
    layers.forEach((L, i) => L.groups.forEach((g, j) => { g.nodes = kept[i][j]; }));
    layers.forEach(stack);
    H = Math.max(...layers.map((L) => L.h)) + PAD_TOP;
  }

  function edgePath(e) {
    const { s, t } = e;
    const top = Math.min(s.y, t.y), bottom = Math.max(s.y, t.y);
    if (s.L === t.L) {
      const x = s.L.x - 8;
      const b = Math.min(10 + Math.abs(t.y - s.y) * 0.22, GAP * 0.42);
      e.box = [x - b, top, x, bottom];
      return `M${x},${s.y}C${x - b},${s.y} ${x - b},${t.y} ${x},${t.y}`;
    }
    const x1 = s.L.x + MARK + s.w + 5;
    const x2 = t.L.x - t.r - 3;
    const dx = (x2 - x1) * 0.5;
    e.box = [x1, top, x2, bottom];
    return `M${x1},${s.y}C${x1 + dx},${s.y} ${x2 - dx},${t.y} ${x2},${t.y}`;
  }

  /* ---------------- render ---------------- */

  const svg = $("#map");
  const vp = $("#viewport");
  let nodeG;

  function el(tag, attrs, parent) {
    const x = document.createElementNS(SVGNS, tag);
    for (const k in attrs) x.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(x);
    return x;
  }

  function render() {
    vp.textContent = "";
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    const heads = el("g", {}, vp);
    for (const L of layers) {
      for (const g of L.groups) {
        const gh = el("g", { class: "ghead", transform: `translate(${L.x - 6},${g.y})` }, heads);
        el("text", { x: 0, y: 10 }, gh).textContent = g.name;
        el("line", { x1: 0, x2: L.w + 6, y1: 16.5, y2: 16.5 }, gh);
      }
    }

    for (const e of edges) {
      e.d = edgePath(e);
      e.p = new Path2D(e.d);
    }

    nodeG = el("g", {}, vp);
    for (const n of nodes) {
      const row = isField(n) ? FIELD_ROW : ROW;
      const g = el("g", {
        class: "node" + (n.L.i % 2 ? " alt" : "") + (isField(n) ? " field" : ""),
        transform: `translate(${n.L.x},${n.y})`,
        style: `--c:var(--l${n.L.i})`,
        "data-id": n.id,
      }, nodeG);
      el("rect", { class: "hit", x: -10, y: -row / 2, width: MARK + n.w + 18, height: row }, g);
      el("circle", { class: "ring", r: n.r + 3.2 }, g);
      el("circle", { class: "dot", r: n.r }, g);
      el("text", { x: MARK, dy: "0.35em" }, g).textContent = n.label;
      n.el = g;
      n.painted = null;
    }
  }

  const lanes = $("#lanes");
  function renderLanes() {
    lanes.textContent = "";
    for (const L of layers) {
      const d = document.createElement("div");
      d.className = "lane";
      d.style.setProperty("--c", `var(--l${L.i})`);
      d.title = L.note;
      d.innerHTML = `<span class="num">${pad2(L.i)}</span><span class="name"></span><span class="count">${L.nodes.length}</span>`;
      d.querySelector(".name").textContent = L.name;
      lanes.appendChild(d);
      L.lane = d;
    }
  }

  /* ---------------- view ---------------- */

  const view = { k: 1, x: 0, y: 0 };
  const stage = $("#stage");
  const LEGEND_CLEARANCE = 64;

  // Sizes are measured once and cached. Reading them during a drag would
  // force the browser to recompute layout on every frame, right after the
  // previous frame changed it.
  const canvas = $(".canvas");
  let size = { left: 0, top: 0, width: 1, height: 1 };
  let cover = { w: 0, h: 0 };
  function measureCanvas() {
    const r = canvas.getBoundingClientRect();
    size = { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function measureCover() {
    const open = panel.classList.contains("open");
    cover = {
      w: open && !narrow() ? panel.offsetWidth : 0,
      h: open && narrow() ? panel.offsetHeight : 0,
    };
  }
  function box() { return size; }

  // The part of the canvas the map can use: the detail panel covers the
  // right edge on desktop and the bottom on phones.
  function room() {
    return { w: size.width - cover.w, h: size.height - cover.h };
  }

  // Zooming out stops once the whole map fits; past that there is nothing
  // more to see, only empty canvas.
  function clampK(k) {
    const r = box();
    const fit = Math.min(r.width / W, r.height / H) || K_MIN;
    return Math.min(K_MAX, Math.max(K_MIN, Math.min(fit, 1), k));
  }

  // Keeps the map pinned inside the canvas. Along an axis where the map is
  // larger than the visible area, its edges cannot be dragged past the
  // canvas edges; where it is smaller, it is centred across and sits at the
  // top, under the column headers. The bottom keeps clear of the legend so
  // the last rows can always be read.
  function clampView(v) {
    v.k = clampK(v.k);
    const { w, h } = room();
    const cw = W * v.k, ch = H * v.k;
    const usable = h - LEGEND_CLEARANCE;
    v.x = cw <= w ? (w - cw) / 2 : Math.min(0, Math.max(w - cw, v.x));
    v.y = ch <= usable ? 0 : Math.min(0, Math.max(usable - ch, v.y));
    return v;
  }

  function apply() {
    clampView(view);
    svg.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`;
    for (const L of layers) {
      if (!L.lane) continue;
      L.lane.style.transform = `translateX(${(L.x - 6) * view.k + view.x}px)`;
      L.lane.style.maxWidth = Math.max(0, (L.w + GAP) * view.k - 14) + "px";
    }
    draw();
  }

  /* ---------------- curves ---------------- */

  // The 522 curves and the column bands are painted on a canvas under the
  // svg labels. As svg they were almost the entire cost of every repaint:
  // hundreds of faint, overlapping, map-wide strokes blended pixel by pixel.
  // The canvas is screen-sized, so only visible pixels are drawn, and curves
  // that are entirely off screen are skipped.
  const edgeCanvas = $("#edges");
  const ectx = edgeCanvas.getContext("2d");
  const ink = {};
  const HOT = { up: [2.1, 0.7], down: [2.1, 0.75], path: [2.8, 0.9] };
  const EDGE_WIDTH = 1.5;
  let tracing = false, hotList = [];

  function readInk() {
    const s = getComputedStyle(document.documentElement);
    for (const k of ["band", "edge", "up", "down", "path"]) ink[k] = s.getPropertyValue("--" + k).trim();
    ink.edgeAlpha = parseFloat(s.getPropertyValue("--edge-alpha")) || 0.075;
  }

  function draw() {
    if (!edges.length || !edges[0].p) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(size.width * dpr), h = Math.round(size.height * dpr);
    if (edgeCanvas.width !== w || edgeCanvas.height !== h) { edgeCanvas.width = w; edgeCanvas.height = h; }
    ectx.setTransform(1, 0, 0, 1, 0, 0);
    ectx.clearRect(0, 0, w, h);
    const k = view.k;
    ectx.setTransform(dpr * k, 0, 0, dpr * k, dpr * view.x, dpr * view.y);
    const x0 = -view.x / k, y0 = -view.y / k;
    const x1 = x0 + size.width / k, y1 = y0 + size.height / k;
    const visible = (e) => e.box[2] >= x0 && e.box[0] <= x1 && e.box[3] >= y0 && e.box[1] <= y1 && seen(e.s) && seen(e.t);

    ectx.fillStyle = ink.band;
    for (const L of layers) if (L.i % 2) ectx.fillRect(L.x - GAP / 2, 0, L.w + GAP, H);

    // Every curve is stroked exactly one device pixel wide. The graphics
    // engine has a dedicated fast path for one-pixel lines that is about
    // twenty times quicker than anything wider, and the curves were always
    // just over that width. To keep the same amount of ink on screen, the
    // background curves get darker in proportion to the width they lost,
    // and highlighted curves are built from several one-pixel passes laid
    // side by side.
    const device = dpr * k;
    const px = 1 / device;
    ectx.lineWidth = px;
    const lost = Math.max(1, EDGE_WIDTH * device);
    const alpha = Math.min(0.3, ink.edgeAlpha * lost) * (tracing ? 0.35 : 1);
    ectx.strokeStyle = `rgba(${ink.edge},${alpha})`;
    for (const e of edges) if (visible(e)) ectx.stroke(e.p);

    for (const [e, cls] of hotList) {
      if (!visible(e)) continue;
      const passes = Math.min(4, Math.max(1, Math.round(HOT[cls][0] * device)));
      ectx.strokeStyle = ink[cls];
      ectx.globalAlpha = HOT[cls][1];
      for (let i = 0; i < passes; i++) {
        const o = (i - (passes - 1) / 2) * 0.8;
        ectx.setTransform(device, 0, 0, device, dpr * view.x + o, dpr * view.y + o);
        ectx.stroke(e.p);
      }
    }
    ectx.setTransform(device, 0, 0, device, dpr * view.x, dpr * view.y);
    ectx.globalAlpha = 1;
  }

  let drawQueued = 0;
  function requestDraw() {
    if (!drawQueued) drawQueued = requestAnimationFrame(() => { drawQueued = 0; draw(); });
  }

  function zoomAt(cx, cy, f) {
    const r = box();
    const px = cx - r.left, py = cy - r.top;
    const k = clampK(view.k * f);
    view.x = px - ((px - view.x) / view.k) * k;
    view.y = py - ((py - view.y) / view.k) * k;
    view.k = k;
    schedule();
  }

  // Input can arrive faster than the screen refreshes, so pointer and wheel
  // handlers only update the numbers and the map is moved once per frame.
  let queued = 0;
  function schedule() {
    if (!queued) queued = requestAnimationFrame(() => { queued = 0; apply(); });
  }

  function home() {
    const r = box();
    const k = clampK(Math.min(1.05, Math.max(0.6, (r.width - 24) / W)));
    return { k, x: W * k < r.width ? (r.width - W * k) / 2 : 0, y: 0 };
  }
  function overview() {
    return clampView({ k: 0, x: 0, y: 0 });
  }

  let anim = 0;
  function animateTo(target, ms = 480) {
    cancelAnimationFrame(anim);
    clampView(target);
    const from = { ...view };
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      view.k = from.k + (target.k - from.k) * e;
      view.x = from.x + (target.x - from.x) * e;
      view.y = from.y + (target.y - from.y) * e;
      apply();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  const narrow = () => window.innerWidth <= 760;

  // The panel covers part of the map (the right edge on desktop, the bottom
  // on phones), so "centre" means the centre of whatever is still visible.
  function centerOn(list, instant) {
    const { w: vw, h: vh } = room();
    const xs = list.map((n) => n.L.x), ys = list.map((n) => n.y);
    const x0 = Math.min(...xs) - 20, x1 = Math.max(...list.map((n) => n.L.x + MARK + n.w)) + 20;
    const y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
    const fitK = Math.min(vw / (x1 - x0), vh / (y1 - y0));
    const k = clampK(Math.min(Math.max(view.k, list.length > 1 ? 0.3 : 0.95), fitK, 1.2));
    const target = { k, x: vw / 2 - ((x0 + x1) / 2) * k, y: vh / 2 - ((y0 + y1) / 2) * k };
    if (instant) { Object.assign(view, target); apply(); } else animateTo(target);
  }

  /* ---------------- pointer input ---------------- */

  const pointers = new Map();
  let press = null, pinch = null;

  const nodeAt = (t) => {
    const g = t && t.closest && t.closest(".node");
    return g ? byId.get(g.getAttribute("data-id")) : null;
  };

  function pinchInfo() {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  // Selection is decided on pointerup rather than click: pointer capture
  // retargets the click to the svg, and a drag that started on a label must
  // not count as choosing it.
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancelAnimationFrame(anim);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    if (pointers.size === 1) {
      press = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, node: nodeAt(e.target), shift: e.shiftKey, moved: false };
    } else if (pointers.size === 2) {
      pinch = { ...pinchInfo(), k: view.k, x: view.x, y: view.y };
      if (press) press.moved = true;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const now = pinchInfo(), r = box();
      const k = clampK(pinch.k * (now.d / pinch.d));
      const wx = (pinch.cx - r.left - pinch.x) / pinch.k;
      const wy = (pinch.cy - r.top - pinch.y) / pinch.k;
      view.k = k;
      view.x = now.cx - r.left - wx * k;
      view.y = now.cy - r.top - wy * k;
      schedule();
      return;
    }
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) > 4) { press.moved = true; canvas.classList.add("dragging"); }
    if (press.moved) { view.x = press.vx + dx; view.y = press.vy + dy; schedule(); }
  });

  function release(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2 && pinch) {
      pinch = null;
      const rest = [...pointers.values()][0];
      if (rest) press = { x: rest.x, y: rest.y, vx: view.x, vy: view.y, node: null, moved: true };
    }
    if (pointers.size === 0) {
      if (press && !press.moved && e.type === "pointerup") tap(press.node, press.shift);
      press = null;
      canvas.classList.remove("dragging");
    }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // Mouse wheels zoom and trackpads pan. Browsers do not say which device
  // sent a wheel event, so this guesses: pinch gestures arrive with ctrlKey,
  // and mouse notches come as large whole-number vertical steps. A fast
  // trackpad swipe can produce a notch-sized step too, so once a gesture has
  // looked like a trackpad, the events that follow it keep panning.
  const SMOOTH_MS = 533;
  let smoothUntil = 0;
  canvas.addEventListener("wheel", (e) => {
    // Embedded in a blog post, a plain scroll belongs to the page around it.
    if (embed && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    cancelAnimationFrame(anim);
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1;
    const dx = e.deltaX * unit, dy = e.deltaY * unit;
    const now = performance.now();
    const smooth = e.deltaMode === 0 && (dx !== 0 || !Number.isInteger(dy) || Math.abs(dy) < 50);
    if (smooth) smoothUntil = now + SMOOTH_MS;
    const notch = !smooth && now > smoothUntil;
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-dy * 0.01));
    else if (notch) zoomAt(e.clientX, e.clientY, Math.exp(-dy * 0.0016));
    else { view.x -= dx; view.y -= dy; schedule(); }
  }, { passive: false });

  // Leaving one label usually means entering the next, so clearing the trace
  // waits a frame; if another label is entered first, the clear never runs
  // and the map goes straight from one trace to the other.
  let unhover = 0;
  vp.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch" || press) return;
    const n = nodeAt(e.target);
    if (!n) return;
    cancelAnimationFrame(unhover);
    if (n !== state.hover) { state.hover = n; used(); if (!state.focus) refresh(); }
  });
  vp.addEventListener("pointerout", (e) => {
    const n = nodeAt(e.target);
    if (!n || nodeAt(e.relatedTarget) === n) return;
    cancelAnimationFrame(unhover);
    unhover = requestAnimationFrame(() => {
      state.hover = null;
      if (!state.focus) refresh();
    });
  });

  /* ---------------- tracing ---------------- */

  const state = { focus: null, target: null, hover: null, mode: "full", picking: false };

  function paint(classes, hot, focus) {
    tracing = classes.size > 0;
    svg.classList.toggle("tracing", tracing);
    // Only concepts whose state changed are touched, so sweeping the pointer
    // across labels restyles a handful of elements instead of all of them.
    for (const n of nodes) {
      const c = classes.get(n);
      const key = (c || "") + (focus.includes(n) ? "|focus" : "");
      if (n.painted === key) continue;
      n.painted = key;
      n.el.classList.toggle("on", !!c);
      n.el.classList.toggle("up", c === "up");
      n.el.classList.toggle("down", c === "down");
      n.el.classList.toggle("path", c === "path");
      n.el.classList.toggle("focus", focus.includes(n));
    }
    // Downstream first so the upstream lines, usually the point, sit on top.
    hot.sort((a, b) => (a[1] === "up") - (b[1] === "up"));
    hotList = hot;
    requestDraw();
  }

  function traceSets(n) {
    const full = state.mode === "full";
    const up = full ? anc(n) : new Set(n.parents);
    const down = full ? desc(n) : new Set(n.children);
    const hot = [];
    if (full) {
      for (const x of [n, ...up]) for (const e of x.inE) if (up.has(e.s)) hot.push([e, "up"]);
      for (const x of [n, ...down]) for (const e of x.outE) if (down.has(e.t)) hot.push([e, "down"]);
    } else {
      for (const e of n.inE) hot.push([e, "up"]);
      for (const e of n.outE) hot.push([e, "down"]);
    }
    return { up, down, hot };
  }

  function between(a, b) {
    const [from, to] = desc(a).has(b) ? [a, b] : desc(b).has(a) ? [b, a] : [null, null];
    if (!from) {
      const A = anc(a), B = anc(b);
      const shared = new Set([...A].filter((x) => B.has(x)));
      return { from: null, to: null, nodes: shared };
    }
    const D = desc(from), U = anc(to);
    const on = new Set(nodes.filter((x) => (x === from || D.has(x)) && (x === to || U.has(x))));
    return { from, to, nodes: on };
  }

  function refresh() {
    const { focus: a, target: b, hover: h } = state;
    const classes = new Map();
    if (a && b) {
      const res = between(a, b);
      const hot = [];
      if (res.from) {
        for (const x of res.nodes) classes.set(x, "path");
        for (const e of edges) if (res.nodes.has(e.s) && res.nodes.has(e.t)) hot.push([e, "path"]);
      } else {
        for (const x of res.nodes) classes.set(x, "up");
        for (const x of [a, b, ...res.nodes]) for (const e of x.inE) if (res.nodes.has(e.s)) hot.push([e, "up"]);
        classes.set(a, "focus"); classes.set(b, "focus");
      }
      paint(classes, hot, [a, b]);
      return;
    }
    const n = a || h;
    if (!n) { paint(classes, [], []); return; }
    const { up, down, hot } = traceSets(n);
    for (const x of up) classes.set(x, "up");
    for (const x of down) classes.set(x, "down");
    classes.set(n, "focus");
    paint(classes, hot, [n]);
  }

  /* ---------------- panel ---------------- */

  const panel = $("#panel");
  const detail = $("#detail");

  function h(tag, props, ...kids) {
    const x = document.createElement(tag);
    for (const k in props || {}) {
      if (k === "on") x.addEventListener("click", props.on);
      else if (k === "style") x.setAttribute("style", props.style);
      else x[k] = props[k];
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) x.append(kid);
    return x;
  }

  const chip = (n) => h("button", {
    type: "button", className: "chip", style: `--c:var(--l${n.L.i})`, title: `${n.L.name} · ${n.group}`,
    on: () => select(n, { center: true }),
  }, n.label);

  function chips(list, empty) {
    if (!list.length) return h("p", { className: "none-yet" }, empty);
    return h("div", { className: "chips" }, list.slice().sort(byPlace).map(chip));
  }

  const refLabel = (url) => (/arxiv\.org|nature\.com/.test(url) ? "Read the paper" : "Project site");

  function listing(words) {
    if (words.length < 2) return words.join("");
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }

  // One row per branch of mathematics, with a cell for every concept in that
  // branch, so it is visible at a glance how much of each area a concept uses.
  function foundations(n) {
    const up = anc(n);
    const rows = layers[0].groups
      .map((g) => ({ g, used: g.nodes.filter((x) => up.has(x)) }))
      .filter((r) => r.used.length);
    if (!rows.length) return null;
    return h("div", { className: "roots" }, rows.map(({ g, used }) =>
      h("div", { className: "root", title: used.map((x) => x.label).join(", ") },
        h("span", { className: "rname" }, g.name),
        h("span", { className: "cells" }, g.nodes.map((x) => h("i", { className: up.has(x) ? "on" : "" }))),
        h("span", { className: "rnum" }, `${used.length}/${g.nodes.length}`))));
  }

  function showNode(n) {
    const up = anc(n), down = desc(n);
    const meta = [];
    if (n.year) meta.push(h("span", {}, String(n.year)));
    if (n.ref) meta.push(h("a", { href: n.ref, target: "_blank", rel: "noopener" }, refLabel(n.ref) + " →"));
    const roots = foundations(n);
    const pickBtn = h("button", {
      type: "button", className: state.picking ? "on" : "",
      on: (ev) => { state.picking = !state.picking; ev.currentTarget.classList.toggle("on", state.picking); },
    }, "Trace a path from here");
    detail.replaceChildren(...[
      h("p", { className: "kicker" }, h("span", { className: "n" }, pad2(n.L.i)), `  ${n.L.name} · ${n.group}`),
      h("h2", {}, n.label),
      meta.length ? h("p", { className: "meta" }, meta) : null,
      h("p", { className: "text" }, n.text),
      h("div", { className: "stats" },
        h("div", {}, h("b", {}, String(up.size)), h("span", {}, "concepts beneath it")),
        h("div", {}, h("b", {}, String(down.size)), h("span", {}, "that depend on it")),
        h("div", {}, h("b", {}, String(depth(n))), h("span", {}, "levels in its longest chain"))),
      roots ? h("h3", {}, "The mathematics underneath") : null,
      roots,
      h("h3", {}, "Made directly on"),
      chips(n.parents, "Nothing on this map. It is a starting point."),
      h("h3", {}, "Leads directly to"),
      chips(n.children, "Nothing yet. This is where the map ends."),
      h("div", { className: "act" }, pickBtn, "Or shift-click any concept to see how the two connect."),
    ].filter(Boolean));
    openPanel();
  }

  function byLayer(list) {
    return layers.filter((L) => list.some((x) => x.L === L)).map((L) => [
      h("h3", { className: "sub" }, h("span", { className: "n" }, pad2(L.i)), ` ${L.name}`),
      chips(list.filter((x) => x.L === L), ""),
    ]);
  }

  function showPath(a, b) {
    const res = between(a, b);
    const inner = [...res.nodes].filter((x) => x !== a && x !== b).sort(byPlace);
    const one = inner.length === 1;
    let body;
    if (res.from) {
      body = [
        h("p", { className: "kicker" }, "Path"),
        h("h2", {}, `${res.from.label} → ${res.to.label}`),
        h("p", { className: "text summary" }, inner.length
          ? `${inner.length} concept${one ? " sits" : "s sit"} on the dependency chains that lead from one to the other.`
          : `${res.to.label} is made directly on ${res.from.label}.`),
        byLayer(inner),
      ];
    } else {
      body = [
        h("p", { className: "kicker" }, "No direct lineage"),
        h("h2", {}, `${a.label} and ${b.label}`),
        h("p", { className: "text summary" }, inner.length
          ? `Neither is made on the other, but they share ${inner.length} foundation${one ? "" : "s"}.`
          : "Neither is made on the other, and they share no foundations on this map."),
        byLayer(inner),
      ];
    }
    detail.replaceChildren(...body.flat(2).filter(Boolean),
      h("h3", {}, "Ends"), chips([a, b], ""),
      h("div", { className: "act" }, h("button", { type: "button", on: () => select(a, { center: true }) }, `Back to ${a.label}`)));
    openPanel();
  }

  // On a phone the panel is a bottom sheet, and at full height it leaves the
  // map a thin strip. So it opens short, showing only the name, and the rest
  // is a tap or swipe away. Once expanded it stays expanded while people
  // follow chips from concept to concept, and only resets when it closes.
  const grip = $("#grip");
  function peek(on) {
    panel.classList.toggle("peek", on);
    grip.setAttribute("aria-expanded", String(!on));
    grip.setAttribute("aria-label", on ? "Show details" : "Hide details");
  }
  function togglePeek() {
    peek(!panel.classList.contains("peek"));
    panel.scrollTop = 0;
    measureCover();
    animateTo({ ...view });
  }
  grip.addEventListener("click", (e) => { e.stopPropagation(); togglePeek(); });
  panel.addEventListener("click", (e) => {
    if (narrow() && panel.classList.contains("peek") && !e.target.closest("a,button")) togglePeek();
  });
  let swipe = null;
  panel.addEventListener("touchstart", (e) => {
    swipe = { y: e.touches[0].clientY, top: panel.scrollTop };
  }, { passive: true });
  panel.addEventListener("touchend", (e) => {
    if (!swipe || !narrow()) return;
    const dy = e.changedTouches[0].clientY - swipe.y;
    const short = panel.classList.contains("peek");
    if ((short && dy < -30) || (!short && swipe.top <= 0 && dy > 40)) togglePeek();
    swipe = null;
  }, { passive: true });

  function openPanel() {
    if (embed) return;
    if (!panel.classList.contains("open")) peek(true);
    panel.classList.add("open");
    stage.classList.add("panel-open");
    panel.scrollTop = 0;
    measureCover();
  }
  function closePanel() {
    const was = panel.classList.contains("open");
    panel.classList.remove("open");
    stage.classList.remove("panel-open");
    measureCover();
    if (was) animateTo({ ...view });
  }

  /* ---------------- selection ---------------- */

  // The usage hint is only for first contact; once someone has hovered or
  // picked a concept it is noise sitting on top of the map.
  function used() {
    $("#legend").classList.add("used");
  }

  function select(n, opts = {}) {
    used();
    if (!seen(n)) setEra(born(n));
    state.focus = n;
    state.target = null;
    state.picking = false;
    refresh();
    showNode(n);
    writeMarker();
    if (opts.center) centerOn([n], opts.instant);
  }

  function selectPath(a, b, opts = {}) {
    state.focus = a;
    state.target = b;
    state.picking = false;
    refresh();
    showPath(a, b);
    writeMarker();
    if (opts.center) centerOn([a, b], opts.instant);
  }

  function clear() {
    state.focus = null;
    state.target = null;
    state.picking = false;
    closePanel();
    refresh();
    writeMarker();
  }

  function tap(n, shift) {
    if (!n) { if (state.focus) clear(); return; }
    if ((shift || state.picking) && state.focus && n !== state.focus) { selectPath(state.focus, n); return; }
    if (n === state.focus && !state.target) { clear(); return; }
    select(n);
  }

  $("#close").addEventListener("click", clear);

  for (const b of document.querySelectorAll(".mode button")) {
    b.addEventListener("click", () => {
      state.mode = b.dataset.mode;
      for (const o of document.querySelectorAll(".mode button")) {
        o.classList.toggle("on", o === b);
        o.setAttribute("aria-pressed", o === b);
      }
      refresh();
    });
  }

  for (const b of document.querySelectorAll(".zoom button")) {
    b.addEventListener("click", () => {
      const r = box();
      if (b.dataset.zoom === "fit") animateTo(overview());
      else zoomAt(r.left + r.width / 2, r.top + r.height / 2, b.dataset.zoom === "in" ? 1.3 : 1 / 1.3);
    });
  }

  /* ---------------- deep links ---------------- */

  function writeMarker() {
    const m = state.focus ? state.focus.id + (state.target ? ".." + state.target.id : "") : "";
    history.replaceState(null, "", m ? "#" + m : location.pathname + location.search);
    if (embed) caption();
  }

  /* ---------------- embed ---------------- */

  const fullLink = $("#full");
  const cap = $("#caption");
  function caption() {
    fullLink.href = location.pathname + location.hash;
    const a = state.focus, b = state.target;
    if (!a) { cap.hidden = true; return; }
    cap.hidden = false;
    if (b) {
      const res = between(a, b);
      cap.replaceChildren(h("b", {}, `${a.label} and ${b.label}`),
        h("span", {}, res.from ? `${res.nodes.size - 2} concepts in between` : "no direct lineage"));
    } else {
      cap.replaceChildren(h("b", {}, a.label),
        h("span", {}, `made on ${anc(a).size}, leads to ${desc(a).size}`));
    }
  }

  /* ---------------- timeline ---------------- */

  // The slider is not linear in years: 1940 to 1990 gets the first 30% of
  // the track, 1990 to 2010 the next 30%, and everything since 2010 the last
  // 40%, because that is where most of the map arrives.
  const LAST = Math.max(new Date().getFullYear(), ...nodes.map((n) => n.year || 0));
  const STOPS = [[0, 1940], [300, 1990], [600, 2010], [1000, LAST]];
  function yearAt(v) {
    for (let i = 1; i < STOPS.length; i++) {
      const [v0, y0] = STOPS[i - 1], [v1, y1] = STOPS[i];
      if (v <= v1) return Math.round(y0 + ((v - v0) / (v1 - v0)) * (y1 - y0));
    }
    return LAST;
  }
  function valueAt(y) {
    for (let i = 1; i < STOPS.length; i++) {
      const [v0, y0] = STOPS[i - 1], [v1, y1] = STOPS[i];
      if (y <= y1) return v0 + ((Math.max(y, y0) - y0) / (y1 - y0)) * (v1 - v0);
    }
    return 1000;
  }

  const bar = $("#timeline");
  const slider = $("#era");
  const eraOut = $("#eraOut");
  const playBtn = $("#play");
  let playing = 0;

  function applyEra() {
    const dated = era !== Infinity;
    svg.classList.toggle("dated", dated);
    for (const n of nodes) {
      n.el.classList.toggle("future", !seen(n));
      n.el.classList.toggle("fresh", dated && born(n) === era);
    }
    for (const L of layers) {
      const shown = L.nodes.filter(seen).length;
      L.lane.querySelector(".count").textContent = dated ? `${shown}/${L.nodes.length}` : L.nodes.length;
    }
    refresh();
  }

  function setEra(y) {
    era = y;
    slider.value = String(Math.round(valueAt(y)));
    eraOut.textContent = y <= 1940 ? "1940" : String(y);
    applyEra();
  }

  function stop() {
    cancelAnimationFrame(playing);
    playing = 0;
    playBtn.classList.remove("on");
    playBtn.setAttribute("aria-label", "Play");
  }

  function play() {
    if (playing) { stop(); return; }
    if (Number(slider.value) >= 1000) setEra(1940);
    playBtn.classList.add("on");
    playBtn.setAttribute("aria-label", "Pause");
    let last = performance.now();
    const step = (now) => {
      const v = Math.min(1000, Number(slider.value) + (now - last) * 0.07);
      last = now;
      const y = yearAt(v);
      if (y !== era) setEra(y);
      slider.value = String(v);
      if (v >= 1000) { stop(); return; }
      playing = requestAnimationFrame(step);
    };
    playing = requestAnimationFrame(step);
  }

  function openTimeline(open) {
    bar.hidden = !open;
    stage.classList.toggle("dating", open);
    $("#timeBtn").classList.toggle("on", open);
    $("#timeBtn").setAttribute("aria-pressed", open);
    if (open) setEra(LAST);
    else { stop(); era = Infinity; applyEra(); }
  }

  slider.addEventListener("input", () => { stop(); setEra(yearAt(Number(slider.value))); });
  playBtn.addEventListener("click", play);
  $("#timeBtn").addEventListener("click", () => openTimeline(bar.hidden));
  $("#eraClose").addEventListener("click", () => openTimeline(false));

  function readMarker(instant) {
    const [a, b] = decodeURIComponent(location.hash.slice(1)).split("..").map((s) => byId.get(s));
    if (a && b) selectPath(a, b, { center: true, instant });
    else if (a) select(a, { center: true, instant });
    return !!a;
  }
  window.addEventListener("hashchange", () => readMarker(false));

  /* ---------------- search ---------------- */

  function purify(s) {
    return (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  for (const n of nodes) {
    n.key = purify(n.label);
    n.akaKey = purify(`${n.aka || ""} ${n.group}`);
    n.textKey = purify(n.text);
  }

  function score(n, q) {
    if (n.key === q) return 0;
    if (n.key.startsWith(q)) return 1;
    if (n.key.split(" ").some((w) => w.startsWith(q))) return 2;
    if (n.key.includes(q)) return 3;
    if (n.akaKey.split(" ").some((w) => w.startsWith(q))) return 4;
    if (n.akaKey.includes(q)) return 5;
    if (q.length > 2 && n.textKey.includes(q)) return 6;
    return 9;
  }

  const q = $("#q");
  const results = $("#results");
  let hits = [], cursor = 0;

  function find() {
    const term = purify(q.value);
    hits = term
      ? nodes.map((n) => [score(n, term), n]).filter(([s]) => s < 9)
        .sort((a, b) => a[0] - b[0] || a[1].label.length - b[1].label.length).slice(0, 8).map(([, n]) => n)
      : [];
    cursor = 0;
    drawResults(!!term);
  }

  function drawResults(open) {
    results.hidden = !open;
    q.setAttribute("aria-expanded", open);
    if (!open) return;
    results.replaceChildren(...(hits.length ? hits.map((n, i) => {
      const li = h("li", { role: "option", style: `--c:var(--l${n.L.i})` },
        h("span", { className: "dot" }), n.label, h("span", { className: "where" }, n.L.name));
      li.setAttribute("aria-selected", i === cursor);
      li.addEventListener("pointerdown", (e) => { e.preventDefault(); choose(n); });
      return li;
    }) : [h("li", { className: "none" }, "Nothing matches that yet")]));
  }

  function choose(n) {
    q.value = "";
    drawResults(false);
    q.blur();
    showView("map");
    select(n, { center: true });
  }

  q.addEventListener("input", find);
  q.addEventListener("focus", () => { if (q.value) find(); });
  q.addEventListener("blur", () => drawResults(false));
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!hits.length) return;
      cursor = (cursor + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
      drawResults(true);
    } else if (e.key === "Enter" && hits[cursor]) {
      e.preventDefault();
      choose(hits[cursor]);
    }
  });

  /* ---------------- index view ---------------- */

  const index = $("#index");

  function buildIndex() {
    const intro = h("p", { className: "ix-intro" },
      `Every concept on the map, layer by layer. Each one lists what it is made on, so you can follow anything in modern AI back to the mathematics underneath. Pick one to see it in place.`);
    const sections = layers.map((L) => h("section", { className: "ix-layer", style: `--c:var(--l${L.i})` },
      h("header", {}, h("span", { className: "num" }, `${pad2(L.i)} / ${pad2(layers.length - 1)}`), h("h2", {}, L.name), h("p", {}, L.note)),
      h("div", { className: "ix-groups" }, L.groups.map((g) => h("div", { className: "ix-group" },
        h("h3", {}, g.name),
        L.nodes.filter((n) => n.group === g.name).map((n) => h("button", { type: "button", className: "ix-item", on: () => { showView("map"); select(n, { center: true }); } },
          h("b", {}, n.label), h("span", {}, n.text),
          n.parents.length ? h("small", {}, "Made on " + listing(n.parents.map((p) => p.label))) : null)))))));
    index.replaceChildren(intro, ...sections);
  }

  function showView(v) {
    index.hidden = v !== "index";
    for (const b of document.querySelectorAll(".seg button")) {
      b.classList.toggle("on", b.dataset.view === v);
      b.setAttribute("aria-pressed", b.dataset.view === v);
    }
    if (v === "index") index.scrollTop = 0;
  }
  for (const b of document.querySelectorAll(".seg button")) b.addEventListener("click", () => showView(b.dataset.view));

  /* ---------------- theme + keys ---------------- */

  // The page is dark by default and has no theme button; the light theme is
  // reached with ?theme=light (handled in index.html). A button with
  // id="theme" in the header would bring the toggle back unchanged.
  const themeButton = $("#theme");
  if (themeButton) {
    themeButton.addEventListener("click", () => {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem("dsmai-theme-choice", root.dataset.theme); } catch (e) { /* private mode */ }
      readInk();
      draw();
    });
  }

  // Arrow keys walk the map: up and down within a column, left to the
  // closest thing a concept is built on, right to the closest thing built on
  // it. Without a parent or child, they fall back to the nearest concept in
  // the neighbouring column so every concept stays reachable.
  function walk(key) {
    const n = state.focus;
    if (!n) {
      select(layers[0].nodes.slice().sort((a, b) => a.y - b.y)[0], { center: true });
      return;
    }
    const near = (list) => (list.length ? list.reduce((a, b) => (Math.abs(b.y - n.y) < Math.abs(a.y - n.y) ? b : a)) : null);
    const column = (i) => (layers[i] ? layers[i].nodes : []);
    let next = null;
    if (key === "ArrowUp" || key === "ArrowDown") {
      const col = n.L.nodes.slice().sort((a, b) => a.y - b.y);
      next = col[col.indexOf(n) + (key === "ArrowDown" ? 1 : -1)];
    } else if (key === "ArrowLeft") {
      next = near(n.parents) || near(column(n.L.i - 1));
    } else {
      next = near(n.children) || near(column(n.L.i + 1));
    }
    if (next) select(next, { center: true });
  }

  document.addEventListener("keydown", (e) => {
    const typing = document.activeElement === q;
    if (e.key.startsWith("Arrow") && !typing && index.hidden && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      walk(e.key);
      return;
    }
    if (e.key === "/" && !typing) { e.preventDefault(); q.focus(); q.select(); return; }
    if (e.key === "Escape") {
      if (typing) { q.value = ""; drawResults(false); q.blur(); }
      else if (!index.hidden) showView("map");
      else clear();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const r = box();
    if (e.key === "+" || e.key === "=") zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.3);
    else if (e.key === "-") zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.3);
    else if (e.key === "0") animateTo(overview());
  });

  /* ---------------- boot ---------------- */

  let built = false;
  function build() {
    measure();
    measureCanvas();
    readInk();
    layout();
    render();
    if (!built) { renderLanes(); buildIndex(); }
    if (!built) {
      Object.assign(view, home());
      apply();
      built = true;
      if (!readMarker(true)) refresh();
    } else {
      apply();
    }
    applyEra();
    if (embed) caption();
  }

  // Label widths decide where edges start, so the layout waits for the web
  // font. If the font is slow, draw with the fallback and redraw once it lands.
  const fontsReady = document.fonts ? document.fonts.load(`500 13px ${HEAD}`).then(() => document.fonts.load(`700 15px ${HEAD}`)) : Promise.resolve();
  let settled = false;
  fontsReady.then(() => { settled = true; build(); }).catch(() => { if (!built) build(); });
  setTimeout(() => { if (!settled && !built) build(); }, 1533);

  window.addEventListener("resize", () => { measureCanvas(); measureCover(); apply(); });
})();
