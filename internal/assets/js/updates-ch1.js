/* ============================================================
   第一章（01-functions.html）修订脚本。
   原 v5 的两个注入模块（采样交互台、工程图动态反馈）已于
   2026-11-22 按作者批注删除，见下方说明。本文件现只保留
   「先看一眼这些界面」卡片的触屏点按切换。
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

  /* ================= 第一章修订（2026-11-22）=================
     作者批注 #52/#55/#58 与 #53/#56/#57/#59：以下两个旧模块已删除——
     「动手试一下：采样 → 切片 → 敲垫出声（网页版采样器）」
     「让这张图动起来：点 Bank 和序列试试（工程图动态反馈）」
     本文件现只保留下面的界面卡片触屏切换。 */

  /* ================= 「先看一眼这些界面」卡片：触屏点按切换 ================= */
  $$('.hovercard').forEach(function (c) {
    c.addEventListener('click', function () {
      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) return; // 桌面以悬停为准
      var on = !c.classList.contains('show');
      $$('.hovercard.show').forEach(function (x) { x.classList.remove('show'); });
      if (on) c.classList.add('show');
    });
  });
})();
