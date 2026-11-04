/* ============================================================
   v5 本地修订（Alder，2026-11-04）—— 第一章（01-functions.html）
   批注 #3：1.1 加「采样交互」——电脑上点垫出声、可录麦克风、
            可切 4/8/16 片；插了 MPC 时可用 Web MIDI 敲真垫触发。
   批注 #4：工程图加动态反馈——点 Bank / 序列，图跟着变。
   示范声音全部由代码现场合成，不用任何版权采样。
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

  /* ================= 采样交互台 ================= */
  var concept1 = null;
  $$('.concept').forEach(function (c) {
    if (!concept1 && c.textContent.indexOf('新概念 ①') !== -1) concept1 = c;
  });

  if (concept1) {
    var AC = null, buffer = null, slices = 8, mediaRec = null, chunks = [];
    function ac() {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      return AC;
    }
    // 示范声音：一段 2 秒的合成和弦琶音（手动算采样点，不依赖任何音频文件）
    function makeDemoBuffer() {
      var ctx = ac(), sr = ctx.sampleRate, dur = 2.0;
      var buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
      var ch = buf.getChannelData(0);
      var notes = [60, 64, 67, 72, 67, 64, 60, 55]; // C E G C' G E C G
      var seg = dur / notes.length;
      for (var i = 0; i < ch.length; i++) {
        var t = i / sr, idx = Math.min(notes.length - 1, Math.floor(t / seg));
        var lt = t - idx * seg;
        var f = 440 * Math.pow(2, (notes[idx] - 69) / 12);
        var envv = Math.exp(-lt * 5);
        ch[i] = (Math.sin(2 * Math.PI * f * lt) * 0.7 +
                 Math.sin(2 * Math.PI * f * 2 * lt) * 0.25) * envv * 0.8;
      }
      return buf;
    }

    var card = el('div', 'v5-card');
    card.innerHTML =
      '<h3>动手试一下：采样 → 切片 → 敲垫出声（网页版采样器）</h3>' +
      '<p class="v5-note">这就是 1.1 讲的流程，搬到网页里了：先有一段声音 → 切成几片 → 每片放一个垫 → 点垫（或按键盘 1–9、0、Q–U）就响。' +
      '在真机上对应：<b>SAMPLE RECORD</b> 录声音 → <b>CHOP</b> 切片 → 敲 <b>PAD</b> 出声。声音是代码合成的示范音，也可以点「录一段」换成你自己的声音。</p>';
    var wave = el('canvas', 'v5-wave'); wave.width = 880; wave.height = 84;
    var status = el('div', 'v5-status', '已载入示范声音，点下面的垫试试。');
    var row1 = el('div', 'v5-row');
    var bPlay = el('button', 'v5-btn', '▶ 播放整段'); bPlay.type = 'button';
    var bRec = el('button', 'v5-btn', '🎤 录一段自己的声音'); bRec.type = 'button';
    var bMidi = el('button', 'v5-btn', '连接 MPC（Web MIDI）'); bMidi.type = 'button';
    row1.appendChild(bPlay); row1.appendChild(bRec); row1.appendChild(bMidi);
    var row2 = el('div', 'v5-row', '<span class="v5-note">切成几片：</span>');
    [4, 8, 16].forEach(function (n) {
      var b = el('button', 'v5-btn' + (n === slices ? ' on' : ''), n + ' 片');
      b.type = 'button';
      b.addEventListener('click', function () {
        slices = n;
        $$('.v5-btn', row2).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        buildPads(); drawWave();
      });
      row2.appendChild(b);
    });
    var padsBox = el('div', 'v5-pads');
    card.appendChild(wave); card.appendChild(row1); card.appendChild(row2);
    card.appendChild(padsBox); card.appendChild(status);
    concept1.parentNode.insertBefore(card, concept1.nextSibling);

    function drawWave() {
      var g = wave.getContext && wave.getContext('2d');
      if (!g) return; // 个别浏览器拿不到 canvas 时跳过画波形，不影响出声
      var W = wave.width, H = wave.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#0e0e12'; g.fillRect(0, 0, W, H);
      if (!buffer) return;
      var data = buffer.getChannelData(0), step = Math.ceil(data.length / W);
      g.strokeStyle = '#00E5FF'; g.beginPath();
      for (var x = 0; x < W; x++) {
        var min = 1, max = -1;
        for (var j = 0; j < step; j++) {
          var v = data[Math.min(data.length - 1, x * step + j)];
          if (v < min) min = v; if (v > max) max = v;
        }
        g.moveTo(x, (1 + min) * H / 2); g.lineTo(x, (1 + max) * H / 2);
      }
      g.stroke();
      g.strokeStyle = '#FFE500'; g.setLineDash([5, 4]);
      for (var s = 1; s < slices; s++) {
        var x = Math.floor(W * s / slices);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      }
      g.setLineDash([]);
    }
    function playSlice(i, vel) {
      if (!buffer) return;
      var ctx = ac(), dur = buffer.duration / slices;
      var src = ctx.createBufferSource(); src.buffer = buffer;
      var g = ctx.createGain(); g.gain.value = Math.max(0.15, Math.min(1, vel == null ? 0.95 : vel));
      src.connect(g); g.connect(ctx.destination);
      src.start(0, i * dur, dur + 0.02);
      var pad = padsBox.children[i];
      if (pad) { pad.classList.add('hit'); setTimeout(function () { pad.classList.remove('hit'); }, 160); }
      status.textContent = '正在放第 ' + (i + 1) + ' 片（共 ' + slices + ' 片）。在真机上，这一下就是敲中了放着这片声音的那个垫。';
    }
    function buildPads() {
      padsBox.innerHTML = '';
      var keys = '1234567890QWERTY'.split('');
      for (var i = 0; i < slices; i++) {
        (function (i) {
          var p = el('button', 'v5-pad', 'PAD ' + (i + 1) + '<small>切片 ' + (i + 1) + (keys[i] ? ' · 键 ' + keys[i] : '') + '</small>');
          p.type = 'button';
          p.addEventListener('click', function () { playSlice(i, 0.95); });
          padsBox.appendChild(p);
        })(i);
      }
    }
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var keys = '1234567890QWERTY';
      var i = keys.indexOf((e.key || '').toUpperCase());
      if (i >= 0 && i < slices && card.getBoundingClientRect().bottom > 0) playSlice(i, 0.95);
    });
    bPlay.addEventListener('click', function () {
      if (!buffer) return;
      var ctx = ac(), src = ctx.createBufferSource();
      src.buffer = buffer; src.connect(ctx.destination); src.start();
      status.textContent = '正在播放整段原声。这段声音切开以后，就是下面每个垫里的东西。';
    });
    bRec.addEventListener('click', function () {
      if (mediaRec && mediaRec.state === 'recording') { mediaRec.stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = '这个浏览器不让网页用麦克风，换 Chrome 打开就能录。';
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = [];
        mediaRec = new MediaRecorder(stream);
        mediaRec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        mediaRec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          bRec.textContent = '🎤 录一段自己的声音';
          new Blob(chunks).arrayBuffer().then(function (ab) {
            return ac().decodeAudioData(ab);
          }).then(function (buf) {
            buffer = buf; drawWave(); buildPads();
            status.textContent = '录好了（' + buf.duration.toFixed(1) + ' 秒），已经自动切成 ' + slices + ' 片放到垫上，点垫听听。';
          }).catch(function () { status.textContent = '录音解码失败，换个浏览器再试一次。'; });
        };
        mediaRec.start();
        bRec.textContent = '⏹ 停止录音（最长 6 秒）';
        status.textContent = '正在录…随便说一句话或拍一下手。';
        setTimeout(function () { if (mediaRec && mediaRec.state === 'recording') mediaRec.stop(); }, 6000);
      }).catch(function () { status.textContent = '没有拿到麦克风权限，检查一下浏览器地址栏的麦克风开关。'; });
    });
    /* Web MIDI：收到真机垫子的音符就触发对应切片。垫位编号以实机为准：
       这里把收到的不同音符按从小到大排，依次对应垫 1、2、3…，并在状态行报出来。 */
    var seenNotes = [];
    bMidi.addEventListener('click', function () {
      if (!navigator.requestMIDIAccess) {
        status.textContent = '这个浏览器没有 Web MIDI（Safari 不支持），请用 Chrome 或 Edge 打开，并先在机器上把 MIDI 输出设为 USB（SHIFT+PAD 8 的设置以实机屏幕为准，待确认）。';
        return;
      }
      navigator.requestMIDIAccess().then(function (access) {
        var n = 0;
        access.inputs.forEach(function (input) {
          n++;
          input.onmidimessage = function (msg) {
            var st = msg.data[0] & 0xF0, note = msg.data[1], vel = msg.data[2];
            if (st !== 0x90 || vel === 0) return;
            if (seenNotes.indexOf(note) === -1 && seenNotes.length < 16) {
              seenNotes.push(note); seenNotes.sort(function (a, b) { return a - b; });
            }
            var idx = seenNotes.indexOf(note);
            if (idx >= 0 && idx < slices) {
              playSlice(idx, vel / 127);
              status.textContent = '收到 MPC 的音符 ' + note + '（力度 ' + vel + '）→ 触发第 ' + (idx + 1) + ' 片。垫位对应是按音符从小到大自动排的，实机对不对请你核对后告诉我。';
            }
          };
        });
        status.textContent = n ? ('已连接 ' + n + ' 个 MIDI 输入，现在敲 MPC 的垫就能触发网页里的切片。')
                               : '没找到 MIDI 输入，先把 MPC 用 USB 连上电脑再点一次。';
      }).catch(function () { status.textContent = 'MIDI 连接被拒绝，检查浏览器权限后再试。'; });
    });

    buffer = makeDemoBuffer();
    buildPads(); drawWave();
  }

  /* ================= 工程图动态反馈 ================= */
  var projConcept = null;
  $$('.concept').forEach(function (c) {
    if (!projConcept && c.textContent.indexOf('新概念 ③') !== -1) projConcept = c;
  });
  if (projConcept) {
    var bankNames = 'ABCDEFGH'.split('');
    var fills = [16, 12, 8, 16, 6, 10, 4, 14]; // 示意：每组装多少个垫，由工程决定，这里只是演示“换组=换一整套垫”
    var seqPatterns = [
      { kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      { kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10, 14] },
      { kick: [0, 10, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      { kick: [0], snare: [4, 12], hat: [0, 4, 8, 12] },
      { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      { kick: [0, 7], snare: [12], hat: [2, 6, 10, 14] },
      { kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15] }
    ];
    var curBank = 0, curSeq = 0;
    var pCard = el('div', 'v5-card');
    pCard.innerHTML = '<h3>让这张图动起来：点 Bank 和序列试试</h3>' +
      '<p class="v5-note">静态图只能看，点一点就懂了：<b>Bank（组）</b>决定 16 个垫上装什么声音；<b>序列（Sequence）</b>是一段节奏编排。' +
      '换 Bank = 换一整套垫；换序列 = 换一段编排，垫上的声音不变。下面的填充数量和谱面都是网页示意，具体装什么由你的工程决定。</p>';
    var banksRow = el('div', 'v5-banks');
    var bpads = el('div', 'v5-bankpads');
    var seqRow = el('div', 'v5-seqchips');
    var stepsBox = el('div', 'v5-seqsteps');
    var pInfo = el('div', 'v5-status');
    pCard.appendChild(banksRow); pCard.appendChild(bpads);
    pCard.appendChild(el('div', 'v5-note', '序列（最多 128 个，这里只摆前 8 个示意）：'));
    pCard.appendChild(seqRow); pCard.appendChild(stepsBox); pCard.appendChild(pInfo);
    projConcept.parentNode.insertBefore(pCard, projConcept.nextSibling);

    function renderProject() {
      banksRow.innerHTML = '';
      bankNames.forEach(function (bn, i) {
        var b = el('button', 'v5-btn' + (i === curBank ? ' on' : ''), 'Bank ' + bn);
        b.type = 'button';
        b.addEventListener('click', function () { curBank = i; renderProject(); });
        banksRow.appendChild(b);
      });
      bpads.innerHTML = '';
      var hue = curBank * 45;
      for (var i = 0; i < 16; i++) {
        var filled = i < fills[curBank];
        var d = el('div', 'v5-bpad' + (filled ? ' filled' : ''), filled ? String(i + 1) : '·');
        if (filled) d.style.background = 'hsl(' + hue + ',85%,62%)';
        bpads.appendChild(d);
      }
      seqRow.innerHTML = '';
      for (var s = 0; s < 8; s++) {
        (function (s) {
          var b = el('button', 'v5-btn' + (s === curSeq ? ' on' : ''), 'SEQ ' + (s + 1));
          b.type = 'button';
          b.addEventListener('click', function () { curSeq = s; renderProject(); });
          seqRow.appendChild(b);
        })(s);
      }
      stepsBox.innerHTML = '';
      var pat = seqPatterns[curSeq];
      for (var st = 0; st < 16; st++) {
        var cls = 'v5-seqstep';
        if (pat.kick.indexOf(st) !== -1) cls += ' on-kick';
        else if (pat.snare.indexOf(st) !== -1) cls += ' on-snare';
        else if (pat.hat.indexOf(st) !== -1) cls += ' on-hat';
        stepsBox.appendChild(el('div', cls));
      }
      pInfo.textContent = '现在是 Bank ' + bankNames[curBank] + '（示意装了 ' + fills[curBank] + ' 个垫）+ SEQ ' + (curSeq + 1) +
        '。记住结构：一个工程 = 8 组 × 16 垫的声音 + 最多 128 个序列。红=底鼓格、黄=军鼓格、青=踩镲格（示意谱面）。';
    }
    renderProject();
  }
})();
