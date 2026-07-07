/* Maison Lumière — interactions
   Slow, deliberate, emotional. No library, no easing shortcuts. */
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- 1. Champagne cursor: dot + trailing ring ---------- */
  if (finePointer) {
    const cursor = document.querySelector(".cursor");
    const dot = cursor.querySelector(".cursor-dot");
    const ring = cursor.querySelector(".cursor-ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

    addEventListener("mousemove", e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
    }, { passive: true });

    (function trail() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      requestAnimationFrame(trail);
    })();

    document.querySelectorAll("a, button, [data-hover]").forEach(el => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- 2. Missing-media grace: chained fallback ----------
     The <video> element itself is the probe: on error, swap to the
     borrow source (clip1, regraded by CSS via .borrowed); if that
     fails too, show the film-toned gradient. No fetch, no races. */
  document.querySelectorAll(".media-frame").forEach(frame => {
    const video = frame.querySelector("video");
    if (!video) return;
    const borrow = video.dataset.fallbackSrc;
    let stage = 0; // 0 = primary source, 1 = borrowed clip1

    const onFail = () => {
      if (stage === 0 && borrow) {
        stage = 1;
        video.setAttribute("src", borrow);
        video.load();
        if (video.hasAttribute("autoplay")) {
          const p = video.play();
          if (p) p.catch(() => {});
        }
      } else {
        frame.classList.add("no-media");
      }
    };
    video.addEventListener("error", onFail);
    video.addEventListener("loadedmetadata", () => {
      frame.classList.remove("no-media");
      if (stage === 1) frame.classList.add("borrowed");
    });
    if (video.error) onFail();
  });

  /* ---------- 3. Hero: scroll-scrubbed film ---------- */
  const heroWrap = document.querySelector(".hero-scroll");
  const heroVideo = document.querySelector(".hero-video");
  if (heroWrap && heroVideo && !reduced) {
    let target = 0, current = 0;
    heroVideo.pause();

    /* Scroll-scrubbing needs random access. Some static servers don't
       support Range requests (video.seekable stays empty), so we pull
       the clip into memory as a Blob: blob: URLs are always seekable
       and scrub with zero network latency. */
    const toBlob = () => {
      const src = heroVideo.getAttribute("src");
      fetch(src)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(blob => {
          heroVideo.src = URL.createObjectURL(blob);
          heroVideo.load();
        })
        .catch(() => {});
    };
    if (heroVideo.readyState >= 1) toBlob();
    else heroVideo.addEventListener("loadedmetadata", toBlob, { once: true });

    const progress = () => {
      const rect = heroWrap.getBoundingClientRect();
      const total = rect.height - innerHeight;
      return Math.min(1, Math.max(0, -rect.top / total));
    };

    (function scrub() {
      // readyState >= 1: metadata (duration, dimensions) is available
      if (heroVideo.readyState >= 1 && heroVideo.duration) {
        target = progress() * heroVideo.duration;
        current += (target - current) * 0.09;           // slow, weighted drift
        if (Math.abs(target - current) > 0.001) {
          try { heroVideo.currentTime = current; } catch (_) {}
        }
      }
      requestAnimationFrame(scrub);
    })();
  } else if (heroVideo && reduced) {
    heroVideo.setAttribute("controls", "");
  }

  /* ---------- 4. Typed manifesto ---------- */
  const typed = document.querySelector(".typed");
  const caret = document.querySelector(".caret");
  if (typed) {
    const text = typed.dataset.typed;
    if (reduced) {
      typed.textContent = text;
      if (caret) caret.classList.add("done");
    } else {
      let i = 0, started = false;
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting || started) return;
        started = true;
        setTimeout(function tick() {
          typed.textContent = text.slice(0, ++i);
          if (i < text.length) {
            setTimeout(tick, 34 + Math.random() * 46);   // human, uneven rhythm
          } else if (caret) {
            setTimeout(() => caret.classList.add("done"), 1400);
          }
        }, 900);
        io.disconnect();
      }, { threshold: 0.4 });
      io.observe(typed);
    }
  }

  /* ---------- 5. Kinetic manifesto: one word per scroll step ---------- */
  const kinetic = document.querySelector(".kinetic");
  const words = [...document.querySelectorAll(".kinetic-word")];
  if (kinetic && words.length && !reduced) {
    let lastIdx = -1;
    const setStep = idx => {
      if (idx === lastIdx) return;
      lastIdx = idx;
      words.forEach((w, i) => {
        w.classList.toggle("active", i === idx);
        w.classList.toggle("passed", i < idx);
      });
    };
    const onScroll = () => {
      const rect = kinetic.getBoundingClientRect();
      const total = rect.height - innerHeight;
      const p = Math.min(0.999, Math.max(0, -rect.top / total));
      setStep(Math.floor(p * words.length));
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 6. Stories: memories waking on hover ---------- */
  document.querySelectorAll(".story").forEach(card => {
    const video = card.querySelector("video");
    if (!video) return;
    const wake = () => {
      card.classList.add("playing");
      const p = video.play();
      if (p) p.catch(() => {});
    };
    const rest = () => {
      card.classList.remove("playing");
      video.pause();
    };
    card.addEventListener("mouseenter", wake);
    card.addEventListener("mouseleave", rest);
    card.addEventListener("focus", wake);
    card.addEventListener("blur", rest);
  });

  /* ---------- 7. Quiet scroll reveals ---------- */
  const revealTargets = document.querySelectorAll(
    ".section-head, .story, .services-left, .services-list li, .note, .process-steps li, .about-copy, .footer-cta, .inquire-btn"
  );
  revealTargets.forEach(el => el.classList.add("reveal"));
  if (!reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("in"));
  }

  /* ---------- 8. Inquire CTA: smooth glide to contact ---------- */
  document.querySelectorAll("[data-inquire]").forEach(btn => {
    btn.addEventListener("click", e => {
      const target = document.querySelector("#contact");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      history.replaceState(null, "", "#contact");
    });
  });
})();
