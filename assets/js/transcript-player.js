/* 第一章视频：中文逐字稿高亮 / 点击跳转 + AI 中文配音同步。
   在线（http/https）时用 YouTube IFrame API；离线或 file:// 时保持静态逐字稿（时间链接到 youtube.com），
   配音可单独播放，逐字稿跟随配音时间高亮。 */
(function () {
  var boxes = [].slice.call(document.querySelectorAll('.tx[data-video]'));
  if (!boxes.length) return;
  var DRIFT = 0.3;

  function setup(box) {
    var id = box.getAttribute('data-video');
    var st = { box: box, id: id, player: null, ready: false, cur: -1 };
    st.items = [].slice.call(box.querySelectorAll('.tx-list li')).map(function (li) {
      return { li: li, s: parseFloat(li.getAttribute('data-s')), e: parseFloat(li.getAttribute('data-e')) };
    });
    st.list = box.querySelector('.tx-list');
    if (!box.querySelector('.tx-dub')) { var _d = document.createElement('div'); _d.className = 'tx-dub'; _d.hidden = true; _d.innerHTML = '<audio class="dub-audio" preload="none"><\/audio><input type="checkbox" class="dub-on"><input type="range" class="dub-mix" value="85"><span class="dub-state"><\/span>'; box.appendChild(_d); } /* 配音已暂停：隐藏占位，字幕照常 */
    st.audio = box.querySelector('.dub-audio');
    st.dubOn = box.querySelector('.dub-on');
    st.mix = box.querySelector('.dub-mix');
    st.follow = box.querySelector('.tx-follow');
    st.status = box.querySelector('.tx-status');
    st.dubState = box.querySelector('.dub-state');
    st.dubBox = box.querySelector('.tx-dub');
    st.iframe = document.querySelector('iframe[data-yt="' + id + '"]');

    box.querySelector('.tx-en-toggle').addEventListener('change', function (e) {
      box.classList.toggle('show-en', e.target.checked);
    });
    st.items.forEach(function (it) {
      it.li.querySelector('.tx-time').addEventListener('click', function (ev) {
        if (st.ready) {
          ev.preventDefault();
          st.player.seekTo(it.s, true); st.player.playVideo();
        } else if (st.audio && !st.audio.paused) {   // 离线：配音正在单独播放时，点时间跳配音
          ev.preventDefault(); st.audio.currentTime = it.s;
        }
      });
    });
    st.dubOn.addEventListener('change', function () { applyDub(st); });
    st.mix.addEventListener('input', function () { applyVolume(st); });
    st.audio.addEventListener('loadedmetadata', function () { sync(st, true); });
    st.audio.addEventListener('timeupdate', function () { if (!st.ready || !st.dubOn.checked) highlight(st, st.audio.currentTime); });
    return st;
  }

  function vols(st) {           // 滑块：0 = 只听原声，100 = 只听配音；默认 85 → 原声 15%
    var b = +st.mix.value;
    return { orig: Math.round(100 - b), dub: Math.min(1, b / 50) };
  }
  function applyVolume(st) {
    var v = vols(st);
    st.audio.volume = st.dubOn.checked ? v.dub : 1;
    if (st.ready) st.player.setVolume(st.dubOn.checked ? v.orig : 100);
  }
  function applyDub(st) {
    st.dubBox.classList.toggle('on', st.dubOn.checked);
    applyVolume(st);
    if (!st.dubOn.checked) { if (st.ready) st.audio.pause(); st.dubState.textContent = ''; return; }
    if (!st.ready) { st.dubState.textContent = '视频接口未就绪：可直接点下方播放器单独听配音'; return; }
    st.dubState.textContent = '已开启：配音跟随视频';
    sync(st, true);
  }
  function sync(st, force) {
    if (!st.ready || !st.dubOn.checked) return;
    var state = st.player.getPlayerState();
    var t = st.player.getCurrentTime() || 0;
    var rate = st.player.getPlaybackRate ? st.player.getPlaybackRate() : 1;
    if (st.audio.playbackRate !== rate) st.audio.playbackRate = rate;
    if (state === 1) {               // PLAYING
      if (st.audio.readyState === 0) st.audio.preload = 'auto';
      if (!st.audio.seeking && st.audio.readyState >= 1 && (force || Math.abs(st.audio.currentTime - t) > DRIFT)) { try { st.audio.currentTime = t; } catch (e) {} }
      if (st.audio.paused) { var p = st.audio.play(); if (p && p.catch) p.catch(function () { st.dubState.textContent = '浏览器拦截了自动播放：请点一下配音播放器'; }); }
    } else {
      if (!st.audio.paused) st.audio.pause();
      if (force && Math.abs(st.audio.currentTime - t) > DRIFT) { try { st.audio.currentTime = t; } catch (e) {} }
    }
  }
  function highlight(st, t) {
    var idx = -1, items = st.items;
    for (var i = 0; i < items.length; i++) { if (items[i].s <= t + 0.05) idx = i; else break; }
    if (idx >= 0 && t > items[idx].e + 2.5) idx = -1;   // 音乐段落里不高亮旧句子
    if (idx === st.cur) return;
    if (st.cur >= 0) items[st.cur].li.classList.remove('on');
    st.cur = idx;
    if (idx < 0) return;
    var li = items[idx].li; li.classList.add('on');
    if (st.follow.checked && st.list.offsetParent !== null) {
      var top = li.offsetTop - st.list.offsetTop - st.list.clientHeight / 3;
      st.list.scrollTop = Math.max(0, top);
    }
  }

  var states = boxes.map(setup);
  var online = /^https?:$/.test(location.protocol);
  if (!online) return;   // file:// 等：保留静态逐字稿 + 单独配音
  states.forEach(function (st) { if (st.iframe) st.status.textContent = '正在连接视频…'; });

  function initPlayers() {
    states.forEach(function (st) {
      if (!st.iframe) return;
      st.player = new YT.Player(st.iframe, {
        events: {
          onReady: function () {
            st.ready = true; st.status.textContent = '点时间即跳到视频对应位置；播放时当前句高亮';
            applyVolume(st);
            if (st.dubOn.checked) applyDub(st);
          },
          onStateChange: function () { sync(st, true); },
          onPlaybackRateChange: function () { sync(st, true); }
        }
      });
    });
    setInterval(function () {
      states.forEach(function (st) {
        if (!st.ready) return;
        var t = st.player.getCurrentTime ? st.player.getCurrentTime() : 0;
        var ps = st.player.getPlayerState();
        if (ps === 1 || ps === 2 || ps === 3) highlight(st, t);
        sync(st, false);
      });
    }, 250);
  }
  var prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () { if (prev) prev(); initPlayers(); };
  if (window.YT && window.YT.Player) { initPlayers(); return; }
  var s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = function () { states.forEach(function (st) { st.status.textContent = '视频接口加载失败：点时间会在 YouTube 打开对应位置'; }); };
  document.head.appendChild(s);
})();
