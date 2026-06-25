const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT) || 3000;
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const storageDir = path.join(rootDir, "storage");
const mediaDir = path.join(storageDir, "media");
const metaDir = path.join(storageDir, "meta");
const contactFile = path.join(storageDir, "contact-submissions.json");
const mediaIndexFile = path.join(metaDir, "media-library.json");
const usersFile = path.join(metaDir, "users.json");
const sessionsFile = path.join(metaDir, "sessions.json");
const artistsFile = path.join(metaDir, "artists.json");
const albumsFile = path.join(metaDir, "albums.json");
const streamsFile = path.join(metaDir, "streams.json");
const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const bootstrapAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const bootstrapAdminPassword = String(process.env.ADMIN_PASSWORD || "");
const bootstrapAdminName = String(process.env.ADMIN_NAME || "NEXAStudios Admin").trim();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

const allowedMediaTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

function ensureStorage() {
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });
  if (!fs.existsSync(contactFile)) fs.writeFileSync(contactFile, "[]\n");
  if (!fs.existsSync(mediaIndexFile)) fs.writeFileSync(mediaIndexFile, "[]\n");
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]\n");
  if (!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile, "[]\n");
  if (!fs.existsSync(artistsFile)) fs.writeFileSync(artistsFile, "[]\n");
  if (!fs.existsSync(albumsFile)) fs.writeFileSync(albumsFile, "[]\n");
  if (!fs.existsSync(streamsFile)) fs.writeFileSync(streamsFile, "[]\n");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": mimeTypes[".json"],
    "Cache-Control": "no-cache"
  });
  response.end(JSON.stringify(payload));
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const seedArtists = [
  {
    id: "black-indigo",
    name: "BLACK INDIGO",
    genre: "Afrobeat / Hiphop",
    origin: "Nigeria",
    status: "active",
    bio: "Afrobeat and hiphop artist with bold hooks, modern African crossover energy, and streetwise rhythm.",
    monthlyListeners: 12840,
    followers: 4200,
    createdAt: "2026-06-24T00:00:00.000Z"
  },
  {
    id: "dr-amaka-aloy",
    name: "DR. AMAKA ALOY",
    genre: "Gospel Music",
    origin: "Nigeria",
    status: "active",
    bio: "Gospel music artist focused on worship, inspirational writing, and faith-centered storytelling.",
    monthlyListeners: 9250,
    followers: 3100,
    createdAt: "2026-06-24T00:00:00.000Z"
  }
];

const seedAlbums = [
  {
    id: "black-indigo-singles",
    title: "BLACK INDIGO Singles",
    artistId: "black-indigo",
    genre: "Afrobeat / Hiphop",
    releaseType: "single collection",
    releaseDate: "2026-06-24",
    status: "active",
    artwork: "/assets/nexa-mark.png",
    createdAt: "2026-06-24T00:00:00.000Z"
  },
  {
    id: "amaka-aloy-gospel-singles",
    title: "DR. AMAKA ALOY Gospel Singles",
    artistId: "dr-amaka-aloy",
    genre: "Gospel Music",
    releaseType: "single collection",
    releaseDate: "2026-06-24",
    status: "active",
    artwork: "/assets/nexa-mark.png",
    createdAt: "2026-06-24T00:00:00.000Z"
  }
];

const builtInTracks = [
  {
    id: "odu-mi-o",
    title: "Odu mi o",
    artistId: "black-indigo",
    artist: "BLACK INDIGO",
    albumId: "black-indigo-singles",
    album: "BLACK INDIGO Singles",
    genre: "Afrobeat / Hiphop",
    kind: "full track",
    url: "/audio/1782309923941-7aff0f41-odu-mi-o-1-male.mp3",
    snippetUrl: "/audio/1782309923941-7aff0f41-odu-mi-o-1-male-snippet.mp3",
    mimeType: "audio/mpeg",
    releaseDate: "2026-06-24",
    baselineStreams: 18420
  }
];

function mergeById(existing, seeded) {
  const map = new Map(existing.map((item) => [item.id, item]));
  seeded.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

function seedLabelData() {
  writeJsonFile(artistsFile, mergeById(readJsonFile(artistsFile), seedArtists));
  writeJsonFile(albumsFile, mergeById(readJsonFile(albumsFile), seedAlbums));
}

function cleanArtistCatalogData() {
  const isAmakaAkala = (item) => {
    const title = String(item.title || "").toLowerCase();
    const artist = String(item.artist || "").toLowerCase();
    return title.includes("akala aka m o") && (item.artistId === "dr-amaka-aloy" || artist.includes("amaka"));
  };

  const media = readJsonFile(mediaIndexFile);
  const filteredMedia = media.filter((item) => !isAmakaAkala(item));
  if (filteredMedia.length !== media.length) writeJsonFile(mediaIndexFile, filteredMedia);

  const streams = readJsonFile(streamsFile);
  const filteredStreams = streams.filter((event) => event.trackId !== "akala-aka-m-o");
  if (filteredStreams.length !== streams.length) writeJsonFile(streamsFile, filteredStreams);
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getUsers() {
  return readJsonFile(usersFile);
}

function saveUsers(users) {
  writeJsonFile(usersFile, users);
}

function getSessions() {
  return readJsonFile(sessionsFile);
}

function saveSessions(sessions) {
  writeJsonFile(sessionsFile, sessions);
}

function getSessionByToken(token) {
  const sessions = getSessions();
  return sessions.find(s => s.token === token && s.expiresAt > Date.now());
}

function createSession(userId) {
  const sessions = getSessions();
  const token = generateSessionToken();
  const session = {
    token,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  };
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

function deleteSession(token) {
  const sessions = getSessions();
  const filtered = sessions.filter(s => s.token !== token);
  saveSessions(filtered);
}

function getUserFromSession(request) {
  const cookieHeader = request.headers && request.headers.cookie;
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith("session="));
  if (!sessionCookie) return null;
  
  const token = sessionCookie.substring(8);
  const session = getSessionByToken(token);
  if (!session) return null;
  
  const users = getUsers();
  return users.find(u => u.id === session.userId);
}

function isAdminUser(user) {
  return Boolean(user && (user.role === "admin" || adminEmails.has(String(user.email || "").toLowerCase())));
}

function requireAdmin(request, response) {
  const user = getUserFromSession(request);
  if (!isAdminUser(user)) {
    sendJson(response, 403, { ok: false, error: "Admin access is required." });
    return null;
  }
  return user;
}

function bootstrapAdminFromEnv() {
  if (!bootstrapAdminEmail || !bootstrapAdminPassword) return;

  const users = getUsers();
  const existing = users.find((user) => user.email === bootstrapAdminEmail);

  if (existing) {
    existing.name = existing.name || bootstrapAdminName;
    existing.password = hashPassword(bootstrapAdminPassword);
    existing.role = "admin";
    existing.updatedAt = new Date().toISOString();
  } else {
    users.push({
      id: crypto.randomUUID(),
      email: bootstrapAdminEmail,
      password: hashPassword(bootstrapAdminPassword),
      name: bootstrapAdminName,
      role: "admin",
      createdAt: new Date().toISOString()
    });
  }

  saveUsers(users);
  adminEmails.add(bootstrapAdminEmail);
}

function collectBody(request, limitBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
      } else {
        chunks.push(chunk);
      }
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sanitizeText(value, fallback = "") {
  return String(value || fallback).trim().slice(0, 180);
}

function sanitizeLongText(value, fallback = "") {
  return String(value || fallback).trim().slice(0, 2000);
}

function sanitizeFilename(filename) {
  const parsed = path.parse(String(filename || "upload"));
  const base = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "upload";
  const ext = parsed.ext.toLowerCase().slice(0, 20) || "";
  return `${base}${ext}`;
}

function resolvePublicFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const cleanPath = normalizedPath.length > 1 ? normalizedPath.replace(/\/$/, "") : normalizedPath;
  const requestedPath = cleanPath === "/" ? "/index.html" : cleanPath;
  let filePath = path.join(publicDir, requestedPath);

  if (!filePath.startsWith(publicDir)) return path.join(publicDir, "index.html");
  if (!path.extname(filePath)) filePath = `${filePath}.html`;

  return filePath;
}

function serveFile(filePath, response, request) {
  const ext = path.extname(filePath).toLowerCase();
  const isAudio = ext === ".mp3" || ext === ".wav" || ext === ".m4a";

  if (isAudio) {
    const filename = path.basename(filePath);
    const isSnippet = filename.includes("-snippet");
    const isPreview = new URL(request.url, `http://${request.headers.host || "localhost"}`).searchParams.get("preview") === "1";
    
    if (!isSnippet && !isPreview) {
      const user = getUserFromSession(request);
      if (!user) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Authentication required for full tracks" }));
        return;
      }
    }
    
    if (!fs.existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Audio file not found");
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = request.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeTypes[ext],
          "Cache-Control": "no-cache"
        };
        response.writeHead(206, head);
        file.pipe(response);
        if (!range || start === 0) recordStream(request, filePath);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": mimeTypes[ext],
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache"
        };
        response.writeHead(200, head);
        fs.createReadStream(filePath).pipe(response);
        recordStream(request, filePath);
      }
    } catch (error) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Audio file not found");
    }
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Unable to load the site.");
          return;
        }

        response.writeHead(200, { "Content-Type": mimeTypes[".html"], "Cache-Control": "no-cache" });
        response.end(fallbackContent);
      });
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(content);
  });
}

function trackIdForPath(filePath) {
  const normalized = filePath.replace(rootDir, "").replace(/\\/g, "/");
  const publicUrl = normalized.startsWith("/public/") ? normalized.replace("/public", "") : normalized;
  const mediaUrl = normalized.startsWith("/storage/media/") ? normalized.replace("/storage", "") : publicUrl;
  const builtIn = builtInTracks.find((track) => track.url === publicUrl || track.snippetUrl === publicUrl);
  if (builtIn) return builtIn.id;
  const media = readJsonFile(mediaIndexFile);
  const mediaItem = media.find((item) => item.url === mediaUrl || item.storedName === path.basename(filePath));
  return mediaItem ? mediaItem.id : path.basename(filePath);
}

function recordStream(request, filePath) {
  const streams = readJsonFile(streamsFile);
  const user = getUserFromSession(request);
  streams.push({
    id: crypto.randomUUID(),
    trackId: trackIdForPath(filePath),
    path: filePath.replace(rootDir, "").replace(/\\/g, "/"),
    userId: user?.id || null,
    createdAt: new Date().toISOString(),
    userAgent: sanitizeText(request.headers["user-agent"], "unknown")
  });
  writeJsonFile(streamsFile, streams.slice(-5000));
}

async function handleContact(request, response) {
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const submission = {
    id: crypto.randomUUID(),
    name: sanitizeText(body.name),
    email: sanitizeText(body.email),
    message: sanitizeLongText(body.message),
    createdAt: new Date().toISOString()
  };

  if (!submission.name || !submission.email || !submission.message) {
    sendJson(response, 400, { ok: false, error: "Name, email, and message are required." });
    return;
  }

  const submissions = readJsonFile(contactFile);
  submissions.unshift(submission);
  writeJsonFile(contactFile, submissions.slice(0, 500));
  sendJson(response, 200, { ok: true, id: submission.id });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

function parseYouTubeUrl(urlValue) {
  const value = String(urlValue || "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (!videoId) videoId = parsed.searchParams.get("v") || "";
      if (!videoId && parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
    }
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) return null;
    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  } catch {
    return null;
  }
}

async function handleMediaUpload(request, response) {
  const user = getUserFromSession(request);
  if (!isAdminUser(user)) {
    sendJson(response, 403, { ok: false, error: "Admin access is required to upload media." });
    return;
  }

  const body = JSON.parse(await collectBody(request) || "{}");
  const parsed = parseDataUrl(body.dataUrl);
  const youtube = parseYouTubeUrl(body.youtubeUrl);

  if (!parsed && !youtube) {
    sendJson(response, 400, { ok: false, error: "Upload an audio/video file or provide a valid YouTube URL." });
    return;
  }

  if (parsed && youtube) {
    sendJson(response, 400, { ok: false, error: "Choose either a file upload or a YouTube URL, not both." });
    return;
  }

  if (parsed && !allowedMediaTypes.has(parsed.mimeType)) {
    sendJson(response, 400, { ok: false, error: "Upload must be an audio or video file." });
    return;
  }

  if (parsed && parsed.buffer.length > 25 * 1024 * 1024) {
    sendJson(response, 413, { ok: false, error: "File must be 25MB or smaller." });
    return;
  }

  const cleanName = sanitizeFilename(body.fileName || body.title || "youtube-video");
  const ext = parsed ? path.extname(cleanName) || (parsed.mimeType.startsWith("video/") ? ".mp4" : ".wav") : "";
  const storedName = parsed ? `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${path.basename(cleanName, ext)}${ext}` : "";
  if (parsed) fs.writeFileSync(path.join(mediaDir, storedName), parsed.buffer);

  const mediaItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: sanitizeText(body.title, cleanName),
    artistId: sanitizeText(body.artistId),
    artist: sanitizeText(body.artist),
    albumId: sanitizeText(body.albumId),
    album: sanitizeText(body.album),
    genre: sanitizeText(body.genre),
    trackNumber: sanitizeText(body.trackNumber),
    kind: sanitizeText(body.kind, youtube ? "music video" : parsed.mimeType.startsWith("video/") ? "video" : "audio"),
    releaseStatus: sanitizeText(body.releaseStatus, "draft"),
    isSnippet: body.isSnippet === "on" || body.isSnippet === true || String(body.kind || "").includes("snippet"),
    provider: youtube ? "youtube" : "file",
    youtubeId: youtube?.videoId || "",
    embedUrl: youtube?.embedUrl || "",
    mimeType: youtube ? "text/youtube" : parsed.mimeType,
    originalName: cleanName,
    storedName,
    size: parsed ? parsed.buffer.length : 0,
    url: youtube ? youtube.url : `/media/${storedName}`
  };

  const media = readJsonFile(mediaIndexFile);
  media.unshift(mediaItem);
  writeJsonFile(mediaIndexFile, media);
  sendJson(response, 201, { ok: true, media: mediaItem });
}

function handleMediaList(response) {
  sendJson(response, 200, { ok: true, media: readJsonFile(mediaIndexFile) });
}

function getArtistName(artistId, artists) {
  return artists.find((artist) => artist.id === artistId)?.name || "Unassigned Artist";
}

function getAlbumTitle(albumId, albums) {
  return albums.find((album) => album.id === albumId)?.title || "Unassigned Album";
}

function uploadedTracks() {
  const artists = readJsonFile(artistsFile);
  const albums = readJsonFile(albumsFile);
  return readJsonFile(mediaIndexFile).map((item) => ({
    ...item,
    artist: item.artist || getArtistName(item.artistId, artists),
    album: item.album || getAlbumTitle(item.albumId, albums),
    genre: item.genre || artists.find((artist) => artist.id === item.artistId)?.genre || ""
  }));
}

function streamCountsByTrack() {
  const counts = {};
  readJsonFile(streamsFile).forEach((event) => {
    counts[event.trackId] = (counts[event.trackId] || 0) + 1;
  });
  return counts;
}

function getDashboardData() {
  const artists = readJsonFile(artistsFile);
  const albums = readJsonFile(albumsFile);
  const counts = streamCountsByTrack();
  const uploads = uploadedTracks();
  const tracks = [
    ...builtInTracks,
    ...uploads.map((item) => ({
      id: item.id,
      title: item.title,
      artistId: item.artistId,
      artist: item.artist,
      albumId: item.albumId,
      album: item.album,
      genre: item.genre,
      kind: item.kind,
      url: item.url,
      mimeType: item.mimeType,
      releaseDate: item.createdAt,
      baselineStreams: 0
    }))
  ].map((track) => ({
    ...track,
    streams: (track.baselineStreams || 0) + (counts[track.id] || 0)
  }));

  const artistMetrics = artists.map((artist) => {
    const artistTracks = tracks.filter((track) => track.artistId === artist.id || track.artist === artist.name);
    return {
      ...artist,
      albums: albums.filter((album) => album.artistId === artist.id).length,
      tracks: artistTracks.length,
      streams: artistTracks.reduce((sum, track) => sum + track.streams, 0)
    };
  });

  return {
    ok: true,
    stats: {
      artists: artists.length,
      albums: albums.length,
      tracks: tracks.length,
      streams: tracks.reduce((sum, track) => sum + track.streams, 0),
      uploads: uploads.length,
      users: readJsonFile(usersFile).length
    },
    artists: artistMetrics,
    albums: albums.map((album) => ({
      ...album,
      artist: getArtistName(album.artistId, artists),
      tracks: tracks.filter((track) => track.albumId === album.id).length,
      streams: tracks.filter((track) => track.albumId === album.id).reduce((sum, track) => sum + track.streams, 0)
    })),
    tracks: tracks.sort((a, b) => b.streams - a.streams),
    recentStreams: readJsonFile(streamsFile).slice(-12).reverse()
  };
}

function handleArtistsList(response) {
  sendJson(response, 200, { ok: true, artists: readJsonFile(artistsFile) });
}

async function handleArtistCreate(request, response) {
  if (!requireAdmin(request, response)) return;
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const name = sanitizeText(body.name);
  if (!name) {
    sendJson(response, 400, { ok: false, error: "Artist name is required." });
    return;
  }
  const artists = readJsonFile(artistsFile);
  const artist = {
    id: sanitizeFilename(name).replace(/\.[^.]+$/, "") || crypto.randomUUID(),
    name,
    genre: sanitizeText(body.genre),
    origin: sanitizeText(body.origin),
    status: sanitizeText(body.status, "active"),
    bio: sanitizeLongText(body.bio),
    monthlyListeners: Number(body.monthlyListeners || 0),
    followers: Number(body.followers || 0),
    createdAt: new Date().toISOString()
  };
  if (artists.some((item) => item.id === artist.id)) artist.id = `${artist.id}-${crypto.randomBytes(3).toString("hex")}`;
  artists.unshift(artist);
  writeJsonFile(artistsFile, artists);
  sendJson(response, 201, { ok: true, artist });
}

function handleAlbumsList(response) {
  sendJson(response, 200, { ok: true, albums: readJsonFile(albumsFile) });
}

async function handleAlbumCreate(request, response) {
  if (!requireAdmin(request, response)) return;
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const title = sanitizeText(body.title);
  if (!title || !body.artistId) {
    sendJson(response, 400, { ok: false, error: "Album title and artist are required." });
    return;
  }
  const albums = readJsonFile(albumsFile);
  const album = {
    id: sanitizeFilename(title).replace(/\.[^.]+$/, "") || crypto.randomUUID(),
    title,
    artistId: sanitizeText(body.artistId),
    genre: sanitizeText(body.genre),
    releaseType: sanitizeText(body.releaseType, "album"),
    releaseDate: sanitizeText(body.releaseDate),
    status: sanitizeText(body.status, "draft"),
    artwork: sanitizeText(body.artwork, "/assets/nexa-mark.png"),
    createdAt: new Date().toISOString()
  };
  if (albums.some((item) => item.id === album.id)) album.id = `${album.id}-${crypto.randomBytes(3).toString("hex")}`;
  albums.unshift(album);
  writeJsonFile(albumsFile, albums);
  sendJson(response, 201, { ok: true, album });
}

async function handleSignup(request, response) {
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const email = sanitizeText(body.email, "").toLowerCase();
  const password = body.password;
  const name = sanitizeText(body.name, "");

  if (!email || !password || !name) {
    sendJson(response, 400, { ok: false, error: "Email, password, and name are required." });
    return;
  }

  if (password.length < 6) {
    sendJson(response, 400, { ok: false, error: "Password must be at least 6 characters." });
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    sendJson(response, 409, { ok: false, error: "Email already registered." });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(password),
    name,
    role: users.length === 0 || adminEmails.has(email) ? "admin" : "user",
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  const session = createSession(user.id);
  
  sendJson(response, 201, { 
    ok: true, 
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token: session.token 
  });
}

async function handleLogin(request, response) {
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const email = sanitizeText(body.email, "").toLowerCase();
  const password = body.password;

  if (!email || !password) {
    sendJson(response, 400, { ok: false, error: "Email and password are required." });
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user || user.password !== hashPassword(password)) {
    sendJson(response, 401, { ok: false, error: "Invalid email or password." });
    return;
  }

  const session = createSession(user.id);
  
  sendJson(response, 200, { 
    ok: true, 
    user: { id: user.id, email: user.email, name: user.name, role: isAdminUser(user) ? "admin" : "user" },
    token: session.token 
  });
}

async function handleLogout(request, response) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    sendJson(response, 200, { ok: true });
    return;
  }

  const cookies = cookieHeader.split(";").map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith("session="));
  
  if (sessionCookie) {
    const token = sessionCookie.substring(8);
    deleteSession(token);
  }

  sendJson(response, 200, { ok: true });
}

async function handleCheckout(request, response) {
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const productName = sanitizeText(body.productName, "NEXAStudios™ Music product");

  sendJson(response, 501, {
    ok: false,
    error: "Stripe checkout is not configured yet. Add STRIPE_SECRET_KEY and real Stripe Price IDs before enabling purchases.",
    productName
  });
}

function serveStoredMedia(urlPath, response, request) {
  const filename = path.basename(decodeURIComponent(urlPath.replace("/media/", "")));
  const filePath = path.join(mediaDir, filename);
  if (!filePath.startsWith(mediaDir)) {
    sendJson(response, 403, { ok: false, error: "Forbidden" });
    return;
  }
  serveFile(filePath, response, request);
}

async function handleApi(request, response, pathname) {
  try {
    if (pathname === "/api/contact" && request.method === "POST") {
      await handleContact(request, response);
      return true;
    }
    if (pathname === "/api/media" && request.method === "GET") {
      handleMediaList(response);
      return true;
    }
    if (pathname === "/api/media" && request.method === "POST") {
      await handleMediaUpload(request, response);
      return true;
    }
    if (pathname === "/api/artists" && request.method === "GET") {
      handleArtistsList(response);
      return true;
    }
    if (pathname === "/api/artists" && request.method === "POST") {
      await handleArtistCreate(request, response);
      return true;
    }
    if (pathname === "/api/albums" && request.method === "GET") {
      handleAlbumsList(response);
      return true;
    }
    if (pathname === "/api/albums" && request.method === "POST") {
      await handleAlbumCreate(request, response);
      return true;
    }
    if (pathname === "/api/admin/dashboard" && request.method === "GET") {
      if (!requireAdmin(request, response)) return true;
      sendJson(response, 200, getDashboardData());
      return true;
    }
    if (pathname === "/api/checkout" && request.method === "POST") {
      await handleCheckout(request, response);
      return true;
    }
    if (pathname === "/api/signup" && request.method === "POST") {
      await handleSignup(request, response);
      return true;
    }
    if (pathname === "/api/login" && request.method === "POST") {
      await handleLogin(request, response);
      return true;
    }
    if (pathname === "/api/logout" && request.method === "POST") {
      await handleLogout(request, response);
      return true;
    }
    if (pathname === "/api/me" && request.method === "GET") {
      const user = getUserFromSession(request);
      if (user) {
        sendJson(response, 200, { ok: true, user: { id: user.id, email: user.email, name: user.name, role: isAdminUser(user) ? "admin" : "user" } });
      } else {
        sendJson(response, 401, { ok: false, error: "Not authenticated" });
      }
      return true;
    }
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message || "Server error" });
    return true;
  }

  return false;
}

ensureStorage();
seedLabelData();
cleanArtistCatalogData();
bootstrapAdminFromEnv();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if ((url.pathname === "/admin" || url.pathname === "/admin.html") && !isAdminUser(getUserFromSession(request))) {
    response.writeHead(302, { Location: "/auth" });
    response.end();
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(request, response, url.pathname);
    if (!handled) sendJson(response, 404, { ok: false, error: "API route not found" });
    return;
  }

  if (url.pathname.startsWith("/media/")) {
    serveStoredMedia(url.pathname, response, request);
    return;
  }

  serveFile(resolvePublicFile(url.pathname + url.search), response, request);
});

server.listen(port, () => {
  console.log(`NEXAStudios™ Music website running at http://localhost:${port}`);
});
