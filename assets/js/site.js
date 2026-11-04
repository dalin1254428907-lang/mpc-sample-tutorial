/* MPC Sample 图文教程 —— 少量渐进增强（无 JS 时内容照常可读） */
(function () {
  // 1) 编号表第一列 → 红色圆点
  document.querySelectorAll(".legend table tbody tr, .marker-table table tbody tr").forEach(function (tr) {
    var td = tr.querySelector("td");
    if (td && /^\d+$/.test(td.textContent.trim())) td.innerHTML = '<span class="marker">' + td.textContent.trim() + "</span>";
  });

  // 1b) 第一章自查清单：允许勾选（只在本机浏览器里，刷新后清空）
  document.querySelectorAll(".checklist input[type=checkbox]").forEach(function (c) { c.disabled = false; });

  // 2) 术语表：三语 / 英中 / 英日 切换 + 分类筛选（对应原 Page 的按钮）
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
  function bar(items, cls, onPick) {
    var d = document.createElement("div");
    d.className = "chips glossary-controls " + cls;
    items.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (i === 0 ? " on" : ""); b.textContent = it;
      b.addEventListener("click", function () {
        d.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on"); onPick(it);
      });
      d.appendChild(b);
    });
    return d;
  }
  var views = { "三语": "", "英中": "view-enzh", "英日": "view-enja" };
  var vbar = bar(Object.keys(views), "views", function (v) {
    g.classList.remove("view-enzh", "view-enja");
    if (views[v]) g.classList.add(views[v]);
  });
  var cbar = bar(["全部"].concat(groups.map(function (x) { return x.cat; })), "cats", function (c) {
    groups.forEach(function (x) {
      var hide = c !== "全部" && x.cat !== c;
      x.h.classList.toggle("hidden", hide); x.t.classList.toggle("hidden", hide);
    });
  });
  g.insertBefore(cbar, g.firstChild);
  g.insertBefore(vbar, g.firstChild);
})();
