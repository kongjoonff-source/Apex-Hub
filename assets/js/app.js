/* ============================================================================
 *  app.js  —  config.js 의 내용을 화면에 그려주는 스크립트
 *  (내용을 바꾸고 싶다면 이 파일이 아니라 config.js 를 수정하세요.)
 * ==========================================================================*/
(function () {
  "use strict";

  if (typeof SITE === "undefined") {
    console.error("[APEX HUB] config.js 를 불러오지 못했습니다. index.html 에서 config.js 가 먼저 로드되는지 확인하세요.");
    return;
  }

  /* ── 자주 쓰는 도우미 ───────────────────────────────────────────────── */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* 이미지가 없으면 요소를 숨겨서 깨진 아이콘이 보이지 않게 함 */
  function hideOnError(img) {
    img.addEventListener("error", function () { img.style.display = "none"; });
  }

  var INVITE = SITE.server.invite || "#";

  /* stats 배열에서 live 종류("members" / "online")에 해당하는 항목 찾기 */
  function findStat(kind) {
    var list = SITE.stats || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].live === kind) return list[i];
    }
    return null;
  }

  /* ── 모든 "디스코드 이동" 버튼에 초대 링크 연결 ─────────────────────── */
  function bindInvite() {
    $$("[data-invite]").forEach(function (el) {
      el.setAttribute("href", INVITE);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });
  }

  /* ── 문서 제목 / 메타 ──────────────────────────────────────────────── */
  function setMeta() {
    if ($("[data-page-title]")) return;                 // 서브페이지는 자체 제목 사용
    document.title = SITE.server.name + " | " + SITE.server.tagline;
  }

  /* ── 상단 내비게이션 로고 ──────────────────────────────────────────── */
  function renderBrand() {
    $$("[data-brand-name]").forEach(function (el) { el.textContent = SITE.server.name; });
    $$("[data-brand-logo]").forEach(function (img) {
      img.src = SITE.server.logo;
      img.alt = SITE.server.name + " 로고";
      hideOnError(img);
    });
  }

  /* ── HERO ──────────────────────────────────────────────────────────── */
  function renderHero() {
    var h = $("[data-hero]");
    if (!h) return;

    var name = SITE.server.name;
    var parts = name.split(" ");
    var styled = parts.length > 1
      ? esc(parts.slice(0, -1).join(" ")) + " <em>" + esc(parts[parts.length - 1]) + "</em>"
      : "<em>" + esc(name) + "</em>";

    $("[data-hero-title]", h).innerHTML = styled;
    $("[data-hero-tag]", h).textContent = SITE.server.tagline;
    $("[data-hero-desc]", h).textContent = SITE.server.description;

    /* 실시간 접속자 / 멤버 문구 (initLiveStats 가 값을 갱신함) */
    var meta = $("[data-hero-meta]", h);
    if (meta) {
      var mStat = findStat("members") || SITE.stats[0] || { value: "-" };
      var oStat = findStat("online")  || SITE.stats[1] || { value: "-" };
      meta.innerHTML =
        '<span><span class="dot-live"></span> 지금 <b data-live="online">' + esc(oStat.value) + '</b>명 활동 중</span>' +
        '<span>·</span>' +
        '<span>서버 멤버 <b data-live="members">' + esc(mStat.value) + '</b>명</span>' +
        '<span>·</span>' +
        '<span>24시간 자동 구매 시스템 운영</span>';
    }

    var banner = $("[data-hero-banner]", h);
    if (banner) {
      var img = $("img", banner);
      img.src = SITE.server.banner;
      img.alt = name + " 배너";
      banner.style.display = SITE.server.banner ? "" : "none";
      hideOnError(img);
      img.addEventListener("error", function () { banner.style.display = "none"; });
    }

    var w = $("[data-hero-widget]", h);
    if (w) {
      if (SITE.server.widget) {
        w.innerHTML = '<iframe src="' + esc(SITE.server.widget) + '" width="100%" height="380" ' +
                      'frameborder="0" allowtransparency="true" loading="lazy" ' +
                      'style="border:1px solid rgba(255,255,255,.1);border-radius:22px;background:#0a0c14"></iframe>';
      } else {
        w.style.display = "none";
      }
    }
  }

  /* ── 통계 ──────────────────────────────────────────────────────────── */
  function renderStats() {
    var box = $("[data-stats]");
    if (!box) return;
    if (!SITE.stats || !SITE.stats.length) { box.style.display = "none"; return; }

    box.innerHTML = SITE.stats.map(function (s, i) {
      var liveAttr = s.live ? ' data-live="' + esc(s.live) + '"' : "";
      var badge = s.live
        ? '<span class="stat__live" title="디스코드에서 실시간으로 가져옵니다"><i></i>LIVE</span>'
        : "";
      return '<div class="stat reveal d' + ((i % 4) + 1) + '">' +
               badge +
               '<div class="stat__value"' + liveAttr + '>' + esc(s.value) + '</div>' +
               '<div class="stat__label">' + esc(s.label) + '</div>' +
             '</div>';
    }).join("");
  }

  /* ── 서버 자랑거리 ─────────────────────────────────────────────────── */
  function renderFeatures() {
    var box = $("[data-features]");
    if (!box) return;
    if (!SITE.features || !SITE.features.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.features.map(function (f, i) {
      return '<div class="card feat reveal d' + ((i % 3) + 1) + '"><div class="card__in">' +
               '<div class="feat__icon">' + esc(f.icon) + '</div>' +
               '<h3>' + esc(f.title) + '</h3>' +
               '<p>' + esc(f.desc) + '</p>' +
             '</div></div>';
    }).join("");
  }

  /* ── 이미지 갤러리 ─────────────────────────────────────────────────── */
  function renderGallery() {
    var box = $("[data-gallery]");
    if (!box) return;
    if (!SITE.gallery || !SITE.gallery.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.gallery.map(function (g, i) {
      return '<figure class="shot reveal d' + ((i % 4) + 1) + '" data-full="' + esc(g.src) + '">' +
               '<img src="' + esc(g.src) + '" alt="' + esc(g.caption || "") + '" loading="lazy">' +
               '<figcaption class="shot__cap">' + esc(g.caption || "") + '</figcaption>' +
             '</figure>';
    }).join("");

    $$(".shot img", box).forEach(hideOnError);
  }

  /* ── 가격표 ────────────────────────────────────────────────────────── */
  function renderPricing() {
    var box = $("[data-pricing]");
    if (!box) return;
    if (!SITE.products || !SITE.products.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.products.map(function (p, i) {
      var cls = "plan reveal d" + ((i % 3) + 1) + (p.highlight ? " plan--hot" : "");

      var badge = p.badge
        ? '<div class="plan__badge">' + esc(p.badge) + '</div>'
        : "";

      var was = p.originalPrice
        ? '<span class="plan__was">' + esc(p.originalPrice) + '</span>'
        : "";

      var items = (p.items || []).map(function (it) {
        return "<li>" + esc(it) + "</li>";
      }).join("");

      return '<div class="' + cls + '">' +
               '<div class="card"><div class="card__in">' +
                 badge +
                 '<div class="plan__name">' + esc(p.name) + '</div>' +
                 '<div class="plan__price"><b>' + esc(p.price) + '</b>' + was + '</div>' +
                 '<p class="plan__desc">' + esc(p.desc || "") + '</p>' +
                 '<ul class="plan__list">' + items + '</ul>' +
                 '<a class="btn ' + (p.highlight ? "btn--gold" : "btn--primary") + ' btn--block" data-invite href="' + esc(INVITE) + '">' +
                   esc(p.buttonText || "구매하러 가기") +
                 '</a>' +
                 '<div class="plan__hint">버튼을 누르면 디스코드 서버로 이동합니다</div>' +
               '</div></div>' +
             '</div>';
    }).join("");

    var note = $("[data-price-note]");
    if (note) {
      if (SITE.priceNote) note.textContent = SITE.priceNote;
      else note.style.display = "none";
    }
  }

  /* ── 이용 가이드(타임라인) ─────────────────────────────────────────── */
  function renderGuide() {
    var box = $("[data-guide]");
    if (!box) return;
    if (!SITE.guide || !SITE.guide.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.guide.map(function (g, i) {
      var steps = (g.steps || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
      var note  = g.note ? '<div class="step__note">⚠️ ' + esc(g.note) + "</div>" : "";
      var video = g.video
        ? '<a class="btn btn--ghost step__video" href="' + esc(g.video) + '" target="_blank" rel="noopener noreferrer">▶ 영상으로 보기</a>'
        : "";

      return '<div class="step reveal">' +
               '<div class="step__num">' + esc(g.emoji || (i + 1)) + '</div>' +
               '<div class="card step__card"><div class="card__in">' +
                 '<h3>' + esc(g.title) + '</h3>' +
                 (steps ? '<ol>' + steps + '</ol>' : "") +
                 note + video +
               '</div></div>' +
             '</div>';
    }).join("");
  }

  /* ── 공지사항 ──────────────────────────────────────────────────────── */
  function renderNotices() {
    var box = $("[data-notices]");
    if (!box) return;
    if (!SITE.notices || !SITE.notices.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.notices.map(function (n, i) {
      return '<div class="notice reveal d' + ((i % 4) + 1) + '">' +
               '<span class="notice__date">' + esc(n.date) + '</span>' +
               '<span class="notice__text">' + esc(n.text) + '</span>' +
             '</div>';
    }).join("");
  }

  /* ── 자주 묻는 질문 ────────────────────────────────────────────────── */
  function renderFaq() {
    var box = $("[data-faq]");
    if (!box) return;
    if (!SITE.faq || !SITE.faq.length) { box.closest("section").style.display = "none"; return; }

    box.innerHTML = SITE.faq.map(function (f, i) {
      return '<details class="qa reveal d' + ((i % 4) + 1) + '"' + (i === 0 ? " open" : "") + ">" +
               "<summary>" + esc(f.q) + "</summary>" +
               '<div class="qa__body">' + esc(f.a) + "</div>" +
             "</details>";
    }).join("");
  }

  /* ── 푸터 ──────────────────────────────────────────────────────────── */
  function renderFooter() {
    var f = SITE.footer || {};
    $$("[data-foot-name]").forEach(function (el) { el.textContent = SITE.server.name; });
    $$("[data-foot-desc]").forEach(function (el) { el.textContent = SITE.server.description; });
    $$("[data-foot-owner]").forEach(function (el) { el.textContent = f.owner || ""; });
    $$("[data-foot-contact]").forEach(function (el) { el.textContent = f.contact || ""; });
    $$("[data-foot-copy]").forEach(function (el) { el.textContent = f.copyright || ""; });

    var links = $("[data-foot-links]");
    if (links && f.links) {
      links.innerHTML = f.links.map(function (l) {
        return '<a href="' + esc(l.href) + '">' + esc(l.label) + "</a>";
      }).join("");
    }

    var year = $("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ── 서브페이지(이용약관 / 개인정보) ───────────────────────────────── */
  function renderDocPage() {
    var box = $("[data-doc]");
    if (!box) return;

    var key = box.getAttribute("data-doc");     // "terms" 또는 "privacy"
    var data = SITE[key];
    if (!data) return;

    var h1 = $("[data-doc-title]");
    if (h1) h1.textContent = data.title;

    var notice = $("[data-doc-notice]");
    if (notice) notice.textContent = data.notice || "";

    box.innerHTML = data.items.map(function (it, i) {
      return '<div class="card feat reveal d' + ((i % 3) + 1) + '"><div class="card__in" style="padding:22px 24px">' +
               '<div style="display:flex;gap:14px;align-items:flex-start">' +
                 '<div class="feat__icon" style="margin:0;width:44px;height:44px;font-size:19px;flex:none">' + esc(it.icon) + '</div>' +
                 '<div><h3 style="font-size:16px">' + esc(it.title) + '</h3>' +
                 '<p style="margin-top:6px">' + esc(it.desc) + '</p></div>' +
               '</div>' +
             '</div></div>';
    }).join("");

    var outro = $("[data-doc-outro]");
    if (outro) outro.textContent = data.outro || "";
  }

  /* ── 상호작용 : 스크롤 진행바 / 내비 고정 / 등장 애니메이션 / 맨 위로 ── */
  function bindScrollUI() {
    var bar  = $("#progress");
    var nav  = $(".nav");
    var top  = $("#toTop");

    function onScroll() {
      var y   = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      if (nav) nav.classList.toggle("is-stuck", y > 20);
      if (top) top.classList.toggle("is-show", y > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (top) {
      top.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    /* 등장 애니메이션 */
    var targets = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(function (el) { io.observe(el); });
    window.__revealIO = io;
  }

  /* ── 상호작용 : 이미지 확대(라이트박스) ─────────────────────────────── */
  function bindLightbox() {
    var lb = $("#lightbox");
    if (!lb) return;
    var img = $("img", lb);

    document.addEventListener("click", function (e) {
      var shot = e.target.closest ? e.target.closest(".shot") : null;
      if (shot) {
        var full = shot.getAttribute("data-full");
        if (full) { img.src = full; lb.classList.add("is-open"); }
        return;
      }
      if (e.target === lb || (e.target.closest && e.target.closest(".lightbox__close"))) {
        lb.classList.remove("is-open");
        img.src = "";
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { lb.classList.remove("is-open"); img.src = ""; }
    });
  }

  /* ── 상호작용 : 초대 링크 복사 버튼 ─────────────────────────────────── */
  function bindCopy() {
    $$("[data-copy-invite]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = INVITE;
        var done = function () {
          var old = btn.getAttribute("data-label") || btn.textContent;
          btn.setAttribute("data-label", old);
          btn.textContent = "✔ 복사 완료!";
          setTimeout(function () { btn.textContent = old; }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (err) {}
          document.body.removeChild(ta); done();
        }
      });
    });
  }

  /* ── 실시간 멤버 수 / 접속자 수 (디스코드 공개 API, 인증 불필요) ──── */
  function getInviteCode() {
    var cfg = SITE.server.liveStats || {};
    if (cfg.inviteCode) return String(cfg.inviteCode).trim();

    /* server.invite 주소에서 초대 코드만 자동 추출 */
    var m = String(INVITE).match(
      /(?:discord(?:app)?\.com\/(?:invite|widget)|\/invite|discord\.gg|discord\.me)\/?([A-Za-z0-9-]+)/i
    );
    return m ? m[1] : "";
  }

  function fmtNum(n) {
    var num = Number(n);
    if (!isFinite(num)) return String(n);
    try { return num.toLocaleString("ko-KR"); } catch (e) { return String(num); }
  }

  function applyLive(members, online) {
    $$("[data-live='members']").forEach(function (el) { el.textContent = fmtNum(members); });
    $$("[data-live='online']").forEach(function (el) { el.textContent = fmtNum(online); });
    $$(".stat__live").forEach(function (el) { el.classList.remove("is-off"); });
    document.documentElement.setAttribute("data-live-ok", "1");
  }

  function markLiveOff() {
    $$(".stat__live").forEach(function (el) { el.classList.add("is-off"); });
    document.documentElement.removeAttribute("data-live-ok");
  }

  function initLiveStats() {
    var cfg = SITE.server.liveStats || {};
    if (cfg.enabled === false) { markLiveOff(); return; }

    /* 아주 오래된 브라우저(fetch 미지원)에서는 조용히 고정값 사용 */
    if (typeof fetch !== "function") { markLiveOff(); return; }

    var code = getInviteCode();
    if (!code) { markLiveOff(); return; }

    var url = "https://discord.com/api/v10/invites/" +
              encodeURIComponent(code) + "?with_counts=true";
    var timer = null;
    var ms = Number(cfg.refreshMs) || 60000;
    if (ms < 30000) ms = 30000;            /* 디스코드 과호출 방지(최소 30초) */

    function load() {
      fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (d) {
          if (d && typeof d.approximate_member_count === "number") {
            applyLive(d.approximate_member_count, d.approximate_presence_count || 0);
          } else {
            markLiveOff();
          }
        })
        .catch(function () {
          /* 실패해도 config.js 에 적어둔 값이 그대로 남아 사이트는 정상 동작 */
          markLiveOff();
        });
    }

    function start() {
      load();
      if (timer) clearInterval(timer);
      timer = setInterval(load, ms);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    /* 탭이 보일 때만 갱신 (불필요한 호출 방지) */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    start();
  }

  /* ── 실행 ──────────────────────────────────────────────────────────── */
  function init() {
    setMeta();
    renderBrand();
    renderHero();
    renderStats();
    renderFeatures();
    renderGallery();
    renderPricing();
    renderGuide();
    renderNotices();
    renderFaq();
    renderFooter();
    renderDocPage();

    bindInvite();
    bindScrollUI();
    bindLightbox();
    bindCopy();

    /* 동적 생성된 요소에도 초대 링크 재적용 */
    bindInvite();

    /* 디스코드에서 실시간 멤버/접속자 수 가져오기 */
    initLiveStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();




