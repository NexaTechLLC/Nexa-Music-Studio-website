const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("#year");
const defaultAlbumArtwork = "/assets/COVER%20ART%20For%20JESUS%20CHRIST%20THE%20LAMB%20OF%20ROYAL%20MERCIES%20Album.png";

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
  if (!cards.length && !document.getElementById("audio-bar")) return;

  const audio = new Audio();
  audio.volume = 0.7;
  let activeBtn = null;
  let activePreviewLimit = 0;
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

  function play(src, title, btn, previewLimit = 0) {
    if (activeBtn && activeBtn !== btn) resetButton(activeBtn);

    if (audio.src.endsWith(src) && !audio.paused) {
      audio.pause();
      resetButton(btn);
      bar?.classList.remove("visible");
      activeBtn = null;
      activePreviewLimit = 0;
      setToggleIcon(true);
      return;
    }

    activePreviewLimit = Number(previewLimit || 0);
    audio.src = src;
    audio.currentTime = 0;
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

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".preview-btn[data-audio]");
    if (!btn) return;
    const rowTitle = btn.closest(".album-track-row")?.querySelector(".album-track-info strong")?.textContent;
    const catalogTitle = btn.closest(".catalog-track, .product-card")?.querySelector("strong, h3")?.textContent;
    play(btn.dataset.audio, rowTitle || catalogTitle || "NEXAStudios preview", btn, btn.dataset.previewLimit);
  });

  audio.addEventListener("timeupdate", () => {
    if (progress && audio.duration) progress.value = audio.currentTime / audio.duration;
    if (activePreviewLimit && audio.currentTime >= activePreviewLimit) {
      audio.pause();
      audio.currentTime = 0;
      resetButton(activeBtn);
      bar?.classList.remove("visible");
      activeBtn = null;
      activePreviewLimit = 0;
      setToggleIcon(true);
    }
  });

  audio.addEventListener("ended", () => {
    resetButton(activeBtn);
    bar?.classList.remove("visible");
    activeBtn = null;
    activePreviewLimit = 0;
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
    activePreviewLimit = 0;
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
  window.activeStoreFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";

  window.renderStoreCatalog = () => {
    const storeCatalog = document.querySelector("[data-store-catalog]");
    if (!storeCatalog) return;
    const media = window.storeCatalogMedia || [];
    const filtered = window.activeStoreFilter === "all"
      ? media
      : media.filter((item) => genreCategoryValue(item).split(/\s+/).includes(window.activeStoreFilter));
    storeCatalog.innerHTML = filtered.length
      ? filtered.map(storeCatalogCard).join("")
      : '<p class="empty-state">No tracks found for this genre yet.</p>';
  };

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      window.activeStoreFilter = btn.dataset.filter;
      window.renderStoreCatalog();
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
          body: JSON.stringify({
            plan: btn.dataset.plan,
            priceId: btn.dataset.priceId,
            productName: btn.dataset.name,
            trackId: btn.dataset.trackId,
            albumId: btn.dataset.albumId
          })
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

async function readApiJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const message = text.trim() || `Request failed with status ${res.status}`;
    throw new Error(message.slice(0, 180));
  }
}

async function uploadBlobFile(file, folder, status, button) {
  if (!file) return null;
  const { upload } = await import("https://esm.sh/@vercel/blob@2.5.0/client");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
  if (status) {
    status.textContent = `Uploading ${file.type.startsWith("image/") ? "image" : "file"} to media storage...`;
    status.className = "form-status";
  }
  if (button) button.textContent = "Uploading file";
  return upload(`${folder}/${Date.now()}-${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    contentType: file.type || "application/octet-stream",
    multipart: file.size > 4 * 1024 * 1024
  });
}

const genreOptions = [
  "Afrosounds",
  "Hip-Hop/Rap",
  "Latin",
  "Jazz/Blues",
  "Caribbean",
  "Pop",
  "R&B",
  "Gospel",
  "Electronic",
  "Rock",
  "Punjabi",
  "Country",
  "Instrumental"
];

function mediaMarkup(item) {
  const mediaUrl = escapeHtml(item.embedUrl || item.url);
  const title = escapeHtml(item.title);
  const artist = escapeHtml(item.artist || "Unassigned Artist");
  const album = escapeHtml(item.album || "No album");
  const genre = escapeHtml(item.genre || "No genre");
  const kind = escapeHtml(item.kind);
  const player = item.provider === "youtube"
    ? `<iframe class="youtube-embed" src="${mediaUrl}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    : item.mimeType.startsWith("video/")
    ? `<video src="${mediaUrl}" controls preload="metadata"></video>`
    : `<audio src="${mediaUrl}" controls preload="metadata"></audio>`;
  return `
    <article class="media-card">
      ${player}
      <div>
        <h3>${title}</h3>
        <p>${artist} · ${album} · ${genre} · ${kind} · ${(item.size / 1024 / 1024).toFixed(2)}MB</p>
        ${item.isUpload ? `<button class="button danger media-delete-btn" type="button" data-media-id="${escapeHtml(item.id)}" data-title="${title}">Delete upload</button>` : ""}
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

function categorySlugs(value) {
  const text = String(value || "").toLowerCase();
  const slugs = [];
  if (/afro|afrobeats|afrosounds|amapiano/.test(text)) slugs.push("afrosounds");
  if (/hip\s*-?\s*hop|hiphop|rap/.test(text)) slugs.push("hip-hop-rap");
  if (/latin/.test(text)) slugs.push("latin");
  if (/jazz|blues/.test(text)) slugs.push("jazz-blues");
  if (/caribbean|dancehall|reggae|soca/.test(text)) slugs.push("caribbean");
  if (/pop/.test(text)) slugs.push("pop");
  if (/r&b|rnb|rhythm/.test(text)) slugs.push("r-b");
  if (/gospel|worship/.test(text)) slugs.push("gospel");
  if (/electronic|edm|dance/.test(text)) slugs.push("electronic");
  if (/rock/.test(text)) slugs.push("rock");
  if (/punjabi/.test(text)) slugs.push("punjabi");
  if (/country/.test(text)) slugs.push("country");
  if (/instrumental|score|beat/.test(text)) slugs.push("instrumental");
  return [...new Set(slugs)].join(" ") || "afrosounds";
}

function genreCategoryValue(item) {
  return categorySlugs(item.genre || item.album || item.artist || "");
}

function isPublicMedia(item) {
  const title = String(item.title || "").toLowerCase();
  const artist = String(item.artist || "").toLowerCase();
  const isAmakaAkala = title.includes("akala aka m o") && (item.artistId === "dr-amaka-aloy" || artist.includes("amaka"));
  return !isAmakaAkala && String(item.releaseStatus || "active").toLowerCase() !== "archived";
}

function publicTrackButton(item, label = "Listen") {
  return `<button class="track-link listen-btn" data-track-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}" data-audio="${escapeHtml(item.url)}" data-snippet="${item.isSnippet ? "true" : "false"}" type="button">${escapeHtml(label)}</button>`;
}

function publicDownloadButton(item) {
  if (item.provider === "youtube") return "";
  return `
    <button class="download-btn" data-download="${escapeHtml(item.downloadUrl || `/api/download?trackId=${encodeURIComponent(item.id)}&format=mp3`)}" type="button">MP3</button>
    <button class="download-btn" data-download="${escapeHtml(`/api/download?trackId=${encodeURIComponent(item.id)}&format=wav`)}" type="button">WAV</button>
  `;
}

function isJesusAlbumItem(item) {
  return normalizedCatalogKey(item.album || item.albumId).includes("jesus-christ-the-lamb-of-royal-mercies");
}

function trackPricePlan(item) {
  if (!isJesusAlbumItem(item)) return null;
  const number = Number(item.trackNumber || 0);
  if (number >= 1 && number <= 13) return { plan: "jesus-track-vocal", price: "$1.34", label: "Buy MP3/WAV" };
  if (number >= 14 && number <= 16) return { plan: "jesus-track-instrumental", price: "$0.99", label: "Buy MP3/WAV" };
  return null;
}

function publicPurchaseButton(item) {
  const pricing = trackPricePlan(item);
  if (!pricing) return "";
  return `<button class="buy-btn track-buy-btn" data-plan="${pricing.plan}" data-track-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.title)}" type="button">${pricing.label} ${pricing.price}</button>`;
}

function previewUrl(item) {
  if (item.provider === "youtube") return item.embedUrl || item.url;
  return item.snippetUrl || `${item.url}?preview=1`;
}

function publicPreviewButton(item) {
  if (item.provider === "youtube") return "";
  return `
    <button class="preview-btn" data-audio="${escapeHtml(previewUrl(item))}" data-preview-limit="10" type="button" aria-label="Preview ${escapeHtml(item.title)}">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1.5l9 4.5-9 4.5V1.5z"/></svg>
      <span>Preview</span>
    </button>
  `;
}

function publicTrackMeta(item) {
  const kind = item.isSnippet ? "snippet" : String(item.kind || "track");
  const context = item.album || item.genre || "";
  return context && context.toLowerCase() !== kind.toLowerCase() ? `${context} · ${kind}` : kind;
}

function publicCatalogItem(item, trackNumber, variant = "full") {
  const compact = variant === "compact";
  return `
    <article class="catalog-track">
      <div class="track-rank">Track ${trackNumber}</div>
      <div class="track-main">
        <strong>${escapeHtml(item.title)}</strong>
        ${compact ? "" : `<span>${escapeHtml(item.artist || "NEXAMusic™ Studios")} · ${escapeHtml(item.album || "Single")} · ${escapeHtml(item.genre || "Catalog")}</span>`}
      </div>
      <div class="track-metrics"${compact ? " hidden" : ""}>
        <span>${Number(item.streams || 0).toLocaleString()} streams</span>
      </div>
      <div class="track-actions">
        ${publicPreviewButton(item)}
        ${publicTrackButton(item, "Full Track")}
        ${publicDownloadButton(item)}
      </div>
    </article>
  `;
}

function normalizedCatalogKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isStudioAlbum(album) {
  return String(album.status || "active").toLowerCase() !== "archived"
    && String(album.releaseType || "").toLowerCase() !== "single collection";
}

function albumArtwork(album) {
  const title = normalizedCatalogKey(album?.title);
  if (title.includes("jesus-christ-the-lamb-of-royal-mercies")) return defaultAlbumArtwork;
  const artwork = String(album?.artwork || "").trim();
  return artwork && !artwork.includes("/assets/nexa-mark.png") ? artwork : defaultAlbumArtwork;
}

function albumTrackRow(item, trackNumber) {
  return `
    <article class="album-track-row">
      <div class="album-track-num">${trackNumber}</div>
      <div class="album-track-info">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.artist || "NEXAMusic™ Studios")}</span>
        <small>${escapeHtml(item.album || "Album")} · ${escapeHtml(item.genre || "Catalog")} · ${escapeHtml(item.kind || "full track")} · ${Number(item.streams || 0).toLocaleString()} streams</small>
      </div>
      <div class="album-track-actions">
        ${publicPurchaseButton(item)}
        ${publicPreviewButton(item)}
        ${publicTrackButton(item, "Full Track")}
        ${publicDownloadButton(item)}
      </div>
    </article>
  `;
}

function albumCard(album, tracks) {
  const albumArtistKey = normalizedCatalogKey(album.artist || album.artistId);
  const albumTracks = tracks
    .filter((item) => {
      if (item.albumId === album.id) return true;
      if (normalizedCatalogKey(item.album) === normalizedCatalogKey(album.title)) return true;
      const sameArtist = normalizedCatalogKey(item.artist || item.artistId) === albumArtistKey;
      const looseAlbum = !item.albumId || ["", "uploaded-media", "unassigned-album"].includes(normalizedCatalogKey(item.album));
      return sameArtist && looseAlbum;
    })
    .filter((item) => !item.isSnippet && String(item.kind || "").toLowerCase() !== "snippet")
    .sort((a, b) => Number(a.trackNumber || 9999) - Number(b.trackNumber || 9999));
  const trackList = albumTracks.length
    ? albumTracks.map((item, index) => albumTrackRow(item, Number(item.trackNumber || index + 1))).join("")
    : '<p class="empty-state compact">No full tracks linked to this album yet.</p>';
  return `
    <article class="album-card" data-album-id="${escapeHtml(album.id)}">
      <button class="album-art-button" type="button" aria-expanded="false">
        <img src="${escapeHtml(albumArtwork(album))}" alt="${escapeHtml(album.title)} album art" />
      </button>
      <div class="album-card-body">
        <p class="eyebrow">${escapeHtml(album.releaseType || "album")}</p>
        <h3>${escapeHtml(album.title)}</h3>
        <p>${escapeHtml(album.artist || "NEXAMusic™ Studios")} · ${escapeHtml(album.genre || "Catalog")} · ${albumTracks.length} track${albumTracks.length === 1 ? "" : "s"}</p>
        ${album.status ? `<span class="album-status">${escapeHtml(album.status)}</span>` : ""}
        ${album.releaseDate ? `<span class="album-date">${escapeHtml(album.releaseDate)}</span>` : ""}
        ${normalizedCatalogKey(album.title).includes("jesus-christ-the-lamb-of-royal-mercies") ? `<a class="button primary album-buy-btn" href="/checkout?plan=jesus-album&albumId=${encodeURIComponent(album.id)}">Buy album MP3/WAV $9.99</a>` : ""}
      </div>
      <div class="album-track-list" hidden>
        ${trackList}
      </div>
    </article>
  `;
}

function storeCatalogCard(item) {
  return `
    <article class="product-card" data-region="${escapeHtml(genreCategoryValue(item))}">
      <div class="product-thumb afro-thumb"></div>
      <div class="product-info">
        <p class="eyebrow">Track ${escapeHtml(item.trackNumber || "-")} · ${escapeHtml(item.artist || "NEXAMusic™ Studios")}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.album || "Single")} · ${escapeHtml(item.genre || publicTrackMeta(item))} · ${Number(item.streams || 0).toLocaleString()} streams</p>
        <div class="product-actions">
          <span class="product-price">${Number(item.streams || 0).toLocaleString()}</span>
          ${publicPurchaseButton(item)}
          ${publicPreviewButton(item)}
          ${publicTrackButton(item, "Full Track")}
          ${publicDownloadButton(item)}
        </div>
      </div>
    </article>
  `;
}

async function initPublicCatalog() {
  const artistCatalogs = document.querySelectorAll("[data-public-catalog]");
  const artistAlbumContainers = document.querySelectorAll("[data-artist-albums]");
  const allAlbumContainers = document.querySelectorAll("[data-album-library]");
  const homeCatalog = document.querySelector("[data-home-catalog]");
  const storeCatalog = document.querySelector("[data-store-catalog]");
  if (!artistCatalogs.length && !artistAlbumContainers.length && !allAlbumContainers.length && !homeCatalog && !storeCatalog) return;

  try {
    const [res, albumsRes] = await Promise.all([fetch("/api/media"), fetch("/api/albums")]);
    if (!res.ok) throw new Error("Media API failed");
    const data = await res.json();
    const albumsData = albumsRes.ok ? await albumsRes.json() : { albums: [] };
    const media = (data.media || []).filter(isPublicMedia);
    const albums = albumsData.albums || [];

    artistCatalogs.forEach((container) => {
      const artistId = container.dataset.publicCatalog;
      const trackOffset = Number(container.dataset.trackOffset || 0);
      const variant = container.dataset.catalogVariant || "full";
      const tracks = media
        .filter((item) => item.artistId === artistId || artistSlug(item.artist) === artistId);
      container.innerHTML = tracks.length
        ? tracks.map((item, index) => publicCatalogItem(item, trackOffset + index + 1, variant)).join("")
        : '<p class="empty-state compact">No public releases uploaded yet.</p>';
    });

    artistAlbumContainers.forEach((container) => {
      const artistId = container.dataset.artistAlbums;
      const artistAlbums = albums
        .filter((album) => album.artistId === artistId || artistSlug(album.artist) === artistId)
        .filter(isStudioAlbum)
        .filter((album) => String(album.status || "active").toLowerCase() === "active" || media.some((item) => item.albumId === album.id));
      container.innerHTML = artistAlbums.length
        ? artistAlbums.map((album) => albumCard(album, media)).join("")
        : '<p class="empty-state compact">No albums published yet.</p>';
    });

    allAlbumContainers.forEach((container) => {
      const visibleAlbums = albums
        .filter(isStudioAlbum)
        .sort((a, b) => new Date(b.createdAt || b.releaseDate || 0) - new Date(a.createdAt || a.releaseDate || 0));
      container.innerHTML = visibleAlbums.length
        ? visibleAlbums.map((album) => albumCard(album, media)).join("")
        : '<p class="empty-state compact">No albums have been created yet.</p>';
    });

    if (homeCatalog) {
      const variant = homeCatalog.dataset.catalogVariant || "full";
      homeCatalog.innerHTML = media.length
        ? media.map((item, index) => publicCatalogItem(item, index + 1, variant)).join("")
        : '<p class="empty-state compact">No public releases uploaded yet.</p>';
    }

    if (storeCatalog) {
      window.storeCatalogMedia = media;
      window.renderStoreCatalog?.();
    }
  } catch {
    artistCatalogs.forEach((container) => {
      container.innerHTML = '<p class="empty-state compact">Catalog uploads could not be loaded.</p>';
    });
    artistAlbumContainers.forEach((container) => {
      container.innerHTML = '<p class="empty-state compact">Albums could not be loaded.</p>';
    });
    allAlbumContainers.forEach((container) => {
      container.innerHTML = '<p class="empty-state compact">Albums could not be loaded.</p>';
    });
    if (homeCatalog) {
      homeCatalog.innerHTML = '<p class="empty-state compact">Catalog uploads could not be loaded.</p>';
    }
  }
}

function initAlbumCards() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".album-art-button");
    if (!button) return;
    const card = button.closest(".album-card");
    const list = card?.querySelector(".album-track-list");
    if (!list) return;
    const expanded = !list.hidden;
    list.hidden = expanded;
    button.setAttribute("aria-expanded", String(!expanded));
  });
}

function optionMarkup(items, labelKey = "name") {
  return [
    '<option value="">Select</option>',
    ...items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item[labelKey])}</option>`)
  ].join("");
}

function initGenreSelects() {
  document.querySelectorAll("[data-genre-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = [
      '<option value="">Select genre</option>',
      ...genreOptions.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`)
    ].join("");
    select.value = current;
  });
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
    albumsTable.innerHTML = tableMarkup(["Artwork", "Album", "Artist", "Type", "Tracks", "Streams"], dashboard.albums.map((album) => `
      <tr>
        <td><img class="table-artwork" src="${escapeHtml(albumArtwork(album))}" alt="" /></td>
        <td>${escapeHtml(album.title)}</td>
        <td>${escapeHtml(album.artist)}</td>
        <td>${escapeHtml(album.releaseType || "-")}</td>
        <td>${escapeHtml(album.tracks)}</td>
        <td>${escapeHtml(album.streams.toLocaleString())}</td>
      </tr>
    `));
  }

  const tracksTable = document.getElementById("tracks-table");
  if (tracksTable) {
    tracksTable.innerHTML = tableMarkup(["Song", "Artist", "Album", "Genre", "Streams", "Actions"], dashboard.tracks.map((track) => `
      <tr>
        <td>${escapeHtml(track.title)}</td>
        <td>${escapeHtml(track.artist || "-")}</td>
        <td>${escapeHtml(track.album || "-")}</td>
        <td>${escapeHtml(track.genre || "-")}</td>
        <td>${escapeHtml(track.streams.toLocaleString())}</td>
        <td>${track.isUpload ? `<button class="button danger media-delete-btn" type="button" data-media-id="${escapeHtml(track.id)}" data-title="${escapeHtml(track.title)}">Delete</button>` : '<span class="muted-text">Built-in</span>'}</td>
      </tr>
    `));
  }
}

function initMediaDeleteActions() {
  document.addEventListener("click", async (event) => {
    const btn = event.target.closest(".media-delete-btn");
    if (!btn) return;
    const mediaId = btn.dataset.mediaId;
    const title = btn.dataset.title || "this upload";
    if (!mediaId) return;
    if (!confirm(`Delete "${title}" from the uploaded media catalog?`)) return;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Deleting";
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(mediaId)}`, { method: "DELETE" });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await loadMediaLibrary();
      await loadAdminDashboard();
      await initPublicCatalog();
    } catch (error) {
      alert(error.message || "Delete failed.");
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function updateProfileUi(user) {
  if (!user) return;
  const nameEl = document.getElementById("admin-profile-name");
  const emailEl = document.getElementById("admin-profile-email");
  const nameInput = document.getElementById("profile-name");
  const emailInput = document.getElementById("profile-email");
  if (nameEl) nameEl.textContent = user.name || "Admin";
  if (emailEl) emailEl.textContent = user.email || "-";
  if (nameInput) nameInput.value = user.name || "";
  if (emailInput) emailInput.value = user.email || "";
}

function initProfileSettings() {
  const form = document.getElementById("profile-form");
  if (!form) return;
  const status = form.querySelector(".form-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving";
    try {
      const payload = Object.fromEntries(new FormData(form));
      if (!payload.newPassword) {
        delete payload.currentPassword;
        delete payload.newPassword;
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile update failed");
      if (data.token) setSessionToken(data.token, true);
      updateProfileUi(data.user);
      form.querySelector('[name="currentPassword"]').value = "";
      form.querySelector('[name="newPassword"]').value = "";
      status.textContent = "Profile updated.";
      status.className = "form-status ok";
    } catch (error) {
      status.textContent = error.message || "Profile update failed.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function initLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch {
        // Local cookie removal is enough for client logout.
      }
      clearSessionToken();
      window.location.href = "/auth";
    });
  });
}

function initAdminTabs() {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const panels = document.querySelectorAll("[data-admin-panel]");
  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.adminTab;
      tabs.forEach((item) => item.classList.toggle("active", item === tab));
      panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === target));
    });
  });
}

async function initCheckoutPage() {
  const form = document.getElementById("checkout-form");
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const artistId = params.get("artist") || "all-artists";
  const artistInput = document.getElementById("checkout-artist-id");
  if (artistInput) artistInput.value = artistId;

  const user = await checkAuth();
  const status = form.querySelector(".form-status");
  if (!user) {
    status.innerHTML = 'Sign in before checkout. <a href="/auth">Go to sign in</a>.';
    status.className = "form-status err";
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processing";
    try {
      const payload = Object.fromEntries(new FormData(form));
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.token) setSessionToken(data.token, true);
      status.textContent = "Subscription active. Downloads and live streaming access are unlocked.";
      status.className = "form-status ok";
      setTimeout(() => { window.location.href = "/store?success=1"; }, 900);
    } catch (error) {
      status.textContent = error.message || "Checkout failed.";
      status.className = "form-status err";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function updateAccountLinks(user) {
  document.querySelectorAll('a[href="/auth"]').forEach((link) => {
    link.hidden = Boolean(user);
  });
  if (user) {
    document.querySelectorAll(".site-nav").forEach((nav) => {
      if (nav.querySelector("[data-logout]")) return;
      const button = document.createElement("button");
      button.className = "nav-action";
      button.type = "button";
      button.dataset.logout = "";
      button.dataset.logoutGenerated = "true";
      button.textContent = "Log out";
      nav.appendChild(button);
    });
    initLogoutButtons();
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
      const payload = Object.fromEntries(new FormData(form));
      if (form.id === "album-form") {
        const artworkFile = form.querySelector('[name="artworkFile"]')?.files?.[0];
        delete payload.artworkFile;
        if (artworkFile) {
          const blob = await uploadBlobFile(artworkFile, "nexa-artwork", status, btn);
          payload.artworkUrl = blob.url;
          payload.artworkName = artworkFile.name;
          payload.artworkMimeType = artworkFile.type || blob.contentType || "";
          payload.artworkSize = artworkFile.size;
        }
      }
      btn.textContent = "Saving";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readApiJson(res);
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
  const youtubeInput = form.querySelector('[name="youtubeUrl"]');
  const driveInput = form.querySelector('[name="googleDriveUrl"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    const youtubeUrl = youtubeInput?.value.trim();
    const googleDriveUrl = driveInput?.value.trim();
    const sourceCount = [Boolean(file), Boolean(youtubeUrl), Boolean(googleDriveUrl)].filter(Boolean).length;
    if (!sourceCount) {
      status.textContent = "Choose an audio/video file, paste a YouTube URL, or paste a Google Drive file URL.";
      status.className = "form-status err";
      return;
    }
    if (sourceCount > 1) {
      status.textContent = "Use one source only: file upload, YouTube URL, or Google Drive URL.";
      status.className = "form-status err";
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = googleDriveUrl ? "Importing" : "Uploading";

    try {
      const formData = Object.fromEntries(new FormData(form));
      const artistSelect = form.querySelector('[name="artistId"]');
      const albumSelect = form.querySelector('[name="albumId"]');
      const metadata = {
        ...formData,
        file: undefined,
        artist: artistSelect?.selectedOptions?.[0]?.textContent || "",
        album: albumSelect?.selectedOptions?.[0]?.textContent || ""
      };

      if (file) {
        const blob = await uploadBlobFile(file, "nexa-media", status, btn);
        metadata.blobUrl = blob.url;
        metadata.fileName = file.name;
        metadata.originalName = file.name;
        metadata.mimeType = file.type || blob.contentType || "";
        metadata.size = file.size;
      }

      if (googleDriveUrl) {
        status.textContent = "Importing Google Drive file into media storage...";
        status.className = "form-status";
      }

      btn.textContent = "Saving";
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata)
      });
      const data = await readApiJson(res);
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

function setSessionToken(token, remember = false) {
  const maxAge = remember ? 2592000 : 86400; // 30 days if remember, 1 day otherwise
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `session=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function getSessionToken() {
  const cookies = document.cookie.split(";").map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith("session="));
  return sessionCookie ? sessionCookie.substring(8) : null;
}

function clearSessionToken() {
  document.cookie = "session=; path=/; max-age=0; SameSite=Lax";
}

async function checkAuth() {
  if (!getSessionToken()) return null;
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      return data.user || null;
    }
    if (res.status === 401) clearSessionToken();
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
  const forgotPasswordLink = document.querySelector(".forgot-password");

  if (!loginForm || !signupForm) return;

  forgotPasswordLink?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/reset-password";
  });

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
    const remember = loginForm.querySelector('[name="remember"]')?.checked || false;
    
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
        setSessionToken(data.token, remember);
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

function initPasswordReset() {
  const requestForm = document.getElementById("request-form");
  const confirmForm = document.getElementById("confirm-form");
  const authTabs = document.querySelectorAll(".auth-tab");
  const resetSuccess = document.getElementById("reset-success");

  if (!requestForm || !confirmForm) return;

  authTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      authTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const tabName = tab.dataset.tab;
      if (tabName === "request") {
        requestForm.classList.remove("hidden");
        confirmForm.classList.add("hidden");
      } else {
        requestForm.classList.add("hidden");
        confirmForm.classList.remove("hidden");
      }
    });
  });

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = requestForm.querySelector(".form-status");
    const btn = requestForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Sending...";
    
    try {
      const res = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(requestForm)))
      });
      const data = await res.json();
      
      if (data.ok) {
        status.textContent = data.message || "Reset link sent. Check your email for the token.";
        status.className = "form-status ok";
        if (data.resetToken) {
          document.getElementById("reset-token").value = data.resetToken;
          authTabs.forEach(t => t.classList.remove("active"));
          authTabs[1].classList.add("active");
          requestForm.classList.add("hidden");
          confirmForm.classList.remove("hidden");
        }
      } else {
        status.textContent = data.error || "Request failed";
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

  confirmForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = confirmForm.querySelector(".form-status");
    const btn = confirmForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Resetting...";
    
    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(confirmForm)))
      });
      const data = await res.json();
      
      if (data.ok) {
        status.textContent = data.message || "Password reset successful!";
        status.className = "form-status ok";
        requestForm.classList.add("hidden");
        confirmForm.classList.add("hidden");
        resetSuccess.hidden = false;
      } else {
        status.textContent = data.error || "Reset failed";
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

function initReviews() {
  const reviewType = document.getElementById("review-type");
  const reviewTarget = document.getElementById("review-target");
  const reviewsList = document.getElementById("reviews-list");
  const reviewForm = document.getElementById("review-form");
  const authRequired = document.getElementById("auth-required");

  if (!reviewType || !reviewTarget || !reviewsList) return;

  const tracks = [
    { id: "odu-mi-o", name: "Odu mi o" },
    { id: "akala-aka-m-o", name: "Akala aka M O" }
  ];

  const artists = [
    { id: "black-indigo", name: "BLACK INDIGO" },
    { id: "dr-amaka-aloy", name: "DR. AMAKA ALOY" }
  ];

  function populateTargets(type) {
    reviewTarget.innerHTML = '<option value="">-- Select --</option>';
    const items = type === "track" ? tracks : artists;
    items.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      reviewTarget.appendChild(option);
    });
  }

  async function loadReviews() {
    const type = reviewType.value;
    const targetId = reviewTarget.value;

    if (!targetId) {
      reviewsList.innerHTML = "<p class='empty-state'>Select a track or artist to view reviews.</p>";
      return;
    }

    try {
      const res = await fetch(`/api/reviews?type=${type}&id=${targetId}`);
      const data = await res.json();

      if (data.ok && data.reviews.length > 0) {
        reviewsList.innerHTML = data.reviews.map(review => `
          <div class="review-item">
            <div class="review-header">
              <span class="review-author">${review.userName}</span>
              <span class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
            </div>
            <div class="review-date">${new Date(review.createdAt).toLocaleDateString()}</div>
            <div class="review-comment">${review.comment}</div>
          </div>
        `).join("");
      } else {
        reviewsList.innerHTML = "<p class='empty-state'>No reviews yet. Be the first to review!</p>";
      }
    } catch (err) {
      reviewsList.innerHTML = "<p class='empty-state'>Error loading reviews.</p>";
    }
  }

  async function checkAuth() {
    if (!getSessionToken()) {
      reviewForm.hidden = true;
      authRequired.hidden = false;
      return;
    }
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.ok && data.user) {
        reviewForm.hidden = false;
        authRequired.hidden = true;
      } else {
        if (res.status === 401) clearSessionToken();
        reviewForm.hidden = true;
        authRequired.hidden = false;
      }
    } catch (err) {
      reviewForm.hidden = true;
      authRequired.hidden = false;
    }
  }

  reviewType.addEventListener("change", () => {
    populateTargets(reviewType.value);
    reviewsList.innerHTML = "<p class='empty-state'>Select a track or artist to view reviews.</p>";
  });

  reviewTarget.addEventListener("change", loadReviews);

  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = reviewForm.querySelector(".form-status");
      const btn = reviewForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;

      const targetType = reviewType.value;
      const targetId = reviewTarget.value;

      if (!targetId) {
        status.textContent = "Please select a track or artist.";
        status.className = "form-status err";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Submitting...";

      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType,
            targetId,
            rating: parseInt(reviewForm.rating.value),
            comment: reviewForm.comment.value
          })
        });
        const data = await res.json();

        if (data.ok) {
          status.textContent = "Review submitted successfully!";
          status.className = "form-status ok";
          reviewForm.reset();
          loadReviews();
        } else {
          status.textContent = data.error || "Submission failed";
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

  populateTargets("track");
  checkAuth();
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

  async function openModal(audioSrc, title, snippetOverride = false, trackId = "") {
    const isSnippet = snippetOverride || audioSrc.includes("-snippet");
    
    if (!isSnippet) {
      const user = await checkAuth();
      if (!user) {
        alert("Please sign in to play full tracks. Snippets are free for everyone.");
        window.location.href = "/auth";
        return;
      }
    }

    if (trackId) {
      fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId })
      }).catch(() => {});
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
    const title = btn.dataset.title || btn.textContent || "Now Playing";
    if (audioSrc) openModal(audioSrc, title, btn.dataset.snippet === "true", btn.dataset.trackId);
  });

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest(".download-btn");
    if (!btn) return;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Checking";
    const user = await checkAuth();
    if (!user) {
      alert("Please sign in before downloading media files.");
      window.location.href = "/auth";
      return;
    }
    try {
      const res = await fetch(btn.dataset.download);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          alert(data.error || "Purchase this track, buy the album, or subscribe before downloading.");
          window.location.href = "/checkout";
          return;
        }
        throw new Error(data.error || "Download unavailable.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "nexamusic-download";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "Download unavailable.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  modalPlayer.addEventListener("error", (e) => {
    console.error("Audio load error:", e);
  });
}

async function initAdminGate() {
  const isAdminPage = Boolean(document.getElementById("media-upload-form") && document.body.classList.contains("admin-page"));
  const user = await checkAuth();
  updateAdminLinks(user);
  updateAccountLinks(user);
  updateProfileUi(user);

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
initMediaDeleteActions();
initAdminForms();
initAdminTabs();
initGenreSelects();
initProfileSettings();
initLogoutButtons();
initAuthForms();
initCheckoutPage();
initPasswordReset();
initReviews();
initPublicCatalog();
initAlbumCards();
initAudioModal();
initAdminGate();
