/* ============================================================
   Pyeonda 프로토타입 — 인터랙션
   0) 새로고침/뒤로가기 시 항상 스크롤 최상단 복원
   1) 채널 토글 (Instagram ↔ KakaoTalk · 슬라이딩 thumb)
   2) 배경 블롭 패럴럭스
   3) 스크롤 리빌 (IntersectionObserver)
   4) 카드 포인터 틸트
   ============================================================ */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── 0) 스크롤 최상단 복원 (크로스브라우징) ──────────────── */
  (function initScrollTop() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const toTop = () => window.scrollTo(0, 0);

    // 초기 진입 시 즉시 + 레이아웃/폰트 로드 후 한 번 더 보정
    toTop();
    window.addEventListener("DOMContentLoaded", toTop);
    window.addEventListener("load", toTop);
    // bfcache(뒤로/앞으로) 복귀 시
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) toTop();
    });
  })();

  /* ── 1) 채널 토글 ─────────────────────────────────────── */
  (function initChannelToggle() {
    const QR_SRC = {
      instagram: "./assets/qr-instagram.png",
      kakao: "./assets/qr-kakao.png",
    };
    const ALT = {
      instagram: "Instagram QR 코드",
      kakao: "KakaoTalk QR 코드",
    };

    const toggle = document.getElementById("channelToggle");
    const qrImage = document.getElementById("channelQr");
    if (!toggle || !qrImage) return;

    const buttons = Array.from(toggle.querySelectorAll(".toggle__btn"));
    toggle.dataset.active = "instagram";

    function selectChannel(channel) {
      const src = QR_SRC[channel];
      if (!src) return;

      qrImage.src = src;
      qrImage.alt = ALT[channel];
      toggle.dataset.active = channel;

      buttons.forEach((btn) => {
        const isActive = btn.dataset.channel === channel;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
    }

    toggle.addEventListener("click", function (event) {
      const btn = event.target.closest(".toggle__btn");
      if (!btn || !toggle.contains(btn)) return;
      selectChannel(btn.dataset.channel);
    });
  })();

  /* ── 1.5) 다국어(i18n) — JSON 언어팩 로드/치환 ──────────── */
  (function initI18n() {
    const STORAGE_KEY = "pyeonda.lang";
    const SUPPORTED = ["en", "zh", "ja", "ko", "vi"];
    const DEFAULT_LANG = "ko";

    const sw = document.getElementById("langSwitch");
    if (!sw) return;

    const buttons = Array.from(sw.querySelectorAll(".lang__btn"));
    const cache = {};

    function applyDict(dict) {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (dict[key] != null) el.textContent = dict[key];
      });
    }

    function markActive(lang) {
      buttons.forEach((btn) => {
        const active = btn.dataset.lang === lang;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    }

    function save(lang) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        /* localStorage 비활성 환경 무시 */
      }
    }

    async function setLang(lang) {
      if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
      try {
        if (!cache[lang]) {
          const res = await fetch("./js/i18n/" + lang + ".json", {
            cache: "no-cache",
          });
          if (!res.ok) throw new Error("locale load failed: " + lang);
          cache[lang] = await res.json();
        }
        applyDict(cache[lang]);
        document.documentElement.lang = lang;
        save(lang);
      } catch (e) {
        // fetch 실패(예: file:// 직접 열기) 시 HTML 기본(한국어) 유지
        console.warn("[i18n]", e.message);
      }
      markActive(lang);
    }

    sw.addEventListener("click", (event) => {
      const btn = event.target.closest(".lang__btn");
      if (!btn || !sw.contains(btn)) return;
      setLang(btn.dataset.lang);
    });

    // li는 기본 키보드 동작이 없으므로 Enter/Space로도 선택 가능하게 처리
    sw.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const btn = event.target.closest(".lang__btn");
      if (!btn || !sw.contains(btn)) return;
      event.preventDefault();
      setLang(btn.dataset.lang);
    });

    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* 무시 */
    }
    setLang(saved || DEFAULT_LANG);
  })();

  /* ── 2) 배경 블롭 패럴럭스 ──────────────────────────────── */
  (function initParallax() {
    const blobs = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!blobs.length || prefersReducedMotion) return;

    let ticking = false;

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      blobs.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0;
        el.style.transform = "translateY(" + scrollTop * speed + "px)";
      });
      ticking = false;
    }

    function requestTick() {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    }

    window.addEventListener("scroll", requestTick, { passive: true });
    onScroll();
  })();

  /* ── 3) 스크롤 리빌 ───────────────────────────────────── */
  (function initReveal() {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    items.forEach((el) => observer.observe(el));
  })();

  /* ── 4) 카드 포인터 틸트 (데스크탑 한정) ────────────────── */
  (function initTilt() {
    if (prefersReducedMotion) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;

    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const MAX = 6; // deg

      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(700px) rotateY(" +
          (px * MAX).toFixed(2) +
          "deg) rotateX(" +
          (-py * MAX).toFixed(2) +
          "deg) translateY(-4px)";
      });

      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  })();
})();
