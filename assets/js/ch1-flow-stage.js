/* ============================================================
   第一章 · 流程引导上舞台（ch1-flow-stage.js）
   §4 两个跟做流程（tutorial-flows.js 渲染）走步时，把当前步
   要按的键同步标到舞台插画机器上：键位高亮框 + 上方引导箭头，
   点「下一步」跟着移到下一个键；流程结束、离开第 4 部分、
   或舞台切成实时机器时标记消失。
   键位坐标（百分比）按面板源图的键位标定：x/y 是键中心，
   w/h 是键的宽高（相对整图）。只读流程现有的 .flow-step /
   .flow-key 结构，不改 tutorial-flows.js。
   ============================================================ */
(function () {
  'use strict';

  var pan = document.getElementById('zm-pan');
  if (!pan) return;
  var fold4 = document.querySelector('.part-fold[data-part="4"]');
  var liveBox = document.getElementById('live-box');
  var stageMap = document.querySelector('.zone-map2');
  var flows = Array.prototype.slice.call(document.querySelectorAll('.flow'));
  if (!flows.length) return;

  var KEY_POS = {
    'SAMPLE':        { x: 10.25, y: 32.67, w: 7.13, h: 3.32 },
    'SEQ':           { x: 19.70, y: 32.67, w: 7.13, h: 3.32 },
    'PAD FX':        { x: 10.25, y: 37.87, w: 7.13, h: 3.32 },
    'KNOB FX':       { x: 19.70, y: 37.87, w: 7.13, h: 3.32 },
    'SHIFT':         { x: 10.25, y: 45.02, w: 7.13, h: 3.32 },
    'PAD BANK':      { x: 19.70, y: 45.02, w: 7.13, h: 3.32 },
    'FADER':         { x: 14.97, y: 62.19, w: 5.27, h: 8.58 },
    'ERASE':         { x: 10.25, y: 79.46, w: 7.13, h: 3.32 },
    'NOTE REPEAT':   { x: 19.70, y: 79.46, w: 7.13, h: 3.32 },
    'K1':            { x: 32.13, y: 35.27, w: 7.20, h: 6.20 },
    'K2':            { x: 50.00, y: 35.27, w: 7.20, h: 6.20 },
    'K3':            { x: 67.61, y: 35.27, w: 7.20, h: 6.20 },
    'PAD 13':        { x: 32.10, y: 46.32, w: 9.96, h: 8.58 },
    'PAD 16':        { x: 67.70, y: 46.32, w: 9.96, h: 8.58 },
    'PADS':          { x: 49.90, y: 61.69, w: 45.57, h: 39.31 },
    'CHOP':          { x: 80.14, y: 32.67, w: 7.07, h: 3.32 },
    'MUTE':          { x: 89.62, y: 32.67, w: 7.13, h: 3.32 },
    'LOOP':          { x: 80.14, y: 37.87, w: 7.07, h: 3.32 },
    'SAMPLE SELECT': { x: 80.14, y: 45.02, w: 7.07, h: 3.32 },
    'TAP TEMPO':     { x: 89.62, y: 45.02, w: 7.13, h: 3.32 },
    'ENCODER':       { x: 84.77, y: 56.59, w: 8.61, h: 7.42 },
    'SAMPLE RECORD': { x: 80.14, y: 72.67, w: 7.07, h: 4.49 },
    'SEQ RECORD':    { x: 89.62, y: 72.67, w: 7.13, h: 4.49 },
    'STOP':          { x: 80.14, y: 79.02, w: 7.07, h: 4.43 },
    'PLAY':          { x: 89.62, y: 79.02, w: 7.13, h: 4.43 }
  };

  // 流程步骤里的键名 → 舞台键位；泛指的垫子（「同一个 PAD」等）标整片垫区；
  // POWER / USB-C 线在机器后面板上，顶面图没有，不出标记。
  function normKey(text) {
    var t = (text || '').trim();
    if (Object.prototype.hasOwnProperty.call(KEY_POS, t)) return t;
    if (t.indexOf('PAD') >= 0 || t.indexOf('垫') >= 0) return 'PADS';
    return null;
  }

  var arrow = document.createElement('div');
  arrow.className = 'flow-arrow';
  arrow.textContent = '▼';
  arrow.hidden = true;
  pan.appendChild(arrow);

  var boxes = [];
  function getBox(i) {
    if (!boxes[i]) {
      var b = document.createElement('div');
      b.className = 'flow-keybox';
      b.hidden = true;
      pan.appendChild(b);
      boxes[i] = b;
    }
    return boxes[i];
  }

  // 两条流程并行存在：以用户最近操作的那条为准（没操作过默认第一条）
  var activeFlow = flows[0];
  flows.forEach(function (f) {
    f.addEventListener('click', function () { activeFlow = f; });
  });

  function place(el, pos) {
    el.style.left = (pos.x - pos.w / 2) + '%';
    el.style.top = (pos.y - pos.h / 2) + '%';
    el.style.width = pos.w + '%';
    el.style.height = pos.h + '%';
  }

  function hideAll() {
    arrow.hidden = true;
    boxes.forEach(function (b) { b.hidden = true; });
  }

  var lastSig = '';
  function tick() {
    var stageOk = fold4 && fold4.open &&
      (!liveBox || liveBox.hidden) &&
      !(stageMap && (stageMap.classList.contains('zoom-screen') ||
                     stageMap.classList.contains('zoom-knobs')));
    var card = stageOk && activeFlow
      ? activeFlow.querySelector('.flow-step.is-current') : null;
    var keys = [];
    if (card) {
      Array.prototype.forEach.call(card.querySelectorAll('.flow-key'), function (c) {
        var k = normKey(c.textContent);
        if (k && keys.indexOf(k) < 0) keys.push(k);
      });
    }
    if (!keys.length) {
      if (lastSig) { hideAll(); lastSig = ''; }
      return;
    }
    var sig = keys.join(',');
    if (sig === lastSig) return;
    lastSig = sig;
    keys.forEach(function (k, i) {
      var b = getBox(i);
      place(b, KEY_POS[k]);
      b.hidden = false;
    });
    for (var j = keys.length; j < boxes.length; j++) boxes[j].hidden = true;
    var p = KEY_POS[keys[0]];
    arrow.style.left = p.x + '%';
    arrow.style.top = (p.y - p.h / 2) + '%';
    arrow.hidden = false;
  }

  setInterval(tick, 300);
  tick();
})();
