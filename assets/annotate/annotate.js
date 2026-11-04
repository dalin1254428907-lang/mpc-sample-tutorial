/* MPC 手册批注模式（仅 ?annotate=1 时加载；数据只存本机 localStorage） */
(function (root) {
  'use strict';
  var KEY = 'mpc-manual-review-v1';
  var KIND = { div: '区块', span: '区块', section: '区块', p: '段落', iframe: '在线视频', video: '视频区', audio: '音频', img: '图片', svg: '图示', figure: '图示', button: '按钮', a: '链接', table: '表格', tr: '表格行', td: '单元格', th: '单元格', li: '列表项', ul: '列表', ol: '列表', pre: '代码', code: '代码', blockquote: '引用' };
  function kindOf(tag) { return /^h[1-6]$/.test(tag) ? '标题' : (KIND[tag] || '区块'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  /* ---------- 导出（纯函数，可在 node 测试） ---------- */
  function toMarkdown(data, now, ua) {
    var pages = Object.keys(data.pages).filter(function (k) { return data.pages[k].items.length; });
    var total = 0; pages.forEach(function (k) { total += data.pages[k].items.length; });
    var L = ['# MPC 手册批注', '', '- 导出时间：' + fmt(now), '- 共 ' + total + ' 条批注，涉及 ' + pages.length + ' 个页面', '- 浏览器：' + ua, ''];
    var out = { format: 'mpc-manual-review', version: 1, exportedAt: new Date(now).toISOString(), pages: {} };
    pages.forEach(function (k) {
      var pg = data.pages[k]; out.pages[k] = pg;
      L.push('## ' + pg.title + '（' + k + '）', '');
      var last = null;
      pg.items.forEach(function (it, i) {
        if (it.section !== last) { L.push('### ' + it.section, ''); last = it.section; }
        L.push('#### 批注 #' + (i + 1) + ' · ' + kindOf(it.locator.tag) + '（<' + it.locator.tag + '>）');
        L.push('- 位置：`' + it.locator.css + '`');
        if (it.media) {
          var m = '- 媒体：`' + it.media.src + '`';
          if (it.media.title) m += ' · 标题：' + it.media.title;
          else if (it.media.alt) m += ' · alt：' + it.media.alt;
          L.push(m);
        }
        if (it.snippet) L.push('- 原文：' + it.snippet.replace(/\s+/g, ' '));
        L.push('- 时间：' + fmt(it.updated || it.created) + ' · 视口宽 ' + it.vw + 'px', '');
        L.push('> **意见：**', '>');
        it.comment.split('\n').forEach(function (s) { L.push('> ' + s); });
        L.push('');
      });
    });
    L.push('---', '', '## 原始数据（供导入 / 程序读取，请勿修改）', '', '```json', JSON.stringify(out, null, 2), '```', '');
    return L.join('\n');
  }
  if (typeof module !== 'undefined') { module.exports = { toMarkdown: toMarkdown }; return; }

  /* ---------- 浏览器部分 ---------- */
  var doc = document, base = root.MPC_ANNOTATE_BASE || '/';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { pages: {} }; } catch (e) { return { pages: {} }; } }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  var path = decodeURIComponent(location.pathname);
  var pageKey = path.indexOf(base) === 0 ? path.slice(base.length) : path.replace(/^\//, '');
  if (!pageKey || /\/$/.test(pageKey)) pageKey += 'index.html';
  var siteTitle = (doc.querySelector('.brand') ? '' : '');
  var pageTitle = doc.title.replace(/ · MPC Sample 图文教程$/, '');
  function squash(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function clip(s) { s = squash(s); return s.length > 100 ? s.slice(0, 100) + '…' : s; }
  function cssPath(el) {
    if (el.id) return '#' + el.id;
    if (el.tagName === 'IFRAME' && el.getAttribute('data-yt')) return 'iframe[data-yt="' + el.getAttribute('data-yt') + '"]';
    var parts = [];
    while (el && el.nodeType === 1 && el !== doc.body) {
      if (el.id) { parts.unshift('#' + el.id); return parts.join(' > '); }
      var t = el.tagName.toLowerCase(), n = 1, s = el;
      while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) n++;
      parts.unshift(t + ':nth-of-type(' + n + ')');
      el = el.parentElement;
    }
    parts.unshift('body'); return parts.join(' > ');
  }
  function sectionOf(el) {
    var hs = Array.prototype.slice.call(doc.querySelectorAll('main h1, main h2, main h3'));
    var h1 = null, h2 = null, h3 = null;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i], pos = h.compareDocumentPosition(el);
      if (!(h === el || pos & 4 || pos & 16)) break; /* 只取位于 el 之前（或包含 / 本身） */
      var t = squash(h.textContent);
      if (h.tagName === 'H1') { h1 = t; h2 = h3 = null; } else if (h.tagName === 'H2') { h2 = t; h3 = null; } else h3 = t;
    }
    if (h2) return h3 ? h2 + ' › ' + h3 : h2;
    return h3 || h1 || pageTitle;
  }
  function mediaOf(el) {
    var m = /^(IMG|IFRAME|VIDEO)$/.test(el.tagName) ? el : el.querySelector('img,iframe,video');
    if (!m) return null;
    var src = m.getAttribute('src') || (m.querySelector('source') && m.querySelector('source').getAttribute('src')) || '';
    var r = { src: m.tagName === 'IMG' ? src : (m.tagName === 'IFRAME' ? m.src : src) };
    if (m.tagName === 'IFRAME') r.title = m.title || '';
    if (m.tagName === 'IMG') r.alt = m.alt || '';
    if (m.tagName === 'VIDEO' && m.getAttribute('poster')) r.poster = m.getAttribute('poster');
    return r;
  }
  function snippetOf(el) {
    if (el.tagName === 'IFRAME') return clip(el.title);
    if (el.tagName === 'IMG') return clip(el.alt);
    var t = squash(el.textContent); if (!t) { var i = el.querySelector('img'); if (i) t = i.alt; }
    return clip(t);
  }

  /* UI */
  var box = doc.createElement('div'); box.className = 'mpca-hl'; doc.body.appendChild(box);
  var tag = doc.createElement('div'); tag.className = 'mpca-tag'; doc.body.appendChild(tag);
  var panel = doc.createElement('div'); panel.className = 'mpca-panel';
  panel.innerHTML = '<div class="mpca-head"><b>批注模式</b><span class="mpca-count"></span></div>' +
    '<div class="mpca-btns"><button data-a="pick" class="on">选取：开</button><button data-a="export">导出 .md</button><button data-a="clear">清空本页</button><button data-a="off">退出</button></div>' +
    '<div class="mpca-list"></div>';
  doc.body.appendChild(panel);
  var picking = true, cur = null, pop = null;
  function own(n) { return n && n.closest && n.closest('.mpca-panel,.mpca-pop,.mpca-hl,.mpca-tag'); }
  function targetAt(x, y) {
    /* iframe/video 会吞掉鼠标事件：选取时它们 pointer-events:none，这里按坐标补回 */
    var ms = doc.querySelectorAll('iframe,video');
    for (var i = 0; i < ms.length; i++) { var r = ms[i].getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return ms[i]; }
    var el = doc.elementFromPoint(x, y);
    if (!el || own(el) || el === doc.body || el === doc.documentElement) return null;
    if (el.closest('svg')) el = el.closest('svg');
    return el;
  }
  function show(el) {
    cur = el; if (!el) { box.style.display = tag.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    box.style.cssText = 'display:block;left:' + (r.left + scrollX) + 'px;top:' + (r.top + scrollY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    var t = el.tagName.toLowerCase(); tag.textContent = kindOf(t) + ' <' + t + '>';
    tag.style.cssText = 'display:block;left:' + (r.left + scrollX) + 'px;top:' + Math.max(0, r.top + scrollY - 22) + 'px';
  }
  doc.addEventListener('mousemove', function (e) { if (!picking || pop) return; if (own(e.target)) return show(null); show(targetAt(e.clientX, e.clientY)); }, true);
  doc.addEventListener('click', function (e) {
    if (!picking || pop || own(e.target)) return;
    var el = targetAt(e.clientX, e.clientY); if (!el) return;
    e.preventDefault(); e.stopPropagation(); openPop(el, e.pageX, e.pageY);
  }, true);
  function openPop(el, x, y, item) {
    pop = doc.createElement('div'); pop.className = 'mpca-pop';
    pop.style.left = Math.min(x, scrollX + innerWidth - 340) + 'px'; pop.style.top = y + 'px';
    pop.innerHTML = '<div class="mpca-pop-h"></div><textarea placeholder="写下意见…"></textarea><div><button data-p="save">保存</button><button data-p="cancel">取消</button></div>';
    pop.querySelector('.mpca-pop-h').textContent = item ? item.section : sectionOf(el) + ' · ' + kindOf(el.tagName.toLowerCase());
    var ta = pop.querySelector('textarea'); if (item) ta.value = item.comment;
    doc.body.appendChild(pop); ta.focus();
    pop.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-p'); if (!a) return;
      if (a === 'save' && ta.value.trim()) {
        var d = load(), now = Date.now();
        var pg = d.pages[pageKey] || (d.pages[pageKey] = { page: pageKey, title: pageTitle, items: [] });
        if (item) { pg.items.forEach(function (it) { if (it.id === item.id) { it.comment = ta.value; it.updated = now; } }); }
        else {
          var t = el.tagName.toLowerCase();
          pg.items.push({ id: 'amw' + now.toString(36) + Math.random().toString(36).slice(2, 6), page: pageKey, title: pageTitle, section: sectionOf(el),
            locator: { id: el.id || '', css: cssPath(el), tag: t, cls: typeof el.className === 'string' ? el.className.replace(/\s*mpca-\S+/g, '') : '' },
            kind: 'element', snippet: (t === 'video' ? '' : snippetOf(el)), media: mediaOf(el), quote: '', comment: ta.value, created: now, updated: now, vw: innerWidth });
        }
        save(d);
      }
      pop.remove(); pop = null; show(null); render();
    });
  }
  function render() {
    var d = load(), list = panel.querySelector('.mpca-list'), n = 0, html = '';
    Object.keys(d.pages).forEach(function (k) {
      var pg = d.pages[k]; if (!pg.items.length) return;
      html += '<div class="mpca-pg">' + esc(pg.title) + (k === pageKey ? '（本页）' : '') + '</div>';
      pg.items.forEach(function (it, i) {
        n++;
        html += '<div class="mpca-it" data-k="' + esc(k) + '" data-id="' + it.id + '"><b>#' + (i + 1) + '</b> ' + esc(it.comment.slice(0, 60)) +
          '<div class="mpca-it-b">' + (k === pageKey ? '<button data-i="go">定位</button><button data-i="edit">编辑</button>' : '<a href="' + base + k + '">打开页面</a>') + '<button data-i="del">删除</button></div></div>';
      });
    });
    list.innerHTML = html || '<div class="mpca-empty">还没有批注。移动鼠标高亮元素，点击写意见。</div>';
    panel.querySelector('.mpca-count').textContent = ' · 共 ' + n + ' 条';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  panel.addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-a'), ia = e.target.getAttribute('data-i');
    if (a === 'pick') { picking = !picking; e.target.textContent = '选取：' + (picking ? '开' : '关'); e.target.classList.toggle('on', picking); doc.documentElement.classList.toggle('mpca-picking', picking); show(null); }
    if (a === 'export') {
      var md = toMarkdown(load(), Date.now(), navigator.userAgent), d = new Date();
      var b = new Blob([md], { type: 'text/markdown;charset=utf-8' }), u = URL.createObjectURL(b), l = doc.createElement('a');
      l.href = u; l.download = '手册批注-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.md';
      doc.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    }
    if (a === 'clear' && confirm('清空本页全部批注？')) { var d2 = load(); delete d2.pages[pageKey]; save(d2); render(); }
    if (a === 'off') { sessionStorage.removeItem('mpcAnnotate'); location.href = location.pathname + '?annotate=0'; }
    if (ia) {
      var row = e.target.closest('.mpca-it'), k = row.getAttribute('data-k'), id = row.getAttribute('data-id'), d3 = load(), pg = d3.pages[k];
      var it = pg.items.filter(function (x) { return x.id === id; })[0];
      if (ia === 'del' && confirm('删除这条批注？')) { pg.items = pg.items.filter(function (x) { return x.id !== id; }); if (!pg.items.length) delete d3.pages[k]; save(d3); render(); }
      if (ia === 'go' || ia === 'edit') {
        var el = null; try { el = doc.querySelector(it.locator.css); } catch (er) {}
        if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(function () { show(el); }, 300); }
        if (ia === 'edit') { var r = el ? el.getBoundingClientRect() : { left: 40, bottom: 120 }; openPop(el || doc.body, r.left + scrollX, r.bottom + scrollY, it); }
      }
    }
  });
  doc.documentElement.classList.add('mpca-picking');
  render();
})(typeof window !== 'undefined' ? window : this);
