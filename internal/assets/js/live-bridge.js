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
