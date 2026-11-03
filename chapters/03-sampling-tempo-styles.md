---
title: "第三章 采样、速度节奏、beat 风格"
chapter: 3
nav_order: 3
short_title: "采样与节奏风格"
status: draft
outline:
  - "3.1 采样基础与版权常识"
  - "3.2 SAMPLE RECORD：Source / Monitor / Free·Seq / Threshold / RECALL；黑胶 · 手机 USB · 麦克风实战"
  - "3.3 编辑：Trim · Normalize · Chop · Warp · 16 LEVELS · Resample · 保存"
  - "3.4 节奏：BPM · TAP · SEQ/GBL · 拍号 · 960 PPQN · Quantize · RT Swing vs Time Correct · NOTE REPEAT/TRIPLET · 节拍器 · HALF/DOUBLE"
  - "3.5 风格（BPM 为通用常识）：Boom bap 85–95 · Lo-fi 70–90 · Trap 130–160 · Drill · House 118–128 · Techno 125–140 · DnB 160–180 · Neo-soul"
---

# 第三章 采样、速度节奏、beat 风格

<p class="tapes"><span class="tape tape-red">本章写作中</span> <span class="tape tape-cyan">大纲与可互动演示</span></p>

> **本章写作中。** 以下为本章大纲及互动采样实验台。

- 3.1 采样基础与版权常识
- 3.2 SAMPLE RECORD：Source / Monitor / Free·Seq / Threshold / RECALL；黑胶 · 手机 USB · 麦克风实战
- 3.3 编辑：Trim · Normalize · Chop · Warp · 16 LEVELS · Resample · 保存
- 3.4 节奏：BPM · TAP · SEQ/GBL · 拍号 · 960 PPQN · Quantize · RT Swing vs Time Correct · NOTE REPEAT/TRIPLET · 节拍器 · HALF/DOUBLE
- 3.5 风格（BPM 为通用常识）：Boom bap 85–95 · Lo-fi 70–90 · Trap 130–160 · Drill · House 118–128 · Techno 125–140 · DnB 160–180 · Neo-soul

---

## 3.3 采样切片互动演示 (CHOP & TRIM)

在实机上，按下 **SAMPLE** 进入波形编辑，旋转 **K1 (Start)** 与 **K2 (End)** 修剪起止点；按 **CHOP** 即可将选定区间均匀切分为 8 个打击垫切片。

下方为 Web Audio 合成的采样演示，可拖动起点与终点滑块实时修剪，点击下方 8 个打击垫或按键盘数字键 **1–8** 触发切片播放：

<div id="sampling-demo" class="sampling-demo-container">
  <div class="demo-header">
    <div class="demo-title">🎛️ 互动采样演示 <span>Web Audio 合成 · 起止修剪 · 8 垫切片</span></div>
    <div class="demo-status-pill">
      <span class="demo-status-dot" id="demo-status-dot"></span>
      <span>44.1kHz · 16-bit 模拟采样</span>
    </div>
  </div>

  <div class="waveform-section">
    <canvas id="waveform-canvas" width="600" height="120"></canvas>
    <div class="trim-slider-wrap">
      <div class="trim-control">
        <label for="trim-start">起点 Start: <span id="label-start">0.00s</span></label>
        <input type="range" id="trim-start" min="0" max="95" value="0" step="1" aria-label="采样起点调节">
      </div>
      <div class="trim-control">
        <label for="trim-end">终点 End: <span id="label-end">2.40s</span></label>
        <input type="range" id="trim-end" min="5" max="100" value="100" step="1" aria-label="采样终点调节">
      </div>
    </div>
  </div>

  <div class="demo-controls-bar">
    <button type="button" class="demo-btn" id="btn-play-trimmed">▶ 播放选区</button>
    <button type="button" class="demo-btn btn-cyan" id="btn-synth-regen">🎲 重新合成 / 随机音色</button>
    <div class="demo-info-badge">选区长度：<span id="label-duration">2.40s</span> · 支持键盘 1–8 键击垫</div>
  </div>

  <div class="pad-grid-title">Classic MPC 8-Pad 切片打击垫（点击或按数字键 1–8 触发）</div>
  <div class="mpc-pad-grid" id="mpc-pads">
    <button type="button" class="mpc-pad-btn" data-pad="1">
      <span class="pad-num-badge">1</span>
      <span class="pad-slice-label">KICK / SUB</span>
      <span class="pad-slice-time">0.00s - 0.30s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="2">
      <span class="pad-num-badge">2</span>
      <span class="pad-slice-label">HAT / CHORD</span>
      <span class="pad-slice-time">0.30s - 0.60s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="3">
      <span class="pad-num-badge">3</span>
      <span class="pad-slice-label">SNARE PUNCH</span>
      <span class="pad-slice-time">0.60s - 0.90s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="4">
      <span class="pad-num-badge">4</span>
      <span class="pad-slice-label">CHORD DECAY</span>
      <span class="pad-slice-time">0.90s - 1.20s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="5">
      <span class="pad-num-badge">5</span>
      <span class="pad-slice-label">SYNCOPATED KICK</span>
      <span class="pad-slice-time">1.20s - 1.50s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="6">
      <span class="pad-num-badge">6</span>
      <span class="pad-slice-label">OPEN HI-HAT</span>
      <span class="pad-slice-time">1.50s - 1.80s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="7">
      <span class="pad-num-badge">7</span>
      <span class="pad-slice-label">MAIN SNARE</span>
      <span class="pad-slice-time">1.80s - 2.10s</span>
    </button>
    <button type="button" class="mpc-pad-btn" data-pad="8">
      <span class="pad-num-badge">8</span>
      <span class="pad-slice-label">GHOST / TAIL</span>
      <span class="pad-slice-time">2.10s - 2.40s</span>
    </button>
  </div>
</div>

---

## 采样实操视频教程

<div class="video-container">
  <iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=PLyawkChSrh7E-qVpQ9qgL4L3RzS" title="MPC Sample 采样与切片实操视频" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<div class="track-area is-zoomed">
  <div class="track-header">
    <span class="tape tape-cyan">音轨 / 轨道区域放大</span>
    <span class="track-meta">Track 1: Drum Loop (16-bit / 44.1kHz · 90 BPM · 8 Slices)</span>
  </div>
  <div class="track-waveform-display" role="img" aria-label="放大音轨波形展示与切点标记">
    <div class="track-slices-overlay">
      <span class="slice-marker">PAD 1</span>
      <span class="slice-marker">PAD 2</span>
      <span class="slice-marker">PAD 3</span>
      <span class="slice-marker">PAD 4</span>
      <span class="slice-marker">PAD 5</span>
      <span class="slice-marker">PAD 6</span>
      <span class="slice-marker">PAD 7</span>
      <span class="slice-marker">PAD 8</span>
    </div>
  </div>
  <p class="caption">轨道区域已放大展示：可清晰查看各个打击垫切片的瞬态起点（Transient Start）与音频能量分布。</p>
</div>
