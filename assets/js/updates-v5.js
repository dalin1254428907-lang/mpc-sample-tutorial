/* ============================================================
   v5 本地修订（Alder，2026-11-04）
   按 2026-11-03 的 12 条批注做的通用增强：
   - 回到顶部按钮（01 / 01b / 03c / 05 四页）
   - 术语表搜索（05）
   - 速查页目录 + 侧栏、面板图一屏/点编号看说明、SHIFT 快捷键卡、
     后面板常用接法（01b）
   全部为渐进增强：无 JS 或选择器对不上时，原内容照常可读。
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

  /* ---------------- 回到顶部 ---------------- */
  var topBtn = el('button', 'v5-topbtn', '↑');
  topBtn.type = 'button';
  topBtn.title = '回到顶部';
  topBtn.setAttribute('aria-label', '回到顶部');
  topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(topBtn);
  window.addEventListener('scroll', function () {
    topBtn.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });

  /* ---------------- 术语表搜索（05） ---------------- */
  var gloss = $('.glossary');
  if (gloss) {
    var groups = [];
    $$('h3', gloss).forEach(function (h) {
      var t = h.nextElementSibling;
      while (t && t.tagName !== 'TABLE' && t.tagName !== 'H3') t = t.nextElementSibling;
      if (t && t.tagName === 'TABLE') groups.push({ h: h, t: t });
    });
    var allRows = $$('tbody tr', gloss);
    var bar = el('div', 'v5-gsearch');
    var input = el('input');
    input.type = 'search';
    input.placeholder = '搜术语：输入 English / 中文 / 日本語，例如 Swing、摇摆、スウィング…';
    input.setAttribute('aria-label', '搜索术语');
    var clear = el('button', 'v5-btn', '清除');
    clear.type = 'button';
    var count = el('span', 'v5-gcount', '共 ' + allRows.length + ' 条');
    bar.appendChild(input); bar.appendChild(clear); bar.appendChild(count);
    gloss.parentNode.insertBefore(bar, gloss);

    function applySearch() {
      var q = input.value.trim().toLowerCase();
      if (q) groups.forEach(function (g) { g.h.classList.remove('hidden'); g.t.classList.remove('hidden'); });
      var shown = 0;
      allRows.forEach(function (tr) {
        var hit = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
        tr.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      groups.forEach(function (g) {
        if (!q) return;
        var any = $$('tbody tr', g.t).some(function (tr) { return tr.style.display !== 'none'; });
        g.h.style.display = any ? '' : 'none';
        g.t.style.display = any ? '' : 'none';
      });
      count.textContent = q ? ('找到 ' + shown + ' 条 / 共 ' + allRows.length + ' 条（中英日三列 + MPC 对应说明都会搜）')
                            : ('共 ' + allRows.length + ' 条');
    }
    input.addEventListener('input', applySearch);
    clear.addEventListener('click', function () {
      input.value = '';
      groups.forEach(function (g) { g.h.style.display = ''; g.t.style.display = ''; });
      applySearch(); input.focus();
    });
  }

  /* ---------------- 速查页（01b） ---------------- */
  var isRef = !!$('#fig-overview');
  if (isRef) {
    /* 目录（顶部可折叠 + 宽屏侧栏） */
    var h2s = $$('main h2[id]');
    if (h2s.length) {
      var links = h2s.map(function (h) {
        return '<li><a href="#' + h.id + '">' + h.textContent + '</a></li>';
      }).join('');
      var toc = el('nav', 'v5-toc', '<details><summary>本页目录（点节名跳转）</summary><ul>' + links + '</ul></details>');
      toc.setAttribute('aria-label', '本页目录');
      var h1 = $('main h1');
      if (h1 && h1.parentNode) h1.parentNode.insertBefore(toc, h1.nextSibling);

      var side = el('nav', 'v5-sidenav',
        h2s.map(function (h) { return '<a href="#' + h.id + '">' + h.textContent + '</a>'; }).join(''));
      side.setAttribute('aria-label', '本页目录（侧栏）');
      document.body.appendChild(side);
    }

    /* 面板总览：一屏看全 + 点编号看说明 */
    var fig = $('#fig-overview');
    var tools = el('div', 'v5-figtools',
      '<span class="v5-note">面板总览：</span>');
    var bFit = el('button', 'v5-btn on', '一屏看全'); bFit.type = 'button';
    var bBig = el('button', 'v5-btn', '原始大小'); bBig.type = 'button';
    var hint = el('span', 'v5-note', '点图上的红色编号，下面会显示这个控件是什么。');
    tools.appendChild(bFit); tools.appendChild(bBig); tools.appendChild(hint);
    fig.parentNode.insertBefore(tools, fig);
    fig.classList.add('v5-fit');
    bFit.addEventListener('click', function () { fig.classList.add('v5-fit'); bFit.classList.add('on'); bBig.classList.remove('on'); });
    bBig.addEventListener('click', function () { fig.classList.remove('v5-fit'); bBig.classList.add('on'); bFit.classList.remove('on'); });

    // 编号 -> 说明（取自本页「面板编号 1–40」表）
    var descMap = {};
    $$('.legend table tbody tr').forEach(function (tr) {
      var c = tr.children;
      if (c.length >= 3 && /^\d+$/.test(c[0].textContent.trim())) {
        descMap[c[0].textContent.trim()] = { row: tr, name: c[1].textContent.trim(), desc: c[2].textContent.trim() };
      }
    });
    var info = el('div', 'v5-markerinfo');
    info.setAttribute('aria-live', 'polite');
    fig.parentNode.insertBefore(info, fig.nextSibling);
    $$('g.marker', fig).forEach(function (g) {
      var t = $('title', g);
      var numEl = $('text', g);
      if (!t || !numEl) return;
      var num = numEl.textContent.trim();
      g.addEventListener('click', function () {
        $$('g.marker', fig).forEach(function (x) { x.classList.remove('v5-sel'); });
        g.classList.add('v5-sel');
        $$('.legend table tbody tr').forEach(function (tr) { tr.classList.remove('v5-hl'); });
        var d = descMap[num];
        var head = '编号 ' + num + ' · ' + t.textContent.replace(/^\d+\s*/, '');
        info.innerHTML = '<div class="v5-mi-head">' + head + '</div>' +
          (d && d.desc ? '<div>' + d.desc + '</div>' : '<div class="v5-note">详细说明见下方「面板编号 1–40」表。</div>');
        if (d && d.row) {
          d.row.classList.add('v5-hl');
          var link = el('div', '', '<a href="javascript:void 0">→ 在编号表里看这一行</a>');
          link.querySelector('a').addEventListener('click', function () {
            d.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
          info.appendChild(link);
        }
        info.classList.add('show');
      });
    });

    /* 「面板编号 1–40」处：SHIFT 快捷键速查卡（数据取自本页 R.6 的表，不另编） */
    var h3num = null;
    $$('h3').forEach(function (h) { if (h.textContent.indexOf('面板编号') !== -1) h3num = h; });
    var shiftTable = null;
    $$('table').forEach(function (tb) {
      if (tb.textContent.indexOf('FULL LEVEL') !== -1 && tb.textContent.indexOf('COUNT-IN') !== -1) shiftTable = tb;
    });
    if (h3num && shiftTable) {
      var items = [];
      $$('tbody tr', shiftTable).forEach(function (tr) {
        var c = tr.children;
        if (c.length >= 3) {
          items.push('<li><kbd>SHIFT</kbd> + <kbd>PAD ' + c[0].textContent.trim() + '</kbd> · <b>' +
            c[1].textContent.trim() + '</b> — ' + c[2].textContent.trim() + '</li>');
        }
      });
      if (items.length) {
        var card = el('div', 'v5-card',
          '<h4>快捷键速查（SHIFT + 垫）</h4>' +
          '<p class="v5-note">基本功能点上面的面板图、编号就会显示说明；这里只收组合键，内容与 R.6 的表一致。</p>' +
          '<ul class="v5-keys">' + items.join('') + '</ul>');
        h3num.parentNode.insertBefore(card, h3num.nextSibling);
      }
    }

    /* 后面板：常用接法 */
    var figF = $('#fig-f');
    if (figF) {
      var conns = [
        ['PHONES 耳机口', '插耳机监听。不接音箱、在夜里练的时候用。'],
        ['AUDIO IN（L/R 输入）', '采样来源：黑胶机（普通黑胶输出太小，先过唱放或 DJ 调音台）、手机 / 电脑放歌、麦克风、吉他等乐器。'],
        ['AUDIO OUT（L/R 输出）', '接有源音箱、调音台或声卡，把声音放大出来 / 录进电脑。'],
        ['USB-C', '接 Mac / PC：一根线同时供电、传音频、传 MIDI、传文件；也能用充电宝供电带出门。'],
        ['MIDI IN / OUT（3.5mm 转 DIN 线）', '和其它硬件互相控制：接 MIDI 键盘来弹，或让 MPC 去触发合成器 / 鼓机。'],
        ['SYNC OUT', '给模块合成器、口袋合成器这类设备送时钟脉冲，让两台机器速度对齐。'],
        ['REC GAIN', '录采样时调输入音量：看着电平表，别顶到红色爆掉。'],
        ['POWER', '电源。长途带出门时可用 USB-C 供电，具体以手册为准。']
      ];
      var connCard = el('div', 'v5-card',
        '<h4>后面板每个插口：常用接法</h4><div class="v5-conn">' +
        conns.map(function (c) {
          return '<div class="v5-conn-item"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>';
        }).join('') + '</div>' +
        '<p class="v5-note">都是最常见的接法示例；线材规格（比如 MIDI 转接线分 A/B 型）下单前按手册和设备说明书再对一次。</p>');
      figF.parentNode.insertBefore(connCard, figF.nextSibling);
    }
  }
})();
