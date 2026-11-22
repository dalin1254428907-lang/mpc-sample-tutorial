/* ============================================================
   第一章 · 机器舞台（ch1-stage.js）
   整章只有一台机器立在顶部（#zone-map 舞台）：
   - 点左侧导航（或舞台分区、色签、正文里的本页锚点链接）时，
     打开目标所在的「五大部分」折叠、把舞台标题换成该部分标题、
     并点亮舞台上对应的区域；
   - 手动展开某个折叠时，标题和高亮也跟着该部分走；
   - 带 #锚点打开本页时，同样展开对应折叠。
   机器始终立在舞台上：讲到第 3 部分时舞台换成实时机器（同步屏），
   其它部分回到同一张插画图；讲屏幕时舞台自动放大屏幕区域。
   点导航后视口停在舞台：宽屏时说明在右栏内部滚到对应小节，
   窄屏时把舞台滚回视野内，文字在下方自己翻。
   宽屏（≥1200px）三栏：右栏一次只显示当前部分的说明。
   ============================================================ */
(function () {
  'use strict';

  var titleEl = document.getElementById('stage-title');
  if (!titleEl) return;
  var folds = Array.prototype.slice.call(document.querySelectorAll('.part-fold'));
  if (!folds.length) return;

  var zoneEntry = document.getElementById('zone-map');
  var liveBox = document.getElementById('live-box');
  var stageMap = document.querySelector('.zone-map2');
  var sideCol = document.getElementById('side-col');
  var wideMq = window.matchMedia('(min-width: 1200px)');
  var currentFold = folds[0];

  // 部分标题：取 summary 里 h2 的「编号 + 名称」
  function partTitle(fold) {
    var h2 = fold.querySelector('summary h2');
    if (!h2) return '';
    var key = h2.querySelector('.region-key');
    var num = key ? key.textContent.trim() : '';
    var name = h2.textContent.trim();
    if (num && name.indexOf(num) === 0) name = name.slice(num.length).trim();
    return num ? num + ' ' + name : name;
  }

  // 每个部分在舞台上的默认高亮区（区域详细介绍靠子项点亮，整部分打开时先不点）
  var partZone = { '1': null, '2': null, '3': 'a', '4': 'e', '5': null };

  // 第 2 部分子项锚点 → 舞台区域
  var anchorZone = {
    'a显示区音量--屏幕--喇叭': 'a',
    'b切模式--shift--推子': 'b',
    'key-shift': 'b',
    'c屏幕旋钮-k1k3': 'c',
    'd工具--浏览--录音--播放': 'd',
    'e16-个打击垫': 'e',
    'key-bank': 'e'
  };

  var hits = {};
  Array.prototype.forEach.call(document.querySelectorAll('.zone-hit'), function (h) {
    ['a', 'b', 'c', 'd', 'e'].forEach(function (z) {
      if (h.classList.contains('zt-' + z)) hits[z] = h;
    });
  });

  function setHighlight(zone) {
    Object.keys(hits).forEach(function (z) {
      hits[z].classList.toggle('stage-on', z === zone);
    });
  }

  function setTitle(fold) {
    var t = partTitle(fold);
    if (t) titleEl.textContent = t;
  }

  function foldOf(el) {
    return el && el.closest ? el.closest('.part-fold') : null;
  }

  function findById(id) {
    var el = document.getElementById(id);
    if (!el) {
      try { el = document.getElementById(decodeURIComponent(id)); } catch (e) { /* 原样再试已做过 */ }
    }
    return el;
  }

  function zoneFor(id, target) {
    if (Object.prototype.hasOwnProperty.call(anchorZone, id)) return anchorZone[id];
    try {
      var dec = decodeURIComponent(id);
      if (Object.prototype.hasOwnProperty.call(anchorZone, dec)) return anchorZone[dec];
    } catch (e) { /* 忽略 */ }
    var fold = foldOf(target);
    return fold ? partZone[fold.getAttribute('data-part')] : undefined;
  }

  // 舞台形态：第 3 部分显示实时机器，其它部分显示插画；
  // 插画态下讲 A 区（屏幕）放大屏幕、讲 C 区（屏幕旋钮）放大屏幕+旋钮。
  function setStage(part, zone) {
    var live = part === '3';
    if (zoneEntry) zoneEntry.hidden = live;
    if (liveBox) liveBox.hidden = !live;
    if (stageMap) {
      stageMap.classList.toggle('zoom-screen', !live && zone === 'a');
      stageMap.classList.toggle('zoom-knobs', !live && zone === 'c');
    }
  }

  // 宽屏右栏一次只显示当前部分
  function markCurrent(fold) {
    currentFold = fold;
    folds.forEach(function (f) {
      f.classList.toggle('is-current', f === fold);
    });
  }

  // 点导航之后视口的落点：宽屏把右栏内部滚到目标小节；
  // 窄屏把舞台滚回视野内（文字在下方，用户自己往下翻）。
  function afterNav(target) {
    if (wideMq.matches && sideCol) {
      if (target && sideCol.contains(target)) {
        var y = target.getBoundingClientRect().top -
          sideCol.getBoundingClientRect().top + sideCol.scrollTop - 10;
        sideCol.scrollTo({ top: Math.max(0, y) });
      } else {
        sideCol.scrollTo({ top: 0 });
      }
    } else if (titleEl.scrollIntoView) {
      titleEl.scrollIntoView({ block: 'start' });
    }
  }

  // 程序化打开折叠时，toggle 事件随后会异步触发；用这个标记让 toggle 处理
  // 跳过同一次打开，避免把刚点亮的子区域高亮又冲掉。
  var guard = null;

  function activate(target, id) {
    var fold = foldOf(target);
    if (!fold) {
      // 舞台自身（#zone-map 等不在折叠里的目标）：回到第 1 部分
      setTitle(folds[0]);
      setHighlight(null);
      markCurrent(folds[0]);
      setStage('1', null);
      return;
    }
    if (!fold.open) {
      guard = { fold: fold, t: Date.now() };
      fold.open = true;
    }
    setTitle(fold);
    var zone = id ? zoneFor(id, target) : partZone[fold.getAttribute('data-part')];
    if (zone !== undefined) setHighlight(zone);
    markCurrent(fold);
    setStage(fold.getAttribute('data-part'), zone === undefined ? null : zone);
  }

  // 左侧导航、舞台分区与色签、说明栏中的本页锚点链接，统一走这里
  var links = document.querySelectorAll(
    '.quick-nav a[href^="#"], .zone-hit[href^="#"], .zone-chip[href^="#"], .quick-content a[href^="#"], .side-col a[href^="#"]'
  );
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href').slice(1);
      var target = findById(id);
      if (target) activate(target, id);
      // 导航类链接不让浏览器把视口甩到正文锚点：舞台才是落点
      if (link.closest('.quick-nav') || link.classList.contains('zone-hit') ||
          link.classList.contains('zone-chip')) {
        e.preventDefault();
        afterNav(target);
      }
    });
  });

  // 手动展开 / 收起折叠：标题和高亮跟随该部分
  folds.forEach(function (fold) {
    fold.addEventListener('toggle', function () {
      if (!fold.open) return;
      if (guard && guard.fold === fold && Date.now() - guard.t < 1000) return;
      setTitle(fold);
      setHighlight(partZone[fold.getAttribute('data-part')]);
      markCurrent(fold);
      setStage(fold.getAttribute('data-part'), partZone[fold.getAttribute('data-part')]);
    });
  });

  // 宽屏下当前部分的标题行只是栏标题，点它不收起
  folds.forEach(function (fold) {
    var sum = fold.querySelector(':scope > summary');
    if (sum) {
      sum.addEventListener('click', function (e) {
        if (wideMq.matches) e.preventDefault();
      });
    }
  });

  // 初始状态：第 1 部分；宽屏时右栏直接展开它
  markCurrent(folds[0]);
  setStage('1', null);
  if (wideMq.matches && !folds[0].open) {
    guard = { fold: folds[0], t: Date.now() };
    folds[0].open = true;
  }
  if (wideMq.addEventListener) {
    wideMq.addEventListener('change', function () {
      if (wideMq.matches && currentFold && !currentFold.open) {
        guard = { fold: currentFold, t: Date.now() };
        currentFold.open = true;
      }
      if (currentFold) markCurrent(currentFold);
    });
  }

  // 带锚点打开本页：展开对应折叠，视口停在舞台
  if (window.location.hash.length > 1) {
    var hid = window.location.hash.slice(1);
    var t = findById(hid);
    if (t && foldOf(t)) {
      activate(t, hid);
      setTimeout(function () { afterNav(t); }, 80);
    }
  }
})();

/* ============================================================
   第一章 · 左侧导航折叠
   导航默认只露出五大部分的标题行：一行 = 部分名链接（点了跳到
   该部分，走上面的舞台联动）+ 右端小箭头按钮（只管展开/收起
   该部分的子项，不跳转）。同时只展开一组，导航始终短短一截。
   带 #锚点进来时展开锚点所在组，否则展开第一组。
   ============================================================ */
(function () {
  'use strict';

  var parts = Array.prototype.slice.call(document.querySelectorAll('.quick-nav .qn-part'));
  if (!parts.length) return;

  function setOpen(part, open) {
    part.classList.toggle('open', open);
    var btn = part.querySelector('.qn-arrow');
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var title = part.querySelector('.qn-title');
      var name = title ? title.textContent.trim() : '';
      btn.setAttribute('aria-label', (open ? '收起' : '展开') + '「' + name + '」子项');
    }
  }

  function openOnly(part) {
    parts.forEach(function (p) { setOpen(p, p === part); });
  }

  parts.forEach(function (part) {
    var btn = part.querySelector('.qn-arrow');
    if (btn) {
      btn.addEventListener('click', function () {
        if (part.classList.contains('open')) setOpen(part, false);
        else openOnly(part);
      });
    }
    // 点部分名或任一子项：该组成为当前展开组
    Array.prototype.forEach.call(part.querySelectorAll('a[href^="#"]'), function (a) {
      a.addEventListener('click', function () { openOnly(part); });
    });
  });

  // 初始展开组：锚点目标所在部分优先，否则第一组
  var initial = parts[0];
  if (window.location.hash.length > 1) {
    var hid = window.location.hash.slice(1);
    var target = document.getElementById(hid);
    if (!target) {
      try { target = document.getElementById(decodeURIComponent(hid)); } catch (e) { /* 保持 null */ }
    }
    if (target) {
      var fold = target.closest ? target.closest('.part-fold') : null;
      if (fold) {
        var dp = fold.getAttribute('data-part');
        parts.forEach(function (p) {
          if (p.getAttribute('data-qn') === dp) initial = p;
        });
      } else {
        parts.forEach(function (p) {
          if (p.querySelector('a[href="#' + hid + '"]')) initial = p;
        });
      }
    }
  }
  openOnly(initial);
})();
