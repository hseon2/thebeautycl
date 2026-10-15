// Shared admin-mode UI: loaded on index.html and every care-*.html page
// (after supabase-js + supabase-config.js). When the visitor is logged in
// as the clinic admin, shows a small top toolbar and lets them edit
// content inline on the page instead of going through admin.html.
(function () {
  if (!window.supabaseClient) return;
  var sb = window.supabaseClient;

  var style = document.createElement("style");
  style.textContent =
    "#admin-toolbar{position:fixed;top:0;left:0;right:0;z-index:999;" +
    "background:#241b2e;color:#fbf3e4;display:flex;align-items:center;" +
    "justify-content:center;gap:16px;padding:8px 16px;" +
    "font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;" +
    "font-size:0.82rem;}" +
    "#admin-toolbar button{background:none;border:1px solid rgba(251,243,228,.4);" +
    "color:inherit;border-radius:999px;padding:4px 14px;font-size:0.78rem;" +
    "cursor:pointer;font-family:inherit;}" +
    "#admin-toolbar button:hover{background:rgba(251,243,228,.15);}" +
    "body.admin-mode{padding-top:36px;}" +
    "body.admin-mode .site-header{top:36px;}" +
    ".admin-edit-btn{display:inline-flex;align-items:center;gap:4px;" +
    "font-size:0.78rem;font-weight:600;color:#6e6274;background:none;" +
    "border:none;padding:4px 2px;cursor:pointer;" +
    "margin:6px 0 6px 10px;font-family:inherit;vertical-align:middle;" +
    "transition:color 0.15s ease;}" +
    ".admin-edit-btn:hover{color:#4a2168;}" +
    ".admin-inline-form{margin:10px 0;max-width:42em;}" +
    ".admin-inline-form textarea,.admin-inline-form select{width:100%;" +
    "font-family:inherit;font-size:0.9rem;padding:8px 10px;" +
    "border:1px solid #e3daea;border-radius:8px;margin-bottom:8px;" +
    "box-sizing:border-box;}" +
    ".admin-inline-form textarea{min-height:90px;line-height:1.6;}" +
    ".admin-inline-actions{display:flex;gap:8px;}" +
    ".admin-inline-actions button{font-family:inherit;font-size:0.78rem;" +
    "font-weight:700;padding:7px 16px;border-radius:999px;border:none;" +
    "cursor:pointer;}" +
    ".admin-save-btn{background:#4a2168;color:#fbf3e4;}" +
    ".admin-save-btn:disabled{opacity:0.6;cursor:not-allowed;}" +
    ".admin-cancel-btn{background:none;border:1px solid #e3daea;color:#241b2e;}";
  document.head.appendChild(style);

  function renderToolbar() {
    if (document.getElementById("admin-toolbar")) return;
    var bar = document.createElement("div");
    bar.id = "admin-toolbar";
    var label = document.createElement("span");
    label.textContent = "관리자 모드 — 내용을 바로 수정할 수 있습니다";
    var logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", function () {
      sb.auth.signOut();
    });
    bar.appendChild(label);
    bar.appendChild(logoutBtn);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function removeToolbar() {
    var bar = document.getElementById("admin-toolbar");
    if (bar) bar.remove();
  }

  function applyState(session) {
    var headerLogin = document.querySelector(".header-login");
    if (session) {
      document.body.classList.add("admin-mode");
      renderToolbar();
      if (headerLogin) headerLogin.hidden = true;
      document.dispatchEvent(new CustomEvent("admin-mode:on"));
    } else {
      document.body.classList.remove("admin-mode");
      removeToolbar();
      if (headerLogin) headerLogin.hidden = false;
      document.dispatchEvent(new CustomEvent("admin-mode:off"));
    }
  }

  sb.auth.getSession().then(function (res) {
    applyState(res.data.session);
  });
  sb.auth.onAuthStateChange(function (_event, session) {
    applyState(session);
  });

  function openInlineEditor(opts) {
    var wrap = document.createElement("div");
    wrap.className = "admin-inline-form";
    var textarea = document.createElement("textarea");
    textarea.value = opts.initialText || "";
    if (opts.tall) textarea.style.minHeight = "160px";
    var actions = document.createElement("div");
    actions.className = "admin-inline-actions";
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "admin-save-btn";
    saveBtn.textContent = "저장";
    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-cancel-btn";
    cancelBtn.textContent = "취소";
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    wrap.appendChild(textarea);
    wrap.appendChild(actions);
    opts.anchor.parentNode.insertBefore(wrap, opts.anchor.nextSibling);
    textarea.focus();

    cancelBtn.addEventListener("click", function () {
      wrap.remove();
      if (opts.onCancel) opts.onCancel();
    });
    saveBtn.addEventListener("click", function () {
      saveBtn.disabled = true;
      saveBtn.textContent = "저장 중...";
      Promise.resolve(opts.onSave(textarea.value.trim()))
        .then(function () {
          wrap.remove();
        })
        .catch(function (err) {
          alert("저장 실패: " + err.message);
          saveBtn.disabled = false;
          saveBtn.textContent = "저장";
        });
    });

    return wrap;
  }

  function makeEditBtn(label) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-edit-btn";
    btn.setAttribute("data-admin-editor", "1");
    btn.textContent = label || "수정";
    return btn;
  }

  window.adminMode = {
    sb: sb,
    get isOn() {
      return document.body.classList.contains("admin-mode");
    },
    openInlineEditor: openInlineEditor,
    makeEditBtn: makeEditBtn,
  };
})();
