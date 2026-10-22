// 사이트 공통 목록 데이터 + 관리자 인라인 편집기.
// (원장 약력, 일반 진료, 특수 치료, 진료 시간)
// index.html / about.html / care-general.html / care-special.html 에서
// admin-mode.js 다음에 로드됩니다.
//
// 사용법: 목록 요소에 아래 속성을 붙입니다.
//   data-site-list="career"       Supabase site_settings 의 key
//   data-list-title="약력"        관리자 버튼 문구 ("약력 수정")
//   data-list-labels="1"          구분(label) 입력칸 사용 (약력·진료시간)
//   data-list-style="bold|plain"  <ul> 렌더 시 label 을 <b>로 감쌀지
// 요소가 <tbody> 이면 <tr><th>label</th><td>text</td></tr> 로 렌더합니다.
//
// 저장 데이터 형식: [{"label": "...", "text": "..."}, ...]
// 같은 key 를 쓰는 목록은 어느 페이지에서 수정해도 모두 함께 바뀝니다.
(function () {
  var sb = window.supabaseClient;
  var nodes = Array.prototype.slice.call(
    document.querySelectorAll("[data-site-list]")
  );
  if (!nodes.length) return;

  var KNOWN_LABELS = ["전", "현", "정회원", "수록", "강의", "수료", "학회"];
  var data = {}; // key -> [{label, text}]
  var byKey = {}; // key -> [elements]
  nodes.forEach(function (el) {
    var k = el.getAttribute("data-site-list");
    (byKey[k] = byKey[k] || []).push(el);
  });
  var keys = Object.keys(byKey);

  function useLabels(el) {
    return el.getAttribute("data-list-labels") === "1";
  }

  // ── 정적 HTML에서 초기 목록 파싱 (DB에 데이터가 없을 때 사용) ──
  function parseStatic(el) {
    var out = [];
    var rows = el.tagName === "TBODY" ? el.querySelectorAll("tr") : el.querySelectorAll("li");
    var labels = useLabels(el);
    Array.prototype.forEach.call(rows, function (row) {
      var label = "";
      var text = "";
      if (row.tagName === "TR") {
        var th = row.querySelector("th");
        var td = row.querySelector("td");
        label = th ? th.textContent : "";
        text = td ? td.textContent : "";
      } else {
        var b = row.querySelector("b, strong");
        if (b && labels) {
          label = b.textContent;
          var clone = row.cloneNode(true);
          var cb = clone.querySelector("b, strong");
          if (cb) cb.remove();
          text = clone.textContent;
        } else {
          text = row.textContent;
          if (labels) {
            var m = text.trim().match(/^(\S+)\s+([\s\S]+)$/);
            if (m && KNOWN_LABELS.indexOf(m[1]) !== -1) {
              label = m[1];
              text = m[2];
            }
          }
        }
      }
      label = label.replace(/\s+/g, " ").trim();
      text = text.replace(/\s+/g, " ").trim();
      if (text || label) out.push({ label: label, text: text });
    });
    return out;
  }

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(function (it) {
        return {
          label: String((it && it.label) || "").replace(/\s+/g, " ").trim(),
          text: String((it && it.text) || "").replace(/\s+/g, " ").trim(),
        };
      })
      .filter(function (it) {
        return it.label || it.text;
      });
  }

  // ── 렌더 ──
  function renderInto(el, list) {
    el.innerHTML = "";
    if (el.tagName === "TBODY") {
      list.forEach(function (it) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.textContent = it.label;
        var td = document.createElement("td");
        td.textContent = it.text;
        tr.appendChild(th);
        tr.appendChild(td);
        el.appendChild(tr);
      });
      return;
    }
    var style = el.getAttribute("data-list-style") || "plain";
    list.forEach(function (it) {
      var li = document.createElement("li");
      if (it.label && style === "bold") {
        var b = document.createElement("b");
        b.textContent = it.label;
        li.appendChild(b);
        li.appendChild(document.createTextNode(" " + it.text));
      } else {
        li.textContent = it.label ? it.label + " " + it.text : it.text;
      }
      el.appendChild(li);
    });
    if (el.classList.contains("two-col")) {
      el.style.gridTemplateRows =
        "repeat(" + Math.max(1, Math.ceil(list.length / 2)) + ", auto)";
    }
  }

  function renderKey(k) {
    if (!data[k]) return;
    byKey[k].forEach(function (el) {
      renderInto(el, data[k]);
    });
    dedupeRichBody();
  }

  // 관리자 리치텍스트 본문(.care-detail-body) 안에 예전 정적 목록이
  // 그대로 저장돼 있으면 중복이므로 제거.
  function dedupeRichBody() {
    var body = document.querySelector(".care-detail-body");
    if (!body) return;
    var known = {};
    keys.forEach(function (k) {
      (data[k] || []).forEach(function (it) {
        known[(it.label + " " + it.text).replace(/\s+/g, " ").trim()] = 1;
        known[it.text] = 1;
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll("ul, ol"), function (ul) {
      if (ul.hasAttribute("data-site-list")) return;
      var lis = ul.querySelectorAll("li");
      if (!lis.length) return;
      var hit = 0;
      Array.prototype.forEach.call(lis, function (li) {
        if (known[li.textContent.replace(/\s+/g, " ").trim()]) hit++;
      });
      if (hit >= Math.ceil(lis.length / 2)) ul.remove();
    });
  }

  var richBody = document.querySelector(".care-detail-body");
  if (richBody && window.MutationObserver) {
    new MutationObserver(function () {
      dedupeRichBody();
    }).observe(richBody, { childList: true });
  }

  // ── 초기 로드 ──
  keys.forEach(function (k) {
    data[k] = parseStatic(byKey[k][0]);
  });
  if (sb) {
    sb.from("site_settings")
      .select("key, value")
      .in("key", keys)
      .then(function (res) {
        var rows = res.data || [];
        rows.forEach(function (row) {
          if (Array.isArray(row.value) && byKey[row.key]) {
            data[row.key] = normalize(row.value);
            renderKey(row.key);
          }
        });
        dedupeRichBody();
      });
  } else {
    dedupeRichBody();
  }

  // ── 관리자 편집기 ──
  if (!sb) return;

  var css = document.createElement("style");
  css.textContent =
    ".sl-admin-slot{display:flex;justify-content:flex-end;margin:4px 0 2px;}" +
    ".sl-editor{margin:10px 0 18px;padding:14px;border:1px solid #e3daea;" +
    "border-radius:12px;background:#faf7fc;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;" +
    "text-align:left;}" +
    ".sl-editor-hint{font-size:0.78rem;color:#6e6274;margin:0 0 10px;line-height:1.5;}" +
    ".sl-row{display:flex;gap:6px;align-items:center;margin-bottom:6px;}" +
    ".sl-row input{font-family:inherit;font-size:0.88rem;padding:7px 9px;" +
    "border:1px solid #e3daea;border-radius:8px;background:#fff;color:#241b2e;}" +
    ".sl-row .sl-label{width:110px;flex:0 0 110px;}" +
    ".sl-row .sl-text{flex:1 1 auto;min-width:0;}" +
    ".sl-row button{flex:0 0 auto;width:28px;height:28px;border-radius:7px;" +
    "border:1px solid #e3daea;background:#fff;color:#4a2168;cursor:pointer;" +
    "font-size:0.8rem;line-height:1;padding:0;font-family:inherit;}" +
    ".sl-row button:disabled{opacity:0.3;cursor:default;}" +
    ".sl-row button.sl-del{color:#b4372f;}" +
    ".sl-editor-actions{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;}" +
    ".sl-editor-actions button{font-family:inherit;font-size:0.8rem;font-weight:700;" +
    "padding:8px 16px;border-radius:999px;border:none;cursor:pointer;}" +
    ".sl-add-btn{background:none;border:1px dashed #b89fcb !important;color:#4a2168;}" +
    ".sl-save-btn{background:#4a2168;color:#fbf3e4;margin-left:auto;}" +
    ".sl-save-btn:disabled{opacity:0.6;cursor:not-allowed;}" +
    ".sl-cancel-btn{background:none;border:1px solid #e3daea !important;color:#241b2e;}" +
    "@media (max-width:560px){.sl-row .sl-label{width:72px;flex-basis:72px;}}";
  document.head.appendChild(css);

  var openEditor = null;

  function editorAnchor(el) {
    // <tbody> 는 바로 뒤에 div 를 넣을 수 없으므로 <table> 기준으로 배치
    return el.tagName === "TBODY" ? el.closest("table") : el;
  }

  function buildEditor(el) {
    var key = el.getAttribute("data-site-list");
    var labels = useLabels(el);
    var title = el.getAttribute("data-list-title") || "목록";
    var draft = (data[key] || []).map(function (it) {
      return { label: it.label, text: it.text };
    });
    if (!draft.length) draft.push({ label: "", text: "" });

    var box = document.createElement("div");
    box.className = "sl-editor";
    var hint = document.createElement("p");
    hint.className = "sl-editor-hint";
    hint.textContent = labels
      ? "왼쪽은 구분, 오른쪽은 내용입니다. ▲▼로 순서를 바꾸고 ✕로 삭제합니다. " +
        "저장하면 이 목록을 쓰는 모든 페이지에 함께 반영됩니다."
      : "한 줄에 한 항목입니다. ▲▼로 순서를 바꾸고 ✕로 삭제합니다. " +
        "저장하면 이 목록을 쓰는 모든 페이지에 함께 반영됩니다.";
    box.appendChild(hint);
    var rowsWrap = document.createElement("div");
    box.appendChild(rowsWrap);

    function syncFromInputs() {
      Array.prototype.forEach.call(rowsWrap.querySelectorAll(".sl-row"), function (row, i) {
        var l = row.querySelector(".sl-label");
        draft[i].label = l ? l.value : "";
        draft[i].text = row.querySelector(".sl-text").value;
      });
    }

    function renderRows() {
      rowsWrap.innerHTML = "";
      draft.forEach(function (it, i) {
        var row = document.createElement("div");
        row.className = "sl-row";
        if (labels) {
          var label = document.createElement("input");
          label.className = "sl-label";
          label.placeholder = "구분";
          label.value = it.label;
          row.appendChild(label);
        }
        var text = document.createElement("input");
        text.className = "sl-text";
        text.placeholder = "내용";
        text.value = it.text;
        var up = document.createElement("button");
        up.type = "button";
        up.textContent = "▲";
        up.title = "위로";
        up.disabled = i === 0;
        var down = document.createElement("button");
        down.type = "button";
        down.textContent = "▼";
        down.title = "아래로";
        down.disabled = i === draft.length - 1;
        var del = document.createElement("button");
        del.type = "button";
        del.className = "sl-del";
        del.textContent = "✕";
        del.title = "삭제";
        up.addEventListener("click", function () {
          syncFromInputs();
          var t = draft[i - 1];
          draft[i - 1] = draft[i];
          draft[i] = t;
          renderRows();
        });
        down.addEventListener("click", function () {
          syncFromInputs();
          var t = draft[i + 1];
          draft[i + 1] = draft[i];
          draft[i] = t;
          renderRows();
        });
        del.addEventListener("click", function () {
          syncFromInputs();
          draft.splice(i, 1);
          if (!draft.length) draft.push({ label: "", text: "" });
          renderRows();
        });
        row.appendChild(text);
        row.appendChild(up);
        row.appendChild(down);
        row.appendChild(del);
        rowsWrap.appendChild(row);
      });
    }
    renderRows();

    var actions = document.createElement("div");
    actions.className = "sl-editor-actions";
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "sl-add-btn";
    addBtn.textContent = "+ 항목 추가";
    addBtn.addEventListener("click", function () {
      syncFromInputs();
      draft.push({ label: "", text: "" });
      renderRows();
      var last = rowsWrap.querySelector(".sl-row:last-child input");
      if (last) last.focus();
    });
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "sl-save-btn";
    saveBtn.textContent = "저장";
    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sl-cancel-btn";
    cancelBtn.textContent = "취소";
    actions.appendChild(addBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    box.appendChild(actions);

    function close() {
      box.remove();
      openEditor = null;
    }
    cancelBtn.addEventListener("click", close);
    saveBtn.addEventListener("click", function () {
      syncFromInputs();
      var next = normalize(draft);
      if (!next.length) {
        alert(title + " 항목을 1개 이상 입력해 주세요.");
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "저장 중...";
      sb.from("site_settings")
        .upsert({ key: key, value: next, updated_at: new Date().toISOString() })
        .then(function (res) {
          if (res.error) {
            alert(
              "저장 실패: " +
                res.error.message +
                (res.error.code === "PGRST205" || /site_settings/.test(res.error.message)
                  ? "\n\n(Supabase에 site_settings 테이블이 아직 없습니다. supabase_migration_5_site_settings.sql 을 SQL Editor에서 실행해 주세요.)"
                  : "")
            );
            saveBtn.disabled = false;
            saveBtn.textContent = "저장";
            return;
          }
          data[key] = next;
          renderKey(key);
          close();
        });
    });

    var anchor = editorAnchor(el);
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    openEditor = box;
    var first = box.querySelector(".sl-text");
    if (first) first.focus();
  }

  function addTriggers() {
    nodes.forEach(function (el) {
      var anchor = editorAnchor(el);
      var prev = anchor.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains("sl-admin-slot")) return;
      var slot = document.createElement("div");
      slot.className = "sl-admin-slot";
      var btn = window.adminMode.makeEditBtn(
        (el.getAttribute("data-list-title") || "목록") + " 수정"
      );
      btn.addEventListener("click", function () {
        if (openEditor) openEditor.remove();
        buildEditor(el);
      });
      slot.appendChild(btn);
      anchor.parentNode.insertBefore(slot, anchor);
    });
  }
  function removeTriggers() {
    Array.prototype.forEach.call(document.querySelectorAll(".sl-admin-slot"), function (s) {
      s.remove();
    });
    if (openEditor) {
      openEditor.remove();
      openEditor = null;
    }
  }

  document.addEventListener("admin-mode:on", addTriggers);
  document.addEventListener("admin-mode:off", removeTriggers);
  if (window.adminMode && window.adminMode.isOn) addTriggers();
})();
