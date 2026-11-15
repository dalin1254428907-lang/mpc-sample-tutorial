/* ============================================================
   第一章 · 上手教程（tutorial-flows.js）
   两个步进流程：采样、换鼓组。SHIFT 快捷键不单开课，
   嵌在流程里用到的那一步顺手教（动作之后再命名）。
   设计口径：
   - 第 0 步是连接微任务：敲一个垫，让网页看到你。
   - 每课先给成品（结果图 + 一句话），再拆步骤。
   - 一步 = 一次按键动作：动作句 + 键位（分区图高亮）+ 预期状态。
   - 核对是 Wait 模式：状态对上只打 ✓ 并高亮「下一步」，
     不自动推进；「跳过这步」永远在。核对宁宽勿严，
     判不了的步骤老实标手动确认，绝不装作能判。
   - 核对反馈用三问句式：你现在在哪 → 目标是什么 → 不对时怎么纠正。
   状态读自状态桥快照（live-bridge.js 挂在 window.MPC_STATE）。
   ============================================================ */
(function () {
  'use strict';

  var ZONES = {
    A: { box: 'left:4%;top:4%;width:92.5%;height:31%', name: 'A 区 · 看与听（屏幕）' },
    B: { box: 'left:6.5%;top:35%;width:20.5%;height:64%', name: 'B 区 · 切模式 · SHIFT · 推子' },
    C: { box: 'left:28%;top:36%;width:45%;height:15%', name: 'C 区 · 三个旋钮 K1–K3' },
    D: { box: 'left:75.5%;top:35%;width:19.5%;height:64%', name: 'D 区 · 工具 · 浏览 · 录音 · 播放' },
    E: { box: 'left:28%;top:50.5%;width:46%;height:48.5%', name: 'E 区 · 16 个打击垫' }
  };
  var ZONE_IMG = '../../assets/img/beginner/b03-zones.jpg';

  var STEP0 = {
    do: '把 MPC Sample <strong>开机</strong>，用 USB 线连上这台电脑，然后<strong>随便敲一个打击垫</strong>——让我看看能不能看到你。',
    expect: '页面上的小屏幕从静态截图变成你机器的实时画面，右上角变绿「已连接」。',
    check: 'connected',
    fix: '还没亮：先看线插紧没有、机器开没开；还是不行就点「跳过这步」，照图文先学，之后随时能连上。',
    keys: ['POWER', 'USB-C 线'],
    zone: null
  };

  var FLOWS = [
    {
      id: 'sampling',
      title: '流程一 · 采样：录下第一个声音',
      intro: '内容依据 1.11 节，新手先用内置麦克风。',
      result: {
        img: '../../assets/img/beginner/results/r13-sample-record.png',
        alt: '采样录音页：敲垫后出现 Recording',
        cap: '先看成品：录好的声音就躺在一个垫上，屏幕上是它的波形，一敲就响——这节课我们就做一个这样的。'
      },
      finale: '成果验收：按 SEQ → PLAY，放着 demo 敲你刚采的声音，听它和节奏搭不搭。然后自由玩 1 分钟——乱采乱敲，把拍手、杯子、钥匙串都录下来试试。',
      steps: [
        {
          do: '按 <kbd>SAMPLE</kbd>，回到 Sample 主屏幕，我们从这里出发。',
          expect: '屏幕是 Sample 页：顶部 Trim 页签、中间波形、下排 Start / End / Loop。',
          check: 'page:sample',
          fix: '不管你现在在哪一页，按一下 SAMPLE 就能回 Sample 主屏幕。',
          keys: ['SAMPLE'], zone: 'B'
        },
        {
          do: '按 <kbd>SAMPLE RECORD</kbd>，进采样录音页。',
          expect: '屏幕变成录音页，写着 Tap pad to record（敲垫开录）。',
          check: 'page:other',
          fix: '还停在 Sample 页 = 没按到，SAMPLE RECORD 在面板右侧（D 区）。',
          keys: ['SAMPLE RECORD'], zone: 'D'
        },
        {
          do: '转 <kbd>K1</kbd> 把 <strong>Source</strong> 选成 <strong>Mic</strong>（内置麦克风）；<kbd>K2</kbd> 保持 <strong>Free</strong>（不限长度）。想录电脑或手机的声音：先用 USB-C 线连好，Source 选 <strong>USB</strong>。',
          expect: '下排 K1 显示 Mic、K2 显示 Free。',
          check: null,
          why: '旋钮参数小屏幕读不到',
          fix: '下排不是 Mic / Free = 不在录音页，先按 SAMPLE RECORD；来源不对就慢慢转 K1 找 Mic。',
          keys: ['K1', 'K2'], zone: 'C'
        },
        {
          do: '敲一个你愿意替换的垫——<strong>这一下就开始录</strong>，对着机器拍手或说话。',
          expect: '屏幕显示 Recording 和垫号，电平表在跳。用内置麦克风时喇叭会自动静音（防啸叫），想边录边听就插耳机。',
          check: null,
          why: '录音中的状态小屏幕读不到',
          fix: '一直显示 Waiting for signal 不开录 = 声音没大过门槛：把 K3 的 Threshold（门槛）调低，声音大过门槛时右上波形图标会亮；电平表完全不动 = 来源选错了，回上一步看 K1。',
          keys: ['PAD（敲一个）', 'K3'], zone: 'E'
        },
        {
          do: '再敲<strong>同一个垫</strong>停止录音。',
          expect: '回到录音页待命，刚才的声音已经存进那个垫。',
          check: null,
          why: '录音中的状态小屏幕读不到',
          fix: '停不下来就按 STOP；按 SAMPLE RECORD 也能直接回采样模式。',
          keys: ['同一个 PAD', 'STOP'], zone: 'E'
        },
        {
          do: '按 <kbd>SAMPLE</kbd> 回主屏幕，敲刚录的那个垫试听。',
          expect: 'Sample 页显示新采样的波形，敲了能响。',
          check: 'sampleWithSelection',
          fix: '敲了没声：多半敲错了垫——刚录的是你开录时敲的那个；也可能是垫被静音了（波形是灰的）。',
          keys: ['SAMPLE', 'PAD（刚录的）'], zone: 'B'
        },
        {
          do: '顺手学一招：先用 <kbd>K1</kbd> / <kbd>K2</kbd> 把起点、终点调干净（边调边敲），然后<strong>按住</strong> <kbd>SHIFT</kbd> 再按 <kbd>PAD 13</kbd>，把两头永久剪掉。这一手有个名字——<strong>第二功能</strong>：按住 SHIFT 再按，触发的是键下印的小字（PAD 13 下印着 TRIM SAMPLE）。',
          expect: '波形变短，一敲就响、不拖泥带水。',
          check: null,
          why: '修剪结果小屏幕读不到',
          fix: '下排不是 Start / End = 不在 Trim 页，先按 B1 切回 Trim；剪错了：按住 SHIFT 再按 −（减号）撤销。',
          keys: ['K1', 'K2', 'SHIFT', 'PAD 13'], zone: 'C'
        }
      ]
    },
    {
      id: 'kit',
      title: '流程二 · 换鼓组：载入一整组新声音',
      intro: '出厂鼓组放在 Load Project 的 Kits 里，载入会换掉整个工程的声音。路径依据 1.13 节；具体鼓组名字以屏幕为准。',
      result: {
        img: '../../assets/img/beginner/results/r10-browser.png',
        alt: '采样浏览器：文件夹与声音列表',
        cap: '先看成品：一整组出厂鼓组载入后，16 个垫全是配套的鼓声，直接就能开录 beat——我们这就去换一组。'
      },
      finale: '成果验收：按 SEQ → PLAY，用新鼓组把整段 beat 听一遍。再自由玩 1 分钟：挨个垫敲过去，记下你最喜欢的三个声音在哪几个垫。',
      steps: [
        {
          do: '（建议先做）保存手头的工程：<kbd>SHIFT</kbd> + <kbd>PAD 16</kbd> 打开 Project 菜单 → 转 <kbd>ENCODER</kbd> 选 <strong>Save Project</strong> → 按下 → 起好名 → <kbd>B3</kbd>（Do It!）。没什么要留的，点「跳过这步」。',
          expect: '工程存好，之后在 Load Project → User 里能打开。',
          check: 'page:other',
          fix: '菜单没出来 = SHIFT 没按住：先按住 SHIFT，再按 PAD 16。',
          keys: ['SHIFT', 'PAD 16'], zone: 'E'
        },
        {
          do: '再开一次 Project 菜单，转 <kbd>ENCODER</kbd> 选 <strong>Load Project</strong>，按下确认。刚才用的 <kbd>SHIFT</kbd> + <kbd>PAD 16</kbd> 就是<strong>第二功能</strong>：PAD 16 下印的小字是 PROJECT，要按住 SHIFT 才触发——动作先做了，名字现在给你。',
          expect: '屏幕出现三个去处：Demos / Kits / User。',
          check: 'page:other',
          fix: '菜单没出来 = SHIFT 没按住：先按住 SHIFT，再按 PAD 16。',
          keys: ['SHIFT', 'PAD 16', 'ENCODER'], zone: 'E'
        },
        {
          do: '选 <strong>Kits</strong>，转 <kbd>ENCODER</kbd> 挑一个鼓组，按下确认载入。',
          expect: '载入完成，16 个垫全换成这个鼓组的声音。',
          check: null,
          why: '载入过程小屏幕读不到',
          fix: '进错文件夹：按 B1 返回上一级；选错了工程：重新 Load 一次就行。',
          keys: ['ENCODER'], zone: 'D'
        },
        {
          do: '按 <kbd>SAMPLE</kbd>，从 PAD 1 敲到 PAD 16，听一遍新鼓组。',
          expect: '敲哪个垫，屏幕就显示哪个采样；声音和之前完全不同。',
          check: 'selectionChanged',
          fix: '声音没变 = 可能载入没成功，回第 2 步重载；敲垫没反应先按 SAMPLE 回主屏幕。',
          keys: ['SAMPLE', 'PAD 1–16'], zone: 'E'
        },
        {
          do: '还有一招不用换工程：按 <kbd>PAD BANK</kbd> 在 A–H 八组之间切换，每组都是 16 个声音；按住 <kbd>PAD BANK</kbd> 再按 PAD 1–8 可以直达某一组；<kbd>SHIFT</kbd> + <kbd>PAD BANK</kbd> 回上一组（又是第二功能）。',
          expect: 'MAIN VOLUME 旁边的组字母变了，垫上的声音成批更换。',
          check: null,
          why: '当前组号小屏幕读不到',
          fix: '组字母没变 = 没按到 PAD BANK，它在 B 区；按一下换一组，别连按。',
          keys: ['PAD BANK', 'SHIFT'], zone: 'B'
        }
      ]
    }
  ];

  // ---------------------------------------------------------- 状态描述与核对
  function sig(s) {
    if (!s || !s.selection) return null;
    return s.selection.frames + '|' + s.selection.channels + '|' + s.selection.rate;
  }

  function stateDesc(s) {
    var base;
    if (s.page === 'sample') base = '你在 Sample 页';
    else if (s.page === 'sample_chop') base = '你在 Sample 页的 Chop 切片';
    else base = '你不在 Sample 页（在别的页面）';
    if (s.selection) {
      base += '，选中的采样 ' + (s.selection.frames / s.selection.rate).toFixed(2) + ' 秒';
    } else if (s.page === 'sample') {
      base += '，还没选中采样';
    }
    return base;
  }

  function evalCheck(step, baseline) {
    var s = window.MPC_STATE;
    if (!step.check) return false;
    if (step.check === 'connected') return !!window.MPC_STATE_OK;
    if (!window.MPC_STATE_OK || !s) return false;
    switch (step.check) {
      case 'page:sample': return s.page === 'sample';
      case 'page:other': return s.page === 'other';
      case 'selection': return !!sig(s);
      case 'sampleWithSelection': return s.page === 'sample' && !!sig(s);
      case 'selectionChanged': {
        var now = sig(s);
        return !!now && now !== baseline;
      }
    }
    return false;
  }

  function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent;
  }

  // 三问句式：你现在在哪 → 目标是什么 → 不对时怎么纠正（✓ 时是确认 + 下一步）
  function feedback(step, passed) {
    var ok = !!window.MPC_STATE_OK;
    var s = window.MPC_STATE;
    var expect = plainText(step.expect);
    var fix = step.fix ? plainText(step.fix) : '';
    if (!step.check) {
      return '这一步' + (step.why || '小屏幕读不到') + ' → 看机器屏幕确认：' + expect + (fix ? ' → 不对时：' + fix : '');
    }
    if (step.check === 'connected') {
      if (passed) return '✓ 看到你了：' + stateDesc(s) + ' → 点「下一步」开始。';
      return '还没看到你 → 做完应看到：' + expect + (fix ? ' → 排查：' + fix : '');
    }
    if (!ok) {
      return '还没连上机器 → 做到后应看到：' + expect + ' → 现在照文字做、用按钮推进；连上后这一步会自动核对。';
    }
    if (passed) {
      return '✓ 已到位：' + stateDesc(s) + ' → 点「下一步」继续。';
    }
    return '你现在：' + stateDesc(s) + ' → 目标：' + expect + (fix ? ' → 纠正：' + fix : '');
  }

  // ---------------------------------------------------------- 面板上的当前步预期
  var hintEl = document.getElementById('live-step-hint');
  function setHint(flow, stepIndex, step) {
    if (!hintEl || !step) return;
    hintEl.hidden = false;
    hintEl.textContent = '跟做中 · ' + flow.title.replace(/^流程[一二] · /, '') +
      ' ' + (stepIndex === 0 ? '第 0 步' : '第 ' + stepIndex + ' 步') + '——做到后应看到：' + plainText(step.expect);
  }

  // ---------------------------------------------------------- 渲染与步进
  function buildFlow(flow) {
    var host = document.getElementById('flow-' + flow.id);
    if (!host) return;
    var steps = [STEP0].concat(flow.steps);
    var st = { index: 0, marks: {}, baseline: null, baselineSet: false, passed: false };

    host.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'flow-head';
    head.innerHTML = '<h3 class="flow-title"></h3><span class="flow-done" hidden>✓ 全部完成</span>';
    head.querySelector('.flow-title').textContent = flow.title;
    host.appendChild(head);

    var intro = document.createElement('p');
    intro.className = 'flow-intro';
    intro.textContent = flow.intro;
    host.appendChild(intro);

    if (flow.result) {
      var fig = document.createElement('figure');
      fig.className = 'flow-result';
      var img = document.createElement('img');
      img.src = flow.result.img;
      img.alt = flow.result.alt;
      img.loading = 'lazy';
      var cap = document.createElement('figcaption');
      cap.textContent = flow.result.cap;
      fig.appendChild(img); fig.appendChild(cap);
      host.appendChild(fig);
    }

    var list = document.createElement('div');
    list.className = 'flow-steps';
    host.appendChild(list);

    var finale = document.createElement('p');
    finale.className = 'flow-finale';
    finale.hidden = true;
    finale.textContent = flow.finale || '';
    host.appendChild(finale);

    var foot = document.createElement('div');
    foot.className = 'flow-foot';
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'flow-btn flow-btn-ghost';
    reset.textContent = '重新开始';
    reset.addEventListener('click', function () {
      st.index = 0; st.marks = {}; st.passed = false;
      armBaseline(); render();
    });
    foot.appendChild(reset);
    host.appendChild(foot);

    host.addEventListener('click', function () { setHint(flow, st.index, steps[st.index]); });

    var cards = steps.map(function (step, i) {
      var card = document.createElement('div');
      card.className = 'flow-step';
      var keysHtml = '';
      if (step.keys && step.keys.length) {
        keysHtml = '<div class="flow-keys"><div class="flow-key-chips">' +
          step.keys.map(function (k) { return '<kbd class="flow-key">' + k + '</kbd>'; }).join('') +
          '</div>' +
          (step.zone && ZONES[step.zone]
            ? '<div class="zmini"><img src="' + ZONE_IMG + '" alt="" loading="lazy" /><span class="zhl" style="' + ZONES[step.zone].box + '"></span><span class="zcap">' + ZONES[step.zone].name + '</span></div>'
            : '') +
          '</div>';
      }
      card.innerHTML =
        '<div class="flow-step-top">' +
          '<span class="flow-step-no"></span>' +
          '<span class="flow-step-badge"></span>' +
        '</div>' +
        '<p class="flow-do"></p>' +
        keysHtml +
        '<p class="flow-expect"></p>' +
        '<p class="flow-check"></p>' +
        '<div class="flow-actions">' +
          '<button type="button" class="flow-btn flow-btn-next">下一步</button>' +
          '<button type="button" class="flow-btn flow-btn-ghost flow-skip">跳过这步</button>' +
        '</div>';
      card.querySelector('.flow-step-no').textContent =
        (i === 0 ? '第 0 步 · 先连上机器' : '第 ' + i + ' 步') + ' / 共 ' + (steps.length - 1) + ' 步';
      card.querySelector('.flow-do').innerHTML = step.do;
      card.querySelector('.flow-expect').innerHTML = '<strong>做到后：</strong>' + step.expect;
      card.querySelector('.flow-btn-next').addEventListener('click', function () { advance('next'); });
      card.querySelector('.flow-skip').addEventListener('click', function () { advance('skip'); });
      list.appendChild(card);
      return card;
    });

    // selectionChanged 的基准：步骤开始这一刻的选中采样签名。
    // 当时还没连上机器就先不抓，等连上后的第一帧再抓，
    // 避免把连接前的旧状态误判成“刚变了”。
    function armBaseline() {
      var step = steps[st.index];
      st.baseline = null;
      st.baselineSet = false;
      if (step && step.check === 'selectionChanged' && window.MPC_STATE_OK) {
        st.baseline = sig(window.MPC_STATE);
        st.baselineSet = true;
      }
    }

    function advance(how) {
      if (st.index >= steps.length) return;
      st.marks[st.index] = how === 'skip' ? 'skipped' : (st.passed ? 'auto' : 'manual');
      st.index += 1;
      st.passed = false;
      armBaseline();
      render();
    }

    function render() {
      var finished = st.index >= steps.length;
      head.querySelector('.flow-done').hidden = !finished;
      finale.hidden = !finished;
      if (finished && hintEl) {
        hintEl.hidden = false;
        hintEl.textContent = '✓ ' + flow.title + ' 做完了。' + (flow.finale || '');
      }
      cards.forEach(function (card, i) {
        var badge = card.querySelector('.flow-step-badge');
        var checkEl = card.querySelector('.flow-check');
        var actions = card.querySelector('.flow-actions');
        var nextBtn = card.querySelector('.flow-btn-next');
        card.classList.toggle('is-current', i === st.index);
        card.classList.toggle('is-done', i < st.index);
        card.classList.toggle('is-todo', i > st.index);
        if (i < st.index) {
          badge.textContent = st.marks[i] === 'auto' ? '✓ 已到位' : (st.marks[i] === 'skipped' ? '已跳过' : '✓ 已完成');
          badge.className = 'flow-step-badge ok';
          checkEl.textContent = '';
          actions.style.display = 'none';
        } else if (i === st.index) {
          var step = steps[i];
          badge.textContent = st.passed ? '✓ 已到位' : '做这一步';
          badge.className = 'flow-step-badge ' + (st.passed ? 'ok' : 'now');
          nextBtn.classList.toggle('flow-btn-hot', !!st.passed);
          actions.style.display = '';
          checkEl.textContent = feedback(step, st.passed);
        } else {
          badge.textContent = '还没到';
          badge.className = 'flow-step-badge';
          checkEl.textContent = '';
          actions.style.display = 'none';
        }
      });
    }

    armBaseline();
    render();

    // Wait 模式轮询：只判当前步，对上就打 ✓ 并高亮「下一步」，不自动推进；
    // 状态漂移走了 ✓ 会熄灭——宁可漏判，不误判。
    setInterval(function () {
      if (st.index >= steps.length) return;
      var step = steps[st.index];
      if (!step.check) { render(); return; }
      if (step.check === 'selectionChanged' && !st.baselineSet && window.MPC_STATE_OK) {
        st.baseline = sig(window.MPC_STATE);
        st.baselineSet = true;
      }
      var now = evalCheck(step, st.baseline);
      if (now !== st.passed) { st.passed = now; }
      render();
    }, 400);
  }

  FLOWS.forEach(buildFlow);
})();
