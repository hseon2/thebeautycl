// 메인 "진료 과목" 섹션 통합 편집기 (index.html 전용).
// site-lists.js 다음에 로드됩니다.
//
// 섹션 상단의 "진료 과목 수정" 버튼 하나로
//   - 섹션 소개 문구
//   - 진료과목 카드 6개의 제목·설명
//   - 일반 진료 목록 (site_settings key: general_care)
//   - 특수 치료 목록 (site_settings key: special_care)
// 를 한 화면에서 수정하고 저장합니다.
//
// 저장 위치: site_settings
//   key = "services" → {"intro": "...", "cards": [{"href": "/care-01", "title": "...", "desc": "..."}]}
//   key = "general_care" / "special_care" → site-lists.js 와 동일한 [{label, text}]
(function () {
  var sb = window.supabaseClient;
  if (!sb) return;
  var section = document.getElementById("services");
  if (!section) return;

  var KEY = "services";
  var headP = section.querySelector(".services-head > p");
  var headTitleBox = section.querySelector(".services-head > div");
  var cardEls = Array.prototype.slice.call(section.querySelectorAll(".service-card"));

  // ── 정적 HTML → 데이터 ──
  function textWithBreaks(el) {
    // <br class="mobile-break"> 는 줄바꿈 문자로 보존 (편집 시 한 줄 = 모바일 줄바꿈 지점)
    var clone = el.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll("br"), function (br) {
      br.replaceWith("\n");
    });
    return clone.textContent
      .split("\n")
      .map(function (l) {
        return l.replace(/\s+/g, " ").trim();
      })
      .filter(function (l) {
        return l;
      })
      .join("\n");
  }
  function setTextWithBreaks(el, text) {
    el.innerHTML = "";
    String(text || "")
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(function (l) {
        return l;
      })
      .forEach(function (line, i) {
        if (i > 0) {
          var br = document.createElement("br");
          br.className = "mobile-break";
          el.appendChild(br);
        }
        el.appendChild(document.createTextNode(line));
      });
  }

  var data = {
    intro: headP ? textWithBreaks(headP) : "",
    cards: cardEls.map(function (a) {
      return {
        href: a.getAttribute("href"),
        title: (a.querySelector("h3") || {}).textContent || "",
        desc: a.querySelector("p") ? textWithBreaks(a.querySelector("p")) : "",
      };
    }),
  };

  function normalizeServices(v) {
    var out = { intro: "", cards: [] };
    if (!v || typeof v !== "object") return out;
    out.intro = String(v.intro || "").trim();
    var cards = Array.isArray(v.cards) ? v.cards : [];
    out.cards = cardEls.map(function (a, i) {
      var href = a.getAttribute("href");
      var found = null;
      cards.forEach(function (c) {
        if (c && c.href === href) found = c;
      });
      if (!found) found = cards[i] || {};
      return {
        href: href,
        title: String(found.title || data.cards[i].title).trim(),
        desc: String(found.desc || data.cards[i].desc).trim(),
      };
    });
    return out;
  }

  function render() {
    if (headP) setTextWithBreaks(headP, data.intro);
    cardEls.forEach(function (a, i) {
      var c = data.cards[i];
      if (!c) return;
      var h3 = a.querySelector("h3");
      var p = a.querySelector("p");
      if (h3) h3.textContent = c.title;
      if (p) setTextWithBreaks(p, c.desc);
    });
  }

  // ── 초기 로드 ──
  sb.from("site_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle()
    .then(function (res) {
      if (res.data && res.data.value) {
        data = normalizeServices(res.data.value);
        render();
      }
    });

  // ── 관리자 편집기 ──
  var css = document.createElement("style");
  css.textContent =
    ".svc-admin-slot{width:100%;display:flex;justify-content:flex-end;margin:-20px 0 16px;}" +
    "#svc-overlay{position:fixed;inset:0;background:rgba(36,27,46,.5);z-index:1000;" +
    "display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow-y:auto;" +
    "font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;}" +
    "body.admin-mode #svc-overlay{padding-top:80px;}" +
    ".svc-card{width:100%;max-width:820px;background:#fff;border-radius:16px;" +
    "padding:clamp(20px,4vw,36px);box-shadow:0 18px 40px -24px rgba(46,20,64,.35);color:#241b2e;}" +
    ".svc-heading{font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;" +
    "color:#a8763a;margin:0 0 6px;}" +
    ".svc-sub{font-size:.82rem;color:#6e6274;margin:0 0 22px;line-height:1.5;}" +
    ".svc-group{border-top:1px solid #e3daea;padding:18px 0 6px;}" +
    ".svc-group h4{font-size:.95rem;font-weight:700;margin:0 0 12px;color:#4a2168;}" +
    ".svc-field{margin-bottom:14px;}" +
    ".svc-field label{display:block;font-size:.76rem;font-weight:700;color:#6e6274;margin-bottom:6px;}" +
    ".svc-field input,.svc-field textarea{width:100%;box-sizing:border-box;font-family:inherit;" +
    "font-size:.9rem;padding:8px 10px;border:1px solid #e3daea;border-radius:8px;background:#fff;color:#241b2e;}" +
    ".svc-field textarea{min-height:78px;line-height:1.55;resize:vertical;}" +
    ".svc-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;}" +
    "@media(max-width:640px){.svc-cards{grid-template-columns:1fr;}}" +
    ".svc-card-item{background:#faf7fc;border:1px solid #e3daea;border-radius:12px;padding:12px 14px;}" +
    ".svc-card-item .svc-tag{font-size:.7rem;letter-spacing:.08em;color:#a8763a;font-weight:700;margin-bottom:8px;}" +
    ".svc-card-item .svc-field{margin-bottom:10px;}" +
    ".svc-card-item .svc-field:last-child{margin-bottom:0;}" +
    ".svc-list-note{font-size:.76rem;color:#6e6274;margin:0 0 8px;}" +
    ".svc-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:22px;" +
    "position:sticky;bottom:0;background:#fff;padding-top:12px;}" +
    ".svc-actions button{font-family:inherit;font-size:.82rem;font-weight:700;padding:9px 18px;" +
    "border-radius:999px;border:none;cursor:pointer;}" +
    ".svc-save{background:#4a2168;color:#fbf3e4;}" +
    ".svc-save:disabled{opacity:.6;cursor:not-allowed;}" +
    ".svc-cancel{background:none;border:1px solid #e3daea;color:#241b2e;}" +
    ".sl-add-btn{background:none;border:1px dashed #b89fcb;color:#4a2168;font-family:inherit;" +
    "font-size:.8rem;font-weight:700;padding:7px 14px;border-radius:999px;cursor:pointer;margin-top:4px;}";
  document.head.appendChild(css);

  function field(labelText, inputEl) {
    var wrap = document.createElement("div");
    wrap.className = "svc-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    return wrap;
  }

  function openEditor() {
    if (document.getElementById("svc-overlay")) return;
    var SL = window.siteLists;
    var overlay = document.createElement("div");
    overlay.id = "svc-overlay";
    var card = document.createElement("div");
    card.className = "svc-card";
    overlay.appendChild(card);

    var h = document.createElement("p");
    h.className = "svc-heading";
    h.textContent = "진료 과목 섹션 수정";
    card.appendChild(h);
    var sub = document.createElement("p");
    sub.className = "svc-sub";
    sub.textContent =
      "설명 칸에서 줄을 바꾸면 모바일 화면에서 그 위치에서 줄바꿈됩니다. " +
      "일반 진료·특수 치료 목록은 각 상세 페이지에도 함께 반영됩니다.";
    card.appendChild(sub);

    // 소개 문구
    var introTa = document.createElement("textarea");
    introTa.value = data.intro;
    card.appendChild(field("섹션 소개 문구", introTa));

    // 카드 6개
    var g1 = document.createElement("div");
    g1.className = "svc-group";
    var g1h = document.createElement("h4");
    g1h.textContent = "진료과목 카드";
    g1.appendChild(g1h);
    var grid = document.createElement("div");
    grid.className = "svc-cards";
    var cardInputs = data.cards.map(function (c, i) {
      var item = document.createElement("div");
      item.className = "svc-card-item";
      var tag = document.createElement("div");
      tag.className = "svc-tag";
      tag.textContent = "CLINIC " + String(i + 1).padStart(2, "0") + " · " + c.href;
      item.appendChild(tag);
      var title = document.createElement("input");
      title.value = c.title;
      var desc = document.createElement("textarea");
      desc.value = c.desc;
      item.appendChild(field("제목", title));
      item.appendChild(field("설명", desc));
      grid.appendChild(item);
      return { title: title, desc: desc };
    });
    g1.appendChild(grid);
    card.appendChild(g1);

    // 목록 2개
    var lists = [
      { key: "general_care", title: "일반 진료" },
      { key: "special_care", title: "특수 치료" },
    ].map(function (def) {
      var g = document.createElement("div");
      g.className = "svc-group";
      var gh = document.createElement("h4");
      gh.textContent = def.title;
      g.appendChild(gh);
      var draft = SL ? SL.get(def.key) : [];
      if (!draft.length) draft.push({ label: "", text: "" });
      var rl = SL.createRowList(draft, false);
      g.appendChild(rl.el);
      var add = document.createElement("button");
      add.type = "button";
      add.className = "sl-add-btn";
      add.textContent = "+ 항목 추가";
      add.addEventListener("click", rl.add);
      g.appendChild(add);
      card.appendChild(g);
      return { key: def.key, draft: draft, rl: rl, title: def.title };
    });

    // 액션
    var actions = document.createElement("div");
    actions.className = "svc-actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "svc-cancel";
    cancel.textContent = "취소";
    var save = document.createElement("button");
    save.type = "button";
    save.className = "svc-save";
    save.textContent = "저장";
    actions.appendChild(cancel);
    actions.appendChild(save);
    card.appendChild(actions);

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    save.addEventListener("click", function () {
      var nextServices = {
        intro: introTa.value.trim(),
        cards: data.cards.map(function (c, i) {
          return {
            href: c.href,
            title: cardInputs[i].title.value.trim() || c.title,
            desc: cardInputs[i].desc.value.replace(/\r/g, "").trim(),
          };
        }),
      };
      var listRows = [];
      for (var i = 0; i < lists.length; i++) {
        lists[i].rl.sync();
        var items = SL.normalize(lists[i].draft);
        if (!items.length) {
          alert(lists[i].title + " 항목을 1개 이상 입력해 주세요.");
          return;
        }
        listRows.push({ key: lists[i].key, value: items, updated_at: new Date().toISOString() });
      }
      save.disabled = true;
      save.textContent = "저장 중...";
      sb.from("site_settings")
        .upsert(
          [{ key: KEY, value: nextServices, updated_at: new Date().toISOString() }].concat(listRows)
        )
        .then(function (res) {
          if (res.error) {
            alert(
              "저장 실패: " +
                res.error.message +
                (res.error.code === "PGRST205" || /site_settings/.test(res.error.message)
                  ? "\n\n(Supabase에 site_settings 테이블이 아직 없습니다. supabase_migration_5_site_settings.sql 을 SQL Editor에서 실행해 주세요.)"
                  : "")
            );
            save.disabled = false;
            save.textContent = "저장";
            return;
          }
          data = nextServices;
          render();
          listRows.forEach(function (r) {
            if (SL) SL.set(r.key, r.value);
          });
          close();
        });
    });

    document.body.appendChild(overlay);
    introTa.focus();
  }

  function addTrigger() {
    if (!headTitleBox || document.getElementById("svc-edit-trigger")) return;
    var slot = document.createElement("div");
    slot.className = "svc-admin-slot";
    slot.id = "svc-edit-trigger";
    var btn = window.adminMode.makeEditBtn("진료 과목 수정");
    btn.addEventListener("click", openEditor);
    slot.appendChild(btn);
    var head = section.querySelector(".services-head");
    head.parentNode.insertBefore(slot, head);
  }
  function removeTrigger() {
    var t = document.getElementById("svc-edit-trigger");
    if (t) t.remove();
    var o = document.getElementById("svc-overlay");
    if (o) o.remove();
  }
  document.addEventListener("admin-mode:on", addTrigger);
  document.addEventListener("admin-mode:off", removeTrigger);
  if (window.adminMode && window.adminMode.isOn) addTrigger();
})();
