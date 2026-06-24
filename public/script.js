const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Open navigation");
  });
});

function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 60);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initWaveform() {
  const canvas = document.getElementById("waveform-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let raf;
  let t = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    ctx.clearRect(0, 0, width, height);

    [
      { color: "rgba(17,200,255,0.35)", amp: 28, freq: 0.012, speed: 0.018, y: height * 0.5 },
      { color: "rgba(255,42,168,0.22)", amp: 18, freq: 0.019, speed: 0.024, y: height * 0.55 },
      { color: "rgba(124,77,255,0.18)", amp: 22, freq: 0.009, speed: 0.013, y: height * 0.45 }
    ].forEach((wave) => {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = wave.y + Math.sin(x * wave.freq + t * wave.speed * 60) * wave.amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    t += 1;
    raf = requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  draw();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cancelAnimationFrame(raf);
  }
}

function initReveal() {
  const targets = document.querySelectorAll(".reveal, .reveal-group");
  if (!targets.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    }),
    { threshold: 0.12 }
  );

  targets.forEach((target) => io.observe(target));
}

function initAudioPreviews() {
  const cards = document.querySelectorAll("[data-audio]");
  if (!cards.length) return;

  const audio = new Audio();
  audio.volume = 0.7;
  let activeBtn = null;
  const bar = document.getElementById("audio-bar");
  const barTitle = document.getElementById("audio-bar-title");
  const progress = document.getElementById("audio-progress");
  const toggleBtn = document.getElementById("audio-bar-toggle");

  function resetButton(btn) {
    btn?.classList.remove("playing");
    const label = btn?.querySelector("span");
    if (label) label.textContent = "Preview";
  }

  function setToggleIcon(paused) {
    if (!toggleBtn) return;
    toggleBtn.innerHTML = paused
      ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 2l9 5-9 5V2z"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="4" height="12"/><rect x="8" y="1" width="4" height="12"/></svg>';
  }

  function play(src, title, btn) {
    if (activeBtn && activeBtn !== btn) resetButton(activeBtn);

    if (audio.src.endsWith(src) && !audio.paused) {
      audio.pause();
      resetButton(btn);
      bar?.classList.remove("visible");
      activeBtn = null;
      setToggleIcon(true);
      return;
    }

    audio.src = src;
    audio.play().catch(() => {});
    btn.classList.add("playing");
    btn.querySelector("span").textContent = "Playing";
    activeBtn = btn;
    if (bar && barTitle) {
      barTitle.textContent = title;
      bar.classList.add("visible");
    }
    setToggleIcon(false);
  }

  cards.forEach((card) => {
    card.querySelector(".preview-btn")?.addEventListener("click", () => {
      play(card.dataset.audio, card.querySelector("h3")?.textContent || "NEXAStudios preview", card.querySelector(".preview-btn"));
    });
  });

  audio.addEventListener("timeupdate", () => {
    if (progress && audio.duration) progress.value = audio.currentTime / audio.duration;
  });

  audio.addEventListener("ended", () => {
    resetButton(activeBtn);
    bar?.classList.remove("visible");
    activeBtn = null;
    setToggleIcon(true);
  });

  toggleBtn?.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {});
      setToggleIcon(false);
    } else {
      audio.pause();
      setToggleIcon(true);
    }
  });

  document.getElementById("audio-bar-close")?.addEventListener("click", () => {
    audio.pause();
    bar?.classList.remove("visible");
    resetButton(activeBtn);
    activeBtn = null;
    setToggleIcon(true);
  });
}

function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = true;
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) panel.hidden = false;
    });
  });
}

function initContactForms() {
  document.querySelectorAll(".contact-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".form-status");
      const btn = form.querySelector('button[type="submit"]');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = { ...Object.fromEntries(new FormData(form)), type: form.dataset.type };
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending";

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Contact API failed");
        status.textContent = "Sent. We'll be in touch within 48 hours.";
        status.className = "form-status ok";
        form.reset();
      } catch {
        status.textContent = "Something went wrong. Email nexastudiosmusic@gmail.com directly.";
        status.className = "form-status err";
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
}

function initStoreFilters() {
  const btns = document.querySelectorAll(".filter-btn");
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      document.querySelectorAll(".product-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.region !== filter;
      });
    });
  });
}

function initBuyButtons() {
  document.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Loading";

      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: btn.dataset.priceId, productName: btn.dataset.name })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error(data.error || "Checkout unavailable");
      } catch (error) {
        alert(error.message || "Checkout is not configured yet.");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
}

function initPurchaseSuccess() {
  const el = document.getElementById("purchase-success");
  if (el && new URLSearchParams(location.search).get("success")) {
    el.hidden = false;
    history.replaceState({}, "", "/store");
  }
}

function mediaMarkup(item) {
  const player = item.mimeType.startsWith("video/")
    ? `<video src="${item.url}" controls preload="metadata"></video>`
    : `<audio src="${item.url}" controls preload="metadata"></audio>`;
  return `
    <article class="media-card">
      ${player}
      <div>
        <h3>${item.title}</h3>
        <p>${item.artist} · ${item.kind} · ${(item.size / 1024 / 1024).toFixed(2)}MB</p>
      </div>
    </article>
  `;
}

async function loadMediaLibrary() {
  const list = document.getElementById("media-library-list");
  if (!list) return;

  try {
    const res = await fetch("/api/media");
    const data = await res.json();
    list.innerHTML = data.media?.length
      ? data.media.map(mediaMarkup).join("")
      : '<p class="empty-state">No uploaded media yet.</p>';
  } catch {
    list.innerHTML = '<p class="empty-state">Media library could not be loaded.</p>';
  }
}

function initMediaUpload() {
  const form = document.getElementById("media-upload-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const fileInput = form.querySelector('input[type="file"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = "Choose an audio or video file first.";
      status.className = "form-status err";
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Uploading";

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const formData = Object.fromEntries(new FormData(form));
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, fileName: file.name, dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      status.textContent = "Uploaded to the media library.";
      status.className = "form-status ok";
      form.reset();
      await loadMediaLibrary();
    } catch (error) {
      status.textContent = error.message || "Upload failed.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload media";
    }
  });

  loadMediaLibrary();
}

function setSessionToken(token) {
  document.cookie = `session=${token}; path=/; max-age=2592000`; // 30 days
}

function getSessionToken() {
  const cookies = document.cookie.split(";").map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith("session="));
  return sessionCookie ? sessionCookie.substring(8) : null;
}

function clearSessionToken() {
  document.cookie = "session=; path=/; max-age=0";
}

async function checkAuth() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

function initAuthForms() {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const authTabs = document.querySelectorAll(".auth-tab");
  const authSuccess = document.getElementById("auth-success");

  if (!loginForm || !signupForm) return;

  authTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      authTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const tabName = tab.dataset.tab;
      if (tabName === "login") {
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
      } else {
        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
      }
    });
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = loginForm.querySelector(".form-status");
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Signing in...";
    
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
      });
      const data = await res.json();
      
      if (data.ok) {
        setSessionToken(data.token);
        status.textContent = "Signed in successfully!";
        status.className = "form-status ok";
        loginForm.classList.add("hidden");
        signupForm.classList.add("hidden");
        authSuccess.hidden = false;
      } else {
        status.textContent = data.error || "Sign in failed";
        status.className = "form-status err";
      }
    } catch (err) {
      status.textContent = "Network error. Please try again.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = signupForm.querySelector(".form-status");
    const btn = signupForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Creating account...";
    
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(signupForm)))
      });
      const data = await res.json();
      
      if (data.ok) {
        setSessionToken(data.token);
        status.textContent = "Account created successfully!";
        status.className = "form-status ok";
        loginForm.classList.add("hidden");
        signupForm.classList.add("hidden");
        authSuccess.hidden = false;
      } else {
        status.textContent = data.error || "Sign up failed";
        status.className = "form-status err";
      }
    } catch (err) {
      status.textContent = "Network error. Please try again.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function initAudioModal() {
  const modal = document.getElementById("audio-modal");
  const modalPlayer = document.getElementById("audio-modal-player");
  const modalTitle = document.getElementById("audio-modal-title");
  const closeBtn = document.querySelector(".audio-modal-close");
  const listenBtns = document.querySelectorAll(".listen-btn");
  const playPauseBtn = document.getElementById("audio-play-pause");
  const progressBar = document.getElementById("audio-progress-bar");
  const currentTimeEl = document.getElementById("audio-current-time");
  const durationEl = document.getElementById("audio-duration");
  const volumeSlider = document.getElementById("audio-volume");

  if (!modal || !modalPlayer) return;

  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function updatePlayPauseIcon() {
    if (modalPlayer.paused) {
      playPauseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l10 6-10 6V2z"/></svg>';
    } else {
      playPauseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>';
    }
  }

  async function openModal(audioSrc, title) {
    const isSnippet = audioSrc.includes("-snippet");
    
    if (!isSnippet) {
      const user = await checkAuth();
      if (!user) {
        alert("Please sign in to play full tracks. Snippets are free for everyone.");
        window.location.href = "/auth";
        return;
      }
    }
    
    modalPlayer.src = audioSrc;
    modalTitle.textContent = title;
    modal.hidden = false;
    document.body.style.paddingBottom = "80px";
    modalPlayer.load();
    modalPlayer.play().catch((err) => {
      console.error("Audio play error:", err);
    });
  }

  function closeModal() {
    modalPlayer.pause();
    modalPlayer.src = "";
    modal.hidden = true;
    document.body.style.paddingBottom = "";
  }

  closeBtn?.addEventListener("click", closeModal);

  playPauseBtn?.addEventListener("click", () => {
    if (modalPlayer.paused) {
      modalPlayer.play().catch(() => {});
    } else {
      modalPlayer.pause();
    }
  });

  modalPlayer.addEventListener("timeupdate", () => {
    const progress = (modalPlayer.currentTime / modalPlayer.duration) * 100 || 0;
    progressBar.value = progress;
    currentTimeEl.textContent = formatTime(modalPlayer.currentTime);
  });

  modalPlayer.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(modalPlayer.duration);
  });

  modalPlayer.addEventListener("play", updatePlayPauseIcon);
  modalPlayer.addEventListener("pause", updatePlayPauseIcon);

  progressBar?.addEventListener("input", () => {
    const time = (progressBar.value / 100) * modalPlayer.duration;
    modalPlayer.currentTime = time;
  });

  volumeSlider?.addEventListener("input", () => {
    modalPlayer.volume = volumeSlider.value;
  });

  listenBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const audioSrc = btn.dataset.audio;
      const title = btn.textContent || "Now Playing";
      if (audioSrc) openModal(audioSrc, title);
    });
  });

  modalPlayer.addEventListener("error", (e) => {
    console.error("Audio load error:", e);
  });
}

initHeader();
initWaveform();
initReveal();
initAudioPreviews();
initTabs();
initContactForms();
initStoreFilters();
initBuyButtons();
initPurchaseSuccess();
initMediaUpload();
initAuthForms();
initAudioModal();
