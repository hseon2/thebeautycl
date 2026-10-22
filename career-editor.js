// 원장 약력 공통 데이터 + 관리자 인라인 편집기.
// index.html, about.html 에서 admin-mode.js 다음에 로드됩니다.
//
// - 페이지의 <ul data-career-list data-career-style="bold|plain"> 를 찾아
//   Supabase site_settings(key='career') 의 목록으로 채웁니다.
//   저장된 데이터가 없으면 HTML에 적힌 정적 목록을 그대로 둡니다.
// - 관리자 모드에서는 목록 옆에 "약력 수정" 버튼이 생기고,
//   항목 추가 / 삭제 / 순서 이동 / 내용 수정 후 저장하면
//   두 페이지(메인·원장소개)에 동시에 반영됩니다.
(function () {
  var sb = window.supabaseClient;
  var lists = Array.prototype.slice.call(
    document.querySelectorAll("[data-career-list]")
  );
  if (!lists.length) return;

  var KEY = "career";
  var KNOWN_LABELS = ["전", "현", "정회원", "수록", "강의", "수료", "학회"];
  var items = null; // [{label, text}]
  var itemsFromDb = false;

  // ── 정적 HTML에서 초기 목록 파싱 (DB에 데이터가 없을 때 사용) ──
  function parseStatic(ul) {
    var out = [];
    Array.prototype.forEach.call(ul.querySelectorAll("li"), function (li) {
      var label = "";
      var text = "";
      var b = li.querySelector("b, strong");
      if (b) {
        label = b.textContent.trim();
        var clone = li.cloneNode(true);
        var cb = clone.querySelector("b, strong");
        if (cb) cb.remove();
        text = clone.textContent;
      } else {
        text = li.textContent;
        var m = text.trim().match(/^(\S+)\s+([\s\S]+)$/);
        if (m && KNOWN_LABELS.indexOf(m[1]) !== -1) {
          label = m[1];
          text = m[2];
        }
      }
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
          label: String((it && it.label) || "").trim(),
          text: String((it && it.text) || "")
            .replace(/\s+/g, " ")
            .trim(),
        };
      })
      .filter(function (it) {
        return it.label || it.text;
      });
  }

  // ── 렌더 ──
  function renderList(ul, list) {
    var style = ul.getAttribute("data-career-style") || "plain";
    ul.innerHTML = "";
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
      ul.appendChild(li);
    });
  }

  function renderAll() {
    if (!items) return;
    lists.forEach(function (ul) {
      renderList(ul, items);
    });
    dedupeRichBody();
  }

  // about.html: 본문(care-detail-body)이 관리자 리치텍스트로 교체될 때
  // 예전에 본문 안에 들어있던 약력 <ul>이 함께 들어오면 중복이므로 제거.
  function dedupeRichBody() {
    if (!items) return;
    var body = document.querySelector(".care-detail-body");
    if (!body) return;
    var known = {};
    items.forEach(function (it) {
      known[(it.label + " " + it.text).replace(/\s+/g, " ").trim()] = 1;
      known[it.text] = 1;
    });
    Array.prototype.forEach.call(body.querySelectorAll("ul"), function (ul) {
      if (ul.hasAttribute("data-career-list")) return;
      var lis = ul.querySelectorAll("li");
      if (!lis.length) return;
      var hit = 0;
      Array.prototype.forEach.call(lis, function (li) {
        var t = li.textContent.replace(/\s+/g, " ").trim();
        if (known[t]) hit++;
        else if (/정경진한의원|청암한의원|경희남촌|면역약침/.test(t)) hit++;
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
  items = parseStatic(lists[0]);
  if (sb) {
    sb.from("site_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle()
      .then(function (res) {
        if (res.data && Array.isArray(res.data.value)) {
          items = normalize(res.data.value);
          itemsFromDb = true;
          renderAll();
        } else {
          dedupeRichBody();
        }
      });
  }

  // ── 관리자 편집기 ──
  if (!sb) return;

  var css = document.createElement("style");
  css.textContent =
    ".career-admin-slot{display:flex;justify-content:flex-end;margin:4px 0 2px;}" +
    ".career-editor{margin:10px 0 18px;padding:14px;border:1px solid #e3daea;" +
    "border-radius:12px;background:#faf7fc;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;}" +
    ".career-editor-hint{font-size:0.78rem;color:#6e6274;margin:0 0 10px;}" +
    ".career-row{display:flex;gap:6px;align-items:center;margin-bottom:6px;}" +
    ".career-row input{font-family:inherit;font-size:0.88rem;padding:7px 9px;" +
    "border:1px solid #e3daea;border-radius:8px;background:#fff;color:#241b2e;}" +
    ".career-row .career-label{width:72px;flex:0 0 72px;}" +
    ".career-row .career-text{flex:1 1 auto;min-width:0;}" +
    ".career-row button{flex:0 0 auto;width:28px;height:28px;border-radius:7px;" +
    "border:1px solid #e3daea;background:#fff;color:#4a2168;cursor:pointer;" +
    "font-size:0.8rem;line-height:1;padding:0;font-family:inherit;}" +
    ".career-row button:disabled{opacity:0.3;cursor:default;}" +
    ".career-row button.career-del{color:#b4372f;}" +
    ".career-editor-actions{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;}" +
    ".career-editor-actions button{font-family:inherit;font-size:0.8rem;font-weight:700;" +
    "padding:8px 16px;border-radius:999px;border:none;cursor:pointer;}" +
    ".career-add-btn{background:none;border:1px dashed #b89fcb !important;color:#4a2168;}" +
    ".career-save-btn{background:#4a2168;color:#fbf3e4;margin-left:auto;}" +
    ".career-save-btn:disabled{opacity:0.6;cursor:not-allowed;}" +
    ".career-cancel-btn{background:none;border:1px solid #e3daea !important;color:#241b2e;}" +
    "@media (max-width:560px){.career-row .career-label{width:56px;flex-basis:56px;}}";
  document.head.appendChild(css);

  var openEditor = null;

  function buildEditor(anchorUl) {
    var draft = (items || []).map(function (it) {
      return { label: it.label, text: it.text };
    });
    if (!draft.length) draft.push({ label: "", text: "" });

    var box = document.createElement("div");
    box.className = "career-editor";
    var hint = document.createElement("p");
    hint.className = "career-editor-hint";
    hint.textContent =
      "왼쪽은 구분(전·정회원·수록·강의 등, 비워도 됨), 오른쪽은 내용입니다. " +
      "저장하면 메인과 원장소개 페이지에 함께 반영됩니다.";
    box.appendChild(hint);
    var rowsWrap = document.createElement("div");
    box.appendChild(rowsWrap);

    function syncFromInputs() {
      Array.prototype.forEach.call(
        rowsWrap.querySelectorAll(".career-row"),
        function (row, i) {
          draft[i].label = row.querySelector(".career-label").value;
          draft[i].text = row.querySelector(".career-text").value;
        }
      );
    }

    function renderRows() {
      rowsWrap.innerHTML = "";
      draft.forEach(function (it, i) {
        var row = document.createElement("div");
        row.className = "career-row";
        var label = document.createElement("input");
        label.className = "career-label";
        label.placeholder = "구분";
        label.value = it.label;
        var text = document.createElement("input");
        text.className = "career-text";
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
        del.className = "career-del";
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
        row.appendChild(label);
        row.appendChild(text);
        row.appendChild(up);
        row.appendChild(down);
        row.appendChild(del);
        rowsWrap.appendChild(row);
      });
    }
    renderRows();

    var actions = document.createElement("div");
    actions.className = "career-editor-actions";
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "career-add-btn";
    addBtn.textContent = "+ 항목 추가";
    addBtn.addEventListener("click", function () {
      syncFromInputs();
      draft.push({ label: "", text: "" });
      renderRows();
      var last = rowsWrap.querySelector(".career-row:last-child .career-text");
      if (last) last.focus();
    });
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "career-save-btn";
    saveBtn.textContent = "저장";
    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "career-cancel-btn";
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
        alert("약력 항목을 1개 이상 입력해 주세요.");
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "저장 중...";
      sb.from("site_settings")
        .upsert({
          key: KEY,
          value: next,
          updated_at: new Date().toISOString(),
        })
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
          items = next;
          itemsFromDb = true;
          renderAll();
          close();
        });
    });

    anchorUl.parentNode.insertBefore(box, anchorUl.nextSibling);
    openEditor = box;
    var first = box.querySelector(".career-text");
    if (first) first.focus();
  }

  function addTriggers() {
    lists.forEach(function (ul) {
      if (ul.previousElementSibling && ul.previousElementSibling.classList &&
          ul.previousElementSibling.classList.contains("career-admin-slot")) return;
      var slot = document.createElement("div");
      slot.className = "career-admin-slot";
      var btn = window.adminMode.makeEditBtn("약력 수정");
      btn.addEventListener("click", function () {
        if (openEditor) openEditor.remove();
        buildEditor(ul);
      });
      slot.appendChild(btn);
      ul.parentNode.insertBefore(slot, ul);
    });
  }
  function removeTriggers() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".career-admin-slot"),
      function (el) {
        el.remove();
      }
    );
    if (openEditor) {
      openEditor.remove();
      openEditor = null;
    }
  }

  document.addEventListener("admin-mode:on", addTriggers);
  document.addEventListener("admin-mode:off", removeTriggers);
  if (window.adminMode && window.adminMode.isOn) addTriggers();
})();
