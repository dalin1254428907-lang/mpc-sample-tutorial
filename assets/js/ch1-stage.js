/* ============================================================
   第一章 · 机器舞台（ch1-stage.js）
   整章只有一台机器立在顶部（#zone-map 舞台）：
   - 点左侧导航（或舞台分区、色签、正文里的本页锚点链接）时，
     打开目标所在的「五大部分」折叠、把舞台标题换成该部分标题、
     并点亮舞台上对应的区域；
   - 手动展开某个折叠时，标题和高亮也跟着该部分走；
   - 带 #锚点打开本页时，同样展开对应折叠。
   机器始终是同一张图；只有第 3 部分折叠里是实时机器。
   ============================================================ */
(function () {
  'use strict';

  var titleEl = document.getElementById('stage-title');
  if (!titleEl) return;
  var folds = Array.prototype.slice.call(document.querySelectorAll('.part-fold'));
  if (!folds.length) return;

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

  // 程序化打开折叠时，toggle 事件随后会异步触发；用这个标记让 toggle 处理
  // 跳过同一次打开，避免把刚点亮的子区域高亮又冲掉。
  var guard = null;

  function activate(target, id) {
    var fold = foldOf(target);
    if (!fold) {
      // 舞台自身（#zone-map 等不在折叠里的目标）：回到第 1 部分
      setTitle(folds[0]);
      setHighlight(null);
      return;
    }
    if (!fold.open) {
      guard = { fold: fold, t: Date.now() };
      fold.open = true;
    }
    setTitle(fold);
    var zone = id ? zoneFor(id, target) : partZone[fold.getAttribute('data-part')];
    if (zone !== undefined) setHighlight(zone);
  }

  // 左侧导航、舞台分区与色签、正文中的本页锚点链接，统一走这里
  var links = document.querySelectorAll(
    '.quick-nav a[href^="#"], .zone-hit[href^="#"], .zone-chip[href^="#"], .quick-content a[href^="#"]'
  );
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function () {
      var id = link.getAttribute('href').slice(1);
      var target = findById(id);
      if (target) activate(target, id);
    });
  });

  // 手动展开 / 收起折叠：标题和高亮跟随该部分
  folds.forEach(function (fold) {
    fold.addEventListener('toggle', function () {
      if (!fold.open) return;
      if (guard && guard.fold === fold && Date.now() - guard.t < 1000) return;
      setTitle(fold);
      setHighlight(partZone[fold.getAttribute('data-part')]);
    });
  });

  // 带锚点打开本页：展开对应折叠并滚到位
  if (window.location.hash.length > 1) {
    var hid = window.location.hash.slice(1);
    var t = findById(hid);
    if (t && foldOf(t)) {
      activate(t, hid);
      setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 80);
    }
  }
})();
