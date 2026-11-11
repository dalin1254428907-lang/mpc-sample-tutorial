/* ============================================================
   v5 本地修订（Alder，2026-11-04）—— 节奏网格实验室（03c）
   批注 #1：竖屏视频不再是主播放方式。每节顶部加「网页内横版播放器」：
            音轨大格子横排、播放线扫过、音量默认拉满可调；原视频收进
            下方折叠区备用。声音为代码合成（与原视频同一套数据）。
   批注 #2：参数标签（BPM / 调 / Swing）可点，点开有大白话解释和数值换算。
   批注 #3：「动手步骤」顶部加跟练清单：按这节的真实数据列出每种乐器
            要敲的步位，照顺序在 MPC 上录，勾完为止，进度存在本机。
   数据来自 assets/data/lab-XX.json（与原视频、网格同一份数据）。
   ============================================================ */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ---------------- 音频合成（与 beat-lab.js 同一套做法） ---------------- */
  var AC = null, master = null, noiseBuf = null;
  function ac() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      var comp = AC.createDynamicsCompressor();
      master = AC.createGain(); master.gain.value = 0.95;
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
  function drum(inst, t, v) {
    if (!ac()) return;
    v = Math.max(0.05, Math.min(1, v));
    var g = AC.createGain(); g.connect(master);
    if (inst === 'kick') {
      var o = AC.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
      o.connect(g); env(g, t, 1.0 * v, 0.38); o.start(t); o.stop(t + 0.42);
    } else if (inst === 'snare' || inst === 'clap') {
      var n = noiseSrc(t, 0.3), f = AC.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = inst === 'clap' ? 1300 : 1900; f.Q.value = 0.8;
      n.connect(f); f.connect(g); env(g, t, 0.7 * v, 0.2);
      var b = AC.createOscillator(), bg = AC.createGain(); b.type = 'triangle';
      b.frequency.setValueAtTime(200, t); b.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      b.connect(bg); bg.connect(master); env(bg, t, 0.45 * v, 0.1); b.start(t); b.stop(t + 0.15);
    } else if (inst === 'hat' || inst === 'shaker' || inst === 'ride') {
      var h = noiseSrc(t, 0.5), hf = AC.createBiquadFilter();
      hf.type = inst === 'shaker' ? 'bandpass' : 'highpass';
      hf.frequency.value = inst === 'shaker' ? 6000 : 7500;
      h.connect(hf); hf.connect(g); env(g, t, 0.35 * v, inst === 'ride' ? 0.4 : 0.05);
    } else if (inst === 'tom') {
      var to = AC.createOscillator(); to.frequency.setValueAtTime(160, t);
      to.frequency.exponentialRampToValueAtTime(90, t + 0.2);
      to.connect(g); env(g, t, 0.7 * v, 0.3); to.start(t); to.stop(t + 0.35);
    } else {
      [540, 800].forEach(function (fq) {
        var co = AC.createOscillator(); co.type = 'square'; co.frequency.value = fq;
        co.connect(g); co.start(t); co.stop(t + 0.3);
      });
      env(g, t, 0.12 * v, 0.25);
    }
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tone(midi, t, dur, v, kind) {
    if (!ac()) return;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = kind === 'bass' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(mtof(midi), t);
    var lvl = (kind === 'bass' ? 0.5 : 0.16) * (v || 0.9);
    o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(lvl, 0.0002), t + 0.01);
    g.gain.setValueAtTime(Math.max(lvl, 0.0002), t + Math.max(0.02, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.start(t); o.stop(t + dur + 0.1);
  }

  var currentPlayer = null; // 同时只放一个

  /* ---------------- 参数标签解释（批注 #2） ---------------- */
  $$('.lab-acc').forEach(function (sec) {
    var params = $('.lab-params', sec);
    if (!params) return;
    var chips = $$('.lp', params);
    if (!chips.length) return;
    var bpm = 90, swing = 50, keyName = '';
    chips.forEach(function (c) {
      var lab = ($('small', c) || {}).textContent || '';
      var val = ($('b', c) || {}).textContent || '';
      var num = parseFloat(val);
      if (lab.indexOf('速度') !== -1 && !isNaN(num)) bpm = num;
      if (lab.indexOf('摇摆') !== -1 && !isNaN(num)) swing = num;
      if (lab.indexOf('调') !== -1) keyName = val;
    });
    var box = el('div', 'v5-lpbox');
    box.setAttribute('aria-live', 'polite');
    var row = $('.lp-row', params);
    if (row) row.parentNode.insertBefore(box, row.nextSibling);
    function explain(lab, val) {
      var stepMs = 60000 / bpm / 4;
      if (lab.indexOf('速度') !== -1) {
        return '<b>BPM（速度）</b>：每分钟打多少拍。' + bpm + ' BPM 时，一拍约 ' + Math.round(60000 / bpm) +
          ' 毫秒，一格 16 分音符约 ' + Math.round(stepMs) + ' 毫秒。数字越大越快。' +
          '在 MPC 上设：按 <kbd>SEQ</kbd> → 按住 <kbd>B1</kbd> → 转 <kbd>ENCODER</kbd>（手册 p.39）。';
      }
      if (lab.indexOf('摇摆') !== -1) {
        var ms = (swing / 100 - 0.5) * 2 * stepMs;
        return '<b>Swing（摇摆）</b>：把每拍里第 2、4 个 16 分音符往后推一点，节奏就不“直”、开始晃。' +
          '50% = 一点不推；这一节是 ' + swing + '%，约推迟 ' + Math.abs(Math.round(ms)) + ' 毫秒（按 ' + bpm + ' BPM 换算）。' +
          '在 MPC 上设：只改播放手感在 SEQ 页转 <kbd>K3</kbd>（RT Swing）；要把音符真正挪位，<kbd>SHIFT</kbd>+<kbd>PAD 14</kbd> 进 TIME CORRECT 设 Swing 后按 <kbd>B3</kbd>（手册 p.39 / p.59）。';
      }
      return '<b>调（' + keyName + '）</b>：这一节的贝斯、和弦和旋律围绕的主音与音阶。' +
        '小调听感偏暗、偏沉，大调偏亮。照着本节的垫位弹，落的都是调内音，不会跑调。';
    }
    chips.forEach(function (c) {
      c.classList.add('v5-lp');
      c.title = '点我看解释';
      c.addEventListener('click', function () {
        var lab = ($('small', c) || {}).textContent || '';
        var val = ($('b', c) || {}).textContent || '';
        box.innerHTML = explain(lab, val);
        box.classList.add('show');
      });
    });
  });

  /* ---------------- 每节：播放器 + 跟练清单 ---------------- */
  $$('.lab-acc[data-lab]').forEach(function (sec) {
    var id = sec.getAttribute('data-lab');
    fetch('../../assets/data/lab-' + id + '.json').then(function (r) { return r.json(); })
      .then(function (d) { if (d) { buildPlayer(sec, d); buildDoSteps(sec, d); } })
      .catch(function () {
        var body = $('.lab-acc-body', sec);
        if (body) {
          var n = el('p', 'note', '（网页播放器要通过「双击打开手册.command」启动的本地页面打开才能加载；直接双击文件时，请看下方原视频和「网格」标签。）');
          body.insertBefore(n, body.firstChild);
        }
      });
    // 原竖屏视频收进折叠区（批注 #1）
    var left = $('.lab-left', sec), cols = $('.lab-cols', sec);
    if (cols) cols.classList.add('v5-stack');
    if (left) {
      var det = el('details', 'v5-oldvideo', '<summary>原来的竖屏视频（备用，点开看）</summary>');
      while (left.firstChild) det.appendChild(left.firstChild);
      left.appendChild(det);
    }
  });

  function evClass(track) {
    if (track.kind === 'chord') return 'chord';
    var i = (track.inst || '').toLowerCase();
    if (i.indexOf('kick') !== -1) return 'kick';
    if (i.indexOf('snare') !== -1 || i.indexOf('clap') !== -1) return 'snare';
    if (i.indexOf('hat') !== -1 || i.indexOf('shaker') !== -1 || i.indexOf('ride') !== -1) return 'hat';
    if (i.indexOf('bass') !== -1) return 'bass';
    if (i.indexOf('vocal') !== -1) return 'vocal';
    return '';
  }

  function buildPlayer(sec, d) {
    var body = $('.lab-acc-body', sec);
    if (!body) return;
    var B = d.bars, total = B * 16, stepDur = 60 / d.bpm / 4;
    var tracks = [];
    (d.drums || []).forEach(function (t) { tracks.push({ label: t.cn, sub: t.name, kind: 'drum', inst: t.inst, bars: t.bars }); });
    (d.pitched || []).forEach(function (t) {
      if (t.kind === 'chord') tracks.push({ label: t.cn, sub: t.name, kind: 'chord', inst: t.inst, rhythm: t.rhythm, chords: t.chords });
      else tracks.push({ label: t.cn, sub: t.name, kind: 'mono', inst: t.inst, bars: t.bars });
    });
    // 预先把事件按整数步归组：{stepIndex: [{fn, frac, offMs}]}
    var byStep = {};
    function addEv(absStep, offMs, fn) {
      var k = Math.floor(absStep);
      if (!byStep[k]) byStep[k] = [];
      byStep[k].push({ frac: absStep - k, offMs: offMs || 0, fn: fn });
    }
    tracks.forEach(function (tr) {
      if (tr.kind === 'drum') {
        tr.bars.forEach(function (barEvs, b) {
          (barEvs || []).forEach(function (ev) {
            addEv(b * 16 + ev[0], ev[3] || 0, (function (inst, v) {
              return function (t) { drum(inst, t, v); };
            })(tr.inst, ev[2]));
          });
        });
      } else if (tr.kind === 'mono') {
        tr.bars.forEach(function (barEvs, b) {
          (barEvs || []).forEach(function (ev) {
            addEv(b * 16 + ev.s, 0, (function (m, len, v, inst) {
              return function (t) { tone(m, t, len * stepDur, v, inst); };
            })(ev.m, ev.l || 1, ev.v, tr.inst));
          });
        });
      } else {
        tr.chords.forEach(function (ch) {
          var b = (ch.bar || 1) - 1;
          (tr.rhythm || []).forEach(function (r) {
            addEv(b * 16 + r[0], 0, (function (notes, len, v) {
              return function (t) { notes.forEach(function (n) { tone(n.midi, t, len * stepDur, v * 0.8, 'keys'); }); };
            })(ch.notes, r[1], r[2]));
          });
        });
      }
    });

    var box = el('div', 'v5-player');
    var head = el('div', 'v5-p-head');
    var playBtn = el('button', 'v5-play', '▶'); playBtn.type = 'button';
    playBtn.setAttribute('aria-label', '播放 / 停止');
    var title = el('span', 'v5-p-title', '网页播放器（横版）<small>' + d.bpm + ' BPM · Swing ' + d.swing + '% · ' + d.key + ' · ' + B + ' 小节循环</small>');
    var volLab = el('span', 'v5-note', '音量');
    var vol = document.createElement('input');
    vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.value = '95';
    vol.setAttribute('aria-label', '音量');
    head.appendChild(playBtn); head.appendChild(title); head.appendChild(volLab); head.appendChild(vol);
    box.appendChild(head);

    // 音轨格子
    var cellRows = [];
    tracks.forEach(function (tr) {
      var rowEl = el('div', 'v5-track');
      rowEl.appendChild(el('div', 'v5-tname', tr.label + '<small>' + tr.sub + '</small>'));
      var cells = el('div', 'v5-cells');
      cells.style.gridTemplateColumns = 'repeat(' + total + ', 1fr)';
      var cellEls = [];
      for (var i = 0; i < total; i++) {
        var c = el('div', 'v5-cell' + (i % 4 === 0 ? ' beat' : ''));
        cells.appendChild(c); cellEls.push(c);
      }
      function placeEv(absStep, lenSteps, titleText) {
        var k = Math.floor(absStep);
        if (k < 0 || k >= total) return;
        var ev = el('div', 'v5-ev ' + evClass(tr));
        ev.style.left = ((absStep - k) * 100) + '%';
        ev.style.width = 'calc(' + (lenSteps * 100) + '% - 2px)';
        if (titleText) ev.title = titleText;
        cellEls[k].appendChild(ev);
      }
      if (tr.kind === 'drum') {
        tr.bars.forEach(function (barEvs, b) {
          (barEvs || []).forEach(function (ev) {
            var offPx = (ev[3] || 0) / 1000 / stepDur;
            placeEv(b * 16 + ev[0] + offPx, Math.max(0.5, Math.min(ev[1] || 1, 2)), tr.label + (ev[3] ? '（偏移 ' + ev[3] + 'ms）' : ''));
          });
        });
      } else if (tr.kind === 'mono') {
        tr.bars.forEach(function (barEvs, b) {
          (barEvs || []).forEach(function (ev) { placeEv(b * 16 + ev.s, ev.l || 1, ev.name || ''); });
        });
      } else {
        tr.chords.forEach(function (ch) {
          var b = (ch.bar || 1) - 1;
          (tr.rhythm || []).forEach(function (r) { placeEv(b * 16 + r[0], r[1], ch.name + '：' + ch.tones); });
        });
      }
      rowEl.appendChild(cells);
      box.appendChild(rowEl);
      cellRows.push(cellEls);
    });

    // 和弦进行 + 键盘（有和弦轨时）
    var chordTrack = null;
    tracks.forEach(function (t) { if (t.kind === 'chord' && !chordTrack) chordTrack = t; });
    var chordNameEl = null, pianoKeys = null;
    if (chordTrack) {
      var prog = chordTrack.chords.map(function (c) { return '小节' + c.bar + ' ' + c.name; }).join(' → ');
      box.appendChild(el('div', 'v5-note', '和弦进行：' + prog));
      chordNameEl = el('div', 'v5-chordname', '');
      box.appendChild(chordNameEl);
      var piano = el('div', 'v5-piano');
      pianoKeys = {};
      var whites = [];
      for (var m = 48; m <= 71; m++) { if ([0, 2, 4, 5, 7, 9, 11].indexOf(m % 12) !== -1) whites.push(m); }
      whites.forEach(function (m, wi) {
        var w = el('div', 'v5-wkey'); w.dataset.pc = m % 12;
        piano.appendChild(w); pianoKeys[m % 12] = pianoKeys[m % 12] || []; pianoKeys[m % 12].push(w);
        var nextPc = (m + 1) % 12;
        if ([1, 3, 6, 8, 10].indexOf(nextPc) !== -1 && m + 1 <= 71) {
          var bk = el('div', 'v5-bkey'); bk.dataset.pc = nextPc;
          bk.style.left = ((wi + 1) / whites.length * 100) + '%';
          bk.style.width = (100 / whites.length * 0.62) + '%';
          piano.appendChild(bk); pianoKeys[nextPc] = pianoKeys[nextPc] || []; pianoKeys[nextPc].push(bk);
        }
      });
      box.appendChild(piano);
    }

    var params = $('.lab-params', sec);
    if (params && params.parentNode) params.parentNode.insertBefore(box, params.nextSibling);
    else body.insertBefore(box, body.firstChild);

    /* 播放调度 */
    var state = { playing: false, timer: null, k: 0, nextT: 0 };
    function swingDelay(stepIdx) {
      return (stepIdx % 2 === 1) ? (d.swing / 100 - 0.5) * 2 * stepDur : 0;
    }
    function highlight(absStep) {
      var bar = Math.floor(absStep / 16);
      cellRows.forEach(function (rowEls) {
        rowEls.forEach(function (c, i) { c.classList.toggle('now', i === absStep); });
      });
      if (chordTrack && chordNameEl) {
        var ch = chordTrack.chords[bar] || chordTrack.chords[0];
        if (ch) {
          chordNameEl.textContent = '第 ' + (bar + 1) + ' 小节：' + ch.name + '（' + ch.tones + '）';
          Object.keys(pianoKeys).forEach(function (pc) {
            pianoKeys[pc].forEach(function (kEl) { kEl.classList.remove('lit'); });
          });
          ch.notes.forEach(function (n) {
            (pianoKeys[n.midi % 12] || []).forEach(function (kEl) { kEl.classList.add('lit'); });
          });
        }
      }
    }
    function stop() {
      state.playing = false;
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      playBtn.textContent = '▶';
      cellRows.forEach(function (rowEls) { rowEls.forEach(function (c) { c.classList.remove('now'); }); });
      if (currentPlayer === state) currentPlayer = null;
    }
    state.stop = stop;
    function tick() {
      while (state.nextT < AC.currentTime + 0.15) {
        var absStep = state.k % total;
        var t = state.nextT + swingDelay(absStep);
        (byStep[absStep] || []).forEach(function (e) {
          e.fn(t + e.frac * stepDur + (e.offMs || 0) / 1000);
        });
        (function (s, when) {
          setTimeout(function () { if (state.playing) highlight(s); },
            Math.max(0, (when - AC.currentTime) * 1000));
        })(absStep, t);
        state.nextT += stepDur;
        state.k++;
      }
    }
    playBtn.addEventListener('click', function () {
      if (state.playing) { stop(); return; }
      if (!ac()) { alert('这个浏览器不支持网页音频，换 Chrome 打开试试。'); return; }
      if (currentPlayer && currentPlayer !== state) currentPlayer.stop();
      if (master) master.gain.value = vol.value / 100;
      state.playing = true; currentPlayer = state;
      state.k = 0; state.nextT = AC.currentTime + 0.08;
      playBtn.textContent = '⏸';
      tick(); state.timer = setInterval(tick, 30);
    });
    vol.addEventListener('input', function () { if (master) master.gain.value = vol.value / 100; });
  }

  /* ---------------- 跟练清单（批注 #3） ---------------- */
  function fmtSteps(list) { return list.join('、'); }
  function buildDoSteps(sec, d) {
    var pane = $('.lab-pane[data-pane="steps"]', sec);
    if (!pane) return;
    var items = [];
    items.push('新建工程、装鼓组：照本页下面「准备」和通用卡 G1 做，鼓组名以你机器屏幕为准。');
    items.push('设速度和摇摆：<kbd>SEQ</kbd> 页设 <b>' + d.bpm + ' BPM</b>，<kbd>K3</kbd> RT Swing 设 <b>' + d.swing + '%</b>（只改手感的设法；参数卡里有另一种挪音符的设法）。');
    items.push('设长度 <b>' + d.bars + ' 小节</b>、量化 Q = 1/16、节拍器预备拍打开（照「准备」一节）。然后按下面的顺序，一种乐器录一遍：每遍按 <kbd>SEQ RECORD</kbd> 开始录，录完按 <kbd>STOP</kbd>，回放听一遍再录下一种。');
    (d.drums || []).forEach(function (t) {
      var perBar = t.bars.map(function (barEvs, b) {
        if (!barEvs || !barEvs.length) return '';
        var ss = barEvs.map(function (ev) {
          var s = '步' + (Math.floor(ev[0]) + 1);
          if (ev[3]) s += '（' + (ev[3] > 0 ? '晚' : '早') + Math.abs(ev[3]) + 'ms）';
          return s;
        });
        return '小节' + (b + 1) + '：' + fmtSteps(ss);
      }).filter(Boolean);
      items.push('录 <b>' + t.cn + '（' + t.name + '）</b>——<span class="v5-do-pos">' + perBar.join('；') + '</span>' +
        (t.offsets ? '。带毫秒偏移的音：量化先关，或录后用 STEP EDIT 微调（偏移量照括号里写）。' : ''));
    });
    (d.pitched || []).forEach(function (t) {
      if (t.kind === 'chord') {
        var rs = (t.rhythm || []).map(function (r) { return '步' + (Math.floor(r[0]) + 1); }).join('、');
        var chs = t.chords.map(function (c) { return '小节' + c.bar + ' ' + c.name; }).join(' → ');
        items.push('录 <b>' + t.cn + '（' + t.name + '）</b>——每小节在 <span class="v5-do-pos">' + rs + '</span> 敲和弦：<span class="v5-do-pos">' + chs + '</span>。弹法：把和弦音分到几个垫上一起敲，或重采样成一个和弦一个垫（见「音名与垫位」）。');
      } else {
        var perBar2 = t.bars.map(function (barEvs, b) {
          if (!barEvs || !barEvs.length) return '';
          var ss = barEvs.map(function (ev) { return '步' + (Math.floor(ev.s) + 1) + ' ' + (ev.name || ''); });
          return '小节' + (b + 1) + '：' + fmtSteps(ss);
        }).filter(Boolean);
        items.push('录 <b>' + t.cn + '（' + t.name + '）</b>——用 16 LEVELS 或逐个垫弹：<span class="v5-do-pos">' + perBar2.join('；') + '</span>');
      }
    });
    items.push('全部录完回放一遍：敲错的用 <kbd>ERASE</kbd> 擦掉那一下重录，或者进 STEP EDIT 微调位置和力度。');
    items.push('保存：<kbd>SHIFT</kbd> + <kbd>PAD 16</kbd> 进 PROJECT 菜单存工程，下次开机还能接着练。');

    var key = 'v5-do-lab-' + d.id;
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { saved = []; }
    var box = el('div', 'v5-do');
    box.innerHTML = '<h4>跟练清单：在 MPC 上照这个顺序敲（' + d.title + '）</h4>';
    var ol = el('ol');
    var boxes = [];
    items.forEach(function (html, i) {
      var li = el('li');
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = saved.indexOf(i) !== -1;
      var span = el('span', cb.checked ? 'done' : '', html);
      cb.addEventListener('change', function () {
        span.classList.toggle('done', cb.checked);
        var arr = boxes.map(function (b, j) { return b.checked ? j : -1; }).filter(function (j) { return j >= 0; });
        try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
        prog.textContent = '已完成 ' + arr.length + ' / ' + items.length + ' 步（进度存在这台电脑的浏览器里）';
      });
      boxes.push(cb);
      lab.appendChild(cb); lab.appendChild(span);
      li.appendChild(lab); ol.appendChild(li);
    });
    var doneCount = boxes.filter(function (b) { return b.checked; }).length;
    var prog = el('div', 'v5-prog', '已完成 ' + doneCount + ' / ' + items.length + ' 步（进度存在这台电脑的浏览器里）');
    box.appendChild(ol); box.appendChild(prog);
    pane.insertBefore(box, pane.firstChild);
  }
})();
