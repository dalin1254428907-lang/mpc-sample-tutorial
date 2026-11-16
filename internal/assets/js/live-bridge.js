/* ============================================================
   第一章 · 实时机器固定面板（live-bridge.js）
   数据来自机器上的状态桥 http://192.168.155.1:8901 ：
   - GET /state ：当前页面、选中采样、状态栏（500 ms 轮询）
   - GET /frame?wait=6000&since=<seq> ：屏幕差分长轮询
     包格式：15 B 头（seq u32 + ts i64 + keyframe u8 +
     rect_count u16，小端）+ 每矩形（x/y/w/h u16 +
     w*h*4 B 原始 BGRX 像素），JS 侧换成 RGBA 后增量绘制。
   连不上时面板保持静态截图，不报错、不弹窗。
   每次成功拿到 /state 后会把快照挂到 window.MPC_STATE
   （连通标志 window.MPC_STATE_OK），供上手教程的步骤核对读取。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('live-canvas');
  if (!canvas) return; // 本页没有实时区块就什么都不做

  var BASE = 'http://192.168.155.1:8901';
  var STATE_URL = BASE + '/state';
  var FRAME_URL = BASE + '/frame';

  var $ = function (id) { return document.getElementById(id); };
  var dot = $('live-dot'), connText = $('live-conn-text');
  var fallbackImg = $('live-fallback'), note = $('live-note');
  var pageEl = $('live-page'), selEl = $('live-sel'), statusEl = $('live-status');

  var stateOk = false;       // /state 最近一次是否成功
  var frameLive = false;     // 是否已经收到过画面包
  var everConnected = false; // 是否曾经连上过（区分“从未连接”和“中途断线”）

  function renderConn() {
    if (frameLive) {
      dot.className = 'live-dot ok';
      connText.textContent = '已连接 · 实时画面同步中';
    } else if (stateOk) {
      dot.className = 'live-dot ok';
      connText.textContent = '已连接（画面同步中…）';
    } else if (everConnected) {
      dot.className = 'live-dot bad';
      connText.textContent = '连接中断，自动重连中…';
    } else {
      dot.className = 'live-dot bad';
      connText.textContent = '未连接 · 现在显示的是静态截图';
    }
  }

  // 给 fetch 加一个客户端超时：地址不可达时不让请求无限挂起。
  // 只影响本页的重试节奏，不改变与状态桥的协议。
  function fetchWithTimeout(url, ms) {
    if (typeof AbortController === 'undefined') {
      return fetch(url, { cache: 'no-store' });
    }
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, ms);
    return fetch(url, { cache: 'no-store', signal: ctl.signal })
      .then(function (r) { clearTimeout(timer); return r; },
            function (e) { clearTimeout(timer); throw e; });
  }

  // ---------------------------------------------------------- /state
  function renderState(s) {
    var pageLabel;
    if (s.sample_page) {
      pageLabel = s.chop_mode ? 'Sample 页 · Chop 切片' : 'Sample 页';
    } else if (s.page === 'other') {
      pageLabel = '其他页面';
    } else {
      pageLabel = '等待数据…';
    }
    pageEl.textContent = pageLabel;

    var sel = s.selection;
    if (sel) {
      var secs = sel.rate > 0 ? (sel.frames / sel.rate) : 0;
      var ch = sel.channels === 1 ? '单声道' : (sel.channels === 2 ? '立体声' : String(sel.channels) + ' 声道');
      selEl.textContent = secs.toFixed(2) + ' 秒 · ' + ch + ' · ' + sel.rate + ' Hz · ' + sel.frames + ' 帧';
    } else {
      selEl.textContent = '—（这一页没有选中采样）';
    }

    statusEl.textContent = s.status ? s.status : '（空）';
  }

  function pollState() {
    fetchWithTimeout(STATE_URL, 4000)
      .then(function (r) {
        if (!r.ok) { throw new Error('http ' + r.status); }
        return r.json();
      })
      .then(function (s) {
        stateOk = true; everConnected = true;
        window.MPC_STATE = s;         // 给上手教程的步骤核对用
        window.MPC_STATE_OK = true;
        renderState(s); renderConn();
      })
      .catch(function () {
        stateOk = false;
        window.MPC_STATE_OK = false;
        renderConn();
      });
  }

  pollState();
  setInterval(pollState, 500);

  // ---------------------------------------------------------- /frame
  // 与状态桥自带查看页相同的绘制逻辑：逐矩形把 BGRX 换成 RGBA，
  // 用 putImageData 增量贴到 canvas 上。
  var ctx = canvas.getContext('2d');
  var curSeq = null; // 已画到 canvas 上的最新 seq

  function applyPacket(buf) {
    var view = new DataView(buf);
    var seq = view.getUint32(0, true);
    var rectCount = view.getUint16(13, true);
    var off = 15;
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < rectCount; i++) {
      if (off + 8 > buf.byteLength) { break; }
      var x = view.getUint16(off, true);
      var y = view.getUint16(off + 2, true);
      var w = view.getUint16(off + 4, true);
      var h = view.getUint16(off + 6, true);
      off += 8;
      var img = ctx.createImageData(w, h);
      var dst = img.data;
      var pixels = w * h;
      for (var p = 0; p < pixels; p++) {
        var s = off + p * 4;
        var d = p * 4;
        dst[d]     = bytes[s + 2]; // R <- 第三字节（BGRX）
        dst[d + 1] = bytes[s + 1]; // G
        dst[d + 2] = bytes[s];     // B <- 第一字节
        dst[d + 3] = 255;          // X -> 不透明
      }
      off += pixels * 4;
      ctx.putImageData(img, x, y);
    }
    curSeq = seq;
    if (!frameLive) {
      frameLive = true; everConnected = true;
      fallbackImg.style.display = 'none';
      canvas.hidden = false;
      note.textContent = '已连接：这是你的机器现在的画面。在机器上切页、换采样，画面和状态都会跟着变。';
      renderConn();
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function frameLoop() {
    while (true) {
      try {
        var url = FRAME_URL + '?wait=6000' +
          (curSeq === null ? '' : '&since=' + curSeq);
        var r = await fetchWithTimeout(url, 9000);
        if (r.status === 204) { continue; } // 没有新画面，继续等
        if (!r.ok) { throw new Error('http ' + r.status); }
        var buf = await r.arrayBuffer();
        if (buf.byteLength >= 15) { applyPacket(buf); }
      } catch (e) {
        // 机器没开、线拔了或桥在重启：停 1 秒后自动重连。
        if (frameLive) { frameLive = false; renderConn(); }
        await sleep(1000);
      }
    }
  }

  frameLoop();
  renderConn();
})();

/* ============================================================
   第一章 · 实时机器动态讲解层（live-guide）
   面板 = 小屏幕 + 它专属的讲解区。讲解跟着走：
   - 连上机器：机器在哪个页面，讲解就切到哪个页面
     （/state 只能分出 Sample / Sample·Chop / 其他三档，
      这是桥给到的最细粒度，不假装能分出其他页具体是哪页）；
     在 Sample 页时，选中采样的时长/格式跟着变（桥读不到采样名，
      讲解里只指向「名字在屏幕上方那一行」，不编造名字）。
   - 没连机器：讲解按正文正在读到的页面小节切换，面板静态图
     同步换成那一页的实拍图。
   讲解内容不另存一份：直接从正文第 3 部分对应小节抽取
   （标题里的进页方式 + 逐条短讲解），正文改了讲解自动跟着改。
   讲到的键会在键位示意（下方 SVG）上亮起，给读者一个指向。
   ============================================================ */
(function () {
  'use strict';

  var guideEl = document.getElementById('live-guide');
  if (!guideEl) return; // 本页没有讲解层就什么都不做

  var $ = function (id) { return document.getElementById(id); };
  var titleEl = $('lg-title'), srcEl = $('lg-src'), howEl = $('lg-how');
  var mapEl = $('lg-map'), itemsEl = $('lg-items'), toggleBtn = $('lg-toggle');
  var fallbackImg = $('live-fallback'), canvas = $('live-canvas');

  // ---------------------------------------------------------- 键位示意（简图，非比例，只作指向）
  var MAP_SVG =
  '<svg viewBox="0 0 300 158" role="img" aria-label="机器键位示意：讲到的键会亮起">' +
  '<g class="lgk" id="lgk-VOL"><circle cx="16" cy="15" r="10"/><text x="16" y="15" class="sm">VOL</text></g>' +
  '<g class="lgk" id="lgk-B1"><rect x="94" y="2" width="31" height="14" rx="3"/><text x="109.5" y="9">B1</text></g>' +
  '<g class="lgk" id="lgk-B2"><rect x="129" y="2" width="31" height="14" rx="3"/><text x="144.5" y="9">B2</text></g>' +
  '<g class="lgk" id="lgk-B3"><rect x="164" y="2" width="31" height="14" rx="3"/><text x="179.5" y="9">B3</text></g>' +
  '<g class="lgk" id="lgk-SCREEN"><rect x="92" y="20" width="106" height="26" rx="3"/><text x="145" y="33">屏幕</text></g>' +
  '<g class="lgk" id="lgk-METERS"><rect x="222" y="3" width="52" height="14" rx="3"/><text x="248" y="10" class="sm">METERS</text></g>' +
  '<g class="lgk" id="lgk-SAMPLE"><rect x="2" y="50" width="30" height="14" rx="3"/><text x="17" y="57" class="sm">SAMPLE</text></g>' +
  '<g class="lgk" id="lgk-SEQ"><rect x="36" y="50" width="32" height="14" rx="3"/><text x="52" y="57">SEQ</text></g>' +
  '<g class="lgk" id="lgk-PADFX"><rect x="2" y="68" width="30" height="14" rx="3"/><text x="17" y="75" class="sm">PAD FX</text></g>' +
  '<g class="lgk" id="lgk-KNOBFX"><rect x="36" y="68" width="32" height="14" rx="3"/><text x="52" y="75" class="xs">KNOB FX</text></g>' +
  '<g class="lgk" id="lgk-SHIFT"><rect x="2" y="86" width="30" height="14" rx="3"/><text x="17" y="93" class="sm">SHIFT</text></g>' +
  '<g class="lgk" id="lgk-PADBANK"><rect x="36" y="86" width="32" height="14" rx="3"/><text x="52" y="93" class="xs">PAD BANK</text></g>' +
  '<g class="lgk" id="lgk-FADER"><rect x="2" y="104" width="30" height="14" rx="3"/><text x="17" y="111" class="sm">FADER</text></g>' +
  '<g class="lgk" id="lgk-ERASE"><rect x="36" y="104" width="32" height="14" rx="3"/><text x="52" y="111" class="sm">ERASE</text></g>' +
  '<g class="lgk" id="lgk-NOTEREPEAT"><rect x="2" y="122" width="66" height="14" rx="3"/><text x="35" y="129" class="sm">NOTE REPEAT</text></g>' +
  '<g class="lgk" id="lgk-K1"><circle cx="108" cy="62" r="10"/><text x="108" y="62">K1</text></g>' +
  '<g class="lgk" id="lgk-K2"><circle cx="145" cy="62" r="10"/><text x="145" y="62">K2</text></g>' +
  '<g class="lgk" id="lgk-K3"><circle cx="182" cy="62" r="10"/><text x="182" y="62">K3</text></g>' +
  '<g class="lgk" id="lgk-PADS"><rect x="92" y="80" width="106" height="72" rx="3"/>' +
  '<path d="M118.5 80V152 M145 80V152 M171.5 80V152 M92 98H198 M92 116H198 M92 134H198" stroke="var(--line)" fill="none"/>' +
  '<text x="145" y="89" class="sm">PAD 1–16</text></g>' +
  '<g class="lgk" id="lgk-CHOP"><rect x="206" y="50" width="44" height="14" rx="3"/><text x="228" y="57" class="sm">CHOP</text></g>' +
  '<g class="lgk" id="lgk-MUTE"><rect x="254" y="50" width="44" height="14" rx="3"/><text x="276" y="57" class="sm">MUTE</text></g>' +
  '<g class="lgk" id="lgk-LOOP"><rect x="206" y="68" width="44" height="14" rx="3"/><text x="228" y="75" class="sm">LOOP</text></g>' +
  '<g class="lgk" id="lgk-LV16"><rect x="254" y="68" width="44" height="14" rx="3"/><text x="276" y="75" class="xs">16 LEVELS</text></g>' +
  '<g class="lgk" id="lgk-SAMPLESELECT"><rect x="206" y="86" width="92" height="14" rx="3"/><text x="252" y="93" class="sm">SAMPLE SELECT</text></g>' +
  '<g class="lgk" id="lgk-ENCODER"><rect x="206" y="104" width="44" height="14" rx="3"/><text x="228" y="111" class="xs">ENCODER</text></g>' +
  '<g class="lgk" id="lgk-PM"><rect x="254" y="104" width="44" height="14" rx="3"/><text x="276" y="111">− / +</text></g>' +
  '<g class="lgk" id="lgk-SAMPLERECORD"><rect x="206" y="122" width="92" height="14" rx="3"/><text x="252" y="129" class="sm">SAMPLE RECORD</text></g>' +
  '<g class="lgk" id="lgk-SEQRECORD"><rect x="206" y="140" width="44" height="14" rx="3"/><text x="228" y="147" class="xs">SEQ RECORD</text></g>' +
  '<g class="lgk" id="lgk-PLAY"><rect x="254" y="140" width="20" height="14" rx="3"/><text x="264" y="147" class="xs">PLAY</text></g>' +
  '<g class="lgk" id="lgk-STOP"><rect x="276" y="140" width="22" height="14" rx="3"/><text x="287" y="147" class="xs">STOP</text></g>' +
  '</svg>';
  mapEl.innerHTML = MAP_SVG;

  function normKey(t) {
    var k = (t || '').toUpperCase().replace(/[\s·]/g, '');
    if (/^PAD\d+$/.test(k)) return 'PADS';
    if (k === '−/+' || k === '−' || k === '+' || k === '-/+') return 'PM';
    if (k === '16LEVELS') return 'LV16';
    if (k === 'MAINVOLUME') return 'VOL';
    return k;
  }

  function keysOf(el) {
    var set = {}, out = [];
    function add(k) { if (k && !set[k]) { set[k] = 1; out.push(k); } }
    var kbds = el.querySelectorAll('kbd');
    for (var i = 0; i < kbds.length; i++) add(normKey(kbds[i].textContent));
    var m = el.textContent.match(/(B[123]|K[123])(?![0-9])/g) || [];
    for (var j = 0; j < m.length; j++) add(m[j]);
    return out;
  }

  function setMapKeys(keys) {
    var on = mapEl.querySelectorAll('.lgk.on');
    for (var i = 0; i < on.length; i++) on[i].classList.remove('on');
    (keys || []).forEach(function (k) {
      var g = document.getElementById('lgk-' + k);
      if (g) g.classList.add('on');
    });
  }

  // ---------------------------------------------------------- 从正文第 3 部分抽讲解数据
  var SECTIONS = [
    { id: 'sample',  anchor: 'screen-sample',  name: 'Sample 主屏幕' },
    { id: 'chop',    anchor: 'screen-chop',    name: 'Chop 切片' },
    { id: 'browser', anchor: 'screen-browser', name: '采样浏览器' },
    { id: 'record',  anchor: 'screen-record',  name: '采样录音' },
    { id: 'seq',     anchor: 'screen-seq',     name: 'Seq 序列模式' },
    { id: 'fx',      anchor: 'screen-fx',      name: 'Pad FX / Knob FX' },
    { id: 'song',    anchor: 'screen-song',    name: 'Song 歌曲页' },
    { id: 'project', anchor: 'screen-project', name: 'Project 菜单与起名页' },
    { id: 'others',  anchor: null, h3id: '其他页面', name: '其他页面' }
  ];

  function sectionRange(h3) {
    var nodes = [], el = h3;
    while (el) {
      nodes.push(el);
      el = el.nextElementSibling;
      if (!el) break;
      if (el.tagName === 'H2') break;
      if (el.querySelector && el.querySelector('a[id^="screen-"], a#s1-flows')) break;
    }
    return nodes;
  }

  function cleanLiBody(li) {
    var tmp = li.cloneNode(true);
    var strong = tmp.querySelector('strong');
    if (strong) {
      strong.remove();
      var first = tmp.firstChild;
      if (first && first.nodeType === 3) {
        first.textContent = first.textContent.replace(/^\s*[=：:·]\s*/, '');
      }
    }
    return tmp.innerHTML;
  }

  function extractItems(nodes) {
    var items = [];
    nodes.forEach(function (node) {
      if (node.classList && node.classList.contains('live-terms')) {
        node.querySelectorAll('.live-term').forEach(function (t) {
          var strong = t.querySelector('strong');
          var p = t.querySelector('p');
          items.push({ title: strong ? strong.textContent.trim() : '', body: p ? p.innerHTML : '', keys: keysOf(t) });
        });
      } else if (node.tagName === 'UL') {
        node.querySelectorAll(':scope > li').forEach(function (li) {
          var strong = li.querySelector('strong');
          items.push({ title: strong ? strong.textContent.trim() : '', body: cleanLiBody(li), keys: keysOf(li) });
        });
      }
    });
    if (!items.length) { // 兜底：用小节里有文字的段落（其他页面就是这样）
      nodes.forEach(function (node) {
        if (node.tagName === 'P' && node.textContent.trim().length > 10 && !node.querySelector('img')) {
          items.push({ title: '', body: node.innerHTML, keys: keysOf(node) });
        }
      });
    }
    return items;
  }

  function extractHow(h3s) {
    var parts = [];
    h3s.forEach(function (h) {
      var html = h.innerHTML, i = html.indexOf('（');
      if (i >= 0) parts.push(html.slice(i + 1).replace(/）\s*$/, ''));
    });
    if (!parts.length) return '怎么来到这里：没有单独的键，设置分在几个 <kbd>SHIFT</kbd> 菜单里（见正文）。';
    return '怎么来到这里：' + parts.join('；');
  }

  var GUIDES = {};
  SECTIONS.forEach(function (sec) {
    var h3 = null;
    if (sec.anchor) {
      var a = document.getElementById(sec.anchor);
      var p = a ? a.closest('p') : null;
      h3 = p ? p.nextElementSibling : null;
    } else if (sec.h3id) {
      h3 = document.getElementById(sec.h3id);
    }
    if (!h3 || h3.tagName !== 'H3') return;
    h3.setAttribute('data-guide', sec.id);
    var nodes = sectionRange(h3);
    var h3s = nodes.filter(function (n) { return n.tagName === 'H3'; });
    var img = null;
    for (var i = 0; i < nodes.length; i++) {
      img = nodes[i].querySelector ? nodes[i].querySelector('img') : null;
      if (img) break;
    }
    var how = extractHow(h3s);
    var tmp = document.createElement('div');
    tmp.innerHTML = how;
    GUIDES[sec.id] = {
      id: sec.id, name: sec.name, how: how, entryKeys: keysOf(tmp), h3: h3,
      items: extractItems(nodes),
      img: img ? img.getAttribute('src') : null,
      imgAlt: img ? (img.getAttribute('alt') || '') : ''
    };
  });

  // ---------------------------------------------------------- 渲染
  var curId = '', curSrc = '', lastState = null, lastSelSig = null;

  function selSig(s) {
    if (!s || !s.selection) return 'none';
    return s.selection.frames + '|' + s.selection.channels + '|' + s.selection.rate;
  }

  function selItemHTML(s) {
    if (!s || !s.selection) {
      return { title: '当前选中的采样', body: '这一页现在没读到采样信息（可能刚切页，稍等一下）。', keys: ['SCREEN'] };
    }
    var sel = s.selection;
    var secs = sel.rate > 0 ? (sel.frames / sel.rate).toFixed(2) : '0';
    var ch = sel.channels === 1 ? '单声道' : (sel.channels === 2 ? '立体声' : sel.channels + ' 声道');
    return {
      title: '当前选中的采样（实时）',
      body: '机器现在选中的采样是 ' + secs + ' 秒 · ' + ch + ' · ' + sel.rate + ' Hz。它的名字在屏幕上方那一行（A01 旁边），波形和下排 Start / End / Loop 都跟着它走——在机器上敲另一个垫，这里就会跟着变。',
      keys: ['SCREEN', 'PADS']
    };
  }

  function buildItem(item, extraClass) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lg-item' + (extraClass ? ' ' + extraClass : '');
    var strong = document.createElement('strong');
    strong.textContent = item.title;
    var body = document.createElement('span');
    body.className = 'lg-body-text';
    body.innerHTML = item.body;
    if (item.title) btn.appendChild(strong);
    btn.appendChild(body);
    btn._keys = item.keys || [];
    return btn;
  }

  function renderGuide(id, source) {
    var g = GUIDES[id];
    if (!g) return;
    curId = id; curSrc = source;
    titleEl.textContent = '📖 讲解 · ' + g.name;
    srcEl.textContent = source === 'live' ? '跟着你的机器走' :
      (source === 'other-live' ? '机器在其他页 · 按你读的位置' : '按你正在读的位置');
    howEl.innerHTML = g.how;
    itemsEl.innerHTML = '';
    if (id === 'sample' && lastState && window.MPC_STATE_OK) {
      itemsEl.appendChild(buildItem(selItemHTML(lastState), 'lg-sel'));
      lastSelSig = selSig(lastState);
    }
    g.items.forEach(function (item) { itemsEl.appendChild(buildItem(item)); });
    setMapKeys(g.entryKeys);
    // 静态模式下，面板图换成这一页的实拍图
    if (fallbackImg && g.img && (!canvas || canvas.hidden)) {
      if (fallbackImg.getAttribute('src') !== g.img) {
        fallbackImg.setAttribute('src', g.img);
        fallbackImg.setAttribute('alt', g.imgAlt);
      }
    }
  }

  function setGuide(id, source) {
    if (id === curId && source === curSrc) return;
    renderGuide(id, source);
  }

  function refreshSelItem(flash) {
    if (curId !== 'sample') return;
    var old = itemsEl.querySelector('.lg-sel');
    var item = buildItem(selItemHTML(lastState), 'lg-sel');
    if (old) {
      itemsEl.replaceChild(item, old);
    } else if (lastState && window.MPC_STATE_OK) {
      itemsEl.insertBefore(item, itemsEl.firstChild);
    }
    if (flash) {
      item.classList.add('flash');
      setTimeout(function () { item.classList.remove('flash'); }, 1300);
    }
  }

  // ---------------------------------------------------------- 跟随逻辑
  var readId = ''; // 正文正在读到的页面小节（滚动位置）

  function computeReadId() {
    var line = window.innerHeight * 0.55, best = '';
    SECTIONS.forEach(function (sec) {
      var g = GUIDES[sec.id];
      if (g && g.h3 && g.h3.getBoundingClientRect().top <= line) best = sec.id;
    });
    return best;
  }

  function evaluate() {
    var rid = computeReadId();
    if (rid) readId = rid;
    var ok = !!window.MPC_STATE_OK, s = window.MPC_STATE;
    if (ok && s) {
      lastState = s;
      if (s.page === 'sample') {
        setGuide('sample', 'live');
        var sig = selSig(s);
        if (sig !== lastSelSig) {
          var had = lastSelSig !== null;
          lastSelSig = sig;
          refreshSelItem(had);
        }
      } else if (s.page === 'sample_chop') {
        setGuide('chop', 'live');
      } else if (s.page === 'other') {
        if (readId && readId !== 'sample' && readId !== 'chop') setGuide(readId, 'other-live');
        else setGuide('others', 'live');
      }
    } else {
      lastState = null;
      setGuide(readId || 'sample', 'scroll');
    }
  }

  // 条目互动：讲到哪个键，键位示意上哪个键亮起来
  function activate(btn) {
    var items = itemsEl.querySelectorAll('.lg-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('on');
    if (btn) {
      btn.classList.add('on');
      setMapKeys(btn._keys && btn._keys.length ? btn._keys : (GUIDES[curId] ? GUIDES[curId].entryKeys : []));
    }
  }
  itemsEl.addEventListener('mouseover', function (e) {
    var btn = e.target.closest ? e.target.closest('.lg-item') : null;
    if (btn) activate(btn);
  });
  itemsEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.lg-item') : null;
    if (btn) activate(btn);
  });
  itemsEl.addEventListener('mouseleave', function () {
    activate(null);
    if (GUIDES[curId]) setMapKeys(GUIDES[curId].entryKeys);
  });

  // 中小屏：展开 / 收起讲解
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var open = guideEl.classList.toggle('open');
      toggleBtn.textContent = open ? '收起讲解 ▴' : '展开讲解 ▾';
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  guideEl.hidden = false;
  renderGuide('sample', 'scroll');
  evaluate();
  setInterval(evaluate, 400);
})();
