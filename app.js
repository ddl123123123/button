(() => {
  'use strict';

  // 先把用到的照片都载入并抠好底，再启动页面，免得先闪出占位图
  const urls = [...new Set(window.BUTTONS.map(it => it.image).filter(Boolean))];
  Promise.all(urls.map(u => ButtonArt.cutout(u, 480).then(r => [u, r], err => { console.warn(err.message); return [u, null]; })))
    .then(list => start(new Map(list)));

  function start(photos) {
    const TYPES = window.TYPES, items = window.BUTTONS, N = items.length;
    const TYPE = Object.fromEntries(TYPES.map(t => [t.key, t]));
    const $ = s => document.querySelector(s);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const pad3 = n => String(n).padStart(3, '0');
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const termHref = id => '#/t/' + encodeURIComponent(id);
    const itemHref = it => '#/b/' + it.id;        // 在词语网里选中这枚钮扣
    const detailHref = it => '#/d/' + it.id;      // 这枚钮扣的详情页

    /* ================= 索引：钮扣 ↔ 词语 ================= */
    const terms = new Map();
    items.forEach((it, i) => {
      it.index = i; it.seed = (i + 1) * 7919; it.terms = [];
      TYPES.forEach(t => [].concat(it.attrs[t.key] || []).forEach(v => {
        const id = t.key + ':' + v;
        if (!terms.has(id)) terms.set(id, { id, type: t.key, label: String(v), items: [] });
        terms.get(id).items.push(it); it.terms.push(id);
      }));
      const photo = it.image && photos.get(it.image);
      if (photo) {             // 有照片：照片自带光影，不再叠光；侧面颜色取照片的平均色
        it.face = it.src = photo.src; it.edge = photo.edge; it.gloss = 0; it.photo = true;
      } else {                 // 没有照片（或照片没载入成功）：用程序画一枚占位的
        const art = ButtonArt.render(it, 520);
        it.face = art.face; it.src = art.lit; it.edge = art.edge; it.gloss = art.gloss;   // face 给会转动的立体钮扣用，src 是带光的成品
      }
    });
    const itemById = Object.fromEntries(items.map(it => [it.id, it]));
    // 和某枚钮扣共用词语的其他钮扣，共用得多的排前面
    const related = it => items.filter(o => o !== it)
      .map(o => ({ o, shared: o.terms.filter(t => it.terms.includes(t)) }))
      .filter(x => x.shared.length)
      .sort((a, b) => b.shared.length - a.shared.length || a.o.index - b.o.index);

    let view = 'home';

    /* ================= 图像浏览 ================= */
    const stage = $('#stage'), info = $('#info'), countEl = $('#count');
    const tickNow = $('#tick-now'), tickBar = $('#tick-bar');
    let W = 0, H = 0, base = 300;
    let pos = 0, target = 0, hover = -1, shown = -1, nearShown = -1;
    let drag = null, dragMoved = false, wheelTimer = 0, wheelFrom = null;
    let tabbing = false;                       // 只有 Tab 键带来的焦点才移动钮扣；窗口重新获得焦点、右键等不算
    addEventListener('keydown', e => { tabbing = e.key === 'Tab'; }, true);
    addEventListener('pointerdown', () => { tabbing = false; }, true);
    addEventListener('blur', () => { tabbing = false; });
    let intro = 1, introStart = 0;
    const geo = new Array(N).fill(null), hv = new Float32Array(N);
    let flyFrom = null, flyStop = null, openedAt = 0;

    $('#tick-all').textContent = pad3(N);

    // 每枚钮扣：.tilt 负责侧倾，.spin 负责滚动时的自转；
    // .spin 里叠几层按牌面轮廓裁出的薄片当作厚度，.light 是不随自转的受光
    const LAYERS = 6, TILT = -34;
    const el = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
    const discs = items.map((it, i) => {
      const b = el('button', 'disc');
      b.type = 'button'; b.setAttribute('aria-label', it.name + '，查看详情');
      const tilt = el('div', 'tilt'), spin = el('div', 'spin');
      b._edges = [];
      for (let k = LAYERS; k >= 1; k--) {
        const e = el('i', 'edge');
        e.style.transform = `translateZ(calc(var(--t) * ${(-k / LAYERS).toFixed(3)}))`;
        e._k = k; b._edges.push(e); spin.append(e);
      }
      const img = new Image(); img.src = it.face; img.alt = ''; img.draggable = false; img.dataset.item = it.id;
      spin.append(img); tilt.append(spin, el('div', 'light')); b.append(tilt);
      b._tilt = tilt; b._spin = spin;
      b.style.display = 'none'; stage.append(b);
      b.addEventListener('pointerenter', () => { hover = i; });
      b.addEventListener('pointerleave', () => { if (hover === i) hover = -1; });
      b.addEventListener('focus', () => { if (tabbing) target = i; });
      b.addEventListener('click', () => { if (!dragMoved) openButton(i); });
      return b;
    });

    function paintDisc(i) {
      const it = items[i], b = discs[i];
      if (!b) return;
      b.style.setProperty('--face', `url("${it.face}")`);
      b.style.setProperty('--gloss', it.gloss);
      b.style.setProperty('--spec', it.gloss > 0.44 ? 0.7 : 0);
      b.style.setProperty('--shade', it.photo ? 0 : 0.3);
      b._edges.forEach(e => { e.style.background = ButtonArt.mix(it.edge, '#000000', 0.08 + e._k / LAYERS * 0.36); });
    }
    discs.forEach((_, i) => paintDisc(i));

    function renderInfo(i) {
      const it = items[i];
      info.innerHTML = `<p class="no">No. ${it.no}</p><h1>${esc(it.name)}</h1><dl>` + TYPES.map(t => {
        const v = [].concat(it.attrs[t.key] || []);
        return v.length ? `<div><dt><i style="background:${t.color}"></i>${t.label}</dt><dd>${esc(v.join('、'))}</dd></div>` : '';
      }).join('') + '</dl>';
    }

    function measure() {
      W = innerWidth; H = innerHeight;
      base = Math.round(Math.min(H * 0.36, W * 0.36));
      document.documentElement.style.setProperty('--base', base + 'px');
      discs.forEach(b => { b._ry = null; });
      dirty = true;
    }

    function openButton(i) {
      const g = geo[i];
      if (g && !reduced) flyFrom = { ...g, src: items[i].src };
      openedAt = performance.now();
      location.hash = detailHref(items[i]);
    }

    function browseFrame(ts) {
      let spin = 0, spread = 1;
      if (intro < 1) {
        if (!introStart) introStart = ts;
        const t = (ts - introStart) / 1000;
        const e = 1 - Math.pow(1 - clamp(t / 1.4, 0, 1), 3);
        countEl.textContent = Math.round(e * N);
        countEl.style.opacity = 1 - clamp((t - 1.5) / 0.5, 0, 1);
        spin = (1 - e) * -540;
        intro = clamp((t - 1.6) / 1.4, 0, 1);
        spread = 1 - Math.pow(1 - intro, 3);
        if (t > 2) document.body.classList.remove('intro');
        if (intro >= 1) countEl.hidden = true;
      }

      pos += (target - pos) * 0.12;
      if (Math.abs(target - pos) < 0.0004) pos = target;

      // 钮扣沿一条弧线排开：远处的小钮扣从左上方落下来，在当前这枚左边到达最低点，
      // 再越来越陡地向右上方扬起，越往右越大（k 是沿路走过的距离，y 是 k 的抛物线）
      const a = 0.27, cx = W * 0.46, cy = H * 0.6;
      const ARC_P = 0.15, ARC_Q = 0.078;
      countEl.style.left = (cx - base * 0.62) + 'px'; countEl.style.top = cy + 'px';
      for (let i = 0; i < N; i++) {
        const el = discs[i];
        let d = i - pos, op = 1;
        if (spread < 1 && i > 0) { d += (1 - spread) * (4 + i * 0.5); op = spread; }
        const e = Math.exp(a * d), k = (e - 1) / a;
        const x = cx + base * 0.84 * k, y = cy - base * (ARC_P * k + ARC_Q * k * k);
        if (d < -8 || x - base * e * 0.6 > W) { if (geo[i]) { el.style.display = 'none'; geo[i] = null; } continue; }
        hv[i] += ((hover === i ? 1 : 0) - hv[i]) * 0.18;
        const sc = e * (1 + hv[i] * 0.05), rot = d * 62 + (i === 0 ? spin : 0);
        if (!geo[i]) el.style.display = '';
        el.style.opacity = op * clamp((d + 8) / 3, 0, 1);
        el.style.transform = `translate(${x - base / 2}px,${y - base / 2}px) scale(${sc})`;
        el._spin.style.transform = `rotate(${rot}deg)`;
        const ry = TILT * (1 - hv[i] * 0.65);          // 指到的那枚会朝你转过来一些
        if (el._ry == null || Math.abs(ry - el._ry) > 0.05) {
          el._ry = ry;
          el._tilt.style.transform = `perspective(${base * 5}px) rotateY(${ry.toFixed(2)}deg) rotateX(4deg)`;
        }
        geo[i] = { x, y, s: base * sc, rot, ry };
      }

      const near = clamp(Math.round(pos), 0, N - 1), show = hover >= 0 ? hover : near;
      if (show !== shown) { shown = show; renderInfo(show); }
      if (near !== nearShown) { nearShown = near; tickNow.textContent = pad3(near + 1); }
      tickBar.style.transform = `scaleX(${(pos + 1) / N})`;
    }

    stage.addEventListener('pointerdown', e => {
      if (e.button || intro < 1) return;
      drag = { x: e.clientX, t: target }; dragMoved = false;
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; stage.classList.add('dragging'); }
      if (dragMoved) target = clamp(drag.t - dx / (base * 0.9), 0, N - 1);
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null; stage.classList.remove('dragging');
      if (dragMoved) { target = Math.round(target); setTimeout(() => { dragMoved = false; }, 0); }
    };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);

    addEventListener('wheel', e => {
      if (view !== 'browse') return;
      e.preventDefault();
      if (intro < 1) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (wheelFrom === null) wheelFrom = Math.round(target);
      target = clamp(target + delta * (e.deltaMode ? 0.12 : 0.0035), 0, N - 1);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        // 停下后吸附到最近的一枚；鼠标滚轮拨一格不到半步，也算前进一枚，而不是弹回原处
        const dv = target - wheelFrom;
        let r = Math.round(target);
        if (r === wheelFrom && Math.abs(dv) > 0.15) r += Math.sign(dv);
        target = clamp(r, 0, N - 1);
        wheelFrom = null;
      }, 240);
    }, { passive: false });

    /* ================= 词语网 ================= */
    const NS = 'http://www.w3.org/2000/svg';
    const svg = $('#net'), camEl = $('#cam'), linkLayer = $('#links'), nodeLayer = $('#nodes'), panel = $('#panel');
    const mk = (tag, attrs = {}) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const units = s => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) < 128 ? 0.62 : 1), 0);

    const G = { nodes: [], links: [], byId: {} };
    const cam = { x: 0, y: 0, k: 1 };
    let focus = null, fitSet = null, hoverNode = null, alpha = 0, dirty = true;
    let near = new Set();          // 和焦点直接相连的节点
    let camFree = false;           // 用户自己平移 / 缩放过，镜头就不再自动跟随
    const hiddenTypes = new Set();

    (function buildGraph() {
      let s = 20240229;
      const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
      const add = n => { n.adj = new Set(); n.vx = n.vy = 0; n.rr = n.rT = n.r0; G.nodes.push(n); G.byId[n.id] = n; return n; };

      terms.forEach(t => {
        const ti = TYPES.findIndex(x => x.key === t.type);
        const ang = ti / TYPES.length * Math.PI * 2 + (rnd() - 0.5) * 0.7, rad = 170 + rnd() * 130;
        const u = units(t.label);
        const n = add({
          id: t.id, kind: 'term', type: t.type, label: t.label, term: t,
          r0: Math.max(14 + 3.4 * Math.sqrt(t.items.length), u * 5.6),
          x: Math.cos(ang) * rad * 1.6, y: Math.sin(ang) * rad,
        });
        n.el = mk('g', { 'data-id': n.id, tabindex: 0, role: 'link', 'aria-label': TYPE[t.type].label + '：' + t.label });
        n.el.append(
          mk('circle', { r: n.r0, fill: TYPE[t.type].color }),
          mk('circle', { r: n.r0 + 3, class: 'halo' }),
        );
        const tx = mk('text', { 'font-size': Math.min(12.5, n.r0 * 1.72 / u).toFixed(1) });
        tx.textContent = t.label; n.el.append(tx);
      });

      items.forEach(it => {
        const ts = it.terms.map(id => G.byId[id]);
        const n = add({
          id: 'b:' + it.id, kind: 'button', item: it, r0: 12,
          x: ts.reduce((a, t) => a + t.x, 0) / ts.length + (rnd() - 0.5) * 40,
          y: ts.reduce((a, t) => a + t.y, 0) / ts.length + (rnd() - 0.5) * 40,
        });
        n.el = mk('g', { 'data-id': n.id, tabindex: 0, role: 'link', 'aria-label': it.name });
        n.el.append(
          mk('image', { href: it.src, x: -n.r0, y: -n.r0, width: n.r0 * 2, height: n.r0 * 2, 'data-item': it.id }),
          mk('circle', { r: n.r0 + 2.5, class: 'halo' }),
        );
        ts.forEach(t => {
          const l = { s: n, t, el: mk('line', { class: 'lk' }) };
          n.adj.add(t); t.adj.add(n); G.links.push(l); linkLayer.append(l.el);
        });
      });
      G.nodes.forEach(n => nodeLayer.append(n.el));

      for (let i = 0, a = 1; i < 600; i++, a *= 0.994) tick(Math.max(a, 0.06));
    })();

    function tick(a) {
      const ns = G.nodes;
      for (let i = 0; i < ns.length; i++) {
        const p = ns[i]; if (p.hidden) continue;
        for (let j = i + 1; j < ns.length; j++) {
          const q = ns[j]; if (q.hidden) continue;
          let dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
          if (d2 > 160000) continue;
          if (d2 < 1) { dx = 0.5 - (i % 2); dy = 0.5; d2 = 1; }
          const d = Math.sqrt(d2), min = p.rr + q.rr + 9;
          const f = 2400 / d2 * a / d;
          p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f;
          if (d < min) {                      // 圆点不互相压住
            const m = (min - d) / d * 0.35;
            p.x -= dx * m; p.y -= dy * m; q.x += dx * m; q.y += dy * m;
          }
        }
      }
      for (const l of G.links) {
        if (l.s.hidden || l.t.hidden) continue;
        const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - (l.s.rr + l.t.rr + 60)) * 0.012 * a / d;
        // 围在焦点身边的节点不被别的连线拉走，这样它们能绕着焦点排成一圈
        const holdS = focus && (l.s === focus || near.has(l.s)), holdT = focus && (l.t === focus || near.has(l.t));
        if (!holdS) { l.s.vx += dx * f; l.s.vy += dy * f; }
        if (!holdT) { l.t.vx -= dx * f; l.t.vy -= dy * f; }
      }
      if (focus && !focus.hidden) {
        const clear = focus.rr + 130;
        for (const n of ns) {
          if (n === focus || n.hidden) continue;
          const dx = n.x - focus.x, dy = n.y - focus.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (near.has(n)) {                          // 相连的节点围到焦点身边
            const f = (d - (focus.rr + n.rr + 30)) * 0.09 * a / d;
            n.vx -= dx * f; n.vy -= dy * f;
          } else if (d < clear) {                     // 其余的让出位置
            const f = (clear - d) * 0.06 * a / d;
            n.vx += dx * f; n.vy += dy * f;
          }
        }
      }
      for (const n of ns) {
        if (n.hidden) continue;
        n.vx -= n.x * 0.0025 * a; n.vy -= n.y * 0.006 * a;
        n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy;
      }
    }

    function camTarget() {
      const set = (fitSet || G.nodes).filter(n => !n.hidden);
      if (!set.length) return cam;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      set.forEach(n => {
        const r = n.rT + 5;
        x0 = Math.min(x0, n.x - r); x1 = Math.max(x1, n.x + r); y0 = Math.min(y0, n.y - r); y1 = Math.max(y1, n.y + r);
      });
      const r = svg.getBoundingClientRect(), wide = innerWidth > 760;
      const pl = wide ? 30 : 12, pr = wide ? 150 : 12, pt = 60, pb = wide ? 20 : 44;
      const aw = Math.max(50, r.width - pl - pr), ah = Math.max(50, r.height - pt - pb);
      const k = Math.min(aw / (x1 - x0), ah / (y1 - y0), focus ? 2.4 : 1.8);
      return { k, x: pl + aw / 2 - (x0 + x1) / 2 * k, y: pt + ah / 2 - (y0 + y1) / 2 * k };
    }

    function graphFrame() {
      if (alpha > 0.01) { tick(alpha); alpha *= 0.97; dirty = true; }
      for (const n of G.nodes) {
        const d = n.rT - n.rr;
        if (Math.abs(d) > 0.05) { n.rr += d * 0.12; dirty = true; }
      }
      if (!camFree) {
        const t = camTarget();
        for (const p of ['x', 'y', 'k']) {
          const d = t[p] - cam[p];
          if (Math.abs(d) > (p === 'k' ? 0.0004 : 0.05)) { cam[p] += d * (reduced ? 1 : 0.085); dirty = true; }
        }
      }
      if (hoverNode) placeTip();
      if (!dirty) return;
      dirty = false;
      camEl.setAttribute('transform', `translate(${cam.x.toFixed(2)},${cam.y.toFixed(2)}) scale(${cam.k.toFixed(4)})`);
      for (const n of G.nodes) n.el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)}) scale(${(n.rr / n.r0).toFixed(3)})`);
      for (const l of G.links) {
        l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1));
        l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1));
      }
    }

    function setFocus(node) {
      focus = node || null;
      const s1 = new Set(), s2 = new Set();
      if (focus) {
        s1.add(focus); focus.adj.forEach(n => s1.add(n));
        focus.adj.forEach(n => n.adj.forEach(m => { if (!s1.has(m)) s2.add(m); }));
        nodeLayer.append(focus.el);
      }
      G.nodes.forEach(n => {
        n.rT = n === focus ? n.r0 * (n.kind === 'term' ? 1.9 : 2.4)
          : focus && focus.kind === 'term' && s1.has(n) ? n.r0 * 1.7 : n.r0;   // 带有这个词的钮扣也放大一些
        n.el.setAttribute('class', 'n ' + n.kind + (!focus ? '' : n === focus ? ' f0' : s1.has(n) ? ' f1' : s2.has(n) ? ' f2' : ' dim'));
      });
      G.links.forEach(l => {
        const on = l.s === focus || l.t === focus;
        const mid = !on && (s1.has(l.s) || s1.has(l.t));
        l.el.setAttribute('class', 'lk' + (!focus ? '' : on ? ' on' : mid ? ' mid' : ' dim'));
      });
      hoverNode = null; highlight(null); tip.hidden = true;
      fitSet = focus ? [...s1] : null;
      near = s1; camFree = false;
      alpha = Math.max(alpha, 0.7); dirty = true;
      renderPanel();
    }

    function applyHidden() {
      G.nodes.forEach(n => {
        n.hidden = n.kind === 'term' && hiddenTypes.has(n.type) && n !== focus;
        n.el.style.display = n.hidden ? 'none' : '';
      });
      G.links.forEach(l => { l.el.style.display = l.s.hidden || l.t.hidden ? 'none' : ''; });
      alpha = 0.6; dirty = true;
    }

    /* 平移与缩放：拖动空白处平移，滚轮缩放；换焦点或双击空白处，镜头回到自动取景 */
    let pan = null, panMoved = false;
    svg.addEventListener('pointerdown', e => {
      if (e.button) return;
      pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; panMoved = false;
    });
    addEventListener('pointermove', e => {
      if (!pan) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!panMoved && Math.hypot(dx, dy) > 4) { panMoved = true; camFree = true; svg.classList.add('panning'); setHover(null); }
      if (panMoved) { cam.x = pan.cx + dx; cam.y = pan.cy + dy; dirty = true; }
    });
    const endPan = () => {
      if (!pan) return;
      pan = null; svg.classList.remove('panning');
      if (panMoved) setTimeout(() => { panMoved = false; }, 0);
    };
    addEventListener('pointerup', endPan);
    addEventListener('pointercancel', endPan);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const step = e.ctrlKey ? 0.01 : e.deltaMode ? 0.05 : 0.0016;
      const k = clamp(cam.k * Math.exp(-e.deltaY * step), 0.3, 5);
      cam.x = mx - (mx - cam.x) * k / cam.k; cam.y = my - (my - cam.y) * k / cam.k; cam.k = k;
      camFree = true; dirty = true;
    }, { passive: false });
    svg.addEventListener('dblclick', e => { if (!e.target.closest('.n')) camFree = false; });

    svg.addEventListener('click', e => {
      if (panMoved) return;
      const g = e.target.closest('.n');
      if (!g) { if (focus) location.hash = '#/graph'; return; }
      const n = G.byId[g.dataset.id];
      location.hash = n.kind === 'term' ? termHref(n.id) : itemHref(n.item);
    });
    svg.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const g = e.target.closest('.n'); if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    /* 悬停：亮出这个节点和它连着的节点，其余退后；名称提示贴在节点上方；
       下方面板里对应的钮扣 / 词语标签同时亮起，反过来指面板也会点亮网里的节点 */
    const tip = $('#tip');
    let hoverTimer = 0;
    function highlight(set, hub) {
      svg.classList.toggle('hovering', !!set);
      G.nodes.forEach(n => n.el.classList.toggle('hv', !!set && set.has(n)));
      G.links.forEach(l => l.el.classList.toggle('hov', !!hub && (l.s === hub || l.t === hub)));
    }
    function placeTip() {
      const n = hoverNode, r = svg.getBoundingClientRect();
      const x = r.left + cam.x + n.x * cam.k, y = r.top + cam.y + (n.y - n.rr) * cam.k - 8;
      const inside = x > r.left && x < r.right && y > r.top + 40 && y < r.bottom;
      tip.style.opacity = inside ? 1 : 0;
      tip.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    }
    function setHover(n, fromPanel) {
      clearTimeout(hoverTimer);
      n = n && !n.hidden ? n : null;
      if (n === hoverNode) return;
      hoverNode = n;
      if (n) { const set = new Set(n.adj); set.add(n); highlight(set, n); } else highlight(null);
      panel.querySelectorAll('[data-node]').forEach(el => {
        const on = !!n && el.dataset.node === n.id;
        el.classList.toggle('hl', on);
        if (on && !fromPanel) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      });
      if (n) {
        tip.textContent = n.kind === 'button'
          ? `No. ${n.item.no} ${n.item.name}`
          : `${TYPE[n.type].label}：${n.label}，${n.term.items.length} 枚钮扣`;
        tip.hidden = false; placeTip();
      } else tip.hidden = true;
    }
    svg.addEventListener('pointerover', e => {
      if (panMoved) return;
      const g = e.target.closest('.n'), n = g ? G.byId[g.dataset.id] : null;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => setHover(n), n ? 40 : 140);   // 稍等一下，鼠标划过时不至于闪
    });
    svg.addEventListener('pointerleave', () => setHover(null));
    svg.addEventListener('focusin', e => { const g = e.target.closest('.n'); if (g) setHover(G.byId[g.dataset.id]); });
    svg.addEventListener('focusout', () => setHover(null));
    panel.addEventListener('pointerover', e => {
      const el = e.target.closest('[data-node]');
      setHover(el ? G.byId[el.dataset.node] : null, true);
    });
    panel.addEventListener('pointerleave', () => setHover(null));
    panel.addEventListener('wheel', e => {                      // 竖向滚轮也能横向翻钮扣那一排
      const row = e.target.closest('.row');
      if (!row || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || row.scrollWidth <= row.clientWidth) return;
      row.scrollLeft += e.deltaY; e.preventDefault();
    }, { passive: false });

    /* 图例：点一下隐藏 / 显示某一类词语 */
    const legend = $('#legend');
    legend.innerHTML = TYPES.map(t =>
      `<li><button type="button" data-type="${t.key}" aria-pressed="true" style="--c:${t.color}">${t.label}</button></li>`).join('');
    legend.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.type, off = !hiddenTypes.has(k);
      off ? hiddenTypes.add(k) : hiddenTypes.delete(k);
      b.setAttribute('aria-pressed', String(!off));
      applyHidden();
    });
    legend.addEventListener('pointerover', e => {                // 指着某一类，先看看它在网里的位置
      const b = e.target.closest('button'); if (!b) return;
      setHover(null);
      highlight(new Set(G.nodes.filter(n => n.type === b.dataset.type && !n.hidden)), null);
    });
    legend.addEventListener('pointerleave', () => { if (!hoverNode) highlight(null); });

    /* 下方面板 */
    const thumb = (it, badge) =>
      `<a href="${itemHref(it)}" data-node="b:${it.id}" aria-label="No. ${it.no} ${esc(it.name)}"><img src="${it.src}" data-item="${it.id}" alt="${esc(it.name)}">${badge ? `<span>${badge}</span>` : ''}</a>`;
    const chip = id => { const t = terms.get(id); return `<li><a href="${termHref(id)}" data-node="${esc(id)}" style="--c:${TYPE[t.type].color}">${esc(t.label)}</a></li>`; };

    function renderPanel() {
      if (focus && focus.kind === 'button') {
        const it = focus.item;
        const rel = related(it).slice(0, 14);
        panel.className = 'panel';
        panel.innerHTML =
          `<a class="p-img" href="${detailHref(it)}" title="查看这枚钮扣的详情"><img src="${it.src}" data-item="${it.id}" alt="${esc(it.name)}"></a>` +
          `<div class="p-meta"><p class="no">No. ${it.no}</p><h2>${esc(it.name)}</h2><ul class="chips">${it.terms.map(chip).join('')}</ul>` +
          `<a class="back" href="${detailHref(it)}">查看详情</a><a class="back" href="#/browse">回到图像索引</a></div>` +
          `<div class="p-rel"><h3>和它共用词语的钮扣（角标是共用的词数）</h3><div class="row">${rel.map(x => thumb(x.o, x.shared.length)).join('')}</div></div>`;
      } else if (focus) {
        const t = focus.term, co = new Map();
        t.items.forEach(it => it.terms.forEach(id => { if (id !== t.id) co.set(id, (co.get(id) || 0) + 1); }));
        const top = [...co].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
        panel.className = 'panel wide';
        panel.innerHTML =
          `<div class="p-meta"><p class="no">${TYPE[t.type].label}</p><h2>${esc(t.label)}</h2>` +
          `<p>${t.items.length} 枚钮扣带有这个词。常和它一起出现的词：</p><ul class="chips">${top.map(chip).join('')}</ul></div>` +
          `<div class="p-rel"><h3>带有「${esc(t.label)}」的钮扣</h3><div class="row big">${t.items.map(it => thumb(it)).join('')}</div></div>`;
      } else {
        panel.className = 'panel wide';
        panel.innerHTML =
          `<div class="p-meta"><p class="no">词语网</p><h2>${N} 枚钮扣，${terms.size} 个词语</h2>` +
          `<p>每个圆点是一个词，每枚小钮扣连着描述它的词。点一个词看哪些钮扣共用它，点一枚钮扣看它的全部词语。</p></div>` +
          `<div class="p-rel"><h3>全部钮扣</h3><div class="row">${items.map(it => thumb(it)).join('')}</div></div>`;
      }
    }

    /* 从图像索引飞到详情页里的那枚钮扣 */
    function fly(to) {
      const from = flyFrom;
      flyFrom = null;
      if (!from || !to) return;
      const r = to.getBoundingClientRect();
      if (!r.width || r.top < 0 || r.top + r.height / 2 > innerHeight) return;   // 目标不在屏幕上（手机上详情图在下面）就不飞
      const c = new Image();
      c.src = from.src; c.className = 'fly'; c.alt = '';
      Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.append(c);
      to.style.visibility = 'hidden';
      const dx = from.x - (r.left + r.width / 2), dy = from.y - (r.top + r.height / 2);
      const P = `perspective(${Math.round(r.width * 5)}px)`;
      const anim = c.animate(
        [{ transform: `translate(${dx}px,${dy}px) scale(${from.s / r.width}) ${P} rotateY(${from.ry}deg) rotate(${from.rot}deg)` },
         { transform: `translate(0px,0px) scale(1) ${P} rotateY(0deg) rotate(0deg)` }],
        { duration: 850, easing: 'cubic-bezier(.62,.02,.18,1)' });
      const stop = () => { c.remove(); to.style.visibility = ''; if (flyStop === stop) flyStop = null; };
      flyStop = () => { anim.cancel(); stop(); };
      anim.onfinish = anim.oncancel = stop;
    }

    /* ================= 入口页 ================= */
    const SITE = window.SITE, home = $('#home');
    (function buildHome() {
      // 三个入口各配一枚钮扣，上面压一块半透明色片（--ln 是色片中间那道线的颜色）
      const objs = [
        { item: items[3 % N], color: TYPE.form.color,  line: TYPE.era.color },
        { item: items[4 % N], color: TYPE.color.color, line: '#101114' },
        { item: items[2 % N], color: TYPE.motif.color, line: '#ffffff' },
      ];
      const featured = objs[2].item;
      const seg = a => `<line x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" pathLength="1"/>`;
      // 一圈没有完全接上的八边形：横屏和竖屏各一套坐标
      const LAND = [[478, 124, 815, 124], [722, 124, 922, 310], [940, 250, 940, 533], [940, 508, 880, 626],
                    [425, 768, 760, 768], [303, 598, 477, 722], [291, 308, 291, 622], [390, 238, 515, 124]];
      const PORT = [[210, 70, 470, 70], [420, 70, 545, 190], [545, 170, 545, 480], [545, 455, 478, 590],
                    [120, 722, 400, 722], [62, 565, 190, 692], [50, 262, 50, 585], [150, 180, 250, 70]];
      home.innerHTML = `<div class="home-stage">
        <svg class="home-lines land" viewBox="0 0 1280 848" aria-hidden="true">${LAND.map(seg).join('')}</svg>
        <svg class="home-lines port" viewBox="0 0 600 800" aria-hidden="true">${PORT.map(seg).join('')}</svg>
        ${SITE.entries.slice(0, 3).map((e, i) => {
          const href = e.href === 'detail' ? detailHref(featured) : e.href, k = 'abc'[i], o = objs[i];
          return `<a class="obj obj-${k}" href="${href}" data-entry="${i}" tabindex="-1" aria-hidden="true">
              <img src="${o.item.src}" data-item="${o.item.id}" alt="" draggable="false"><i class="lens" style="--c:${o.color};--ln:${o.line}"></i></a>
            <a class="slot slot-${k}" href="${href}" data-entry="${i}" aria-label="${esc(e.big + e.rest)}，${esc(e.label)}">
              ${PixelType.svg(e.big)}<span class="slot-label${e.rest ? '' : ' bare'}">${esc(e.rest)}<b>${esc(e.no)}</b>${esc(e.label)}</span></a>`;
        }).join('')}
      </div>`;
      // 指着大字或指着钮扣，同一个入口的两部分一起响应
      const hot = (e, on) => {
        const a = e.target.closest('[data-entry]'); if (!a) return;
        home.querySelectorAll(`[data-entry="${a.dataset.entry}"]`).forEach(x => x.classList.toggle('hot', on));
      };
      home.addEventListener('pointerover', e => hot(e, true));
      home.addEventListener('pointerout', e => hot(e, false));
      home.addEventListener('focusin', e => hot(e, true));
      home.addEventListener('focusout', e => hot(e, false));
    })();

    /* ================= 钮扣详情 ================= */
    const detail = $('#detail');
    detail.addEventListener('click', e => {      // 双击索引里的钮扣时，第二下会落在刚换上来的详情页上：吞掉它
      if (performance.now() - openedAt < 450) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    let detailItem = null;
    const vals = (it, k) => [].concat(it.attrs[k] || []).map(String);
    const word = (it, k) => vals(it, k).join('、');

    // 一小张马赛克版的钮扣图，给详情页那块色片里用
    const pixCache = new Map();
    function pixelated(it) {
      const key = it.src;                     // 同一张照片的钮扣共用一份
      if (!pixCache.has(key)) pixCache.set(key, new Promise(res => {
        const im = new Image();
        im.onload = () => {
          try {
            const n = 34, cv = document.createElement('canvas');
            cv.width = cv.height = n;
            cv.getContext('2d').drawImage(im, 0, 0, n, n);
            res(cv.toDataURL());
          } catch (e) { res(it.src); }            // 直接用 file:// 打开时画布读不出来：退回原图
        };
        im.onerror = () => { pixCache.delete(key); res(it.src); };
        im.src = it.src;
      }));
      return pixCache.get(key);
    }

    function describe(it, rel) {
      const motif = word(it, 'motif');
      return `这枚钮扣用${word(it, 'material')}做成，${word(it, 'color')}色，${word(it, 'form')}形制，工艺是${word(it, 'craft')}，` +
        `${!motif || motif === '素面' ? '表面不带纹样' : '表面是' + motif + '纹样'}。` +
        `它来自 ${word(it, 'era')} 的${word(it, 'origin')}，原本钉在${word(it, 'use')}上。` +
        (rel.length
          ? `索引里有 ${rel.length} 枚钮扣和它至少共用一个词语，最接近的是 No. ${rel[0].o.no}「${rel[0].o.name}」，和它共用 ${rel[0].shared.length} 个词。`
          : '索引里还没有和它共用词语的钮扣。');
    }

    // 把八个词画成一张结构图：怎么做成（材质、工艺、形制）→ 这枚钮扣 → 怎么描述它（外观 / 来历）→ 接着看什么
    function diagram(it, rel) {
      const a = (href, inner) => `<a href="${href}">${inner}</a>`;
      const box = (cx, y, w, text, href) => {
        const g = `<g class="dg-box"><rect x="${cx - w / 2}" y="${y}" width="${w}" height="22"/><text x="${cx}" y="${y + 11.5}">${esc(text)}</text></g>`;
        return href ? a(href, g) : g;
      };
      const cap = (x, y, text) => `<text class="dg-cap" x="${x}" y="${y}">${esc(text)}</text>`;
      const top = (k, cx) => vals(it, k).length ? cap(cx, 12, TYPE[k].label) + box(cx, 20, 86, word(it, k), termHref(k + ':' + vals(it, k)[0])) : '';
      const line = (k, cx, y) => {
        if (!vals(it, k).length) return '';
        const t = word(it, k), half = units(t) * 6;
        return a(termHref(k + ':' + vals(it, k)[0]),
          `<g class="dg-word"><circle cx="${cx - half - 8}" cy="${y}" r="3.2" fill="${TYPE[k].color}"/><text x="${cx}" y="${y}">${esc(t)}</text>` +
          `<text class="dg-cap" x="${cx + half + 14}" y="${y + 0.5}">${TYPE[k].label}</text></g>`);
      };
      return `<svg class="dg" viewBox="0 0 380 424" role="img" aria-label="这枚钮扣的八个词语是怎么组织的">
        ${top('material', 70)}${top('craft', 190)}${top('form', 310)}
        <path d="M113 31H147M233 31H267M190 42V62M190 84V102M190 140V156"/>
        ${box(190, 62, 76, '怎么做成')}
        <rect class="dg-name" x="100" y="102" width="180" height="38" rx="15"/><text class="dg-title" x="190" y="121.5">${esc(it.name)}</text>
        ${cap(190, 164, '怎么描述它')}
        <path d="M170 174H210L190 188ZM190 188L112 208M190 188L268 208"/>
        <path d="M14 252L52 208H150L182 252L150 296H52ZM198 252L230 208H328L366 252L328 296H230Z"/>
        ${cap(98, 224, '外观')}${line('color', 92, 246)}${line('motif', 92, 270)}
        ${cap(282, 222, '来历')}${line('era', 276, 240)}${line('origin', 276, 259)}${line('use', 276, 278)}
        <path d="M98 296L190 322M282 296L190 322M190 322V334L98 348M190 334L282 348"/>
        ${cap(98, 357, '最接近的钮扣')}
        ${rel.length ? box(98, 366, 160, `No. ${rel[0].o.no} ${rel[0].o.name}`, detailHref(rel[0].o)) : box(98, 366, 160, '还没有')}
        ${box(98, 396, 160, `共用词语的钮扣 ${rel.length} 枚`)}
        ${cap(282, 357, '接着看')}
        ${box(282, 366, 160, '在词语网里看它', itemHref(it))}
        ${box(282, 396, 160, '回到图像索引', '#/browse')}
      </svg>`;
    }

    // 右侧的一格：一枚相关的钮扣（灰着），上面压一块色片，写着它们共用的词
    function relCard(it, x, i) {
      const o = x.o;
      const t = terms.get(x.shared.slice().sort((p, q) => terms.get(p).items.length - terms.get(q).items.length)[0]);  // 挑最少见的那个共用词
      const s = (it.index * 7 + i * 13) % 5;
      const inset = ['0 14% 10% 0', '8% 0 0 12%', '0 6% 14% 6%', '10% 10% 0 0', '0 0 8% 18%'][s];
      const bx = [10, 34, 22, 6, 40][s], px = [54, 4, 58, 50, 6][(s + i) % 5], py = [50, 54, 6, 44, 10][(s + 2 * i) % 5];
      return `<a class="rel" href="${detailHref(o)}" title="No. ${o.no} ${esc(o.name)}" style="--i:${inset};--x:${bx}%;--px:${px}%;--py:${py}%;--c:${TYPE[t.type].color}">
        <i class="card"></i><img src="${o.src}" data-item="${o.id}" alt="${esc(o.name)}">
        <span class="patch">${esc(t.label)}${x.shared.length > 1 ? `<small>共 ${x.shared.length} 词</small>` : ''}</span></a>`;
    }

    function showDetail(it) {
      detailItem = it;
      const rel = related(it);
      const tint = TYPES[it.index % TYPES.length].color;
      // 每个词和它后面的分隔线包在一起，换行时分隔线不会落到行首
      const keys = TYPES.flatMap(t => vals(it, t.key).map(v => `<a href="${termHref(t.key + ':' + v)}">${esc(v)}</a>`))
        .map((a, i, all) => `<span>${a}${i < all.length - 1 ? '<i>｜</i>' : ''}</span>`).join('');
      const prev = items[(it.index + N - 1) % N], next = items[(it.index + 1) % N];
      detail.innerHTML = `<article class="d-wrap">
        <section class="d-text">
          <h1>${esc(it.name)}<i>｜</i>No. ${it.no}</h1>
          <p class="d-keys">${keys}</p>
          <i class="d-bits" style="--c:${tint}"></i>
          <p class="d-desc">${esc(describe(it, rel))}</p>
          <div class="d-diagram">${diagram(it, rel)}</div>
        </section>
        <section class="d-hero" style="--c:${tint}">
          <img id="hero-img" src="${it.src}" data-item="${it.id}" alt="${esc(it.name)}">
          <div class="d-lens"><img class="d-pix" alt=""></div>
        </section>
        <section class="d-rel" aria-label="和它共用词语的钮扣">${
          rel.slice(0, 12).map((x, i) => relCard(it, x, i)).join('') || '<p class="d-none">索引里还没有和它共用词语的钮扣。</p>'}</section>
        <nav class="d-pager" aria-label="翻看其他钮扣">
          <a href="${detailHref(prev)}">上一枚<span>No. ${prev.no} ${esc(prev.name)}</span></a>
          <a href="#/browse">回到图像索引</a>
          <a href="${detailHref(next)}">下一枚<span>No. ${next.no} ${esc(next.name)}</span></a>
        </nav>
      </article>`;
      detail.scrollTop = 0;
      pixelated(it).then(src => {
        const p = detail.querySelector('.d-pix');
        if (detailItem === it && p) p.src = src;
      });
    }

    /* ================= 检索 ================= */
    const q = $('#q'), results = $('#results');
    let hits = [], sel = 0;
    function search() {
      const v = q.value.trim().toLowerCase();
      if (!v) { results.hidden = true; hits = []; return; }
      hits = [
        ...[...terms.values()].filter(t => t.label.toLowerCase().includes(v) || TYPE[t.type].label.includes(v))
          .sort((a, b) => b.items.length - a.items.length)
          .map(t => ({ href: termHref(t.id), html: `<i style="background:${TYPE[t.type].color}"></i>${esc(t.label)}<small>${TYPE[t.type].label} ${t.items.length}</small>` })),
        ...items.filter(it => it.name.toLowerCase().includes(v) || it.no.includes(v))
          .map(it => ({ href: detailHref(it), html: `<img src="${it.src}" alt="">${esc(it.name)}<small>No. ${it.no}</small>` })),
      ].slice(0, 9);
      sel = 0;
      results.hidden = false;
      results.innerHTML = hits.length
        ? hits.map((h, i) => `<li><a href="${h.href}"${i === 0 ? ' class="sel"' : ''}>${h.html}</a></li>`).join('')
        : '<li class="none">没有匹配的词语或钮扣，换一个词试试</li>';
    }
    const closeSearch = () => { q.value = ''; results.hidden = true; hits = []; };
    q.addEventListener('input', search);
    q.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeSearch(); q.blur(); }
      if (!hits.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
        results.querySelectorAll('a').forEach((a, i) => a.classList.toggle('sel', i === sel));
      }
      if (e.key === 'Enter') { location.hash = hits[sel].href; closeSearch(); q.blur(); }
    });
    results.addEventListener('click', e => { if (e.target.closest('a')) closeSearch(); });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) results.hidden = true; });

    /* ================= 路由与主循环 =================
       #/            入口页
       #/browse      图像索引
       #/d/<id>      一枚钮扣的详情
       #/graph  #/b/<id>  #/t/<词语>   词语网（不选中 / 选中钮扣 / 选中词语） */
    function setView(v) {
      view = v;
      ['home', 'browse', 'graph', 'detail'].forEach(k => document.body.classList.toggle('is-' + k, k === v));
      document.querySelectorAll('[data-nav]').forEach(a =>
        a.classList.toggle('on', a.dataset.nav === v || (v === 'detail' && a.dataset.nav === 'browse')));
    }

    let lastItem = null, camReady = false, introPlayed = false;
    function route() {
      if (flyStop) flyStop();                     // 上一次的飞入还没落地就又换了页面：先收掉
      const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
      let node = null, graph = false;
      if (h.startsWith('b/')) { node = G.byId['b:' + h.slice(2)]; graph = true; }
      else if (h.startsWith('t/')) { node = G.byId[h.slice(2)]; graph = true; }
      else if (h === 'graph') graph = true;

      if (graph) {
        flyFrom = null;
        setView('graph');
        if (!camReady) { fitSet = null; Object.assign(cam, camTarget()); camReady = true; }
        setFocus(node);
        if (node && node.kind === 'button') lastItem = node.item;
        return;
      }
      setHover(null);

      const it = h.startsWith('d/') ? itemById[h.slice(2)] : null;
      if (it) {
        setView('detail');
        showDetail(it);
        lastItem = it;
        if (flyFrom) fly($('#hero-img'));
        return;
      }
      flyFrom = null;

      if (h === 'browse') {
        // 第一次进图像索引时播一遍开场；从某枚钮扣回来则直接停在那一枚
        if (!introPlayed && !reduced && !lastItem) {
          intro = 0; introStart = 0; countEl.hidden = false; countEl.style.opacity = 1;
          document.body.classList.add('intro');
        }
        introPlayed = true;
        if (lastItem) { pos = target = lastItem.index; lastItem = null; }
        setView('browse');
        return;
      }
      lastItem = null;
      setView('home');
    }

    addEventListener('keydown', e => {
      if (e.target === q) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;          // 浏览器自己的快捷键（后退、前进）不拦
      const arrow = !e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');   // Shift+方向键留给选中文字
      if (view === 'browse' && intro >= 1) {
        if (arrow) {
          target = clamp(Math.round(target) + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1); e.preventDefault();
        } else if (e.key === 'Enter' && !e.target.closest('a, button')) openButton(clamp(Math.round(pos), 0, N - 1));
      } else if (view === 'graph' && e.key === 'Escape') {
        location.hash = focus ? '#/graph' : '#/browse';
      } else if (view === 'detail' && detailItem) {
        if (e.key === 'Escape') location.hash = '#/browse';
        else if (arrow) {
          location.hash = detailHref(items[(detailItem.index + (e.key === 'ArrowRight' ? 1 : N - 1)) % N]);
        }
      }
      if (e.key === '/' ) { e.preventDefault(); q.focus(); }
    });

    addEventListener('resize', measure);
    addEventListener('hashchange', route);

    countEl.hidden = true;
    measure();
    route();

    (function loop(ts) {
      if (view === 'browse') browseFrame(ts); else if (view === 'graph') graphFrame();
      requestAnimationFrame(loop);
    })(performance.now());
  }
})();
