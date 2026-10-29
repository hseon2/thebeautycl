// 메인(index.html)의 플로팅 버튼(.hero-fab)별 링크(URL)와 노출 여부를 관리합니다.
// 설정은 Supabase site_settings 테이블의 key = 'fabs' 에 저장되며, 방문자에게도
// 같은 값이 적용됩니다. 관리자 모드(admin-mode.js)에서만 상단 툴바에 설정 버튼이 생깁니다.
//
// 각 버튼은 HTML 에서 data-fab="<id>" 로 구분합니다.
// value 형식 (key = 'fabs'):
//   {"tel": {"url": "tel:0260931075", "visible": true}, "booking": {...}, ...}
(function () {
  var sb = window.supabaseClient;
  var nodes = Array.prototype.slice.call(
    document.querySelectorAll("a.hero-fab[data-fab]")
  );
  if (!nodes.length) return;

  var KEY = "fabs";
  var defaults = {};
  nodes.forEach(function (a) {
    var id = a.getAttribute("data-fab");
    var label = a.querySelector(".hero-fab-label");
    defaults[id] = {
      label: label ? label.textContent.trim() : id,
      url: a.getAttribute("href") || "",
      visible: true,
    };
  });

  var settings = {};

  function normalizeUrl(url) {
    url = (url || "").trim();
    // 전화번호만 입력하면 tel: 링크로 변환
    if (/^[0-9+\-\s()]+$/.test(url)) return "tel:" + url.replace(/[^0-9+]/g, "");
    return url;
  }

  function apply() {
    nodes.forEach(function (a) {
      var id = a.getAttribute("data-fab");
      var cfg = settings[id] || {};
      var url = cfg.url ? normalizeUrl(cfg.url) : defaults[id].url;
      a.setAttribute("href", url);
      if (/^https?:/i.test(url)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
      } else {
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
      a.hidden = cfg.visible === false;
    });
  }

  if (!sb) return;

  sb.from("site_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle()
    .then(function (res) {
      if (res.data && res.data.value && typeof res.data.value === "object") {
        settings = res.data.value;
        apply();
      }
    });

  // ── 관리자 편집기 ──
  var css = document.createElement("style");
  css.textContent =
    ".hero-fab[hidden]{display:none !important;}" +
    "#fab-editor-overlay{position:fixed;inset:0;z-index:1000;background:rgba(36,27,46,.55);" +
    "display:flex;align-items:center;justify-content:center;padding:16px;}" +
    "#fab-editor{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:560px;" +
    "max-height:90vh;overflow:auto;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;" +
    "color:#241b2e;text-align:left;}" +
    "#fab-editor h3{margin:0 0 4px;font-size:1.05rem;}" +
    "#fab-editor .fe-hint{font-size:0.78rem;color:#6e6274;margin:0 0 14px;line-height:1.5;}" +
    ".fe-row{border:1px solid #e3daea;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#faf7fc;}" +
    ".fe-row-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}" +
    ".fe-row-head strong{font-size:0.88rem;}" +
    ".fe-row-head label{font-size:0.8rem;display:flex;align-items:center;gap:6px;cursor:pointer;}" +
    ".fe-row input[type=text]{width:100%;box-sizing:border-box;font-family:inherit;font-size:0.88rem;" +
    "padding:7px 9px;border:1px solid #e3daea;border-radius:8px;background:#fff;color:#241b2e;}" +
    ".fe-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;}" +
    ".fe-actions button{font-family:inherit;font-size:0.8rem;font-weight:700;padding:8px 18px;" +
    "border-radius:999px;border:none;cursor:pointer;}" +
    ".fe-save{background:#4a2168;color:#fbf3e4;}" +
    ".fe-save:disabled{opacity:0.6;cursor:not-allowed;}" +
    ".fe-cancel{background:none;border:1px solid #e3daea !important;color:#241b2e;}";
  document.head.appendChild(css);

  function openEditor() {
    if (document.getElementById("fab-editor-overlay")) return;
    var overlay = document.createElement("div");
    overlay.id = "fab-editor-overlay";
    var box = document.createElement("div");
    box.id = "fab-editor";
    box.innerHTML =
      "<h3>플로팅 버튼 설정</h3>" +
      '<p class="fe-hint">링크(URL)를 수정하고 노출 여부를 선택하세요. ' +
      "전화번호만 입력하면 전화 링크로 자동 변환됩니다. " +
      "비워두면 기본 링크를 사용합니다.</p>";

    var rows = {};
    Object.keys(defaults).forEach(function (id) {
      var cfg = settings[id] || {};
      var row = document.createElement("div");
      row.className = "fe-row";
      var head = document.createElement("div");
      head.className = "fe-row-head";
      var name = document.createElement("strong");
      name.textContent = defaults[id].label;
      var lab = document.createElement("label");
      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = cfg.visible !== false;
      lab.appendChild(chk);
      lab.appendChild(document.createTextNode("노출"));
      head.appendChild(name);
      head.appendChild(lab);
      var input = document.createElement("input");
      input.type = "text";
      input.value = cfg.url || defaults[id].url;
      input.placeholder = defaults[id].url;
      row.appendChild(head);
      row.appendChild(input);
      box.appendChild(row);
      rows[id] = { chk: chk, input: input };
    });

    var actions = document.createElement("div");
    actions.className = "fe-actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "fe-cancel";
    cancel.textContent = "취소";
    var save = document.createElement("button");
    save.type = "button";
    save.className = "fe-save";
    save.textContent = "저장";
    actions.appendChild(cancel);
    actions.appendChild(save);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }
    cancel.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    save.addEventListener("click", function () {
      var next = {};
      Object.keys(rows).forEach(function (id) {
        var url = normalizeUrl(rows[id].input.value) || defaults[id].url;
        next[id] = { url: url, visible: rows[id].chk.checked };
      });
      save.disabled = true;
      save.textContent = "저장 중...";
      sb.from("site_settings")
        .upsert({ key: KEY, value: next, updated_at: new Date().toISOString() })
        .then(function (res) {
          if (res.error) {
            alert("저장 실패: " + res.error.message);
            save.disabled = false;
            save.textContent = "저장";
            return;
          }
          settings = next;
          apply();
          close();
        });
    });
  }

  function addTrigger() {
    var bar = document.getElementById("admin-toolbar");
    if (!bar || document.getElementById("fab-editor-trigger")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "fab-editor-trigger";
    btn.textContent = "플로팅 버튼 설정";
    btn.addEventListener("click", openEditor);
    bar.insertBefore(btn, bar.lastChild);
  }
  function removeTrigger() {
    var btn = document.getElementById("fab-editor-trigger");
    if (btn) btn.remove();
    var overlay = document.getElementById("fab-editor-overlay");
    if (overlay) overlay.remove();
  }

  document.addEventListener("admin-mode:on", addTrigger);
  document.addEventListener("admin-mode:off", removeTrigger);
  if (window.adminMode && window.adminMode.isOn) addTrigger();
})();
