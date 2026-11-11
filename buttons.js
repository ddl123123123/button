/*
 * 钮扣图像
 *   ButtonArt.render(item, size)  按材质 / 颜色 / 形制 / 纹样画一枚占位钮扣，
 *                                 返回 { face 不带方向光的牌面, lit 带光的成品, edge 侧面颜色, gloss 光泽 }
 *   ButtonArt.cutout(url, size)   载入真实照片，把四周的纯色底抠成透明，返回 Promise<{ src, edge }>
 */
window.ButtonArt = (() => {
  const TAU = Math.PI * 2;
  const HEX = {
    珠白: '#ECE6D8', 墨黑: '#262527', 琥珀: '#C07A2E', 朱红: '#C23A2E', 靛蓝: '#2A4580',
    橄榄: '#6E6B45', 象牙: '#E6DAB9', 鎏金: '#C9A240', 银灰: '#B7B9BA', 棕褐: '#6E4A33',
    松绿: '#2E8078', 藕粉: '#E0B4B0', 赤铜: '#A3623F',
  };
  const GLOSS = {
    贝母: .38, 牛角: .3, 黄铜: .32, 银: .4, 铜: .28, 锡: .2, 玻璃: .55, 珐琅: .5, 陶瓷: .46,
    电木: .36, 树脂: .34, 象牙果: .16, 骨: .14, 木: .1, 椰壳: .1, 皮革: .12, 布: .03,
  };
  const METAL = new Set(['黄铜', '银', '铜', '锡']);

  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (h, to, t) => {
    const a = rgb(h), b = rgb(to);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const rng = seed => {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  };
  const first = v => String([].concat(v || '')[0]);

  function render(it, S) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const c = S / 2, R = S * 0.48;
    let rnd = rng(it.seed || 1);
    const mat = first(it.attrs.material), form = first(it.attrs.form), motif = first(it.attrs.motif);
    const base = HEX[first(it.attrs.color)] || '#9a958c';
    const holed = form === '二孔' || form === '四孔';
    const metal = METAL.has(mat);
    let ink = lum(base) < 0.4 ? mix(base, '#ffffff', .5) : mix(base, '#000000', .5);
    if (mat === '陶瓷') ink = lum(base) < 0.4 ? '#F3EEE2' : '#2A4580';
    if (mat === '珐琅') ink = '#E2C56A';

    const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
    const blob = (x, y, r, tone, alpha, stretch = 1, ang = 0) => {
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(stretch, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(${tone},${alpha})`); gr.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = gr; circle(0, 0, r); g.fill(); g.restore();
    };
    const diag = (a, b) => {
      const lg = g.createLinearGradient(c - R * .7, c - R * .7, c + R * .7, c + R * .7);
      lg.addColorStop(0, a); lg.addColorStop(1, b); return lg;
    };
    const ring = (r, w, style) => { circle(c, c, r); g.lineWidth = w; g.strokeStyle = style; g.stroke(); };

    g.save();
    circle(c, c, R); g.clip();

    /* 底色 */
    const bg = g.createRadialGradient(c - R * .3, c - R * .35, R * .1, c, c, R * 1.05);
    bg.addColorStop(0, mix(base, '#ffffff', .16)); bg.addColorStop(.7, base); bg.addColorStop(1, mix(base, '#000000', .3));
    g.fillStyle = bg; g.fillRect(0, 0, S, S);

    /* 材质 */
    if (mat === '贝母') {
      const cg = g.createConicGradient(rnd() * TAU, c + R * (rnd() - .5) * .6, c + R * (rnd() - .5) * .6);
      const cols = ['rgba(255,190,220,.4)', 'rgba(170,235,240,.4)', 'rgba(255,250,200,.3)', 'rgba(200,190,255,.38)', 'rgba(180,255,210,.3)'];
      for (let i = 0; i <= 10; i++) cg.addColorStop(i / 10, cols[i % cols.length]);
      g.fillStyle = cg; g.fillRect(0, 0, S, S);
      g.globalCompositeOperation = 'soft-light';
      const a0 = rnd() * Math.PI;
      for (let i = 0; i < 8; i++) blob(rnd() * S, rnd() * S, R * (.25 + rnd() * .5), '255,255,255', .55, 3 + rnd() * 3, a0 + rnd() * .5);
      g.globalCompositeOperation = 'source-over';
    } else if (mat === '牛角' || mat === '电木' || mat === '树脂') {
      const n = mat === '树脂' ? 7 : 20, a0 = rnd() * Math.PI;
      const st = mat === '牛角' ? 5 : mat === '电木' ? 2 : 1.4;
      for (let i = 0; i < n; i++) {
        blob(rnd() * S, rnd() * S, R * (.12 + rnd() * .35), rnd() < .55 ? '0,0,0' : '255,235,200',
          mat === '树脂' ? .1 : .14 + rnd() * .2, st * (.6 + rnd()), a0 + (rnd() - .5) * .5);
      }
    } else if (mat === '木' || mat === '椰壳' || mat === '象牙果') {
      const a0 = rnd() * TAU, ox = c + Math.cos(a0) * R * 1.6, oy = c + Math.sin(a0) * R * 1.6;
      for (let r = R * .5; r < R * 2.8; r += R * (.03 + rnd() * .06)) {
        circle(ox, oy, r); g.lineWidth = R * (.008 + rnd() * .02);
        g.strokeStyle = `rgba(0,0,0,${mat === '象牙果' ? .05 + rnd() * .06 : .08 + rnd() * .14})`; g.stroke();
      }
      if (mat === '椰壳') {
        g.fillStyle = 'rgba(20,10,0,.45)';
        for (let i = 0; i < 260; i++) g.fillRect(rnd() * S, rnd() * S, R * .012, R * (.02 + rnd() * .04));
      }
    } else if (metal) {
      const k = mat === '锡' ? .55 : 1;
      const cg = g.createConicGradient(rnd() * TAU, c, c);
      for (let i = 0; i <= 8; i++) cg.addColorStop(i / 8, i % 2 ? `rgba(0,0,0,${.3 * k})` : `rgba(255,255,255,${.42 * k})`);
      g.fillStyle = cg; g.fillRect(0, 0, S, S);
      for (let r = R * .06; r < R; r += R * .028) ring(r, 1, 'rgba(0,0,0,.05)');
      for (let i = 0; i < 9; i++) blob(rnd() * S, rnd() * S, R * (.1 + rnd() * .3), '0,0,0', .1 + rnd() * .12);
    } else if (mat === '玻璃') {
      const cg = g.createConicGradient(rnd() * TAU, c, c);
      for (let i = 0; i < 16; i++) {
        const col = i % 2 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)';
        cg.addColorStop(i / 16, col); cg.addColorStop((i + 1) / 16 - .001, col);
      }
      g.fillStyle = cg; g.fillRect(0, 0, S, S);
      blob(c + R * .25, c + R * .3, R * .7, '255,255,255', .22);
    } else if (mat === '骨') {
      const a0 = rnd() * Math.PI;
      g.save(); g.translate(c, c); g.rotate(a0);
      for (let i = 0; i < 46; i++) {
        g.fillStyle = `rgba(90,60,20,${.03 + rnd() * .06})`;
        g.fillRect(-R, (rnd() * 2 - 1) * R, R * 2, R * (.005 + rnd() * .02));
      }
      g.restore();
      g.fillStyle = 'rgba(80,50,20,.3)';
      for (let i = 0; i < 90; i++) { circle(rnd() * S, rnd() * S, R * .006); g.fill(); }
    } else if (mat === '皮革') {
      g.save(); g.translate(c, c); g.rotate(Math.PI / 4);
      const w = R * .3;
      for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) {
        const x = i * w, y = j * w;
        const lg = (i + j) & 1 ? g.createLinearGradient(x, y, x, y + w) : g.createLinearGradient(x, y, x + w, y);
        lg.addColorStop(0, 'rgba(0,0,0,.45)'); lg.addColorStop(.5, 'rgba(255,255,255,.12)'); lg.addColorStop(1, 'rgba(0,0,0,.45)');
        g.fillStyle = lg; g.fillRect(x, y, w, w);
      }
      g.restore();
    } else if (mat === '布') {
      g.save(); g.translate(c, c); g.rotate(rnd() * Math.PI);
      for (let p = -R; p < R; p += R * .03) {
        g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(p, -R, R * .012, R * 2);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-R, p, R * 2, R * .012);
      }
      g.restore();
    }

    /* 纹样 */
    const zone = holed ? .56 : 0;        // 有孔的钮扣把纹样排在孔外一圈
    const drawMotif = () => {
      if (motif === '花卉') {
        if (holed) {
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * TAU;
            g.beginPath(); g.ellipse(c + Math.cos(a) * R * zone, c + Math.sin(a) * R * zone, R * .095, R * .045, a, 0, TAU); g.fill();
          }
        } else {
          const n = 5 + Math.floor(rnd() * 3);
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU;
            g.beginPath(); g.ellipse(c + Math.cos(a) * R * .3, c + Math.sin(a) * R * .3, R * .24, R * .12, a, 0, TAU); g.fill();
          }
          for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; circle(c + Math.cos(a) * R * .72, c + Math.sin(a) * R * .72, R * .022); g.fill(); }
        }
      } else if (motif === '几何') {
        g.lineWidth = R * .028; g.lineJoin = 'round';
        if (holed) {
          g.beginPath();
          for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = R * (i % 2 ? .48 : .65); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
          g.stroke();
        } else {
          [.26, .46, .66].forEach((rr, k) => {
            g.beginPath();
            for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU + k * .39; g.lineTo(c + Math.cos(a) * R * rr, c + Math.sin(a) * R * rr); }
            g.stroke();
          });
        }
      } else if (motif === '徽章') {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = R * (i % 2 ? .17 : .4); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
        g.closePath(); g.fill();
        g.lineWidth = R * .02; circle(c, c, R * .56); g.stroke();
      } else if (motif === '动物') {
        g.save(); g.translate(c, c + R * .04);
        g.beginPath(); g.ellipse(0, 0, R * .3, R * .19, -.35, 0, TAU); g.fill();              // 身
        circle(-R * .26, -R * .22, R * .11); g.fill();                                          // 头
        g.beginPath(); g.moveTo(-R * .36, -R * .25); g.lineTo(-R * .52, -R * .2); g.lineTo(-R * .35, -R * .16); g.fill(); // 喙
        g.beginPath(); g.moveTo(R * .18, -R * .02); g.lineTo(R * .56, -R * .2); g.lineTo(R * .5, R * .08); g.lineTo(R * .2, R * .14); g.fill(); // 尾
        g.beginPath(); g.moveTo(-R * .05, -R * .12); g.quadraticCurveTo(R * .2, -R * .56, R * .36, -R * .3); g.quadraticCurveTo(R * .2, -R * .2, R * .1, -R * .02); g.fill(); // 翅
        g.fillRect(-R * .08, R * .16, R * .03, R * .16); g.fillRect(R * .04, R * .15, R * .03, R * .17);
        g.fillRect(-R * .3, R * .32, R * .6, R * .035);                                         // 栖枝
        g.restore();
      } else if (motif === '文字') {
        const word = { 上海: 'SHANGHAI', 香港: 'HONG KONG', 广州: 'CANTON', 伯明翰: 'BIRMINGHAM' }[first(it.attrs.origin)] || 'BUTTON';
        const str = ('★ ' + word + ' ★ BEST QUALITY ').replace(/ /g, ' ');
        const rad = R * (holed ? .58 : .64), size = Math.min(R * .13, rad * TAU / str.length * 1.25);
        g.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < str.length; i++) {
          const a = i / str.length * TAU - Math.PI / 2;
          g.save(); g.translate(c + Math.cos(a) * rad, c + Math.sin(a) * rad); g.rotate(a + Math.PI / 2); g.fillText(str[i], 0, 0); g.restore();
        }
        if (!holed) {
          g.font = `700 ${R * .34}px Georgia, serif`; g.fillText(word[0], c, c + R * .02);
          g.lineWidth = R * .015; circle(c, c, R * .44); g.stroke();
        }
      } else if (motif === '条纹') {
        g.save(); circle(c, c, R * (holed ? .78 : .93)); g.clip();
        g.translate(c, c); g.rotate(rnd() * Math.PI); g.globalAlpha *= .5;
        for (let p = -R; p < R; p += R * .15) g.fillRect(-R, p, R * 2, R * .065);
        g.restore();
      } else if (motif === '螺旋') {
        g.lineCap = 'round';
        if (holed) {
          g.lineWidth = R * .026; g.beginPath();
          for (let t = 0; t <= 1; t += .004) { const a = t * TAU * 3.5, r = R * (.33 + t * .38); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
          g.stroke();
        } else {
          for (let k = 0; k < 9; k++) {
            g.beginPath();
            for (let t = 0; t <= 1; t += .02) {
              const a = k / 9 * TAU + t * 2.3, r = R * (.07 + t * .78);
              g.lineWidth = R * (.03 + t * .09);
              g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
            }
            g.stroke();
          }
          circle(c, c, R * .09); g.fill();
        }
      }
    };
    if (motif && motif !== '素面') {
      const o = R * .014;
      // 浮雕要把同一纹样画三遍，每遍都从同一个种子取随机数，形状才对得上
      const pass = (dx, dy, col, alpha) => {
        const keep = rnd; rnd = rng((it.seed || 1) + 99);
        g.save(); g.translate(dx, dy); g.globalAlpha = alpha; g.fillStyle = g.strokeStyle = col;
        drawMotif(); g.restore(); rnd = keep;
      };
      if (metal) { pass(o, o, '#000000', .5); pass(-o, -o, '#ffffff', .55); pass(0, 0, mix(base, '#ffffff', .12), .9); }
      else pass(0, 0, ink, mat === '玻璃' ? .5 : .8);
    }

    /* 形制 */
    if (holed) {
      ring(R * .9, R * .2, diag('rgba(255,255,255,.3)', 'rgba(0,0,0,.34)'));
      ring(R * .795, R * .035, diag('rgba(0,0,0,.4)', 'rgba(255,255,255,.28)'));
      const dish = g.createRadialGradient(c, c, R * .2, c, c, R * .8);
      dish.addColorStop(0, 'rgba(0,0,0,0)'); dish.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = dish; circle(c, c, R * .78); g.fill();
      if (metal || mat === '牛角') { ring(R * .93, R * .012, 'rgba(255,255,255,.4)'); ring(R * .87, R * .012, 'rgba(255,255,255,.3)'); }
    } else if (form === '包扣') {
      const ed = g.createRadialGradient(c, c, R * .6, c, c, R);
      ed.addColorStop(0, 'rgba(0,0,0,0)'); ed.addColorStop(1, 'rgba(0,0,0,.42)');
      g.fillStyle = ed; g.fillRect(0, 0, S, S);
    } else if (form === '揿扣') {
      ring(R * .88, R * .13, diag('rgba(255,255,255,.4)', 'rgba(0,0,0,.4)'));
      ring(R * .56, R * .03, diag('rgba(0,0,0,.45)', 'rgba(255,255,255,.3)'));
      const nub = g.createRadialGradient(c - R * .08, c - R * .1, R * .02, c, c, R * .3);
      nub.addColorStop(0, 'rgba(255,255,255,.6)'); nub.addColorStop(1, 'rgba(0,0,0,.4)');
      g.fillStyle = nub; circle(c, c, R * .28); g.fill();
    } else {
      ring(R * .965, R * .05, diag('rgba(255,255,255,.32)', 'rgba(0,0,0,.4)'));
      if (metal) {                                  // 绳纹边
        for (let i = 0; i < 52; i++) {
          const a = i / 52 * TAU, x = c + Math.cos(a) * R * .88, y = c + Math.sin(a) * R * .88;
          g.beginPath(); g.ellipse(x, y, R * .05, R * .026, a + .9, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.34)'; g.fill();
          g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
        }
        ring(R * .8, R * .014, 'rgba(0,0,0,.3)');
      }
    }

    ring(R - R * .012, R * .024, 'rgba(0,0,0,.3)');
    g.restore();

    /* 孔：真的打穿，能透出页面底色 */
    if (holed) {
      const k = R * .165;
      const pts = form === '二孔' ? [[-k, 0], [k, 0]] : [[-k, -k], [k, -k], [-k, k], [k, k]];
      pts.forEach(([x, y]) => {
        const hx = c + x, hy = c + y, hr = R * .085;
        g.globalCompositeOperation = 'destination-out'; circle(hx, hy, hr); g.fill();
        g.globalCompositeOperation = 'source-over';
        const wall = g.createLinearGradient(hx - hr, hy - hr, hx + hr, hy + hr);
        wall.addColorStop(0, 'rgba(0,0,0,.7)'); wall.addColorStop(.6, 'rgba(0,0,0,0)');
        g.fillStyle = wall; circle(hx, hy, hr); g.fill();
        g.lineWidth = R * .012; g.strokeStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(hx, hy, hr * 1.08, .3, 1.9); g.stroke();
      });
    }
    /* 先导出不带方向光的牌面：图像视图里钮扣会转，光要另外叠一层才不会跟着转 */
    const face = cv.toDataURL();

    /* 光：只落在已有像素上，孔保持透空 */
    const gloss = GLOSS[mat] == null ? .2 : GLOSS[mat];
    g.save(); g.globalCompositeOperation = 'source-atop';
    blob(c - R * .36, c - R * .42, R * .75, '255,255,255', gloss);
    blob(c + R * .5, c + R * .56, R * .9, '0,0,0', .28);
    if (gloss > .44) {
      g.translate(c - R * .4, c - R * .47); g.rotate(-.7);
      g.beginPath(); g.ellipse(0, 0, R * .2, R * .075, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
    }
    g.restore();
    return { face, lit: cv.toDataURL(), edge: mix(base, '#000000', .3), gloss };
  }

  /* 把照片四周的纯色背景抠成透明 */
  function cutout(url, S) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片载入失败：' + url));
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = S;
        const g = cv.getContext('2d');
        const k = Math.min(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
        g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        let d;
        try { d = g.getImageData(0, 0, S, S); } catch (e) { return resolve({ src: url, edge: '#4a443c' }); }
        const px = d.data, seen = new Uint8Array(S * S), stack = [];
        const ref = [px[0], px[1], px[2]];
        const isBg = i => px[i * 4 + 3] < 8 ||
          Math.abs(px[i * 4] - ref[0]) + Math.abs(px[i * 4 + 1] - ref[1]) + Math.abs(px[i * 4 + 2] - ref[2]) < 60;
        const push = i => { if (!seen[i] && isBg(i)) { seen[i] = 1; stack.push(i); } };
        for (let i = 0; i < S; i++) { push(i); push(S * (S - 1) + i); push(i * S); push(i * S + S - 1); }
        while (stack.length) {
          const i = stack.pop(), x = i % S, y = (i / S) | 0;
          px[i * 4 + 3] = 0;
          if (x > 0) push(i - 1); if (x < S - 1) push(i + 1); if (y > 0) push(i - S); if (y < S - 1) push(i + S);
        }
        g.putImageData(d, 0, 0);
        let r = 0, gg = 0, b = 0, n = 0;                 // 取照片的平均色，用来给侧面上色
        for (let i = 0; i < S * S; i += 13) if (px[i * 4 + 3] > 200) { r += px[i * 4]; gg += px[i * 4 + 1]; b += px[i * 4 + 2]; n++; }
        const hex = n ? '#' + [r, gg, b].map(v => Math.round(v / n * .7).toString(16).padStart(2, '0')).join('') : '#4a443c';
        resolve({ src: cv.toDataURL(), edge: hex });
      };
      img.src = url;
    });
  }

  return { render, cutout, mix };
})();
