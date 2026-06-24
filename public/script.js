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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function mediaMarkup(item) {
  const mediaUrl = escapeHtml(item.url);
  const title = escapeHtml(item.title);
  const artist = escapeHtml(item.artist || "Unassigned Artist");
  const album = escapeHtml(item.album || "No album");
  const kind = escapeHtml(item.kind);
  const player = item.mimeType.startsWith("video/")
    ? `<video src="${mediaUrl}" controls preload="metadata"></video>`
    : `<audio src="${mediaUrl}" controls preload="metadata"></audio>`;
  return `
    <article class="media-card">
      ${player}
      <div>
        <h3>${title}</h3>
        <p>${artist} · ${album} · ${kind} · ${(item.size / 1024 / 1024).toFixed(2)}MB</p>
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

function artistSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/dr\./g, "dr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isPublicMedia(item) {
  const title = String(item.title || "").toLowerCase();
  const artist = String(item.artist || "").toLowerCase();
  const isAmakaAkala = title.includes("akala aka m o") && (item.artistId === "dr-amaka-aloy" || artist.includes("amaka"));
  return !isAmakaAkala && String(item.releaseStatus || "active").toLowerCase() === "active";
}

function publicTrackButton(item, label = "Listen") {
  return `<button class="track-link listen-btn" data-audio="${escapeHtml(item.url)}" data-snippet="${item.isSnippet ? "true" : "false"}" type="button">${escapeHtml(label)}</button>`;
}

function publicTrackMeta(item) {
  const kind = item.isSnippet ? "snippet" : String(item.kind || "track");
  const context = item.album || item.genre || "";
  return context && context.toLowerCase() !== kind.toLowerCase() ? `${context} · ${kind}` : kind;
}

function publicCatalogItem(item) {
  return `
    <article class="catalog-track">
      ${publicTrackButton(item, item.title)}
      <span>${escapeHtml(publicTrackMeta(item))}</span>
    </article>
  `;
}

function storeCatalogCard(item) {
  return `
    <article class="product-card" data-region="${escapeHtml(artistSlug(item.genre || item.artist))}">
      <div class="product-thumb afro-thumb"></div>
      <div class="product-info">
        <p class="eyebrow">${escapeHtml(item.artist || "NEXAStudios™ Music")} · ${escapeHtml(item.album || "Release")}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(publicTrackMeta(item))} uploaded from the label media vault.</p>
        <div class="product-actions">
          <span class="product-price">$9.99</span>
          ${publicTrackButton(item, item.isSnippet ? "Preview" : "Listen")}
        </div>
      </div>
    </article>
  `;
}

async function initPublicCatalog() {
  const artistCatalogs = document.querySelectorAll("[data-public-catalog]");
  const storeCatalog = document.querySelector("[data-store-catalog]");
  if (!artistCatalogs.length && !storeCatalog) return;

  try {
    const res = await fetch("/api/media");
    if (!res.ok) throw new Error("Media API failed");
    const data = await res.json();
    const media = (data.media || []).filter(isPublicMedia);

    artistCatalogs.forEach((container) => {
      const artistId = container.dataset.publicCatalog;
      const tracks = media.filter((item) => item.artistId === artistId || artistSlug(item.artist) === artistId);
      container.innerHTML = tracks.length
        ? tracks.map(publicCatalogItem).join("")
        : '<p class="empty-state compact">No public releases uploaded yet.</p>';
    });

    if (storeCatalog) {
      storeCatalog.innerHTML = media.length ? media.map(storeCatalogCard).join("") : "";
    }
  } catch {
    artistCatalogs.forEach((container) => {
      container.innerHTML = '<p class="empty-state compact">Catalog uploads could not be loaded.</p>';
    });
  }
}

function optionMarkup(items, labelKey = "name") {
  return [
    '<option value="">Select</option>',
    ...items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item[labelKey])}</option>`)
  ].join("");
}

function tableMarkup(headers, rows) {
  if (!rows.length) return '<p class="empty-state">No data yet.</p>';
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

async function loadAdminDashboard() {
  if (!document.body.classList.contains("admin-page")) return;

  const [dashboardRes, artistsRes, albumsRes] = await Promise.all([
    fetch("/api/admin/dashboard"),
    fetch("/api/artists"),
    fetch("/api/albums")
  ]);

  if (!dashboardRes.ok) return;

  const dashboard = await dashboardRes.json();
  const artistsData = await artistsRes.json();
  const albumsData = await albumsRes.json();
  const artists = artistsData.artists || [];
  const albums = albumsData.albums || [];

  document.querySelectorAll("[data-artist-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = optionMarkup(artists, "name");
    select.value = current;
  });

  document.querySelectorAll("[data-album-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = optionMarkup(albums, "title");
    select.value = current;
  });

  const statValues = [
    dashboard.stats.artists,
    dashboard.stats.albums,
    dashboard.stats.tracks,
    dashboard.stats.streams.toLocaleString(),
    dashboard.stats.uploads,
    dashboard.stats.users
  ];
  document.querySelectorAll("#admin-stats strong").forEach((el, index) => {
    el.textContent = statValues[index] ?? "-";
  });

  const artistsTable = document.getElementById("artists-table");
  if (artistsTable) {
    artistsTable.innerHTML = tableMarkup(["Artist", "Genre", "Albums", "Tracks", "Streams"], dashboard.artists.map((artist) => `
      <tr><td>${escapeHtml(artist.name)}</td><td>${escapeHtml(artist.genre || "-")}</td><td>${escapeHtml(artist.albums)}</td><td>${escapeHtml(artist.tracks)}</td><td>${escapeHtml(artist.streams.toLocaleString())}</td></tr>
    `));
  }

  const albumsTable = document.getElementById("albums-table");
  if (albumsTable) {
    albumsTable.innerHTML = tableMarkup(["Album", "Artist", "Type", "Tracks", "Streams"], dashboard.albums.map((album) => `
      <tr><td>${escapeHtml(album.title)}</td><td>${escapeHtml(album.artist)}</td><td>${escapeHtml(album.releaseType || "-")}</td><td>${escapeHtml(album.tracks)}</td><td>${escapeHtml(album.streams.toLocaleString())}</td></tr>
    `));
  }

  const tracksTable = document.getElementById("tracks-table");
  if (tracksTable) {
    tracksTable.innerHTML = tableMarkup(["Song", "Artist", "Album", "Genre", "Streams"], dashboard.tracks.map((track) => `
      <tr><td>${escapeHtml(track.title)}</td><td>${escapeHtml(track.artist || "-")}</td><td>${escapeHtml(track.album || "-")}</td><td>${escapeHtml(track.genre || "-")}</td><td>${escapeHtml(track.streams.toLocaleString())}</td></tr>
    `));
  }
}

function initAdminForms() {
  const artistForm = document.getElementById("artist-form");
  const albumForm = document.getElementById("album-form");

  async function submitAdminForm(form, url, successText) {
    const status = form.querySelector(".form-status");
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      status.textContent = successText;
      status.className = "form-status ok";
      form.reset();
      await loadAdminDashboard();
    } catch (error) {
      status.textContent = error.message;
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  artistForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAdminForm(artistForm, "/api/artists", "Artist created.");
  });

  albumForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAdminForm(albumForm, "/api/albums", "Album created.");
  });
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
      const artistSelect = form.querySelector('[name="artistId"]');
      const albumSelect = form.querySelector('[name="albumId"]');
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          artist: artistSelect?.selectedOptions?.[0]?.textContent || "",
          album: albumSelect?.selectedOptions?.[0]?.textContent || "",
          fileName: file.name,
          dataUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      status.textContent = "Uploaded to the media library.";
      status.className = "form-status ok";
      form.reset();
      await loadMediaLibrary();
      await loadAdminDashboard();
    } catch (error) {
      status.textContent = error.message || "Upload failed.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload media";
    }
  });

  loadMediaLibrary();
  loadAdminDashboard();
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

function updateAdminLinks(user) {
  document.querySelectorAll('a[href="/admin"]').forEach((link) => {
    if (!user || user.role !== "admin") {
      link.hidden = true;
    } else {
      link.hidden = false;
    }
  });
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
        authSuccess.querySelector(".admin-link")?.toggleAttribute("hidden", data.user?.role !== "admin");
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
        authSuccess.querySelector(".admin-link")?.toggleAttribute("hidden", data.user?.role !== "admin");
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

  async function openModal(audioSrc, title, snippetOverride = false) {
    const isSnippet = snippetOverride || audioSrc.includes("-snippet");
    
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

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".listen-btn");
    if (!btn) return;
    const audioSrc = btn.dataset.audio;
    const title = btn.textContent || "Now Playing";
    if (audioSrc) openModal(audioSrc, title, btn.dataset.snippet === "true");
  });

  modalPlayer.addEventListener("error", (e) => {
    console.error("Audio load error:", e);
  });
}

async function initAdminGate() {
  const isAdminPage = Boolean(document.getElementById("media-upload-form") && document.body.classList.contains("admin-page"));
  const user = await checkAuth();
  updateAdminLinks(user);

  if (isAdminPage && (!user || user.role !== "admin")) {
    window.location.href = "/auth";
  }
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
initAdminForms();
initAuthForms();
initPublicCatalog();
initAudioModal();
initAdminGate();
