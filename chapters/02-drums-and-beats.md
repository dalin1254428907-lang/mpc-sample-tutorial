---
title: "第二章 打击乐音色、使用场景、写 beat"
chapter: 2
nav_order: 2
short_title: "打击乐与写 beat"
status: draft
outline:
  - "2.1 鼓组构成：真鼓 → TR-808/909、SP-1200、MPC60"
  - "2.2 Kick · Snare · Clap · Rim · Hi-hat（Mute Group）· Tom · Crash/Ride · Shaker 等 · 808 · 人声/Foley：声音、频段、角色、怎么调"
  - "2.3 场景：随身草稿 · Live/battle · 配吉他（Amp Sim）· 黑胶挖掘 · 当声卡/MIDI 控制器"
  - "2.4 写 beat 七步：BPM → Kick+Snare 骨架 → Hi-hat（NOTE REPEAT）→ 力度/幽灵音 → 量化/Swing → 变化/过门 → Song 编排"
  - "练习：boom bap · lo-fi · trap · house 各一个"
  - "Swing"
  - "鼓循环分步操作"
---

# 第二章 打击乐音色、使用场景、写 beat

<p class="tapes"><span class="tape tape-red">本章写作中</span> <span class="tape tape-cyan">大纲</span></p>

> **本章写作中。** 以下为本章大纲，正文完成后替换此页内容。

- 2.1 鼓组构成：真鼓 → TR-808/909、SP-1200、MPC60
- 2.2 Kick · Snare · Clap · Rim · Hi-hat（Mute Group）· Tom · Crash/Ride · Shaker 等 · 808 · 人声/Foley：声音、频段、角色、怎么调
- 2.3 场景：随身草稿 · Live/battle · 配吉他（Amp Sim）· 黑胶挖掘 · 当声卡/MIDI 控制器
- 2.4 写 beat 七步：BPM → Kick+Snare 骨架 → Hi-hat（NOTE REPEAT）→ 力度/幽灵音 → 量化/Swing → 变化/过门 → Song 编排
- 练习：boom bap · lo-fi · trap · house 各一个

<div id="swing" class="doc-section" markdown="1">

## Swing

Swing（摇摆）让死板的机器节奏有“人的感觉”：把网格上偶数位置的音符（如每对 1/16 音符中的后一个）往后拖一点，形成“长-短”的三连音式律动。
- 50% = 不拖，标准直板网格。
- 54%–58% = 轻微摇摆，常见于 Boom Bap / 90 年代 Hip-Hop。
- 60%–66% = 明显“躺在拍后”，慵懒、律动感强（J Dilla、Lo-Fi、Neo-Soul 常用）。
建议：Trap/现代流行多用 50%–52%；House/Techno 50%–54%；先从 56% 起步，用耳朵每次微调 1%。
在 MPC Sample 上有两种方式：
1. 实时试听：按 SEQ 进入 Sequence Mode，转 K2 设置 Q（量化）值，转 K3 调 RT Swing。RT Swing 只影响播放，不改变音符的实际位置。
2. 写入音符：按住 SHIFT 再按 PAD 14（TIME CORRECT）打开 Time Correct 菜单 → 按 PAD 选择要处理的 pad（或按 B2 全选）→ K1 设 Q 值、K2 设 Shift、K3 设 Swing → 按 B3（Do It!）应用。不满意就按住 SHIFT 再按 -/UNDO 撤销。
注：Q 和 Swing 是全局设置，Swing 也会影响 Note Repeat。

<p class="note"><small>来源：<a href="https://www.akaipro.com/guides/mpc-sample/time_correct.htm">https://www.akaipro.com/guides/mpc-sample/time_correct.htm</a> ， <a href="https://www.akaipro.com/guides/mpc-sample/sequence_mode.htm">https://www.akaipro.com/guides/mpc-sample/sequence_mode.htm</a></small></p>

</div>

<div id="steps-drum-loop" class="doc-section" markdown="1">

## 鼓循环分步操作

0. 准备：用附带 USB-C 线接 USB-C 电源适配器或充电宝（至少 5V/2A）。耳机插 3.5mm PHONES 口，或用 6.35mm AUDIO OUT 接音箱。
1. 按 POWER 开机。要新建工程：按住 SHIFT 再按 PAD 16（PROJECT）。
2. 按 SAMPLE 进入 Sample Mode，选中一个 pad，按 SAMPLE SELECT 打开采样浏览器，从内置存储或 microSD 卡选一个鼓采样放到这个 pad。依次给 Kick、Snare、Hi-hat 各放一个 pad。
3. 按 SEQ 进入 Sequence Mode：转 K1 把长度设为 4 Bars；转 K2 把 Q 设为 1/16；按 B3 打开录音量化。按住 B1 再转 ENCODER 设 BPM（也可以按 TAP TEMPO 打拍子）。
4. 按住 SHIFT 再按 PAD 4（COUNT-IN）打开一小节预备拍；按住 SHIFT 再按 TAP TEMPO 切换节拍器。
5. 录制：<!-- TODO: 录音启动按键组合（SEQ RECORD / PLAY 的确切用法）未在官方页面核实，待补充 --> <div class="todo-placeholder">内容待补充</div>
6. 敲错了就按住 SHIFT 再按 -/UNDO 撤销；要删某个 pad 的音符，在播放时按住 ERASE 再按住该 pad。
7. 要加摇摆，见上面的 Swing 小节（Time Correct）。

<p class="note"><small>来源：features.htm、sequence_mode.htm、time_correct.htm</small></p>

</div>
