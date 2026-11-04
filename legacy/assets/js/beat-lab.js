/* 节奏网格实验室（3+）交互：手风琴 · 视频片段芯片 · 可点鼓网格 + WebAudio · 音名与垫位 · 鼓谱 · MPC 模拟器 · 术语弹窗
   纯静态、无外部依赖；数据来自 assets/data/beat-lab-data.js（离线包），http 下缺的 JSON 再按需 fetch。
   生成数据的脚本：/workspace/mpc-research/tools/lab_data.py、lab_demo_01.py、lab_terms.py */
(function () {
  'use strict';
  var doc = document;
  var ROOT = (function () {
    var s = (doc.currentScript && doc.currentScript.src) || '';
    var i = s.indexOf('assets/js/beat-lab.js');
    return i >= 0 ? s.slice(0, i) : '../';
  })();
  function url(p) { return ROOT + p; }
  var DATA = window.BEAT_LAB_DATA || {};
  function getData(key, cb) {
    if (DATA[key]) return cb(DATA[key]);
    if (/^https?:$/.test(location.protocol) && window.fetch) {
      fetch(url('assets/data/' + key + '.json')).then(function (r) { return r.json(); })
        .then(function (d) { DATA[key] = d; cb(d); }).catch(function () { cb(null); });
    } else cb(null);
  }
  function el(tag, attrs, html) {
    var e = doc.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function fmt(t) { return (Math.round(t * 10) / 10).toFixed(1); }

  /* ------------------------------------------------------------------ audio */
  var AC = null, master = null, noiseBuf = null;
  function ac() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      var comp = AC.createDynamicsCompressor();
      master = AC.createGain(); master.gain.value = 0.8;
      master.connect(comp); comp.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function env(g, t, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  }
  function noiseSrc(t, dur) {
    var s = AC.createBufferSource(); s.buffer = noiseBuf; s.start(t); s.stop(t + dur + 0.05); return s;
  }
  function drum(inst, t, v, open) {
    if (!ac()) return;
    v = Math.max(0.05, Math.min(1, v));
    var g = AC.createGain(); g.connect(master);
    if (inst === 'kick') {
      var o = AC.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
      o.connect(g); env(g, t, 1.0 * v, 0.38); o.start(t); o.stop(t + 0.42);
      var c = noiseSrc(t, 0.01), cf = AC.createBiquadFilter(), cg = AC.createGain();
      cf.type = 'highpass'; cf.frequency.value = 2500; c.connect(cf); cf.connect(cg); cg.connect(master); env(cg, t, 0.25 * v, 0.012);
    } else if (inst === 'snare' || inst === 'clap') {
      var n = noiseSrc(t, 0.3), f = AC.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = inst === 'clap' ? 1300 : 1900; f.Q.value = 0.8;
      n.connect(f); f.connect(g);
      if (inst === 'clap') {
        g.gain.setValueAtTime(0.0001, t);
        [0, 0.012, 0.024].forEach(function (d) { g.gain.setValueAtTime(0.7 * v, t + d); g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.01); });
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      } else {
        env(g, t, 0.7 * v, 0.2);
        var b = AC.createOscillator(), bg = AC.createGain(); b.type = 'triangle'; b.frequency.setValueAtTime(200, t);
        b.frequency.exponentialRampToValueAtTime(150, t + 0.08); b.connect(bg); bg.connect(master); env(bg, t, 0.45 * v, 0.1); b.start(t); b.stop(t + 0.15);
      }
    } else if (inst === 'hat' || inst === 'shaker' || inst === 'ride') {
      var h = noiseSrc(t, 0.5), hf = AC.createBiquadFilter();
      hf.type = inst === 'shaker' ? 'bandpass' : 'highpass'; hf.frequency.value = inst === 'shaker' ? 6000 : (inst === 'ride' ? 5000 : 7500);
      h.connect(hf); hf.connect(g); env(g, t, (inst === 'ride' ? 0.25 : 0.35) * v, open ? 0.32 : (inst === 'ride' ? 0.4 : 0.05));
    } else if (inst === 'tom') {
      var to = AC.createOscillator(); to.frequency.setValueAtTime(160, t); to.frequency.exponentialRampToValueAtTime(90, t + 0.2);
      to.connect(g); env(g, t, 0.7 * v, 0.3); to.start(t); to.stop(t + 0.35);
    } else { // cowbell / 其它
      [540, 800].forEach(function (fq) { var co = AC.createOscillator(); co.type = 'square'; co.frequency.value = fq; co.connect(g); co.start(t); co.stop(t + 0.3); });
      env(g, t, 0.12 * v, 0.25);
    }
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tone(midi, t, dur, v, kind) {
    if (!ac()) return;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = kind === 'bass' || kind === 'bass808' ? 'triangle' : (kind === 'cowbell' ? 'square' : 'sine');
    o.frequency.setValueAtTime(mtof(midi), t);
    var lvl = (kind === 'bass' || kind === 'bass808' ? 0.5 : (kind === 'cowbell' ? 0.06 : 0.18)) * (v || 0.9);
    o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + 0.01);
    g.gain.setValueAtTime(lvl, t + Math.max(0.02, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.start(t); o.stop(t + dur + 0.1);
  }

  /* ------------------------------------------------------------------ sequencer (one at a time) */
  var Player = { cur: null, timer: null };
  Player.stop = function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    var c = this.cur; this.cur = null;
    if (c && c.onStop) c.onStop();
  };
  Player.start = function (job) {
    this.stop();
    if (!ac()) { alert('这个浏览器不支持 WebAudio'); return; }
    var self = this; this.cur = job;
    var stepDur = 60 / job.bpm() / 4, t = AC.currentTime + 0.08, k = 0;
    function tick() {
      while (t < AC.currentTime + 0.12) {
        var bars = job.bars(), bar = Math.floor(k / 16) % bars, st = k % 16;
        stepDur = 60 / job.bpm() / 4;
        job.schedule(bar, st, t, stepDur);
        (function (bar, st, when) { setTimeout(function () { if (self.cur === job && job.onStep) job.onStep(bar, st); }, Math.max(0, (when - AC.currentTime) * 1000)); })(bar, st, t);
        t += stepDur; k++;
      }
    }
    tick(); this.timer = setInterval(tick, 25);
  };
  function swingOff(s, sw, stepDur) {
    return (Math.abs(s - Math.round(s)) < 1e-6 && Math.round(s) % 2 === 1) ? (sw / 100 - 0.5) * 2 * stepDur : 0;
  }

  /* ------------------------------------------------------------------ terms */
  var TERMS = null, TERM_RX = [];
  function loadTerms(cb) {
    if (TERMS) return cb();
    getData('terms', function (d) {
      TERMS = {};
      if (d) d.terms.forEach(function (tm) {
        TERMS[tm.id] = tm;
        try { TERM_RX.push({ id: tm.id, rx: new RegExp(tm.match.join('|'), 'g') }); } catch (e) { /* 旧浏览器不支持 lookbehind 时跳过 */ }
      });
      cb();
    });
  }
  var SKIP = /^(SCRIPT|STYLE|CODE|PRE|KBD|BUTTON|A|TEXTAREA|INPUT|SELECT|OPTION|svg|SVG|VIDEO|SUMMARY|H2)$/;
  var SCOPE = '.lab-pane, .lab-params, .bl-vnote, .bl-sim-text, .bl-hist-card, .bl-score-cap, .bl-grid-wrap, .step, .concept, table, details, .bl-scr';
  function wrapTerms(root) {
    if (!TERM_RX.length || !root) return;
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        for (var p = n.parentNode; p && p !== root.parentNode; p = p.parentNode) {
          if (p.nodeType !== 1) continue;
          if (SKIP.test(p.tagName) || p.classList.contains('term') || p.hasAttribute('data-noterm')) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var scope = (node.parentNode.closest && node.parentNode.closest(SCOPE)) || root;
      var seen = scope.__terms || (scope.__terms = {});
      $$('.term', scope).forEach(function (x) { seen[x.dataset.term] = 1; });
      var cur = node;
      for (var guard = 0; guard < 20 && cur; guard++) {
        var best = null, txt = cur.nodeValue;
        TERM_RX.forEach(function (r) {
          if (seen[r.id]) return;
          r.rx.lastIndex = 0; var m = r.rx.exec(txt);
          if (m && m[0].length && (!best || m.index < best.i)) best = { i: m.index, len: m[0].length, id: r.id };
        });
        if (!best) break;
        var mid = cur.splitText(best.i), rest = mid.splitText(best.len);
        var sp = el('span', { class: 'term', 'data-term': best.id, tabindex: '0', role: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
        mid.parentNode.replaceChild(sp, mid); sp.appendChild(mid);
        seen[best.id] = 1; cur = rest;
      }
    });
  }
  var pop = null, popFor = null, pinned = false, hoverT = null;
  function ensurePop() {
    if (pop) return pop;
    pop = el('div', { class: 'bl-pop', role: 'dialog', 'aria-modal': 'false', hidden: '' });
    pop.addEventListener('mouseenter', function () { clearTimeout(hoverT); });
    pop.addEventListener('mouseleave', function () { if (!pinned) hoverT = setTimeout(hidePop, 300); });
    doc.body.appendChild(pop); return pop;
  }
  function placePop() {
    if (!popFor || pop.hidden) return;
    var r = popFor.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 16);
    pop.style.width = w + 'px';
    var x = Math.min(Math.max(8, r.left), window.innerWidth - w - 8), y = r.bottom + 6;
    if (y + pop.offsetHeight > window.innerHeight - 8 && r.top - pop.offsetHeight - 6 > 8) y = r.top - pop.offsetHeight - 6;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function showPop(t, pin) {
    var tm = TERMS && TERMS[t.dataset.term]; if (!tm) return;
    ensurePop(); clearTimeout(hoverT);
    if (popFor && popFor !== t) popFor.setAttribute('aria-expanded', 'false');
    popFor = t; pinned = !!pin; t.setAttribute('aria-expanded', 'true');
    pop.innerHTML = '<div class="bl-pop-h"><b></b><span class="bl-lv"></span><button type="button" class="bl-pop-x" aria-label="关闭">×</button></div><p class="bl-pop-b"></p>' +
      (tm.deeper ? '<button type="button" class="bl-pop-more" aria-expanded="false">更深一层 ▾</button><p class="bl-pop-d" hidden></p>' : '');
    $('b', pop).textContent = tm.label; $('.bl-lv', pop).textContent = tm.level;
    $('.bl-lv', pop).className = 'bl-lv lv-' + ['入门', '进阶', '高级'].indexOf(tm.level);
    $('.bl-pop-b', pop).textContent = tm.basic;
    if (tm.deeper) {
      $('.bl-pop-d', pop).textContent = tm.deeper;
      $('.bl-pop-more', pop).addEventListener('click', function (e) {
        var d = $('.bl-pop-d', pop), open = d.hidden; d.hidden = !open; e.currentTarget.setAttribute('aria-expanded', open);
        e.currentTarget.textContent = open ? '收起 ▴' : '更深一层 ▾'; pinned = true; placePop();
      });
    }
    $('.bl-pop-x', pop).addEventListener('click', function () { hidePop(true); });
    pop.setAttribute('aria-label', tm.label);
    pop.hidden = false; placePop();
  }
  function hidePop(refocus) {
    if (!pop || pop.hidden) return;
    pop.hidden = true; pinned = false;
    if (popFor) { popFor.setAttribute('aria-expanded', 'false'); if (refocus === true) popFor.focus(); }
    popFor = null;
  }
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.term');
    if (t) { e.preventDefault(); if (popFor === t && pinned) hidePop(); else showPop(t, true); return; }
    if (pop && !pop.hidden && !pop.contains(e.target)) hidePop();
  });
  doc.addEventListener('keydown', function (e) {
    var t = e.target.closest && e.target.closest('.term');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (popFor === t && !pop.hidden) hidePop(); else { showPop(t, true); var b = $('.bl-pop-more', pop) || $('.bl-pop-x', pop); } }
    if (e.key === 'Escape') hidePop(true);
  });
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest && e.target.closest('.term'); if (!t || pinned) return;
      clearTimeout(hoverT); hoverT = setTimeout(function () { showPop(t, false); }, 220);
    });
    doc.addEventListener('mouseout', function (e) {
      var t = e.target.closest && e.target.closest('.term'); if (!t || pinned) return;
      clearTimeout(hoverT); hoverT = setTimeout(hidePop, 300);
    });
  }
  window.addEventListener('scroll', placePop, { passive: true });
  window.addEventListener('resize', placePop);

  /* ------------------------------------------------------------------ video */
  function initVideo(sec, d) {
    var v = $('video', sec), box = $('.bl-vctl', sec); if (!v || !box || box.__done) return; box.__done = 1;
    var seg = null, stages = d.video.stages, dur = d.video.duration;
    var segs = [{ n: 0, label: '全段', t0: 0, t1: dur, full: true }].concat(stages.map(function (s, i) {
      return { n: s.n, label: '①②③④⑤⑥⑦⑧'[i] + ' ' + s.label + (i === stages.length - 1 ? '（完整）' : ''), t0: s.t0, t1: s.t1, caption: s.caption };
    }));
    box.innerHTML = '<div class="bl-vrow bl-segs" role="group" aria-label="片段选择"></div>' +
      '<div class="bl-vrow"><label class="bl-chk"><input type="checkbox" class="bl-loop"> 循环此段</label>' +
      '<span class="bl-speed" role="group" aria-label="播放速度"></span></div><p class="bl-vnow" aria-live="polite"></p>';
    var segBox = $('.bl-segs', box), now = $('.bl-vnow', box), loop = $('.bl-loop', box);
    segs.forEach(function (s, i) {
      var b = el('button', { type: 'button', class: 'chip bl-seg', 'data-i': i, title: s.full ? '从头完整播放' : (s.caption + '（' + fmt(s.t0) + '–' + fmt(s.t1) + ' 秒）') });
      b.innerHTML = s.label + (s.full ? '' : ' <small>' + fmt(s.t0) + '–' + fmt(s.t1) + 's</small>');
      b.addEventListener('click', function () { pick(i); });
      segBox.appendChild(b);
    });
    [0.5, 0.75, 1].forEach(function (r) {
      var b = el('button', { type: 'button', class: 'chip bl-rate' + (r === 1 ? ' on' : ''), text: r + 'x', 'aria-pressed': r === 1 });
      b.addEventListener('click', function () { v.playbackRate = r; $$('.bl-rate', box).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
      $('.bl-speed', box).appendChild(b);
    });
    function go(t) {
      if (v.readyState < 1) { v.preload = 'auto'; v.addEventListener('loadedmetadata', function f() { v.removeEventListener('loadedmetadata', f); v.currentTime = t; }); v.load(); }
      else v.currentTime = t;
    }
    function pick(i) {
      var s = segs[i]; Player.stop();
      seg = s.full ? null : s; v.loop = !!(s.full && loop.checked);
      $$('.bl-seg', box).forEach(function (x) { x.classList.toggle('on', +x.dataset.i === i); });
      go(s.t0); var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    loop.addEventListener('change', function () { v.loop = !seg && loop.checked && $('.bl-seg.on', box) && $('.bl-seg.on', box).dataset.i === '0'; });
    function frame() {
      var t = v.currentTime;
      if (seg && !v.paused && t >= seg.t1 - 0.04) {
        if (loop.checked) v.currentTime = seg.t0; else { v.pause(); v.currentTime = Math.max(seg.t0, seg.t1 - 0.05); }
      }
      var cur = 0; segs.forEach(function (s, i) { if (i && t >= s.t0 - 0.01 && t < s.t1) cur = i; });
      $$('.bl-seg', box).forEach(function (x) { x.classList.toggle('cur', +x.dataset.i === cur && cur > 0); });
      now.textContent = '当前 ' + fmt(t) + ' 秒' + (cur ? ' · 第 ' + cur + ' 段：' + segs[cur].caption : (t >= stages[stages.length - 1].t1 ? ' · 结尾' : ''));
      if (!v.paused) requestAnimationFrame(frame);
    }
    v.addEventListener('play', function () { Player.stop(); requestAnimationFrame(frame); });
    v.addEventListener('seeked', frame); v.addEventListener('pause', frame);
    frame();
  }

  /* ------------------------------------------------------------------ grid */
  var DRUM_EN = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hi-hat', shaker: 'Shaker', ride: 'Ride', tom: 'Tom', cowbell: 'Cowbell' };
  function cellSym(ns) {
    if (!ns.length) return '';
    if (ns.some(function (n) { return Math.abs(n[1] - 0.667) < 0.01; })) return 't';
    if (ns.length > 1) return ns.length === 2 ? 'r' : '3';
    var n = ns[0]; if (n[4]) return 'O';
    return n[2] >= 0.75 ? 'X' : (n[2] >= 0.45 ? 'x' : 'g');
  }
  var SYM_TXT = { X: '●', x: '•', g: '·', O: '开', r: '×2', '3': '×3', t: '3连' };
  var SYM_NAME = { '': '空', X: '重', x: '轻', g: '鬼音', O: '开镲', r: '一格两下', '3': '一格三下', t: '三连音' };
  function makeGrid(container, d, opts) {
    opts = opts || {};
    var layers = opts.layers, nb = Math.min(opts.bars || d.bars, d.bars);
    var lanes = d.drums.filter(function (l) { return !layers || layers.indexOf(l.name) >= 0; })
      .map(function (l) { return { name: l.name, cn: l.cn, inst: l.inst, bars: l.bars.map(function (b) { return b.map(function (n) { return n.slice(); }); }) }; });
    var orig = JSON.stringify(lanes);
    var hasOff = d.drums.some(function (l) { return l.offsets; });
    var G = { lanes: lanes, bar: 0, swing: d.swing, human: false, pitchOn: {}, listeners: [], changeL: [], playing: false, nb: nb };
    container.innerHTML = '';
    container.classList.add('bl-grid-wrap');
    var bar = el('div', { class: 'bl-gbar' });
    var play = el('button', { type: 'button', class: 'chip bl-play', 'aria-label': '播放 / 停止', text: '▶ 播放' });
    bar.appendChild(play);
    if (nb > 1) {
      var bsel = el('span', { class: 'bl-bars', role: 'group', 'aria-label': '看第几小节' });
      for (var b = 0; b < nb; b++) (function (b) {
        var x = el('button', { type: 'button', class: 'chip bl-barbtn' + (b ? '' : ' on'), text: '小节 ' + (b + 1) });
        x.addEventListener('click', function () { G.bar = b; draw(); }); bsel.appendChild(x);
      })(b);
      bar.appendChild(bsel);
    }
    var info = el('span', { class: 'bl-ginfo' }); info.innerHTML = d.bpm + ' BPM';
    bar.appendChild(info);
    container.appendChild(bar);
    if (!opts.compact) {
      var sw = el('div', { class: 'bl-gbar bl-sw' });
      sw.innerHTML = '<label>Swing <input type="range" min="50" max="75" step="1" value="' + d.swing + '" aria-label="Swing 百分比"> <b class="bl-swv"></b></label>';
      if (hasOff) sw.insertAdjacentHTML('beforeend', '<label class="bl-chk"><input type="checkbox" class="bl-hum"> 加上视频里的毫秒偏移</label>');
      d.pitched.forEach(function (p, i) { sw.insertAdjacentHTML('beforeend', '<label class="bl-chk"><input type="checkbox" class="bl-pon" data-i="' + i + '"> +' + p.cn + '</label>'); });
      sw.insertAdjacentHTML('beforeend', '<button type="button" class="chip bl-reset">重置</button>');
      container.appendChild(sw);
      var rng = $('input[type=range]', sw), swv = $('.bl-swv', sw);
      function swText() {
        var ms = (G.swing / 100 - 0.5) * 2 * (60000 / d.bpm / 4);
        swv.textContent = G.swing + '%' + (G.swing > 50 ? '（第 2、4 个 16 分音符晚约 ' + Math.round(ms) + ' 毫秒）' : '（不摇）');
      }
      rng.addEventListener('input', function () { G.swing = +rng.value; swText(); });
      swText();
      var hum = $('.bl-hum', sw); if (hum) hum.addEventListener('change', function () { G.human = hum.checked; });
      $$('.bl-pon', sw).forEach(function (c) { c.addEventListener('change', function () { G.pitchOn[c.dataset.i] = c.checked; }); });
      $('.bl-reset', sw).addEventListener('click', function () {
        G.lanes = lanes = JSON.parse(orig); G.swing = d.swing; rng.value = d.swing; swText(); draw(); G.changeL.forEach(function (f) { f(); });
      });
    }
    var tbl = el('div', { class: 'bl-grid', role: 'grid', 'aria-label': '16 格鼓网格' });
    container.appendChild(tbl);
    container.appendChild(el('p', { class: 'bl-legend' }, '点格子：空 → <b>●</b> 重 → <b>•</b> 轻 → <b>·</b> 鬼音 → 空。<b>开</b> = 开镲，<b>×2</b> = 一格两下（1/32），<b>×3</b>、<b>3连</b> = 三连音。每 4 格 = 1 拍。'));
    function notesAt(l, b, i) { return l.bars[b].filter(function (n) { return Math.floor(n[0] + 1e-6) === i; }); }
    function draw() {
      $$('.bl-barbtn', container).forEach(function (x, i) { x.classList.toggle('on', i === G.bar); });
      var h = '<div class="bl-row bl-head" role="row"><span class="bl-lab" role="columnheader">第几步</span>';
      for (var i = 0; i < 16; i++) h += '<span class="bl-step' + (i % 4 === 0 ? ' beat' : '') + '" role="columnheader">' + (i + 1) + '</span>';
      h += '</div>';
      tbl.innerHTML = h;
      lanes.forEach(function (l, li) {
        var row = el('div', { class: 'bl-row', role: 'row' });
        row.appendChild(el('span', { class: 'bl-lab', role: 'rowheader' }, l.cn + ' <small>' + (DRUM_EN[l.inst] || l.name) + '</small>'));
        for (var i = 0; i < 16; i++) (function (i) {
          var s = cellSym(notesAt(l, G.bar, i));
          var c = el('button', { type: 'button', class: 'bl-cell s-' + (s || 'none') + ((i >> 2) % 2 ? ' alt' : ''), 'data-st': i, role: 'gridcell',
            'aria-label': l.cn + ' 第 ' + (i + 1) + ' 步：' + SYM_NAME[s] }, SYM_TXT[s] || '');
          c.addEventListener('click', function () {
            var cur = cellSym(notesAt(l, G.bar, i)), nv = { '': 1.0, X: 0.6, x: 0.3 }[cur];
            l.bars[G.bar] = l.bars[G.bar].filter(function (n) { return Math.floor(n[0] + 1e-6) !== i; });
            if (nv !== undefined && cur !== 'g') l.bars[G.bar].push([i, 1, nv, 0, 0]);
            l.bars[G.bar].sort(function (a, b) { return a[0] - b[0]; });
            draw(); G.changeL.forEach(function (f) { f(); });
            if (!G.playing) drum(l.inst, ac() ? AC.currentTime + 0.01 : 0, nv || 0.0001, 0);
          });
          row.appendChild(c);
        })(i);
        tbl.appendChild(row);
      });
      wrapTerms(tbl);
    }
    G.draw = draw;
    var job = {
      bpm: function () { return d.bpm; }, bars: function () { return nb; },
      schedule: function (b, st, t, sd) {
        lanes.forEach(function (l) {
          l.bars[b].forEach(function (n) {
            if (Math.floor(n[0] + 1e-6) !== st) return;
            var tt = t + (n[0] - st) * sd + swingOff(n[0], G.swing, sd) + (G.human ? n[3] / 1000 : 0);
            drum(l.inst, Math.max(AC.currentTime, tt), n[2], n[4]);
          });
        });
        d.pitched.forEach(function (p, i) {
          if (!G.pitchOn[i]) return;
          if (p.kind === 'mono') {
            (p.bars[b] || []).forEach(function (n) { if (Math.floor(n.s + 1e-6) === st) tone(n.mm, t + (n.s - st) * sd + swingOff(n.s, G.swing, sd), n.l * sd, n.v, p.inst); });
          } else {
            var ch = p.chords[b % p.chords.length];
            p.rhythm.forEach(function (r) { if (Math.floor(r[0]) === st) ch.notes.forEach(function (nt) { tone(nt.midi, t + swingOff(r[0], G.swing, sd), r[1] * sd, r[2] * 0.8, p.inst); }); });
          }
        });
      },
      onStep: function (b, st) {
        if (b !== G.bar) { G.bar = b; draw(); }
        $$('.bl-cell.now, .bl-step.now', tbl).forEach(function (x) { x.classList.remove('now'); });
        $$('.bl-cell[data-st="' + st + '"]', tbl).forEach(function (x) { x.classList.add('now'); });
        var hs = $$('.bl-step', tbl)[st]; if (hs) hs.classList.add('now');
        G.listeners.forEach(function (f) { f(b, st); });
      },
      onStop: function () { G.playing = false; play.textContent = '▶ 播放'; play.classList.remove('on'); $$('.now', tbl).forEach(function (x) { x.classList.remove('now'); }); G.listeners.forEach(function (f) { f(-1, -1); }); }
    };
    play.addEventListener('click', function () {
      if (G.playing) { Player.stop(); return; }
      $$('video').forEach(function (v) { v.pause(); });
      Player.start(job); G.playing = true; play.textContent = '■ 停止'; play.classList.add('on');
    });
    G.toggle = function () { play.click(); };
    draw();
    return G;
  }

  /* ------------------------------------------------------------------ score (标准打击乐谱 + 网格对照) */
  function makeScore(container, d, G) {
    var BW = 16 * 24 + 30, X0 = 70, top = 46;
    function y(line) { return top + line * 10; } // line 0 = 顶线
    function rest(x, kind, yy) {
      yy = yy || y(2);
      if (kind === 4) return '<path class="rst" d="M' + (x - 3) + ' ' + (yy - 14) + ' l7 8 l-6 6 l7 8 c-6 -3 -9 1 -4 6" />';
      var s = '<path class="rst" d="M' + (x + 4) + ' ' + (yy - 6) + ' L' + (x - 1) + ' ' + (yy + 10) + '"/><circle class="rstd" cx="' + (x) + '" cy="' + (yy - 5) + '" r="2.4"/>';
      if (kind === 1) s += '<circle class="rstd" cx="' + (x - 1.5) + '" cy="' + (yy + 1) + '" r="2.4"/>';
      if (kind === 3) s += '<circle class="rstd" cx="' + (x + 8) + '" cy="' + (yy - 3) + '" r="1.4"/>';
      return s;
    }
    function draw() {
      var lanes = {}; G.lanes.forEach(function (l) { lanes[l.inst] = l; });
      var nb = G.nb, W = X0 + nb * BW + 20, H = 230, s = '';
      s += '<text class="tt" x="8" y="18">♩ = ' + d.bpm + '</text><text class="tt" x="80" y="18">Swing 16 分 ' + G.swing + '%（每拍第 2、4 个 16 分音符稍晚）</text>';
      for (var i = 0; i < 5; i++) s += '<line class="st" x1="8" x2="' + (W - 12) + '" y1="' + y(i) + '" y2="' + y(i) + '"/>';
      s += '<rect class="clef" x="14" y="' + y(1) + '" width="4" height="20"/><rect class="clef" x="22" y="' + y(1) + '" width="4" height="20"/>';
      s += '<text class="ts" x="38" y="' + (y(2) - 1) + '">4</text><text class="ts" x="38" y="' + (y(4) - 1) + '">4</text>';
      s += '<text class="lbl" x="' + (W - 10) + '" y="' + (y(0) - 8) + '" text-anchor="end">x = Hi-hat · 第三间 = Snare · 下间 = Kick</text>';
      for (var b = 0; b < nb; b++) {
        var bx = X0 + b * BW;
        s += '<line class="bl" x1="' + (bx + BW - 6) + '" x2="' + (bx + BW - 6) + '" y1="' + y(0) + '" y2="' + y(4) + '"/>';
        s += '<text class="lbl" x="' + bx + '" y="' + (y(4) + 50) + '">小节 ' + (b + 1) + '</text>';
        for (var beat = 0; beat < 4; beat++) {
          var up = [], dn = [];
          for (var st = beat * 4; st < beat * 4 + 4; st++) {
            var hh = lanes.hat && lanes.hat.bars[b].filter(function (n) { return Math.floor(n[0] + 1e-6) === st; })[0];
            var sn = lanes.snare && lanes.snare.bars[b].filter(function (n) { return Math.floor(n[0] + 1e-6) === st; })[0];
            var kk = lanes.kick && lanes.kick.bars[b].filter(function (n) { return Math.floor(n[0] + 1e-6) === st; })[0];
            if (hh || sn) up.push({ st: st, hh: hh, sn: sn });
            if (kk) dn.push({ st: st, kk: kk });
          }
          var xs = function (st) { return bx + 8 + st * 24; };
          // 上声部：hat + snare，符干向上
          up.forEach(function (e, i) {
            var x = xs(e.st), k = b + '-' + e.st, sx = x + 5.5;
            var low = e.sn ? y(1.5) : y(-0.5);
            s += '<g class="nt" data-k="' + k + '">';
            if (e.hh) s += '<path class="xh" d="M' + (x - 4.5) + ' ' + (y(-0.5) - 4.5) + 'l9 9m0 -9l-9 9"/>';
            if (e.sn) {
              s += '<ellipse class="nh" cx="' + x + '" cy="' + y(1.5) + '" rx="5.6" ry="4" transform="rotate(-20 ' + x + ' ' + y(1.5) + ')"/>';
              if (e.sn[2] < 0.45) s += '<text class="gh" x="' + (x - 11) + '" y="' + (y(1.5) + 4) + '">(</text><text class="gh" x="' + (x + 7) + '" y="' + (y(1.5) + 4) + '">)</text>';
            }
            s += '<line class="stem" x1="' + sx + '" x2="' + sx + '" y1="' + (low - 1) + '" y2="' + (top - 26) + '"/></g>';
          });
          s += beams(up.map(function (e) { return e.st; }), function (st) { return xs(st) + 5.5; }, top - 26, 1, beat);
          // 下声部：kick，符干向下
          if (!dn.length) s += rest(xs(beat * 4) + 36, 4, y(3.4));
          else {
            if (dn[0].st > beat * 4) s += rest(xs(beat * 4) + 14, dn[0].st - beat * 4, y(3.6));
            dn.forEach(function (e, i) {
              var x = xs(e.st), k = b + '-' + e.st, sx = x - 5.5;
              s += '<g class="nt" data-k="' + k + 'k"><ellipse class="nh" cx="' + x + '" cy="' + y(3.5) + '" rx="5.6" ry="4" transform="rotate(-20 ' + x + ' ' + y(3.5) + ')"/>' +
                '<line class="stem" x1="' + sx + '" x2="' + sx + '" y1="' + (y(3.5) + 1) + '" y2="' + (y(4) + 28) + '"/>';
              if (dn.length === 1) {
                var len = beat * 4 + 4 - e.st;
                if (len < 4) { s += '<path class="flag" d="M' + sx + ' ' + (y(4) + 28) + ' q8 -6 7 -16"/>'; if (len === 1) s += '<path class="flag" d="M' + sx + ' ' + (y(4) + 21) + ' q8 -6 7 -16"/>'; }
                if (len === 3) s += '<circle class="rstd" cx="' + (x + 9) + '" cy="' + y(3.5) + '" r="1.6"/>';
              }
              s += '</g>';
            });
            if (dn.length > 1) s += beams(dn.map(function (e) { return e.st; }), function (st) { return xs(st) - 5.5; }, y(4) + 28, -1, beat);
          }
        }
        // 网格谱对照
        ['hat', 'snare', 'kick'].forEach(function (inst, r) {
          var l = lanes[inst]; if (!l) return;
          for (var st = 0; st < 16; st++) {
            var n = l.bars[b].filter(function (n) { return Math.floor(n[0] + 1e-6) === st; })[0];
            var cls = n ? (n[2] >= 0.75 ? 'g-on' : (n[2] >= 0.45 ? 'g-mid' : 'g-gh')) : ((st >> 2) % 2 ? 'g-alt' : 'g-off');
            s += '<rect class="gc ' + cls + '" data-k="' + b + '-' + st + 'g" x="' + (bx + 8 + st * 24 - 10) + '" y="' + (y(4) + 60 + r * 18) + '" width="20" height="14" rx="3"/>';
          }
          if (b === 0) s += '<text class="lbl" x="8" y="' + (y(4) + 71 + r * 18) + '">' + DRUM_EN[inst] + '</text>';
        });
      }
      H = y(4) + 60 + 3 * 18 + 8;
      container.innerHTML = '<div class="bl-score-bar"><button type="button" class="chip bl-score-play">' + (G.playing ? '■ 停止' : '▶ 播放（与网格同步）') + '</button></div><div class="bl-score-scroll"><svg class="bl-score-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="01 鼓谱：五线谱与网格对照">' + s + '</svg></div>';
    }
    function beams(sts, sx, yb, dir, beat) {
      if (sts.length < 2) {
        if (sts.length === 1 && dir > 0) {
          var len = beat * 4 + 4 - sts[0];
          if (len < 4) return '<path class="flag" d="M' + sx(sts[0]) + ' ' + yb + ' q8 6 7 16"/>' + (len === 1 ? '<path class="flag" d="M' + sx(sts[0]) + ' ' + (yb + 7) + ' q8 6 7 16"/>' : '');
        }
        return '';
      }
      var o = '<rect class="beam" x="' + sx(sts[0]) + '" y="' + (dir > 0 ? yb : yb - 4) + '" width="' + (sx(sts[sts.length - 1]) - sx(sts[0]) + 1.4) + '" height="4"/>';
      var y2 = dir > 0 ? yb + 7 : yb - 11;
      for (var i = 0; i < sts.length; i++) {
        var nxt = i + 1 < sts.length ? sts[i + 1] : beat * 4 + 4, prv = i ? sts[i - 1] : null;
        var d16 = nxt - sts[i] === 1;
        if (d16 && i + 1 < sts.length) o += '<rect class="beam" x="' + sx(sts[i]) + '" y="' + y2 + '" width="' + (sx(sts[i + 1]) - sx(sts[i]) + 1.4) + '" height="4"/>';
        else if (d16 && !(prv !== null && sts[i] - prv === 1)) o += '<rect class="beam" x="' + (sx(sts[i]) - 8) + '" y="' + y2 + '" width="9" height="4"/>';
      }
      return o;
    }
    container.addEventListener('click', function (e) {
      if (!e.target.closest('.bl-score-play')) return;
      var gp = $('.bl-play', container.closest('.lab-acc')); if (gp) gp.click();
    });
    draw();
    G.changeL.push(draw);
    var last = [];
    G.listeners.push(function (b, st) {
      last.forEach(function (x) { x.classList.remove('now'); }); last = [];
      var sb = $('.bl-score-play', container); if (sb) sb.textContent = b < 0 ? '▶ 播放（与网格同步）' : '■ 停止';
      if (b < 0) return;
      ['', 'k', 'g'].forEach(function (suf) { var e = container.querySelector('[data-k="' + b + '-' + st + suf + '"]'); if (e) { e.classList.add('now'); last.push(e); } });
    });
  }

  /* ------------------------------------------------------------------ 音名与垫位 */
  function makePads(container, d) {
    container.innerHTML = '';
    if (!d.pitched.length) { container.innerHTML = '<p class="note">这一节没有音高声部。</p>'; return; }
    d.pitched.forEach(function (p) {
      var box = el('div', { class: 'bl-pitch' });
      box.appendChild(el('h4', null, p.cn + ' <small>16 LEVELS Tune · PAD 4 = ' + p.base_name + '</small>'));
      var list = el('div', { class: 'bl-notes' });
      var pads = el('div', { class: 'bl-pads', role: 'group', 'aria-label': p.cn + ' 16 LEVELS 垫位图' });
      var order = [13, 14, 15, 16, 9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4];
      var used = {};
      if (p.kind === 'mono') p.bars.forEach(function (b) { b.forEach(function (n) { used[n.pad] = 1; }); });
      else p.chords.forEach(function (c) { c.notes.forEach(function (n) { used[n.pad] = 1; }); });
      order.forEach(function (k) {
        var pd = p.pads[k - 1];
        var b = el('button', { type: 'button', class: 'bl-pad' + (used[k] ? ' used' : '') + (k === 4 ? ' base' : ''), 'data-pad': k, 'aria-label': 'PAD ' + k + ' = ' + pd.name },
          '<small>' + k + '</small>' + pd.name);
        b.addEventListener('click', function () { hit([k]); tone(pd.midi, ac() ? AC.currentTime + 0.01 : 0, 0.5, 0.9, p.inst); });
        pads.appendChild(b);
      });
      function hit(ks) {
        $$('.bl-pad', pads).forEach(function (x) { x.classList.remove('hit'); void x.offsetWidth; if (ks.indexOf(+x.dataset.pad) >= 0) x.classList.add('hit'); });
      }
      if (p.kind === 'mono') {
        p.bars.forEach(function (b, bi) {
          var row = el('div', { class: 'bl-nrow' }, '<span class="bl-nbar">小节 ' + (bi + 1) + '</span>');
          b.forEach(function (n) {
            var x = el('button', { type: 'button', class: 'chip bl-note' + (n.fold ? ' fold' : ''), title: n.fold ? '原音 ' + n.orig + '，已移八度' : '' },
              '第 ' + (Math.floor(n.s) + 1) + ' 步 <b>' + n.name + '</b> → PAD ' + n.pad + (n.fold ? '*' : '') + (n.glide ? ' <small>(从 ' + n.glide + ' 滑)</small>' : ''));
            x.addEventListener('click', function () { hit([n.pad]); tone(n.mm, ac() ? AC.currentTime + 0.01 : 0, Math.min(1.2, n.l * 60 / d.bpm / 4), 0.9, p.inst); });
            row.appendChild(x);
          });
          list.appendChild(row);
        });
      } else {
        list.appendChild(el('p', { class: 'bl-small' }, '和弦节奏：每小节第 ' + p.rhythm.map(function (r) { return Math.floor(r[0]) + 1; }).join('、') + ' 步按。点和弦名 = 一起响；点单个音名 = 只响那个音。'));
        p.chords.forEach(function (c) {
          var row = el('div', { class: 'bl-nrow' }, '<span class="bl-nbar">小节 ' + c.bar + '</span>');
          var cb = el('button', { type: 'button', class: 'chip bl-note chord' }, '<b>' + c.name + '</b> <small>' + c.tones + '</small>');
          cb.addEventListener('click', function () { hit(c.notes.map(function (n) { return n.pad; })); var t = ac() ? AC.currentTime + 0.01 : 0; c.notes.forEach(function (n, i) { tone(n.midi, t + i * 0.012, 1.0, 0.8, p.inst); }); });
          row.appendChild(cb);
          c.notes.forEach(function (n) {
            var x = el('button', { type: 'button', class: 'chip bl-note' + (n.fold ? ' fold' : '') }, n.name + ' = PAD ' + n.pad + (n.fold ? '*' : ''));
            x.addEventListener('click', function () { hit([n.pad]); tone(n.midi, ac() ? AC.currentTime + 0.01 : 0, 0.8, 0.9, p.inst); });
            row.appendChild(x);
          });
          list.appendChild(row);
        });
      }
      var two = el('div', { class: 'bl-pitch-cols' }); two.appendChild(list); two.appendChild(pads);
      box.appendChild(two); container.appendChild(box);
    });
    container.appendChild(el('p', { class: 'note' }, '垫位按“PAD 4 = 原音高、每垫一个半音”推算（推断，手册 p.22/35 + Akai 官方视频）；* = 超出 16 个垫已移八度。声音是浏览器里合成的简单波形，只用来听音高。'));
  }

  /* ------------------------------------------------------------------ MPC 模拟器 */
  var PANEL = null;
  function screenHTML(s) {
    var h = '', mk = function (n) { return '<span class="bl-mk">' + n + '</span>'; };
    if (s.type === 'img') {
      h = '<div class="bl-scr img"><img src="' + url(s.src) + '" alt="MPC Sample 屏幕（官方手册截图）">' +
        (s.marks || []).map(function (m) { return '<span class="bl-mk abs" style="left:' + m.x + '%;top:' + m.y + '%">' + m.n + '</span>'; }).join('') + '</div>';
      return h + '<p class="bl-src">屏幕：官方《MPC Sample User Guide v1.3.0》截图，编号为本教程添加</p>';
    }
    var M = {}; (Array.isArray(s.marks) ? s.marks : Object.keys(s.marks || {}).map(function (k) { return { el: k, n: s.marks[k] }; })).forEach(function (m) { M[m.el] = m.n; });
    function E(name, cls, inner) { return '<span class="' + cls + (M[name] ? ' mk-on' : '') + '" data-el="' + name + '">' + inner + (M[name] ? mk(M[name]) : '') + '</span>'; }
    if (s.type === 'seq') {
      var ico = s.state === 'rec' ? '<i class="rec">●</i>' : (s.state === 'play' ? '<i>▶</i>' : '<i>■</i>');
      var bp = s.bpm.split('.');
      h = '<div class="bl-scr sim seq">' +
        '<div class="r r1">' + E('bpm', 'bpm', bp[0] + '<sup>' + (bp[1] || '00') + '</sup>') + E('bpmmode', 'box', 'BPM: ' + s.bpmmode) + E('recq', 'box rq' + (s.recq ? ' on' : ''), '<em>Rec</em> Quant') + '</div>' +
        '<div class="r r2">' + E('seq', 'seqn', s.seq) + '</div>' +
        '<div class="r r3">' + E('sig', '', s.sig) + E('metro', '', '♩ ' + s.metro) + E('countin', 'ci' + (s.countin ? ' on' : ''), '1234') + '</div>' +
        '<div class="r r4' + (s.state === 'rec' ? ' recst' : '') + '">' + E('state', 'ico', ico) + E('pos', 'pos', s.pos) + '<span class="tk">' + s.ticks + '</span></div>' +
        '<div class="r r5">' + E('bars', '', s.bars) + E('q', '', 'Q ' + s.q) + E('swing', 'sw', 'RT Swing <b>' + s.swing + '</b>') + '</div>' +
        (s.popup ? '<div class="pop">' + E('popup', 'popin', '<span>' + s.popup.title + '</span><b>' + s.popup.value + '</b>') + '</div>' : '') + '</div>';
    } else if (s.type === 'list') {
      h = '<div class="bl-scr sim list"><div class="r r1">' + E('head', 'box', s.head) + '</div><ul>' +
        s.items.map(function (it, i) { return '<li>' + (i === s.sel ? E('sel', 'sel', '▸ ' + it) : '<span>' + it + '</span>') + '</li>'; }).join('') +
        '</ul><div class="r foot">' + E('foot', '', s.foot) + '</div></div>';
    } else if (s.type === 'param') {
      var wave = '';
      if (s.wave) {
        var cuts = { auto: [12, 31, 47, 58, 76, 90], even4: [25, 50, 75], manual: [9, 37, 63], split: [25, 37.5, 50, 75], merge: [50, 75] }[s.wave] || [];
        wave = E('wave', 'wave', '<svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="' + wavePath() + '"/>' + cuts.map(function (c) { return '<line x1="' + c + '" x2="' + c + '" y1="0" y2="30"/>'; }).join('') + '</svg>');
      }
      h = '<div class="bl-scr sim param"><div class="r tabs">' + s.tabs.map(function (t, i) { return i === s.on ? E('tab', 'tab on', t) : '<span class="tab">' + t + '</span>'; }).join('') + '</div>' +
        '<div class="r">' + E('name', 'pname', s.name) + '</div>' + (wave || '<div class="wave"><svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="' + wavePath(1) + '"/></svg></div>') +
        '<div class="r knobs">' + s.knobs.map(function (k, i) { return E('k' + (i + 1), 'kn', '<small>' + k[0] + '</small><b>' + k[1] + '</b>'); }).join('') + '</div></div>';
    } else if (s.type === 'msg') {
      h = '<div class="bl-scr sim msg"><div class="msgbox">' + E('title', 'mt', s.title) + E('body', 'mb', s.body) + '</div></div>';
    }
    return h + '<p class="bl-src">按手册文字 / 截图重绘的示意屏幕（推断），不是实机截图</p>';
  }
  function wavePath(decay) {
    var p = 'M0 15', seed = 7;
    for (var i = 1; i <= 100; i++) {
      seed = (seed * 9301 + 49297) % 233280; var r = seed / 233280;
      var a = decay ? 13 * Math.exp(-i / 18) : (6 + 7 * Math.abs(Math.sin(i / 4)));
      p += ' L' + i + ' ' + (15 + (i % 2 ? 1 : -1) * a * (0.4 + 0.6 * r)).toFixed(1);
    }
    return p;
  }
  function makeSim(container, demo, labD) {
    var P = PANEL; container.innerHTML = '';
    var free = demo.mode === 'free', idx = 0, steps = demo.steps;
    var top = el('div', { class: 'bl-sim-top' });
    var pw = el('div', { class: 'bl-panel' });
    pw.innerHTML = '<img src="' + url(P.src) + '" alt="MPC Sample 顶面示意图（本教程按手册绘制）">';
    var vb = P.viewBox, svg = '<svg class="bl-ov" viewBox="' + vb.join(' ') + '" aria-hidden="' + (free ? 'false' : 'true') + '">';
    var hot = {}; steps.forEach(function (s) { s.controls.forEach(function (c) { hot[c] = 1; }); });
    Object.keys(hot).forEach(function (c) {
      var g = P.controls[c];
      svg += '<g class="hs" data-c="' + c + '"><circle class="hit" cx="' + g[0] + '" cy="' + g[1] + '" r="' + g[2] + '"><title>' + c + '</title></circle>' +
        '<circle class="ring" cx="' + g[0] + '" cy="' + g[1] + '" r="' + g[2] + '"/><circle class="ring r2" cx="' + g[0] + '" cy="' + g[1] + '" r="' + g[2] + '"/>' +
        '<g class="badge"><circle cx="' + (g[0] + g[2] * 0.75) + '" cy="' + (g[1] - g[2] * 0.75) + '" r="34"/><text x="' + (g[0] + g[2] * 0.75) + '" y="' + (g[1] - g[2] * 0.75 + 13) + '" text-anchor="middle"></text></g></g>';
    });
    pw.innerHTML += svg + '</svg>';
    var right = el('div', { class: 'bl-sim-r' });
    top.appendChild(pw); top.appendChild(right);
    container.appendChild(top);
    var text = el('div', { class: 'bl-sim-text' });
    container.appendChild(text);
    var mini = el('div', { class: 'bl-sim-grid' });
    container.appendChild(mini);
    var nav = el('div', { class: 'bl-sim-nav' });
    container.appendChild(nav);
    if (free) {
      steps.forEach(function (s, i) {
        var b = el('button', { type: 'button', class: 'chip bl-act', text: s.title });
        b.addEventListener('click', function () { show(i); }); nav.appendChild(b);
      });
      $$('.hs', pw).forEach(function (g) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', function () {
          var c = g.dataset.c; if (c === 'SHIFT') return;
          var cand = []; steps.forEach(function (s, i) { if (s.controls.indexOf(c) >= 0) cand.push(i); });
          var pos = cand.indexOf(idx); show(cand[(pos + 1) % cand.length]);
        });
      });
    } else {
      nav.innerHTML = '<button type="button" class="chip bl-prev">← 上一步</button><span class="bl-dots" role="tablist" aria-label="步骤"></span><button type="button" class="chip bl-next">下一步 →</button>';
      steps.forEach(function (s, i) {
        var dot = el('button', { type: 'button', class: 'bl-dot', 'aria-label': '第 ' + (i + 1) + ' 步：' + s.title, title: s.title });
        dot.addEventListener('click', function () { show(i); }); $('.bl-dots', nav).appendChild(dot);
      });
      $('.bl-prev', nav).addEventListener('click', function () { show(Math.max(0, idx - 1)); });
      $('.bl-next', nav).addEventListener('click', function () { show(Math.min(steps.length - 1, idx + 1)); });
    }
    function show(i) {
      idx = i; var s = steps[i];
      $$('.hs', pw).forEach(function (g) {
        var k = s.controls.indexOf(g.dataset.c);
        g.classList.toggle('on', k >= 0);
        $('text', g).textContent = k >= 0 && s.controls.length > 1 ? (k + 1) : '';
      });
      right.innerHTML = '<p class="bl-sim-h">' + (free ? '' : '<b>' + (i + 1) + ' / ' + steps.length + '</b> ') + s.title + '</p>' + screenHTML(s.screen);
      text.innerHTML = '<p class="bl-press"><span class="tag">按什么</span> ' + s.press + '</p>' +
        '<div class="bl-see"><span class="tag">屏幕上会出现什么</span><ol>' + s.see.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +
        (s.next ? '<p class="bl-next-t"><span class="tag">下一步</span> ' + s.next + '</p>' : '') +
        '<p class="bl-ref">' + (s.ref || '') + (s.infer ? ' · <b>（推断）</b>' + s.infer : '') + '</p>';
      container.__terms = null;
      text.__terms = null; right.__terms = null;
      wrapTerms(text); wrapTerms(right);
      Player.stop();
      mini.innerHTML = '';
      if (s.grid && labD) {
        mini.appendChild(el('p', { class: 'bl-small' }, '已录到这一层：' + s.grid.layers.map(function (n) { var l = labD.drums.filter(function (x) { return x.name === n; })[0]; return l ? l.cn : (labD.pitched.filter(function (x) { return x.name === n; })[0] || { cn: n }).cn; }).join(' + ') + '（点 ▶ 听浏览器合成的这一层）'));
        var gbox = el('div'); mini.appendChild(gbox);
        var G = makeGrid(gbox, labD, { layers: s.grid.layers, bars: s.grid.bars, compact: true });
        G.swing = /swing|metro|rec|double|velocity|bass|chop|save/.test(s.id) ? labD.swing : 50;
        if (s.id === 'swing') G.swing = labD.swing;
        labD.pitched.forEach(function (p, pi) { if (s.grid.layers.indexOf(p.name) >= 0) G.pitchOn[pi] = true; });
        $('.bl-ginfo', gbox).innerHTML = labD.bpm + ' BPM · Swing ' + G.swing + '%';
      }
      if (!free) $$('.bl-dot', nav).forEach(function (x, k) { x.classList.toggle('on', k === i); x.classList.toggle('done', k < i); x.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      else $$('.bl-act', nav).forEach(function (x, k) { x.classList.toggle('on', k === i); });
    }
    container.__show = function (id) { steps.forEach(function (s, i) { if (s.id === id) show(i); }); };
    show(0);
  }

  /* ------------------------------------------------------------------ tabs / accordion / routing */
  function initTabs(right) {
    if (right.__tabs) return; right.__tabs = 1;
    var tabs = $$('.lab-tab', right), panes = $$('.lab-pane', right);
    function act(name, focus) {
      tabs.forEach(function (t) { var on = t.dataset.tab === name; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
      panes.forEach(function (p) { p.hidden = p.dataset.pane !== name; });
      Player.stop();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { act(t.dataset.tab); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; act(n.dataset.tab, true); }
      });
    });
    right.__act = act;
    act(tabs[0].dataset.tab);
  }
  var accs = $$('.lab-acc');
  if (!accs.length) return;
  doc.documentElement.classList.add('bl-js');
  function initSection(sec) {
    if (sec.__init) return; sec.__init = 1;
    $$('.lab-right', sec).forEach(initTabs);
    var id = sec.dataset.lab;
    loadTerms(function () {
      wrapTerms($('.lab-acc-body', sec));
      if (!id) return;
      getData('lab-' + id, function (d) {
        if (!d) return;
        initVideo(sec, d);
        var G = null;
        $$('.bl-gridbox', sec).forEach(function (b) { G = makeGrid(b, d, {}); });
        $$('.bl-score', sec).forEach(function (b) { if (G) makeScore(b, d, G); });
        $$('.bl-padsbox', sec).forEach(function (b) { makePads(b, d); wrapTerms(b); });
        var sims = $$('.bl-sim', sec);
        if (sims.length) getData('panel', function (p) {
          PANEL = p; if (!p) return;
          sims.forEach(function (b) { getData(b.dataset.demo, function (demo) { if (demo) makeSim(b, demo, d); }); });
        });
        $$('[data-goto]', sec).forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault(); var g = a.dataset.goto.split(':'), r = $('.lab-right', sec);
            if (r.__act) r.__act(g[0]); var sim = $('.lab-pane[data-pane="' + g[0] + '"] .bl-sim', sec);
            if (sim && sim.__show) sim.__show(g[1]);
            r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
        });
      });
    });
    $$('.bl-yt', sec).forEach(function (c) {
      var b = $('.bl-yt-play', c); if (!b) return;
      if (!/^https?:$/.test(location.protocol)) { b.hidden = true; return; }
      b.addEventListener('click', function () {
        var f = el('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + c.dataset.yt + '?autoplay=1', title: c.dataset.title || 'YouTube', allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: '', loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin' });
        var w = el('div', { class: 'bl-yt-frame' }); w.appendChild(f); b.replaceWith(w);
      });
    });
  }
  function setOpen(sec, scroll) {
    accs.forEach(function (a) {
      var on = a === sec, btn = $('.lab-acc-btn', a);
      a.classList.toggle('open', on); if (btn) btn.setAttribute('aria-expanded', on);
      var body = $('.lab-acc-body', a); if (body) body.hidden = !on;
      if (!on) $$('video', a).forEach(function (v) { v.pause(); });
    });
    $$('.lab-toc a').forEach(function (a) { a.classList.toggle('on', sec && a.getAttribute('href') === '#' + sec.id); });
    Player.stop(); hidePop();
    if (sec) { initSection(sec); if (scroll) sec.scrollIntoView({ block: 'start' }); }
  }
  var ALIAS = { 'lab-premier': 'lab-01', 'lab-dilla': 'lab-02', 'lab-peterock': 'lab-03', 'lab-memphis': 'lab-04', 'lab-4536': 'lab-05', 'lab-6251': 'lab-06', 'g-cards': 'lab-g', 'chord-basics': 'lab-chords' };
  function route(hash, scroll) {
    var id = decodeURIComponent((hash || '').replace(/^#/, ''));
    if (!id) return false;
    var target = doc.getElementById(ALIAS[id] || id);
    if (!target) return false;
    var sec = target.classList.contains('lab-acc') ? target : target.closest('.lab-acc');
    if (!sec) return false;
    setOpen(sec, false);
    var pane = target.closest('.lab-pane'), right = pane && pane.closest('.lab-right');
    if (pane && right) { initTabs(right); right.__act(pane.dataset.pane); }
    if (scroll !== false) (target === sec || ALIAS[id] ? sec : target).scrollIntoView({ block: 'start' });
    return true;
  }
  accs.forEach(function (a) {
    var btn = $('.lab-acc-btn', a);
    if (btn) btn.addEventListener('click', function () {
      var open = a.classList.contains('open');
      setOpen(open ? null : a, false);
      if (!open) { history.replaceState(null, '', '#' + a.id); a.scrollIntoView({ block: 'start' }); }
    });
  });
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-goto')) return;
    var h = a.getAttribute('href');
    if (h.length > 1 && route(h)) { e.preventDefault(); history.pushState(null, '', h); }
  });
  window.addEventListener('hashchange', function () { route(location.hash); });
  if (!route(location.hash)) setOpen($('#lab-01') || accs[0], false);
  else if (location.hash) setTimeout(function () { route(location.hash); }, 60);
})();
