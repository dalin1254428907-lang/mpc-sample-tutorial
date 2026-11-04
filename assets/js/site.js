/* MPC Sample 图文教程 —— 渐进增强与交互脚本 */
(function () {
  "use strict";

  // ==========================================
  // 1) 编号表第一列 → 红色圆点
  // ==========================================
  function initMarkers() {
    document.querySelectorAll(".legend table tbody tr, .marker-table table tbody tr").forEach(function (tr) {
      var td = tr.querySelector("td");
      if (td && /^\d+$/.test(td.textContent.trim())) {
        td.innerHTML = '<span class="marker">' + td.textContent.trim() + "</span>";
      }
    });
  }

  // ==========================================
  // 2) 术语表：三语切换 + 分类筛选 + 实时搜索
  // ==========================================
  function initGlossary() {
    var g = document.querySelector(".glossary");
    if (!g) return;

    var groups = [];
    g.querySelectorAll("h3").forEach(function (h) {
      var t = h.nextElementSibling;
      while (t && t.tagName !== "TABLE" && t.tagName !== "H3") t = t.nextElementSibling;
      if (t && t.tagName === "TABLE") {
        groups.push({ cat: h.textContent.trim(), h: h, t: t });
        t.querySelectorAll("tr").forEach(function (tr) {
          var c = tr.children;
          if (c[1]) c[1].classList.add("col-zh");
          if (c[2]) c[2].classList.add("col-ja");
        });
      }
    });

    var currentView = "";
    var currentCat = "全部";
    var currentQuery = "";
    var searchInput = document.getElementById("glossary-search");
    var searchCount = document.getElementById("search-count");

    function applyFilter() {
      var totalMatches = 0;
      var totalRows = 0;

      groups.forEach(function (grp) {
        var catMatch = currentCat === "全部" || grp.cat === currentCat;
        var groupMatches = 0;
        var rows = grp.t.querySelectorAll("tbody tr");

        rows.forEach(function (tr) {
          totalRows++;
          var rowText = tr.textContent.toLowerCase();
          var queryMatch = !currentQuery || rowText.indexOf(currentQuery) !== -1;
          if (catMatch && queryMatch) {
            tr.style.display = "";
            groupMatches++;
            totalMatches++;
          } else {
            tr.style.display = "none";
          }
        });

        var showGroup = catMatch && groupMatches > 0;
        grp.h.classList.toggle("hidden", !showGroup);
        grp.t.classList.toggle("hidden", !showGroup);
      });

      if (searchCount) {
        if (currentQuery) {
          searchCount.textContent = "找到 " + totalMatches + " 条匹配项";
        } else {
          searchCount.textContent = "共 " + totalRows + " 条术语";
        }
      }
    }

    // 控件栏生成辅助
    function createButtonBar(items, cls, onPick) {
      var d = document.createElement("div");
      d.className = "chips glossary-controls " + cls;
      items.forEach(function (it, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (i === 0 ? " on" : "");
        b.textContent = it;
        b.addEventListener("click", function () {
          d.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          onPick(it);
        });
        d.appendChild(b);
      });
      return d;
    }

    var views = { "三语": "", "英中": "view-enzh", "英日": "view-enja" };
    var vbar = createButtonBar(Object.keys(views), "views", function (v) {
      g.classList.remove("view-enzh", "view-enja");
      if (views[v]) g.classList.add(views[v]);
      currentView = views[v];
    });

    var cbar = createButtonBar(["全部"].concat(groups.map(function (x) { return x.cat; })), "cats", function (c) {
      currentCat = c;
      applyFilter();
    });

    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        currentQuery = e.target.value.trim().toLowerCase();
        applyFilter();
      });
    }

    g.insertBefore(cbar, g.firstChild);
    g.insertBefore(vbar, g.firstChild);
    applyFilter();
  }

  // ==========================================
  // 3) 面板图灯箱 (Lightbox)
  // ==========================================
  function initLightbox() {
    var figures = document.querySelectorAll(".fig-wrap");
    if (!figures.length) return;

    var lb = document.getElementById("fig-lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "fig-lightbox";
      lb.className = "fig-lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "面板图放大查看");
      lb.innerHTML = [
        '<div class="lightbox-body">',
        '  <button type="button" class="lightbox-close" aria-label="关闭灯箱">✕</button>',
        '  <div class="lightbox-content"></div>',
        '  <div class="lightbox-caption"></div>',
        "</div>"
      ].join("\n");
      document.body.appendChild(lb);
    }

    var lbContent = lb.querySelector(".lightbox-content");
    var lbCaption = lb.querySelector(".lightbox-caption");
    var closeBtn = lb.querySelector(".lightbox-close");

    function closeLightbox() {
      lb.classList.remove("is-open");
      lbContent.innerHTML = "";
      lbCaption.innerHTML = "";
      document.body.style.overflow = "";
    }

    function openLightbox(figWrap) {
      var target = figWrap.querySelector("svg") || figWrap.querySelector("img");
      if (!target) return;

      var clone = target.cloneNode(true);
      lbContent.innerHTML = "";
      lbContent.appendChild(clone);

      var captionText = "";
      var figCap = figWrap.querySelector(".caption-text, figcaption, .caption");
      if (figCap) {
        captionText = figCap.textContent.trim();
      } else if (target.getAttribute("aria-label")) {
        captionText = target.getAttribute("aria-label");
      } else {
        var titleElem = target.querySelector("title");
        if (titleElem) captionText = titleElem.textContent.trim();
      }

      lbCaption.textContent = captionText;
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    figures.forEach(function (fig) {
      fig.setAttribute("title", "点击或悬停放大查看图解与说明");
      fig.addEventListener("click", function (e) {
        // 允许直接点击打开灯箱
        openLightbox(fig);
      });
    });

    closeBtn.addEventListener("click", closeLightbox);
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lightbox-body")) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) {
        closeLightbox();
      }
    });
  }

  // ==========================================
  // 4) 04 参考页：Sticky 侧边目录 与 回到顶部
  // ==========================================
  function initStickyTOC() {
    var tocContainer = document.getElementById("auto-toc");
    var contentArea = document.getElementById("chapter-content") || document.querySelector(".wrap");
    if (!contentArea) return;

    // 回到顶部浮动按钮
    var floatBtn = document.getElementById("back-to-top-float");
    if (!floatBtn) {
      floatBtn = document.createElement("button");
      floatBtn.id = "back-to-top-float";
      floatBtn.type = "button";
      floatBtn.innerHTML = "↑ 回到顶部";
      floatBtn.setAttribute("aria-label", "回到页面顶部");
      document.body.appendChild(floatBtn);
    }

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    floatBtn.addEventListener("click", scrollToTop);

    var sidebarTopBtn = document.getElementById("back-to-top");
    if (sidebarTopBtn) {
      sidebarTopBtn.addEventListener("click", scrollToTop);
    }

    window.addEventListener("scroll", function () {
      if (window.scrollY > 280) {
        floatBtn.classList.add("is-visible");
      } else {
        floatBtn.classList.remove("is-visible");
      }
    }, { passive: true });

    // 若有侧边目录容器，自动扫描 h2, h3
    if (tocContainer) {
      var headings = contentArea.querySelectorAll("h2, h3");
      if (!headings.length) return;

      var ul = document.createElement("ul");
      var tocLinks = [];

      headings.forEach(function (h, idx) {
        if (!h.id) {
          h.id = "sec-" + (h.tagName.toLowerCase()) + "-" + (idx + 1);
        }

        var li = document.createElement("li");
        li.className = "toc-item-" + h.tagName.toLowerCase();

        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent.replace(/^#+\s*/, "").trim();

        a.addEventListener("click", function (e) {
          e.preventDefault();
          var targetEl = document.getElementById(h.id);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            history.pushState(null, "", "#" + h.id);
          }
        });

        li.appendChild(a);
        ul.appendChild(li);
        tocLinks.push({ heading: h, link: a });
      });

      tocContainer.innerHTML = "";
      tocContainer.appendChild(ul);

      // ScrollSpy 滚动高亮当前章节
      function updateActiveToc() {
        var scrollPos = window.scrollY + 120;
        var activeItem = null;

        for (var i = 0; i < tocLinks.length; i++) {
          var rect = tocLinks[i].heading.getBoundingClientRect();
          var top = rect.top + window.scrollY;
          if (top <= scrollPos) {
            activeItem = tocLinks[i];
          } else {
            break;
          }
        }

        tocLinks.forEach(function (it) {
          it.link.classList.remove("on");
        });

        if (activeItem) {
          activeItem.link.classList.add("on");
        }
      }

      window.addEventListener("scroll", updateActiveToc, { passive: true });
      updateActiveToc();
    }
  }

  // ==========================================
  // 5) Web Audio 可互动采样演示 (Sampling Demo)
  // ==========================================
  function initSamplingDemo() {
    var demoEl = document.getElementById("sampling-demo");
    if (!demoEl) return;

    var audioCtx = null;
    var audioBuffer = null;
    var duration = 2.4; // 2.4 秒经典 4 拍 lo-fi / boom-bap 循环
    var sampleRate = 44100;
    var trimStartPct = 0;
    var trimEndPct = 100;

    var canvas = document.getElementById("waveform-canvas");
    var ctx = canvas ? canvas.getContext("2d") : null;
    var startInput = document.getElementById("trim-start");
    var endInput = document.getElementById("trim-end");
    var labelStart = document.getElementById("label-start");
    var labelEnd = document.getElementById("label-end");
    var labelDur = document.getElementById("label-duration");
    var statusDot = document.getElementById("demo-status-dot");
    var playTrimBtn = document.getElementById("btn-play-trimmed");
    var regenBtn = document.getElementById("btn-synth-regen");
    var padsContainer = document.getElementById("mpc-pads");

    function getAudioContext() {
      if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      if (statusDot) statusDot.classList.add("active");
      return audioCtx;
    }

    // Web Audio 纯算法合成一段 Hip-Hop 鼓组 + Rhodes 和弦采样
    function synthesizeBeatBuffer() {
      var actx = getAudioContext();
      var frames = Math.floor(actx.sampleRate * duration);
      var buffer = actx.createBuffer(2, frames, actx.sampleRate);
      var left = buffer.getChannelData(0);
      var right = buffer.getChannelData(1);
      var sr = actx.sampleRate;

      // 4 拍时间点 (0.0s, 0.6s, 1.2s, 1.8s)
      var beatLen = duration / 4;

      for (var i = 0; i < frames; i++) {
        var t = i / sr;
        var sample = 0;

        // 1. 底鼓 Kick (拍 1 位于 0s，拍 3 位于 1.2s，伴随 1.5s 附点切分)
        [0, 1.2, 1.5].forEach(function (hitTime) {
          if (t >= hitTime && t < hitTime + 0.35) {
            var dt = t - hitTime;
            var freq = 130 * Math.exp(-dt * 24) + 45;
            var kickEnv = Math.exp(-dt * 12);
            sample += Math.sin(2 * Math.PI * freq * dt) * kickEnv * 0.9;
          }
        });

        // 2. 军鼓 Snare (拍 2 位于 0.6s，拍 4 位于 1.8s，伴随 2.1s 幽灵音)
        [0.6, 1.8, 2.1].forEach(function (hitTime, hIdx) {
          if (t >= hitTime && t < hitTime + 0.28) {
            var dt = t - hitTime;
            var isGhost = (hIdx === 2);
            var vol = isGhost ? 0.3 : 0.75;
            var tone = Math.sin(2 * Math.PI * 185 * dt) * Math.exp(-dt * 22);
            var noise = (Math.random() * 2 - 1) * Math.exp(-dt * (isGhost ? 32 : 16));
            sample += (tone * 0.4 + noise * 0.6) * vol;
          }
        });

        // 3. 踩镲 Hi-Hat (每 0.3s 出现 8 分音符)
        for (var b = 0; b < 8; b++) {
          var hatTime = b * 0.3;
          if (t >= hatTime && t < hatTime + 0.1) {
            var dt = t - hatTime;
            var open = (b === 5); // 稍微开镲
            var decay = open ? 14 : 45;
            var hatNoise = (Math.random() * 2 - 1) * Math.exp(-dt * decay);
            sample += hatNoise * (open ? 0.25 : 0.16);
          }
        }

        // 4. 复古电钢琴/Rhodes 爵士和弦 (Fm9 和弦: F3, Ab3, C4, Eb4, G4)
        var chordNotes = [174.61, 207.65, 261.63, 311.13, 392.00];
        var chordEnv = Math.exp(-((t % (duration / 2)) * 1.5));
        var chordSignal = 0;
        for (var k = 0; k < chordNotes.length; k++) {
          var f = chordNotes[k];
          chordSignal += Math.sin(2 * Math.PI * f * t) * 0.15;
          // 泛音
          chordSignal += Math.sin(2 * Math.PI * f * 2 * t) * 0.05;
        }
        sample += chordSignal * chordEnv * 0.4;

        // 5. 磁带黑胶底噪 Vinyl Crackle (微弱背景质感)
        if (Math.random() < 0.003) {
          sample += (Math.random() * 2 - 1) * 0.08;
        }

        // 软限幅防过载
        sample = Math.tanh(sample);

        left[i] = sample;
        right[i] = sample;
      }

      audioBuffer = buffer;
      drawWaveform();
      updatePadsInfo();
    }

    // 绘制波形与修剪区间
    function drawWaveform(playheadSec) {
      if (!ctx || !canvas || !audioBuffer) return;

      var w = canvas.width = canvas.clientWidth * window.devicePixelRatio || 600;
      var h = canvas.height = canvas.clientHeight * window.devicePixelRatio || 120;

      ctx.clearRect(0, 0, w, h);

      // 背景网格
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(52, 52, 61, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      var data = audioBuffer.getChannelData(0);
      var step = Math.ceil(data.length / w);
      var amp = h / 2.2;

      var startX = (trimStartPct / 100) * w;
      var endX = (trimEndPct / 100) * w;

      // 绘制波形柱
      for (var x = 0; x < w; x++) {
        var min = 1.0;
        var max = -1.0;
        for (var j = 0; j < step; j++) {
          var datum = data[(x * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        var isTrimmed = (x >= startX && x <= endX);
        ctx.fillStyle = isTrimmed ? "#00E5FF" : "#34343D";
        ctx.fillRect(x, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
      }

      // 未选中区域半透明遮罩
      ctx.fillStyle = "rgba(11, 11, 13, 0.65)";
      ctx.fillRect(0, 0, startX, h);
      ctx.fillRect(endX, 0, w - endX, h);

      // 绘制 8 个切片参考分割线
      ctx.strokeStyle = "rgba(255, 229, 0, 0.4)";
      ctx.setLineDash([4, 4]);
      var sliceWidth = (endX - startX) / 8;
      for (var s = 1; s < 8; s++) {
        var sx = startX + s * sliceWidth;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 起点与终点手柄标注线
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#FFE500";
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, h);
      ctx.stroke();

      // 播放头光标
      if (typeof playheadSec === "number") {
        var curX = (playheadSec / duration) * w;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#FF3B3B";
        ctx.shadowColor = "#FF3B3B";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(curX, 0);
        ctx.lineTo(curX, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 播放指定时间区间的音频
    var activeSource = null;
    function playAudioSlice(startSec, sliceDur, onFinish) {
      var actx = getAudioContext();
      if (!audioBuffer) return;

      if (activeSource) {
        try { activeSource.stop(); } catch (err) {}
      }

      var source = actx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(actx.destination);
      source.start(0, startSec, sliceDur);
      activeSource = source;

      var startTime = actx.currentTime;
      var animId;
      function step() {
        var elapsed = actx.currentTime - startTime;
        if (elapsed <= sliceDur) {
          drawWaveform(startSec + elapsed);
          animId = requestAnimationFrame(step);
        } else {
          drawWaveform();
          if (onFinish) onFinish();
        }
      }
      step();

      source.onended = function () {
        cancelAnimationFrame(animId);
        drawWaveform();
        if (onFinish) onFinish();
      };
    }

    // 更新 8 个打击垫的时间提示与状态
    function updatePadsInfo() {
      var startSec = (trimStartPct / 100) * duration;
      var endSec = (trimEndPct / 100) * duration;
      var totalSliceTime = Math.max(0.01, endSec - startSec);
      var sliceLen = totalSliceTime / 8;

      if (labelStart) labelStart.textContent = startSec.toFixed(2) + "s";
      if (labelEnd) labelEnd.textContent = endSec.toFixed(2) + "s";
      if (labelDur) labelDur.textContent = totalSliceTime.toFixed(2) + "s";

      var pads = demoEl.querySelectorAll(".mpc-pad-btn");
      pads.forEach(function (pad, idx) {
        var pStart = startSec + idx * sliceLen;
        var pEnd = pStart + sliceLen;
        var timeEl = pad.querySelector(".pad-slice-time");
        if (timeEl) {
          timeEl.textContent = pStart.toFixed(2) + "s - " + pEnd.toFixed(2) + "s";
        }
      });
    }

    // 触发单个切片播放
    function triggerPadSlice(padIndex) {
      var startSec = (trimStartPct / 100) * duration;
      var endSec = (trimEndPct / 100) * duration;
      var sliceLen = Math.max(0.01, endSec - startSec) / 8;
      var sliceStart = startSec + padIndex * sliceLen;

      var padBtn = demoEl.querySelector('.mpc-pad-btn[data-pad="' + (padIndex + 1) + '"]');
      if (padBtn) padBtn.classList.add("is-hitting");

      playAudioSlice(sliceStart, sliceLen, function () {
        if (padBtn) padBtn.classList.remove("is-hitting");
      });
    }

    // 绑定修剪滑块
    if (startInput && endInput) {
      startInput.addEventListener("input", function () {
        var sVal = parseFloat(startInput.value);
        var eVal = parseFloat(endInput.value);
        if (sVal >= eVal) {
          sVal = Math.max(0, eVal - 5);
          startInput.value = sVal;
        }
        trimStartPct = sVal;
        drawWaveform();
        updatePadsInfo();
      });

      endInput.addEventListener("input", function () {
        var sVal = parseFloat(startInput.value);
        var eVal = parseFloat(endInput.value);
        if (eVal <= sVal) {
          eVal = Math.min(100, sVal + 5);
          endInput.value = eVal;
        }
        trimEndPct = eVal;
        drawWaveform();
        updatePadsInfo();
      });
    }

    // 绑定打击垫点击事件
    if (padsContainer) {
      padsContainer.querySelectorAll(".mpc-pad-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var padNum = parseInt(btn.getAttribute("data-pad"), 10) - 1;
          triggerPadSlice(padNum);
        });
      });
    }

    // 键盘数字键 1–8 触发打击垫
    window.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      var num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        triggerPadSlice(num - 1);
      }
    });

    // 播放完整选区
    if (playTrimBtn) {
      playTrimBtn.addEventListener("click", function () {
        var startSec = (trimStartPct / 100) * duration;
        var endSec = (trimEndPct / 100) * duration;
        playAudioSlice(startSec, endSec - startSec);
      });
    }

    // 重新合成声音
    if (regenBtn) {
      regenBtn.addEventListener("click", function () {
        synthesizeBeatBuffer();
      });
    }

    // 首次交互时合成音频
    demoEl.addEventListener("click", function onFirstClick() {
      if (!audioBuffer) {
        synthesizeBeatBuffer();
      }
      demoEl.removeEventListener("click", onFirstClick);
    }, { once: true });

    // 初始渲染一次波形骨架
    window.addEventListener("resize", function () {
      drawWaveform();
    });
    setTimeout(function () {
      synthesizeBeatBuffer();
    }, 150);
  }

  // ==========================================
  // 初始化运行
  // ==========================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initMarkers();
      initGlossary();
      initLightbox();
      initStickyTOC();
      initSamplingDemo();
    });
  } else {
    initMarkers();
    initGlossary();
    initLightbox();
    initStickyTOC();
    initSamplingDemo();
  }
})();
