/* ============================================================================
 *  admin.js  —  관리자 패널(admin.html) 로직
 *  · 비밀번호 로그인
 *  · 상품/가격/가이드/공지 등 모든 내용 편집 (추가·삭제·순서변경)
 *  · config.js 파일로 내려받기 또는 GitHub 에 원클릭 저장
 * ==========================================================================*/
(function () {
  "use strict";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  if (typeof SITE === "undefined") {
    document.body.innerHTML =
      '<div style="padding:40px;color:#fff;font-family:sans-serif">' +
      'config.js 를 불러오지 못했습니다. admin.html 과 같은 폴더에 config.js 가 있는지 확인하세요.</div>';
    return;
  }

  var ADMIN = SITE.admin || {};
  var LS_KEY   = "apexhub.admin.settings";   /* GitHub 설정(토큰 포함) 저장 키 */
  var LS_LOGIN = "apexhub.admin.login";      /* 로그인 유지 키 */
  var LS_ALERT = "apexhub.admin.alertoff";   /* 경고 배너 닫기 키 */

  /* 기본 비밀번호(apex-2026)의 해시 — 이 값이 그대로면 경고를 띄웁니다 */
  var DEFAULT_HASH = "eac8dae9a8f6b35c999b9e8e79521c23532d8404210a72e0e31a603662611dcf";

  /* ── 공용 도우미 ───────────────────────────────────────────────────── */
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg, kind) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "toast is-show" + (kind ? " is-" + kind : "");
    clearTimeout(t.__timer);
    t.__timer = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ── SHA-256 (crypto.subtle 이 없는 file:// 환경에서도 동작) ───────── */
  function sha256(msg) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
             0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
             0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
             0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
             0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
             0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
             0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
             0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];

    /* UTF-8 변환 */
    var bytes = [], i, c;
    for (i = 0; i < msg.length; i++) {
      c = msg.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {
        i++; c = 0x10000 + (((c & 0x3ff) << 10) | (msg.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push(0, 0, 0, 0);
    bytes.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

    var w = new Array(64), off, t;
    for (off = 0; off < bytes.length; off += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) |
               (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rr(w[t-15],7) ^ rr(w[t-15],18) ^ (w[t-15] >>> 3);
        var s1 = rr(w[t-2],17) ^ rr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
      }
      var a=H[0],b=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
        var mj = (a & b) ^ (a & cc) ^ (b & cc);
        var t2 = (S0 + mj) | 0;
        h=g; g=f; f=e; e=(d+t1)|0; d=cc; cc=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0;  H[1]=(H[1]+b)|0;  H[2]=(H[2]+cc)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0;  H[5]=(H[5]+f)|0;  H[6]=(H[6]+g)|0;  H[7]=(H[7]+h)|0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }

  /* ── 상태 ─────────────────────────────────────────────────────────── */
  var state = deepClone(SITE);
  var BIND  = [];          /* 폼 바인딩 목록 */
  var currentTab = "server";

  function markDirty() { $("#dirtyBadge").hidden = false; }
  function clearDirty() { $("#dirtyBadge").hidden = true; }

  /* ── 폼 렌더링 ─────────────────────────────────────────────────────── */
  function fieldHtml(obj, def, prefix) {
    var id = prefix + "_" + def.key;
    var v  = obj[def.key];

    if (def.type === "checkbox") {
      return '<label class="fld"><span class="chk"><input type="checkbox" id="' + id + '"' +
             (v ? " checked" : "") + '> ' + esc(def.label) + '</span>' +
             (def.hint ? '<span class="fld__hint">' + esc(def.hint) + '</span>' : "") + '</label>';
    }

    var h = '<label class="fld"><span class="fld__label">' + esc(def.label) + '</span>';

    if (def.type === "textarea" || def.type === "lines" || def.type === "pairs") {
      var text;
      if (def.type === "lines") {
        text = (v || []).join("\n");
      } else if (def.type === "pairs") {
        text = (v || []).map(function (p) { return (p.label || "") + "|" + (p.href || ""); }).join("\n");
      } else {
        text = v == null ? "" : v;
      }
      h += '<textarea id="' + id + '" rows="' + (def.rows || 3) + '" placeholder="' +
           esc(def.placeholder || "") + '">' + esc(text) + "</textarea>";

    } else if (def.type === "select") {
      h += '<select id="' + id + '">' + (def.options || []).map(function (o) {
        var val = o[0], lab = o[1];
        return '<option value="' + esc(val) + '"' +
               (String(v == null ? "" : v) === String(val) ? " selected" : "") +
               ">" + esc(lab) + "</option>";
      }).join("") + "</select>";

    } else if (def.type === "image" || def.type === "imagelogo") {
      h += '<span class="imgrow' + (def.type === "imagelogo" ? " imgrow--logo" : "") + '">' +
             '<img id="' + id + '_prev" src="' + esc(v || "") + '" alt="">' +
             '<span class="imgrow__fields">' +
               '<input type="text" id="' + id + '" value="' + esc(v == null ? "" : v) +
               '" placeholder="' + esc(def.placeholder || "assets/images/파일명.png") + '">' +
               (def.hint ? '<span class="fld__hint">' + esc(def.hint) + '</span>' : "") +
             "</span>" +
           "</span>";

    } else {
      h += '<input type="' + (def.type === "number" ? "number" : "text") + '" id="' + id +
           '" value="' + esc(v == null ? "" : v) + '" placeholder="' + esc(def.placeholder || "") + '">';
    }

    if (def.hint && def.type !== "image" && def.type !== "imagelogo") {
      h += '<span class="fld__hint">' + esc(def.hint) + "</span>";
    }
    return h + "</label>";
  }

  /* defs 를 순서대로 렌더링하고 BIND 에 등록 (half:true 두 개는 한 줄에 배치) */
  function renderForm(obj, defs, prefix) {
    var html = "", i = 0;
    while (i < defs.length) {
      var d = defs[i];
      if (d.half && defs[i + 1] && defs[i + 1].half) {
        var d2 = defs[i + 1];
        html += '<div class="grid2">' + fieldHtml(obj, d, prefix) + fieldHtml(obj, d2, prefix) + "</div>";
        BIND.push({ id: prefix + "_" + d.key,  obj: obj, def: d  });
        BIND.push({ id: prefix + "_" + d2.key, obj: obj, def: d2 });
        i += 2;
        continue;
      }
      html += fieldHtml(obj, d, prefix);
      BIND.push({ id: prefix + "_" + d.key, obj: obj, def: d });
      i++;
    }
    return html;
  }

  /* 화면에 입력된 값을 state 에 다시 써넣기 */
  function collect() {
    BIND.forEach(function (b) {
      var el = document.getElementById(b.id);
      if (!el) return;
      var d = b.def, v = el.value;

      if (d.type === "checkbox") { b.obj[d.key] = el.checked; return; }
      if (d.type === "number")   { b.obj[d.key] = v === "" ? 0 : Number(v); return; }
      if (d.type === "lines") {
        b.obj[d.key] = v.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        return;
      }
      if (d.type === "pairs") {
        b.obj[d.key] = v.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
          .map(function (s) {
            var p = s.split("|");
            return { label: (p[0] || "").trim(), href: (p[1] || "").trim() };
          });
        return;
      }
      b.obj[d.key] = v;
    });
  }

  /* ── 목록 편집기 (추가 / 삭제 / 순서변경 / 복제) ───────────────────── */
  function listHtml(arr, defs, opts) {
    var html = '<div class="box__head"><h3>' + esc(opts.title) + "</h3>" +
               '<span class="box__count">' + arr.length + "개</span></div>";
    if (opts.tip) html += '<div class="tip">' + opts.tip + "</div>";

    html += arr.map(function (it, i) {
      var hot = opts.hot && it[opts.hot];
      return '<div class="item' + (hot ? " is-hot" : "") + '">' +
               '<div class="item__bar">' +
                 '<span class="item__idx">' + (i + 1) + "</span>" +
                 '<span class="item__name">' + esc(opts.nameOf ? opts.nameOf(it, i) : "항목 " + (i + 1)) + "</span>" +
                 '<span class="item__tools">' +
                   '<button class="iconbtn" type="button" data-act="up"   data-key="' + opts.key + '" data-i="' + i + '" title="위로">▲</button>' +
                   '<button class="iconbtn" type="button" data-act="down" data-key="' + opts.key + '" data-i="' + i + '" title="아래로">▼</button>' +
                   '<button class="iconbtn" type="button" data-act="dup"  data-key="' + opts.key + '" data-i="' + i + '" title="복제">⧉</button>' +
                   '<button class="iconbtn iconbtn--del" type="button" data-act="del" data-key="' + opts.key + '" data-i="' + i + '" title="삭제">✕</button>' +
                 "</span>" +
               "</div>" +
               renderForm(it, defs, opts.key.replace(/\./g, "-") + "_" + i) +
             "</div>";
    }).join("");

    html += '<button class="addbtn" type="button" data-act="add" data-key="' + opts.key + '">＋ ' +
            esc(opts.addLabel || "항목 추가") + "</button>";
    return html;
  }

  function pathGet(path) {
    var p = path.split("."), o = state, i;
    for (i = 0; i < p.length - 1; i++) o = o[p[i]];
    return o[p[p.length - 1]];
  }

  /* ── 각 항목의 필드 정의 ───────────────────────────────────────────── */
  var DEF = {
    server: [
      { key: "name",        label: "서버 이름",        type: "text", half: true },
      { key: "tagline",     label: "한 줄 소개",       type: "text", half: true },
      { key: "description", label: "서버 소개글",      type: "textarea", rows: 4 },
      { key: "invite",      label: "디스코드 초대 링크 (구매 버튼 목적지)", type: "text",
        placeholder: "https://discord.gg/xxxxxx", hint: "이 주소에서 초대 코드를 자동으로 뽑아 실시간 멤버 수를 가져옵니다." },
      { key: "logo",        label: "로고 이미지 경로",  type: "imagelogo" },
      { key: "banner",      label: "상단 배너 이미지 경로", type: "image" },
      { key: "widget",      label: "디스코드 위젯 주소 (안 쓰면 비워두세요)", type: "text" }
    ],
    live: [
      { key: "enabled",    label: "실시간 연동 사용", type: "checkbox",
        hint: "디스코드 공개 API로 실제 멤버 수 / 접속자 수를 가져옵니다. (봇·토큰 불필요)" },
      { key: "refreshMs",  label: "갱신 주기 (밀리초)", type: "number", half: true, hint: "60000 = 1분" },
      { key: "inviteCode", label: "초대 코드 (보통 비워둠)", type: "text", half: true, hint: "비워두면 초대 링크에서 자동 추출" }
    ],
    stats: [
      { key: "value", label: "표시 값", type: "text", half: true, placeholder: "856" },
      { key: "label", label: "설명",    type: "text", half: true, placeholder: "서버 멤버" },
      { key: "live",  label: "실시간 연동", type: "select", options: [
        ["", "사용 안 함 (고정값)"],
        ["members", "실제 멤버 수 (자동 갱신)"],
        ["online",  "실제 접속자 수 (자동 갱신)"]
      ] }
    ],
    products: [
      { key: "name",          label: "상품 이름", type: "text", half: true, placeholder: "베이직" },
      { key: "price",         label: "판매가",   type: "text", half: true, placeholder: "1,000원" },
      { key: "originalPrice", label: "정가 (할인 표시 · 없으면 비움)", type: "text", half: true, placeholder: "3,000원" },
      { key: "badge",         label: "리본 배지 (없으면 비움)", type: "text", half: true, placeholder: "가장 저렴" },
      { key: "desc",          label: "짧은 설명", type: "text" },
      { key: "items",         label: "포함 항목 (한 줄에 하나씩)", type: "lines", rows: 5 },
      { key: "buttonText",    label: "버튼 문구", type: "text", half: true, placeholder: "구매하러 가기" },
      { key: "highlight",     label: "추천 상품으로 강조 (금색 카드)", type: "checkbox" }
    ],
    features: [
      { key: "icon",  label: "아이콘 (이모지)", type: "text", half: true, placeholder: "💰" },
      { key: "title", label: "제목", type: "text", half: true },
      { key: "desc",  label: "설명", type: "textarea", rows: 2 }
    ],
    gallery: [
      { key: "src",     label: "이미지 경로", type: "image", placeholder: "assets/images/shot-1.png" },
      { key: "caption", label: "설명 문구",  type: "text" }
    ],
    guide: [
      { key: "emoji", label: "이모지",     type: "text", half: true, placeholder: "🚪" },
      { key: "title", label: "단계 제목",  type: "text", half: true, placeholder: "1단계 · 서버 입장" },
      { key: "steps", label: "순서 (한 줄에 하나씩)", type: "lines", rows: 5 },
      { key: "note",  label: "주의사항 (없으면 비움)", type: "textarea", rows: 2 },
      { key: "video", label: "유튜브 주소 (없으면 비움)", type: "text" }
    ],
    notices: [
      { key: "date", label: "날짜", type: "text", half: true, placeholder: "2026-01-01" },
      { key: "text", label: "내용", type: "text" }
    ],
    faq: [
      { key: "q", label: "질문", type: "text" },
      { key: "a", label: "답변", type: "textarea", rows: 2 }
    ],
    footer: [
      { key: "owner",     label: "운영자", type: "text", half: true },
      { key: "contact",   label: "문의 (디스코드 아이디)", type: "text", half: true },
      { key: "copyright", label: "저작권 문구", type: "text" }
    ],
    "footer.links": [
      { key: "label", label: "표시 이름", type: "text", half: true, placeholder: "이용 가이드" },
      { key: "href",  label: "링크 주소", type: "text", half: true, placeholder: "#guide 또는 terms.html" }
    ],
    doc: [
      { key: "title",  label: "제목", type: "text" },
      { key: "notice", label: "상단 안내 문구", type: "textarea", rows: 2 },
      { key: "outro",  label: "하단 마무리 문구", type: "textarea", rows: 2 }
    ],
    docItems: [
      { key: "icon",  label: "아이콘", type: "text", half: true, placeholder: "🚫" },
      { key: "title", label: "항목 제목", type: "text", half: true },
      { key: "desc",  label: "설명", type: "text" }
    ]
  };

  /* 새 항목 추가 시 기본값 */
  var NEW_ITEM = {
    "stats":        function () { return { value: "0", label: "새 항목" }; },
    "products":     function () { return { name: "새 상품", price: "1,000원", originalPrice: "",
                                           badge: "", desc: "", items: ["혜택 1"], buttonText: "구매하러 가기" }; },
    "features":     function () { return { icon: "✨", title: "새 특징", desc: "설명을 입력하세요" }; },
    "gallery":      function () { return { src: "assets/images/shot-1.svg", caption: "설명을 입력하세요" }; },
    "guide":        function () { return { title: "새 단계", emoji: "📌", steps: ["할 일을 입력하세요"] }; },
    "notices":      function () { return { date: "", text: "새 공지사항" }; },
    "faq":          function () { return { q: "새 질문", a: "답변을 입력하세요" }; },
    "footer.links": function () { return { label: "새 링크", href: "#" }; },
    "terms.items":  function () { return { icon: "📌", title: "새 항목", desc: "설명" }; },
    "privacy.items":function () { return { icon: "📌", title: "새 항목", desc: "설명" }; }
  };

  /* ── 탭 정의 ──────────────────────────────────────────────────────── */
  var TABS = [
    { key: "server",   icon: "🏠", label: "기본 정보" },
    { key: "stats",    icon: "📊", label: "통계 뱃지" },
    { key: "products", icon: "💰", label: "가격표(상품)" },
    { key: "features", icon: "✨", label: "서버 자랑거리" },
    { key: "gallery",  icon: "🖼️", label: "이미지 갤러리" },
    { key: "guide",    icon: "📖", label: "이용 가이드" },
    { key: "notices",  icon: "📢", label: "공지사항" },
    { key: "faq",      icon: "❓", label: "자주 묻는 질문" },
    { key: "footer",   icon: "🔗", label: "하단 정보" },
    { key: "terms",    icon: "📜", label: "이용약관" },
    { key: "privacy",  icon: "🛡️", label: "개인정보처리방침" }
  ];

  function head(title, desc) {
    return '<div class="panel-head"><h2>' + esc(title) + "</h2><p>" + esc(desc) + "</p></div>";
  }
  function box(inner) { return '<div class="box">' + inner + "</div>"; }

  /* ── 탭별 화면 ────────────────────────────────────────────────────── */
  var TAB_HTML = {};

  TAB_HTML.server = function () {
    return head("기본 정보", "서버 이름 · 소개글 · 디스코드 초대 링크를 설정합니다.") +
      '<div class="tip">구매 버튼은 모두 <b>초대 링크</b>로 이동합니다. 링크를 바꾸면 실시간 멤버 수 연동도 자동으로 따라갑니다.</div>' +
      box(renderForm(state.server, DEF.server, "server")) +
      '<div class="box"><div class="box__head"><h3>실시간 멤버 수 / 접속자 수</h3></div>' +
      renderForm(state.server.liveStats, DEF.live, "live") + "</div>";
  };

  TAB_HTML.stats = function () {
    return head("통계 뱃지", "상단 숫자 카드입니다. 실시간 연동을 켜면 디스코드 실제 값으로 자동 갱신됩니다.") +
      box(listHtml(state.stats, DEF.stats, {
        key: "stats", title: "통계 카드", addLabel: "통계 카드 추가",
        nameOf: function (it) { return (it.label || "이름 없음") + "  ·  " + (it.value || ""); }
      }));
  };

  TAB_HTML.products = function () {
    return head("가격표(상품)", "상품을 추가·삭제하고 가격과 혜택을 수정할 수 있습니다.") +
      '<div class="tip">▲▼ 순서 변경 &nbsp;·&nbsp; ⧉ 복제 &nbsp;·&nbsp; ✕ 삭제 &nbsp;|&nbsp; <b>추천 상품</b>을 체크하면 금색 카드로 강조됩니다.</div>' +
      box(listHtml(state.products, DEF.products, {
        key: "products", title: "상품 목록", addLabel: "＋ 새 상품 추가", hot: "highlight",
        nameOf: function (it) { return (it.name || "이름 없음") + "  ·  " + (it.price || ""); }
      }));
  };

  TAB_HTML.features = function () {
    return head("서버 자랑거리", "'왜 저희 서버를 선택해야 할까요?' 영역에 표시됩니다.") +
      box(listHtml(state.features, DEF.features, {
        key: "features", title: "특징 목록", addLabel: "특징 추가",
        nameOf: function (it) { return (it.icon || "") + "  " + (it.title || "이름 없음"); }
      }));
  };

  TAB_HTML.gallery = function () {
    return head("이미지 갤러리", "이미지를 추가하면 자동으로 그리드에 배치됩니다.") +
      '<div class="tip tip--warn">이미지 파일을 먼저 <code>assets/images/</code> 폴더에 올린 뒤 경로를 입력하세요. (예: <b>assets/images/shot-1.png</b>)</div>' +
      box(listHtml(state.gallery, DEF.gallery, {
        key: "gallery", title: "이미지 목록", addLabel: "이미지 추가",
        nameOf: function (it, i) { return (i + 1) + "번째 · " + (it.caption || it.src || ""); }
      }));
  };

  TAB_HTML.guide = function () {
    return head("이용 가이드", "구매 순서를 단계별로 작성하세요. 원하는 만큼 단계를 추가할 수 있습니다.") +
      box(listHtml(state.guide, DEF.guide, {
        key: "guide", title: "가이드 단계", addLabel: "단계 추가",
        nameOf: function (it) { return (it.emoji || "") + "  " + (it.title || "제목 없음"); }
      }));
  };

  TAB_HTML.notices = function () {
    return head("공지사항", "최신 글이 위로 오도록 순서를 맞춰주세요.") +
      box(listHtml(state.notices, DEF.notices, {
        key: "notices", title: "공지 목록", addLabel: "공지 추가",
        nameOf: function (it) { return (it.date || "날짜 없음") + "  ·  " + String(it.text || "").slice(0, 26); }
      }));
  };

  TAB_HTML.faq = function () {
    return head("자주 묻는 질문", "사이트 하단 FAQ 아코디언에 표시됩니다.") +
      box(listHtml(state.faq, DEF.faq, {
        key: "faq", title: "질문 목록", addLabel: "질문 추가",
        nameOf: function (it) { return it.q || "질문 없음"; }
      }));
  };

  TAB_HTML.footer = function () {
    return head("하단 정보", "사이트 맨 아래에 표시되는 정보와 링크입니다.") +
      box(renderForm(state.footer, DEF.footer, "footer")) +
      box(listHtml(state.footer.links, DEF["footer.links"], {
        key: "footer.links", title: "푸터 링크", addLabel: "링크 추가",
        nameOf: function (it) { return (it.label || "이름 없음") + "  →  " + (it.href || ""); }
      }));
  };

  TAB_HTML.doc = function (k) {
    var label = k === "terms" ? "이용약관" : "개인정보처리방침";
    return head(label, k + ".html 페이지에 표시되는 내용입니다.") +
      box(renderForm(state[k], DEF.doc, k)) +
      box(listHtml(state[k].items, DEF.docItems, {
        key: k + ".items", title: "세부 항목", addLabel: "항목 추가",
        nameOf: function (it) { return (it.icon || "") + "  " + (it.title || "이름 없음"); }
      }));
  };

  /* terms / privacy 는 같은 화면을 쓰되 어떤 데이터를 쓸지 key 로 구분 */
  TAB_HTML.terms   = TAB_HTML.doc;
  TAB_HTML.privacy = TAB_HTML.doc;

  /* ── 탭 / 사이드바 렌더 ───────────────────────────────────────────── */
  function renderTab(key) {
    currentTab = key;
    BIND = [];
    var fn = TAB_HTML[key];
    $("#main").innerHTML = fn ? fn(key) : "";
    window.scrollTo(0, 0);
  }

  function renderSide() {
    $("#side").innerHTML = TABS.map(function (t) {
      return '<button class="side__btn' + (t.key === currentTab ? " is-on" : "") +
             '" type="button" data-tab="' + t.key + '"><span>' + t.icon + "</span>" + esc(t.label) + "</button>";
    }).join("") +
    '<div class="side__sep"></div>' +
    '<button class="side__btn" type="button" data-go="pw"><span>🔑</span>비밀번호 변경</button>' +
    '<button class="side__btn" type="button" data-go="save"><span>💾</span>저장하기</button>';
  }

  function describeItem(it) {
    if (!it) return "";
    return it.name || it.title || it.label || it.q || it.caption || it.text ||
           JSON.stringify(it).slice(0, 40);
  }

  /* ── 목록 조작 (추가 / 삭제 / 순서변경 / 복제) ────────────────────── */
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!el || !el.closest) return;

    var tabBtn = el.closest("[data-tab]");
    if (tabBtn) { collect(); renderTab(tabBtn.getAttribute("data-tab")); renderSide(); return; }

    var goBtn = el.closest("[data-go]");
    if (goBtn) { goBtn.getAttribute("data-go") === "pw" ? openPw() : openSave(); return; }

    var actBtn = el.closest("[data-act]");
    if (!actBtn || !el.closest("#main")) return;

    collect();
    var act = actBtn.getAttribute("data-act");
    var key = actBtn.getAttribute("data-key");
    var i   = parseInt(actBtn.getAttribute("data-i"), 10);
    var arr = pathGet(key);
    if (!Array.isArray(arr)) return;

    if (act === "add") {
      var mk = NEW_ITEM[key];
      arr.push(mk ? mk() : {});
    } else if (act === "del") {
      if (!confirm('"' + describeItem(arr[i]) + '" 항목을 삭제할까요?\n\n삭제 후 [저장하기] 를 눌러야 실제 사이트에 반영됩니다.')) return;
      arr.splice(i, 1);
    } else if (act === "up" && i > 0) {
      arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
    } else if (act === "down" && i < arr.length - 1) {
      arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
    } else if (act === "dup") {
      arr.splice(i + 1, 0, deepClone(arr[i]));
    } else {
      return;
    }

    markDirty();
    renderTab(currentTab);
  });

  /* 입력 시 : 이미지 미리보기 갱신 + 저장 필요 표시 */
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || !el.id) return;
    var prev = document.getElementById(el.id + "_prev");
    if (prev) prev.src = el.value;
    if (el.closest && el.closest("#main")) markDirty();
  });

  /* ── config.js 텍스트 생성기 ──────────────────────────────────────── */
  function keyStr(k) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
  }

  function js(v, ind) {
    ind = ind || "";
    if (v === null || v === undefined) return '""';
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "string") return JSON.stringify(v);

    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      return "[\n" + v.map(function (x) {
        return ind + "  " + js(x, ind + "  ");
      }).join(",\n") + "\n" + ind + "]";
    }

    var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; });
    if (!keys.length) return "{}";
    return "{\n" + keys.map(function (k) {
      return ind + "  " + keyStr(k) + ": " + js(v[k], ind + "  ");
    }).join(",\n") + "\n" + ind + "}";
  }

  function buildConfig() {
    var s = state;
    var L = [];
    L.push("/* ============================================================================");
    L.push(" *  config.js  —  사이트 설정 파일");
    L.push(" *  ----------------------------------------------------------------");
    L.push(" *  ★ 이 파일은 관리자 패널(admin.html)에서 자동 생성되었습니다. ★");
    L.push(" *  생성 시각 : " + new Date().toLocaleString("ko-KR"));
    L.push(" *");
    L.push(" *  직접 수정해도 되지만, 관리자 패널에서 다시 저장하면 덮어써집니다.");
    L.push(" * ==========================================================================*/");
    L.push("");
    L.push("const SITE = {");
    L.push("");
    L.push("  /* 1. 기본 정보 (서버 이름 / 로고 / 디스코드 초대 링크 / 실시간 연동) */");
    L.push("  server: " + js(s.server, "  ") + ",");
    L.push("");
    L.push("  /* 2. 통계 뱃지 — live: \"members\"(멤버) | \"online\"(접속자) | 없으면 고정값 */");
    L.push("  stats: " + js(s.stats, "  ") + ",");
    L.push("");
    L.push("  /* 3. 서버 자랑거리 */");
    L.push("  features: " + js(s.features, "  ") + ",");
    L.push("");
    L.push("  /* 4. 가격표(상품) — 항목을 추가/삭제할 수 있습니다 */");
    L.push("  products: " + js(s.products, "  ") + ",");
    L.push("");
    L.push("  /* 5. 가격표 아래 안내 문구 */");
    L.push("  priceNote: " + js(s.priceNote) + ",");
    L.push("");
    L.push("  /* 6. 이미지 갤러리 */");
    L.push("  gallery: " + js(s.gallery, "  ") + ",");
    L.push("");
    L.push("  /* 7. 구매/이용 가이드 */");
    L.push("  guide: " + js(s.guide, "  ") + ",");
    L.push("");
    L.push("  /* 8. 공지사항 (최신 글이 위로) */");
    L.push("  notices: " + js(s.notices, "  ") + ",");
    L.push("");
    L.push("  /* 9. 자주 묻는 질문 */");
    L.push("  faq: " + js(s.faq, "  ") + ",");
    L.push("");
    L.push("  /* 10. 하단 정보 */");
    L.push("  footer: " + js(s.footer, "  ") + ",");
    L.push("");
    L.push("  /* 11. 서버 이용약관 (terms.html) */");
    L.push("  terms: " + js(s.terms, "  ") + ",");
    L.push("");
    L.push("  /* 12. 개인정보 처리방침 (privacy.html) */");
    L.push("  privacy: " + js(s.privacy, "  ") + ",");
    L.push("");
    L.push("  /* 13. 관리자 패널 설정 (비밀번호는 admin.html 에서 변경) */");
    L.push("  admin: " + js(s.admin, "  "));
    L.push("");
    L.push("};");
    L.push("");
    return L.join("\n");
  }

  /* ── 파일 다운로드 ────────────────────────────────────────────────── */
  function download(text, filename) {
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url  = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "config.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1200);
  }

  /* ── GitHub 저장 ──────────────────────────────────────────────────── */
  function b64utf8(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function ghLog(msg, cls) {
    var el = $("#ghLog");
    el.innerHTML += (el.innerHTML ? "\n" : "") +
                    '<span class="' + (cls || "") + '">' + esc(msg) + "</span>";
  }

  /* GitHub 설정 읽기 — sessionStorage 우선, 없으면 localStorage */
  function loadSettings() {
    var raw = null;
    try { raw = sessionStorage.getItem(LS_KEY); } catch (e) {}
    if (!raw) { try { raw = localStorage.getItem(LS_KEY); } catch (e) {} }
    try { return JSON.parse(raw || "{}"); } catch (e) { return {}; }
  }

  /* GitHub 설정 저장 — "브라우저에 저장" 체크 여부에 따라 위치가 달라짐 */
  function saveSettings(o) {
    var remember = $("#ghRemember") ? $("#ghRemember").checked : true;
    try {
      if (remember) {
        localStorage.setItem(LS_KEY, JSON.stringify(o));
        sessionStorage.removeItem(LS_KEY);
      } else {
        sessionStorage.setItem(LS_KEY, JSON.stringify(o));
        localStorage.removeItem(LS_KEY);
      }
    } catch (e) {}
  }

  function forgetSettings() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    try { sessionStorage.removeItem(LS_KEY); } catch (e) {}
  }

  /* ── 기본 비밀번호 사용 중이면 경고 바 표시 ───────────────────────── */
  function checkDefaultPassword() {
    var bar = $("#alertbar");
    if (!bar) return;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(LS_ALERT) === "1"; } catch (e) {}
    var isDefault = String(ADMIN.passwordHash || "") === DEFAULT_HASH;
    bar.hidden = !(isDefault && !dismissed);
  }

  /* ── 저장 모달 ────────────────────────────────────────────────────── */
  function openSave() {
    collect();
    $("#codeOut").value = buildConfig();

    var cfg = loadSettings();
    var gh  = state.admin.github || {};
    $("#ghOwner").value  = cfg.owner  || gh.owner  || "";
    $("#ghRepo").value   = cfg.repo   || gh.repo   || "";
    $("#ghBranch").value = cfg.branch || gh.branch || "main";
    $("#ghPath").value   = cfg.path   || gh.path   || "config.js";
    $("#ghMsg").value    = cfg.msg    || "관리자 패널에서 내용 수정";
    $("#ghToken").value  = cfg.token  || "";
    $("#ghLog").innerHTML = "";

    /* 토큰을 localStorage 에 저장했는지 여부를 체크박스에 반영 */
    var inLocal = false, inSess = false;
    try { inLocal = !!localStorage.getItem(LS_KEY); } catch (e) {}
    try { inSess  = !!sessionStorage.getItem(LS_KEY); } catch (e) {}
    $("#ghRemember").checked = !(inSess && !inLocal);

    $("#modal").classList.add("is-open");
  }

  function closeSave() { $("#modal").classList.remove("is-open"); }

  function pushToGitHub() {
    var cfg = {
      owner:  $("#ghOwner").value.trim(),
      repo:   $("#ghRepo").value.trim(),
      branch: $("#ghBranch").value.trim() || "main",
      path:   $("#ghPath").value.trim() || "config.js",
      token:  $("#ghToken").value.trim(),
      msg:    $("#ghMsg").value.trim() || "관리자 패널에서 내용 수정"
    };

    if (!cfg.owner || !cfg.repo || !cfg.token) {
      toast("GitHub 아이디 · 저장소 · 토큰을 모두 입력하세요", "ng");
      return;
    }
    saveSettings(cfg);
    state.admin.github = { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, path: cfg.path };

    var api = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo +
              "/contents/" + cfg.path;
    var headers = {
      "Authorization": "token " + cfg.token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    };

    $("#ghLog").innerHTML = "";
    ghLog("① 저장소의 기존 파일 확인 중...");
    $("#btnPush").disabled = true;

    fetch(api + "?ref=" + encodeURIComponent(cfg.branch), { headers: headers })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) return r.text().then(function (t) {
          throw new Error("조회 실패 (" + r.status + ") " + t.slice(0, 120));
        });
        return r.json();
      })
      .then(function (d) {
        var sha = d && d.sha;
        ghLog("② 업로드 중... (" + (sha ? "기존 파일 갱신" : "새 파일 생성") + ")");
        var body = { message: cfg.msg, content: b64utf8(buildConfig()), branch: cfg.branch };
        if (sha) body.sha = sha;
        return fetch(api, { method: "PUT", headers: headers, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) {
          throw new Error("저장 실패 (" + r.status + ") " + t.slice(0, 200));
        });
        return r.json();
      })
      .then(function (d) {
        var sha = (d && d.commit && d.commit.sha) || "";
        ghLog("✅ 저장 완료!  커밋 " + sha.slice(0, 7), "ok");
        ghLog("GitHub Pages 반영까지 1~2분 정도 걸립니다.");
        clearDirty();
        toast("GitHub 저장 완료! 1~2분 뒤 사이트에 반영됩니다", "ok");
      })
      .catch(function (err) {
        ghLog("❌ " + err.message, "ng");
        ghLog("· 토큰에 'repo' 권한이 있는지 확인하세요.");
        ghLog("· 아이디 / 저장소 / 브랜치 이름이 정확한지 확인하세요.");
        toast("저장 실패 : " + err.message, "ng");
      })
      .then(function () { $("#btnPush").disabled = false; });
  }

  /* ── 비밀번호 변경 모달 ───────────────────────────────────────────── */
  function openPw() { $("#pwModal").classList.add("is-open"); }
  function closePw() { $("#pwModal").classList.remove("is-open"); }

  /* ── 로그인 ───────────────────────────────────────────────────────── */
  function showPanel() {
    $("#login").classList.add("is-hidden");
    $("#panel").hidden = false;
    $("#panelTitle").textContent = ADMIN.title || "관리자 패널";
    renderSide();
    renderTab("server");
    checkDefaultPassword();
  }

  function tryLogin(pw) {
    if (sha256(pw) === String(ADMIN.passwordHash)) {
      try { sessionStorage.setItem(LS_LOGIN, "1"); } catch (e) {}
      showPanel();
      return true;
    }
    return false;
  }

  /* ── 초기화 ───────────────────────────────────────────────────────── */
  function init() {
    $("#panelTitle").textContent = ADMIN.title || "관리자 패널";

    if (ADMIN.enabled === false) {
      $("#loginErr").textContent = "관리자 패널이 비활성화되어 있습니다. (config.js → admin.enabled)";
      return;
    }
    if (!ADMIN.passwordHash) {
      $("#loginErr").textContent = "config.js 에 admin.passwordHash 가 없습니다.";
      return;
    }

    /* 로그인 */
    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (tryLogin($("#pw").value)) {
        $("#loginErr").textContent = "";
      } else {
        $("#loginErr").textContent = "비밀번호가 틀렸습니다.";
        $("#pw").value = "";
        $("#pw").focus();
      }
    });

    /* 상단 버튼 */
    $("#btnSave").addEventListener("click", openSave);
    $("#btnLogout").addEventListener("click", function () {
      try { sessionStorage.removeItem(LS_LOGIN); } catch (e) {}
      location.reload();
    });

    /* 기본 비밀번호 경고 바 */
    var fix = $("#alertFix");
    if (fix) fix.addEventListener("click", function (e) { e.preventDefault(); openPw(); });
    var ax = $("#alertClose");
    if (ax) ax.addEventListener("click", function () {
      $("#alertbar").hidden = true;
      try { sessionStorage.setItem(LS_ALERT, "1"); } catch (e) {}
    });

    /* 저장 모달 */
    $("#modalClose").addEventListener("click", closeSave);
    $("#modal").addEventListener("click", function (e) { if (e.target === this) closeSave(); });
    $("#btnDownload").addEventListener("click", function () {
      collect();
      download(buildConfig(), "config.js");
      toast("config.js 다운로드 완료 — GitHub에 덮어쓰기 하세요", "ok");
    });
    $("#btnPush").addEventListener("click", pushToGitHub);
    $("#btnForget").addEventListener("click", function () {
      forgetSettings();
      $("#ghToken").value = "";
      $("#ghOwner").value = "";
      $("#ghRepo").value = "";
      toast("저장된 토큰을 완전히 삭제했습니다", "ok");
    });
    $("#btnCopyCode").addEventListener("click", function () {
      collect();
      var text = buildConfig();
      $("#codeOut").value = text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast("코드를 복사했습니다", "ok"); },
                                                function () { toast("복사 실패 — 직접 선택해 복사하세요", "ng"); });
      } else {
        $("#codeOut").select();
        toast("코드를 선택했습니다. Ctrl+C 로 복사하세요", "ok");
      }
    });

    /* 비밀번호 변경 모달 */
    $("#pwClose").addEventListener("click", closePw);
    $("#pwModal").addEventListener("click", function (e) { if (e.target === this) closePw(); });
    $("#btnMakeHash").addEventListener("click", function () {
      var a = $("#newPw").value, b = $("#newPw2").value;
      if (a.length < 4) { toast("비밀번호는 4자 이상으로 해주세요", "ng"); return; }
      if (a !== b) { toast("두 비밀번호가 서로 다릅니다", "ng"); return; }
      $("#hashOut").value = sha256(a);
      toast("해시값 생성 완료 — config.js 에 붙여넣고 저장하세요", "ok");
    });

    /* ESC 로 모달 닫기 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeSave(); closePw(); }
    });

    /* 저장 안 한 채 나가려 할 때 경고 */
    window.addEventListener("beforeunload", function (e) {
      if (!$("#dirtyBadge").hidden) { e.preventDefault(); e.returnValue = ""; }
    });

    /* 새로고침해도 로그인 유지 (탭을 닫으면 로그아웃) */
    try { if (sessionStorage.getItem(LS_LOGIN) === "1") showPanel(); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();







