/* MPC 手册 · 批注模式（review mode）
 * 纯本地：批注保存在本浏览器 localStorage，可导出 .md 文件发给作者。
 * 关闭批注模式时不拦截任何事件、不改动页面，只多一个右下角小按钮。 */
(function () {
  'use strict';
  if (window.__mpcReview) return;
  var doc = document, win = window;
  var NS = 'mpcReview:v1:';            // 固定命名空间（与端口/路径前缀无关）
  var PAGE_PREFIX = NS + 'page:';
  var MODE_KEY = NS + 'mode';
  var FORMAT = 'mpc-manual-review';

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function mk(tag, attrs, html) {
    var e = doc.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function clip(s, n) { s = squash(s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function uid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function cssEsc(s) { return (win.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/([^\w-])/g, '\\$1'); }

  /* ---------- 页面标识：相对手册根目录的路径（file:// 与 http:// 一致） ---------- */
  function pagePath() {
    var p = location.pathname;
    try { p = decodeURIComponent(p); } catch (e) {}
    var m = p.match(/(?:^|\/)(chapters\/[^\/]+\.html?)$/);
    if (m) return m[1];
    m = p.match(/([^\/]+\.html?)$/);
    return m ? m[1] : 'index.html';
  }
  var PAGE = pagePath();
  var PAGE_KEY = PAGE_PREFIX + PAGE;
  function pageTitle() { return squash(doc.title).replace(/\s*·\s*MPC Sample 图文教程$/, ''); }

  /* ---------- 存储（localStorage 不可用时退回内存） ---------- */
  var mem = {};
  var store = {
    get: function (k) { try { return win.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    set: function (k, v) { try { win.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del: function (k) { try { win.localStorage.removeItem(k); } catch (e) {} delete mem[k]; },
    keys: function () {
      var out = [];
      try { for (var i = 0; i < win.localStorage.length; i++) out.push(win.localStorage.key(i)); } catch (e) {}
      for (var k in mem) if (out.indexOf(k) < 0) out.push(k);
      return out;
    }
  };
  function readPage(key) {
    try { var d = JSON.parse(store.get(key) || 'null'); if (d && Array.isArray(d.items)) return d; } catch (e) {}
    return null;
  }
  function loadItems() { var d = readPage(PAGE_KEY); return d ? d.items : []; }
  function saveItems() {
    if (!items.length) store.del(PAGE_KEY);
    else store.set(PAGE_KEY, JSON.stringify({ page: PAGE, title: pageTitle(), items: items }));
  }
  function allPages() {
    var res = {};
    store.keys().forEach(function (k) {
      if (k && k.indexOf(PAGE_PREFIX) === 0) {
        var d = readPage(k);
        if (d && d.items.length) res[k.slice(PAGE_PREFIX.length)] = d;
      }
    });
    return res;
  }
  function totalCount() { var n = 0, a = allPages(); for (var k in a) n += a[k].items.length; return n; }

  var items = loadItems();
  var on = false;

  /* ---------- 定位 ---------- */
  function isUI(n) { return !!(n && n.nodeType === 1 ? n.closest('[data-rm-ui]') : n && n.parentElement && n.parentElement.closest('[data-rm-ui]')); }
  var PICK = 'img, video, iframe, svg, button, input, select, textarea, label, .term, .bl-cell, .bl-pad, .bl-step, .lp, kbd, a, summary, td, th, li, dt, dd, p, h1, h2, h3, h4, h5, h6, figcaption, figure, pre, blockquote, .video-embed, .local-video, .lab-params, .bl-vctl, .bl-gridbox, .bl-padsbox, .card, .note, .step, tr, table, section, article, div';
  function pickTarget(t, x, y) {
    if (!t || t.nodeType !== 1) t = t && t.parentElement;
    if (!t || t === doc.body || t === doc.documentElement) return null;
    // 批注模式下 video/iframe 设为 pointer-events:none，点到的是外层，这里找回点中的媒体元素
    var media = $$('video, iframe', t).filter(function (m) {
      var r = m.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (media.length) return media[0];
    if (t.closest('svg')) { var s = t.closest('svg'); while (s.parentElement && s.parentElement.closest('svg')) s = s.parentElement.closest('svg'); return s; }
    var e = t.closest(PICK);
    if (!e || e === doc.body) return null;
    if (e.closest('main') == null && e.closest('header') == null && e.closest('footer') == null) {
      // 动态插入到 body 的元素（如术语浮窗）也可以批注
    }
    return e;
  }
  // 运行时由脚本生成的 id（如 YouTube API 的 widget2）不稳定，不用来定位
  function stableId(el) { var id = el && el.id; return id && !/^(widget|player|yt|ytp|ember|react|ui-id)-?\d+$/i.test(id) ? id : ''; }
  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== doc.body && el !== doc.documentElement) {
      if (el.getAttribute('data-yt')) { parts.unshift(el.tagName.toLowerCase() + '[data-yt="' + el.getAttribute('data-yt') + '"]'); return parts.join(' > '); }
      if (stableId(el) && doc.querySelectorAll('#' + cssEsc(el.id)).length === 1) { parts.unshift('#' + cssEsc(el.id)); return parts.join(' > '); }
      var tag = el.tagName.toLowerCase(), i = 1, s = el.previousElementSibling;
      while (s) { if (s.tagName === el.tagName) i++; s = s.previousElementSibling; }
      parts.unshift(tag + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  }
  function snippetOf(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'img') return { text: el.getAttribute('alt') || '', media: { src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' } };
    if (tag === 'video') { var so = el.querySelector('source'); return { text: el.getAttribute('aria-label') || '', media: { src: (so && so.getAttribute('src')) || el.getAttribute('src') || '', poster: el.getAttribute('poster') || '' } }; }
    if (tag === 'iframe') return { text: el.getAttribute('title') || '', media: { src: el.getAttribute('src') || '', title: el.getAttribute('title') || '' } };
    var txt = squash(el.innerText || el.textContent || '');
    if (!txt) {
      var im = el.querySelector('img'); if (im) return { text: im.getAttribute('alt') || '', media: { src: im.getAttribute('src') || '', alt: im.getAttribute('alt') || '' } };
      txt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    }
    return { text: txt.slice(0, 120) + (txt.length > 120 ? '…' : ''), media: null };
  }
  var HEADS = 'h1, h2, h3, h4';
  // 最近的章节标题：「1.7 第一次播放 demo」；若其后还有更小的小标题（h3/h4），用 › 连起来
  function sectionOf(el) {
    var hs = $$(HEADS).filter(function (h) { return !isUI(h); }), major = null, minor = null;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i], inside = h === el || h.contains(el);
      if (!inside && !(h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
      if (/^H[12]$/.test(h.tagName)) { major = h; minor = null; } else minor = h;
      if (inside) break;
    }
    return [major, minor].filter(Boolean).map(function (h) { return squash(h.textContent); }).join(' › ');
  }
  var TAGNAME = { p: '段落', li: '列表项', h1: '标题', h2: '标题', h3: '标题', h4: '标题', h5: '标题', h6: '标题', img: '图片', video: '视频', iframe: '在线视频', td: '表格单元格', th: '表头', button: '按钮', a: '链接', table: '表格', figure: '插图', figcaption: '图注', pre: '代码块', blockquote: '引用', kbd: '按键', summary: '折叠标题', svg: '图示', label: '选项', input: '控件', select: '下拉框', tr: '表格行', dt: '术语', dd: '释义' };
  function kindName(a) {
    var c = a.locator.cls || '';
    if (/\bbl-cell\b/.test(c)) return '网格格子';
    if (/\bbl-pad\b/.test(c)) return '打击垫按钮';
    if (/\bterm\b/.test(c)) return '术语热点';
    if (/\b(video-embed|local-video)\b/.test(c)) return '视频区';
    return TAGNAME[a.locator.tag] || '区块';
  }
  function findEl(a) {
    var L = a.locator || {}, e = null;
    try { if (L.id) e = doc.getElementById(L.id); } catch (x) {}
    try { if (!e && L.css) e = doc.querySelector(L.css); } catch (x) {}
    if (e && L.tag && e.tagName.toLowerCase() !== L.tag) e = null;
    if (!e && L.tag && a.snippet) {
      var want = squash(a.snippet).replace(/…$/, '').slice(0, 40);
      e = $$(L.tag).filter(function (x) { return !isUI(x) && squash(x.innerText || x.textContent).indexOf(want) === 0; })[0] || null;
    }
    if (!e && a.media && a.media.src) e = $$('img, video, iframe').filter(function (x) { return (x.getAttribute('src') || (x.querySelector('source') || {}).getAttribute && x.querySelector('source').getAttribute('src')) === a.media.src; })[0] || null;
    return e;
  }

  /* ---------- UI ---------- */
  var ui = {};
  function buildUI() {
    ui.fab = mk('button', { type: 'button', class: 'rm-fab', 'data-rm-ui': '', title: '批注模式：给这一页写修改意见', 'aria-pressed': 'false' }, '✏️ 批注');
    ui.fab.addEventListener('click', function () { toggle(); });
    doc.body.appendChild(ui.fab);
  }
  function buildModeUI() {
    if (ui.bar) return;
    ui.bar = mk('div', { class: 'rm-bar', 'data-rm-ui': '', role: 'toolbar', 'aria-label': '批注模式' },
      '<span class="rm-bar-t">✏️ 批注模式 · 点页面任意位置添加意见</span><span class="rm-bar-n"></span>' +
      '<span class="rm-bar-btns"><button type="button" data-act="list">批注列表</button><button type="button" data-act="export">导出批注</button>' +
      '<button type="button" data-act="import">导入批注</button><button type="button" data-act="clear">清空</button>' +
      '<button type="button" data-act="exit" class="rm-exit">退出</button></span>');
    ui.file = mk('input', { type: 'file', accept: '.md,.json,.txt,text/markdown,application/json,text/plain', hidden: '', 'data-rm-ui': '' });
    ui.bar.appendChild(ui.file);
    ui.bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'list') togglePanel();
      else if (a === 'export') exportAll();
      else if (a === 'import') ui.file.click();
      else if (a === 'clear') clearAll();
      else if (a === 'exit') toggle(false);
    });
    ui.file.addEventListener('change', function () { var f = ui.file.files && ui.file.files[0]; if (f) importFile(f); ui.file.value = ''; });
    ui.hl = mk('div', { class: 'rm-hl', 'data-rm-ui': '', 'aria-hidden': 'true' });
    ui.badges = mk('div', { class: 'rm-badges', 'data-rm-ui': '' });
    ui.panel = mk('aside', { class: 'rm-panel', 'data-rm-ui': '', hidden: '', 'aria-label': '本页批注列表' });
    ui.toast = mk('div', { class: 'rm-toast', 'data-rm-ui': '', role: 'status', hidden: '' });
    [ui.bar, ui.hl, ui.badges, ui.panel, ui.toast].forEach(function (x) {
      doc.body.appendChild(x);
      // 键盘输入不要传给页面上的快捷键 / 术语浮窗
      x.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });
  }
  function toast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg; ui.toast.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { ui.toast.hidden = true; }, 2600);
  }
  function updateCounts() {
    var t = totalCount();
    if (ui.bar) $('.rm-bar-n', ui.bar).textContent = '本页 ' + items.length + ' 条 · 全部页面 ' + t + ' 条';
    var lb = ui.bar && $('[data-act=list]', ui.bar); if (lb) lb.textContent = '批注列表（' + items.length + '）';
    ui.fab.textContent = on ? '✏️ 退出批注' : ('✏️ 批注' + (t ? ' · ' + t : ''));
  }

  /* ---------- 开关 ---------- */
  function toggle(force) {
    var want = typeof force === 'boolean' ? force : !on;
    if (want === on) return;
    on = want;
    try { win.sessionStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch (e) {}
    if (on) {
      buildModeUI();
      ui.bar.hidden = false; ui.badges.hidden = false;
      doc.documentElement.classList.add('rm-on'); setBarH();
      LISTEN.forEach(function (t) { win.addEventListener(t, onEvent, true); });
      win.addEventListener('resize', schedulePlace); win.addEventListener('load', schedulePlace);
      placeTimer = setInterval(placeBadges, 1200);
      renderBadges(); renderPanel();
    } else {
      closePop();
      LISTEN.forEach(function (t) { win.removeEventListener(t, onEvent, true); });
      win.removeEventListener('resize', schedulePlace);
      clearInterval(placeTimer);
      doc.documentElement.classList.remove('rm-on'); doc.documentElement.style.removeProperty('--rm-bar-h');
      if (ui.bar) { ui.bar.hidden = true; ui.badges.hidden = true; ui.panel.hidden = true; ui.hl.style.display = 'none'; }
    }
    ui.fab.setAttribute('aria-pressed', on ? 'true' : 'false');
    updateCounts();
  }

  /* ---------- 事件拦截（仅批注模式开启时注册，捕获阶段） ---------- */
  var LISTEN = ['click', 'dblclick', 'auxclick', 'mousedown', 'pointerdown', 'mouseup', 'mouseover', 'mouseout', 'mousemove', 'submit', 'keydown', 'contextmenu'];
  var lastSelT = 0, hoverEl = null;
  function isFormish(t) { return t && t.closest && t.closest('input, select, textarea, video, audio, [contenteditable], label'); }
  function onEvent(e) {
    var t = e.target;
    if (isUI(t)) return;                       // 批注模式自己的 UI 照常工作
    var type = e.type;
    if (type === 'keydown') {
      if (e.key === 'Escape') { if (pop) closePop(); else toggle(false); e.preventDefault(); e.stopPropagation(); return; }
      // 阻止 Enter/空格 激活页面按钮/链接
      if ((e.key === 'Enter' || e.key === ' ') && t && t.closest && t.closest('a, button, summary, [role=button], input, select, .term')) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (type === 'mousemove') { hover(t, e.clientX, e.clientY); return; }
    if (type === 'mouseover' || type === 'mouseout') { e.stopPropagation(); if (type === 'mouseover') hover(t, e.clientX, e.clientY); return; }
    if (type === 'mousedown' || type === 'pointerdown') {
      // 让文字照常可以拖选；但表单控件 / 媒体不要响应（滑杆、复选框等）
      if (isFormish(t)) e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (type === 'mouseup') {
      e.stopPropagation();
      if (e.button !== 0) return;
      var sel = win.getSelection && win.getSelection();
      if (sel && !sel.isCollapsed && squash(sel.toString()).length) {
        var r = sel.getRangeAt(0), c = r.commonAncestorContainer;
        if (!isUI(c)) {
          var el = pickTarget(c.nodeType === 1 ? c : c.parentElement, -1, -1);
          if (el) { lastSelT = Date.now(); var q = clip(sel.toString(), 300); openPop(null, el, q, e.clientX, e.clientY); }
        }
      }
      return;
    }
    // click / dblclick / auxclick / submit / contextmenu：一律不让页面原有功能响应
    if (type === 'contextmenu') return;        // 右键菜单保留（方便复制）
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (type !== 'click' || e.button !== 0) return;
    if (Date.now() - lastSelT < 500) return;    // 刚刚处理过选中文字
    if (pop) { closePop(); return; }            // 先关掉已打开的批注框
    var target = pickTarget(t, e.clientX, e.clientY);
    if (target) openPop(null, target, '', e.clientX, e.clientY);
  }
  function hover(t, x, y) {
    if (pop) return;
    var el = isUI(t) ? null : pickTarget(t, x, y);
    if (el === hoverEl) return;
    hoverEl = el;
    if (!el) { ui.hl.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    ui.hl.style.display = 'block';
    ui.hl.style.left = (r.left - 3) + 'px'; ui.hl.style.top = (r.top - 3) + 'px';
    ui.hl.style.width = (r.width + 6) + 'px'; ui.hl.style.height = (r.height + 6) + 'px';
  }
  win.addEventListener('scroll', function () { if (on && ui.hl) { ui.hl.style.display = 'none'; hoverEl = null; } if (pop) placePop(); }, { passive: true });

  /* ---------- 批注弹框 ---------- */
  var pop = null, popCtx = null;
  function openPop(ann, el, quote, x, y) {
    closePop();
    var isNew = !ann;
    if (isNew) {
      var sn = snippetOf(el);
      ann = {
        id: uid(), page: PAGE, title: pageTitle(), section: sectionOf(el),
        locator: { id: stableId(el), css: cssPath(el), tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? squash(el.className) : '' },
        kind: quote ? 'selection' : 'element', snippet: sn.text, media: sn.media, quote: quote || '', comment: '',
        created: Date.now(), updated: Date.now(), vw: win.innerWidth
      };
    }
    var num = isNew ? items.length + 1 : items.indexOf(ann) + 1;
    pop = mk('div', { class: 'rm-pop', 'data-rm-ui': '', role: 'dialog', 'aria-label': '批注 #' + num });
    var where = [kindName(ann), ann.section ? '「' + clip(ann.section, 30) + '」' : ''].filter(Boolean).join(' · ');
    var ctx = ann.quote ? '<div class="rm-pop-q">选中：「' + esc(clip(ann.quote, 120)) + '」</div>'
      : '<div class="rm-pop-q">' + esc(ann.media && ann.media.src ? (ann.media.alt || ann.media.title || '') + ' ' + ann.media.src.split('/').pop() : clip(ann.snippet, 80)) + '</div>';
    pop.innerHTML = '<div class="rm-pop-h"><b>批注 #' + num + '</b><span>' + esc(where) + '</span></div>' + ctx +
      '<textarea rows="4" placeholder="写下你的意见：哪里看不懂、哪里写错了、希望怎么改……"></textarea>' +
      '<div class="rm-pop-b"><span class="rm-pop-tip">Ctrl/⌘+Enter 保存 · Esc 取消</span>' +
      (isNew ? '' : '<button type="button" class="rm-del">删除</button>') +
      '<button type="button" class="rm-cancel">取消</button><button type="button" class="rm-save">保存</button></div>';
    doc.body.appendChild(pop);
    pop.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); closePop(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    });
    var ta = $('textarea', pop); ta.value = ann.comment || '';
    function save() {
      var v = ta.value.trim();
      if (!v) { if (isNew) { closePop(); return; } ta.focus(); toast('意见是空的；如果要去掉这条，请点「删除」'); return; }
      ann.comment = v; ann.updated = Date.now();
      if (isNew) items.push(ann);
      saveItems(); closePop(); renderBadges(); renderPanel(); updateCounts();
      toast('已保存批注 #' + (items.indexOf(ann) + 1));
    }
    $('.rm-save', pop).addEventListener('click', save);
    $('.rm-cancel', pop).addEventListener('click', closePop);
    var del = $('.rm-del', pop);
    if (del) del.addEventListener('click', function () {
      items.splice(items.indexOf(ann), 1); saveItems(); closePop(); renderBadges(); renderPanel(); updateCounts(); toast('已删除');
    });
    popCtx = { el: el, x: x, y: y, ann: ann };
    ui.hl.style.display = 'none'; hoverEl = null;
    if (el) el.classList.add('rm-target');
    placePop();
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); } }, 0);
  }
  function placePop() {
    if (!pop) return;
    var w = Math.min(340, win.innerWidth - 16), h = pop.offsetHeight || 200, r = popCtx.el ? popCtx.el.getBoundingClientRect() : null;
    pop.style.width = w + 'px';
    var x = popCtx.x >= 0 ? popCtx.x - 20 : (r ? r.left : 20), y = r ? r.bottom + 8 : popCtx.y + 12;
    if (popCtx.x >= 0 && r && r.height > 220) y = popCtx.y + 14;   // 很高的元素：贴近点击位置
    if (y + h > win.innerHeight - 8) y = Math.max(56, (r ? Math.min(r.top, popCtx.y > 0 ? popCtx.y : r.top) : popCtx.y) - h - 10);
    if (y < 56) y = Math.min(win.innerHeight - h - 8, 56);
    x = Math.max(8, Math.min(x, win.innerWidth - w - 8));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function closePop() {
    if (!pop) return;
    if (popCtx && popCtx.el) popCtx.el.classList.remove('rm-target');
    pop.remove(); pop = null; popCtx = null;
    try { var s = win.getSelection(); if (s && !s.isCollapsed) s.removeAllRanges(); } catch (e) {}
  }

  /* ---------- 编号徽章 ---------- */
  var placeTimer = null, placeRAF = 0;
  function setBarH() { if (ui.bar && !ui.bar.hidden) doc.documentElement.style.setProperty('--rm-bar-h', ui.bar.offsetHeight + 'px'); }
  function schedulePlace() { setBarH(); cancelAnimationFrame(placeRAF); placeRAF = requestAnimationFrame(placeBadges); }
  function renderBadges() {
    if (!ui.badges) return;
    ui.badges.innerHTML = '';
    items.forEach(function (a, i) {
      var b = mk('button', { type: 'button', class: 'rm-badge' + (a.kind === 'selection' ? ' sel' : ''), title: '批注 #' + (i + 1) + '：' + clip(a.comment, 60), 'data-i': i }, String(i + 1));
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var el = findEl(a); var r = b.getBoundingClientRect();
        openPop(a, el, a.quote, r.left, r.bottom);
      });
      ui.badges.appendChild(b);
    });
    placeBadges();
  }
  function placeBadges() {
    if (!on || !ui.badges) return;
    var used = {};
    $$('.rm-badge', ui.badges).forEach(function (b) {
      var a = items[+b.getAttribute('data-i')], el = a && findEl(a);
      var r = el && el.getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) { b.style.display = 'none'; return; }
      var k = Math.round(r.top) + ':' + Math.round(r.right), n = used[k] = (used[k] || 0) + 1;
      var left = Math.min(r.right + win.scrollX - 12 - (n - 1) * 26, doc.documentElement.clientWidth + win.scrollX - 30);
      left = Math.max(left, r.left + win.scrollX - 4);
      b.style.display = ''; b.style.left = left + 'px'; b.style.top = (r.top + win.scrollY - 10) + 'px';
    });
  }

  /* ---------- 侧边列表 ---------- */
  function togglePanel(force) {
    var show = typeof force === 'boolean' ? force : ui.panel.hidden;
    ui.panel.hidden = !show; if (show) renderPanel();
  }
  function renderPanel() {
    if (!ui.panel) return;
    var t = totalCount();
    var h = '<div class="rm-panel-h"><b>本页批注 ' + items.length + ' 条</b><span>全部页面共 ' + t + ' 条</span><button type="button" class="rm-panel-x" aria-label="关闭列表">×</button></div>';
    if (!items.length) h += '<p class="rm-empty">这一页还没有批注。打开批注模式后，点页面上任意段落、图片、按钮就能写意见；也可以先拖选一段文字再写。</p>';
    h += '<ol class="rm-list">' + items.map(function (a, i) {
      return '<li><button type="button" class="rm-item" data-i="' + i + '"><span class="rm-num">' + (i + 1) + '</span><span class="rm-body">' +
        '<span class="rm-sec">' + esc(clip(a.section || a.title, 40)) + ' · ' + esc(kindName(a)) + '</span>' +
        '<span class="rm-snip">' + esc(a.quote ? '「' + clip(a.quote, 60) + '」' : (a.media && a.media.src ? '🖼 ' + a.media.src.split('/').pop() : clip(a.snippet, 60))) + '</span>' +
        '<span class="rm-cmt">' + esc(clip(a.comment, 140)) + '</span></span></button></li>';
    }).join('') + '</ol>';
    var others = allPages(), lines = [];
    for (var k in others) if (k !== PAGE) lines.push('<li>' + esc(clip(others[k].title || k, 30)) + '：' + others[k].items.length + ' 条</li>');
    if (lines.length) h += '<div class="rm-others"><b>其他页面</b><ul>' + lines.join('') + '</ul></div>';
    h += '<p class="rm-hint">批注只存在这台电脑的这个浏览器里。写完请点「导出批注」，把下载的 .md 文件发给 Oki。</p>';
    ui.panel.innerHTML = h;
    $('.rm-panel-x', ui.panel).addEventListener('click', function () { togglePanel(false); });
    $$('.rm-item', ui.panel).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = items[+b.getAttribute('data-i')], el = findEl(a);
        if (!el || !el.getClientRects().length) { toast('找不到这条批注对应的位置（可能在折叠的面板/标签页里，或页面内容已更新）'); if (el) openPop(a, el, a.quote, -1, -1); return; }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('rm-flash'); setTimeout(function () { el.classList.remove('rm-flash'); }, 1600);
        setTimeout(placeBadges, 600);
      });
    });
    updateCounts();
  }

  /* ---------- 导出 / 导入 / 清空 ---------- */
  function buildExport() {
    var pages = allPages(), keys = Object.keys(pages).sort(), now = new Date(), total = 0;
    keys.forEach(function (k) { total += pages[k].items.length; });
    var md = ['# MPC 手册批注', '', '- 导出时间：' + fmtTime(now.getTime()), '- 共 ' + total + ' 条批注，涉及 ' + keys.length + ' 个页面', '- 浏览器：' + navigator.userAgent, ''];
    keys.forEach(function (k) {
      var pg = pages[k];
      md.push('## ' + (pg.title || k) + '（' + k + '）', '');
      var groups = [], idx = {};
      pg.items.forEach(function (a, i) {
        var s = a.section || '（本页开头）';
        if (!(s in idx)) { idx[s] = groups.length; groups.push({ s: s, list: [] }); }
        groups[idx[s]].list.push({ a: a, n: i + 1 });
      });
      groups.forEach(function (g) {
        md.push('### ' + g.s, '');
        g.list.forEach(function (it) {
          var a = it.a, L = a.locator || {};
          md.push('#### 批注 #' + it.n + ' · ' + kindName(a) + '（<' + L.tag + '>）');
          md.push('- 位置：' + (L.id ? '`#' + L.id + '`' : '`' + L.css + '`'));
          if (a.media && a.media.src) md.push('- 媒体：`' + a.media.src + '`' + (a.media.alt ? ' · alt：' + a.media.alt : '') + (a.media.title ? ' · 标题：' + a.media.title : ''));
          if (a.snippet) md.push('- 原文：' + squash(a.snippet));
          if (a.quote) md.push('- 选中文字：「' + squash(a.quote) + '」');
          md.push('- 时间：' + fmtTime(a.updated || a.created) + ' · 视口宽 ' + a.vw + 'px', '');
          md.push('> **意见：**', '>');
          String(a.comment).split(/\r?\n/).forEach(function (l) { md.push('> ' + l); });
          md.push('');
        });
      });
    });
    var data = { format: FORMAT, version: 1, exportedAt: now.toISOString(), pages: pages };
    var json = JSON.stringify(data, null, 2).replace(/`/g, '\\u0060');
    md.push('---', '', '## 原始数据（供导入 / 程序读取，请勿修改）', '', '```json', json, '```', '');
    var fn = '手册批注-' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '-' + pad2(now.getHours()) + pad2(now.getMinutes()) + '.md';
    return { name: fn, text: md.join('\n'), total: total };
  }
  function exportAll() {
    var ex = buildExport();
    if (!ex.total) { toast('还没有任何批注可以导出'); return; }
    var blob = new Blob([ex.text], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = mk('a', { href: url, download: ex.name, 'data-rm-ui': '' });
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('已导出 ' + ex.total + ' 条批注：' + ex.name + '（在「下载」文件夹里）');
  }
  function parseImport(text) {
    var m, re = /```json\s*\n([\s\S]*?)\n```/g, last = null;
    while ((m = re.exec(text))) last = m[1];
    var data = JSON.parse(last != null ? last : text);
    if (!data || data.format !== FORMAT || !data.pages) throw new Error('格式不对');
    return data;
  }
  function importText(text) {
    var data = parseImport(text), added = 0, same = 0;
    Object.keys(data.pages).forEach(function (k) {
      var inc = data.pages[k]; if (!inc || !Array.isArray(inc.items)) return;
      var key = PAGE_PREFIX + k, cur = readPage(key) || { page: k, title: inc.title, items: [] };
      var ids = {}; cur.items.forEach(function (a) { ids[a.id] = 1; });
      inc.items.forEach(function (a) { if (a && a.id && a.locator && !ids[a.id]) { cur.items.push(a); added++; } else same++; });
      cur.items.sort(function (x, y) { return (x.created || 0) - (y.created || 0); });
      cur.title = cur.title || inc.title;
      if (cur.items.length) store.set(key, JSON.stringify(cur));
    });
    items = loadItems(); renderBadges(); renderPanel(); updateCounts();
    return { added: added, skipped: same };
  }
  function importFile(f) {
    var rd = new FileReader();
    rd.onload = function () {
      try { var r = importText(String(rd.result)); toast('导入完成：新增 ' + r.added + ' 条' + (r.skipped ? '，' + r.skipped + ' 条已存在' : '')); }
      catch (e) { toast('导入失败：请选择「导出批注」生成的 .md 或 .json 文件'); }
    };
    rd.readAsText(f, 'utf-8');
  }
  function clearAll() {
    var t = totalCount();
    if (!t) { toast('没有批注需要清空'); return; }
    if (!win.confirm('确定清空全部页面的 ' + t + ' 条批注吗？\n（建议先「导出批注」备份；清空后无法恢复，除非再导入导出的文件。）')) return;
    store.keys().forEach(function (k) { if (k && k.indexOf(PAGE_PREFIX) === 0) store.del(k); });
    items = []; closePop(); renderBadges(); renderPanel(); updateCounts(); toast('已清空');
  }

  /* ---------- 启动 ---------- */
  function init() {
    buildUI(); updateCounts();
    var m = null; try { m = win.sessionStorage.getItem(MODE_KEY); } catch (e) {}
    if (m === '1') toggle(true);
  }
  // 其他标签页里改了批注 → 同步
  win.addEventListener('storage', function (e) { if (e.key && e.key.indexOf(PAGE_PREFIX) === 0) { items = loadItems(); if (on) { renderBadges(); renderPanel(); } updateCounts(); } });

  window.__mpcReview = {
    toggle: toggle, isOn: function () { return on; }, items: function () { return items.slice(); },
    total: totalCount, buildExport: buildExport, importText: importText, page: PAGE
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
