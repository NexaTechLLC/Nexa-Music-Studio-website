import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { handleUpload } from "@vercel/blob/client";

export const rootDir = process.cwd();
export const publicDir = path.join(rootDir, "public");
export const storageDir = process.env.NEXA_STORAGE_DIR || (process.env.VERCEL ? "/tmp/nexa-storage" : path.join(rootDir, "storage"));
export const mediaDir = path.join(storageDir, "media");
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

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

const blobUrlPattern = /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i;

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
    trackNumber: "1",
    releaseStatus: "active",
    isSnippet: false,
    provider: "file",
    url: "/audio/1782309923941-7aff0f41-odu-mi-o-1-male.mp3",
    snippetUrl: "/audio/1782309923941-7aff0f41-odu-mi-o-1-male-snippet.mp3",
    mimeType: "audio/mpeg",
    releaseDate: "2026-06-24",
    baselineStreams: 18420
  },
  {
    id: "akala-aka-m-o",
    title: "Akala aka M O",
    artistId: "black-indigo",
    artist: "BLACK INDIGO",
    albumId: "black-indigo-singles",
    album: "BLACK INDIGO Singles",
    genre: "Afrobeat / Hiphop",
    kind: "full track",
    trackNumber: "2",
    releaseStatus: "active",
    isSnippet: false,
    provider: "file",
    url: "/audio/1782337470797-4be410f6-akala-aka-m-o-male.mp3",
    snippetUrl: "/audio/1782337470797-4be410f6-akala-aka-m-o-male.mp3?preview=1",
    mimeType: "audio/mpeg",
    releaseDate: "2026-06-24",
    baselineStreams: 9
  }
];

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-cache" }
  });
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

function mergeById(existing, seeded) {
  const map = new Map(existing.map((item) => [item.id, item]));
  seeded.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

export function ensureStorage() {
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });
  if (!fs.existsSync(contactFile)) fs.writeFileSync(contactFile, "[]\n");
  if (!fs.existsSync(mediaIndexFile)) fs.writeFileSync(mediaIndexFile, "[]\n");
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]\n");
  if (!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile, "[]\n");
  if (!fs.existsSync(artistsFile)) fs.writeFileSync(artistsFile, "[]\n");
  if (!fs.existsSync(albumsFile)) fs.writeFileSync(albumsFile, "[]\n");
  if (!fs.existsSync(streamsFile)) fs.writeFileSync(streamsFile, "[]\n");
  writeJsonFile(artistsFile, mergeById(readJsonFile(artistsFile), seedArtists));
  writeJsonFile(albumsFile, mergeById(readJsonFile(albumsFile), seedAlbums));
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
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${base}${ext}`;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sessionSecret() {
  return String(process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "nexastudios-local-session-secret");
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(payload) {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function publicUser(user) {
  const subscription = user.subscription || {};
  const subscriptionActive = Boolean(subscription.liveStreaming && (!subscription.activeUntil || new Date(subscription.activeUntil).getTime() > Date.now()));
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: isAdminUser(user) ? "admin" : user.role || "user",
    subscription: {
      liveStreaming: subscriptionActive,
      plan: subscription.plan || "",
      artistId: subscription.artistId || "",
      activeUntil: subscription.activeUntil || ""
    }
  };
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
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

function createSession(user) {
  const safeUser = publicUser(user);
  const payload = encodeBase64Url(JSON.stringify({
    ...safeUser,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000
  }));
  return { token: `${payload}.${signSessionPayload(payload)}` };
}

function deleteSession(token) {
  saveSessions(getSessions().filter((session) => session.token !== token));
}

function verifySessionToken(token) {
  if (!token) return null;
  if (token.includes(".")) {
    try {
      const [payload, signature] = token.split(".");
      const expected = signSessionPayload(payload);
      if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
      const parsed = JSON.parse(decodeBase64Url(payload));
      if (!parsed.exp || parsed.exp <= Date.now()) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  const session = getSessions().find((item) => item.token === token && item.expiresAt > Date.now());
  if (!session) return null;
  return { id: session.userId };
}

export function getUserFromSession(request) {
  const token = getCookie(request, "session");
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const storedUser = getUsers().find((user) => user.id === payload.id || user.email === payload.email);
  return storedUser || {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    subscription: payload.subscription
  };
}

function isAdminUser(user) {
  return Boolean(user && (user.role === "admin" || adminEmails.has(String(user.email || "").toLowerCase())));
}

function hasLiveStreamingSubscription(user) {
  const subscription = user?.subscription || {};
  return Boolean(subscription.liveStreaming && (!subscription.activeUntil || new Date(subscription.activeUntil).getTime() > Date.now()));
}

function requireAdmin(request) {
  const user = getUserFromSession(request);
  return isAdminUser(user) ? user : null;
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

function getArtistName(artistId, artists) {
  return artists.find((artist) => artist.id === artistId)?.name || "Unassigned Artist";
}

function getAlbumTitle(albumId, albums) {
  return albums.find((album) => album.id === albumId)?.title || "Unassigned Album";
}

function normalizedSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/dr\./g, "dr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isCatalogDuplicate(item) {
  const title = String(item.title || "").trim().toLowerCase();
  const artistSlug = normalizedSlug(item.artist || getArtistName(item.artistId, readJsonFile(artistsFile)));
  const artistId = item.artistId || artistSlug;
  const isBlackIndigo = artistId === "black-indigo" || artistSlug === "black-indigo";
  const isAmakaAloy = artistId === "dr-amaka-aloy" || artistSlug === "dr-amaka-aloy" || artistSlug.includes("amaka");
  const isStaticBlackIndigoTrack = isBlackIndigo && ["odu mi o", "akala aka m o"].includes(title);
  const isWrongArtistAssignment = isAmakaAloy && title.includes("akala aka m o");
  return isStaticBlackIndigoTrack || isWrongArtistAssignment;
}

function uploadedTracks() {
  const artists = readJsonFile(artistsFile);
  const albums = readJsonFile(albumsFile);
  return readJsonFile(mediaIndexFile)
    .filter((item) => !isCatalogDuplicate(item))
    .map((item) => ({
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
  ]
    .map((track) => ({ ...track, streams: (track.baselineStreams || 0) + (counts[track.id] || 0) }))
    .sort((a, b) => Number(a.trackNumber || 999) - Number(b.trackNumber || 999) || b.streams - a.streams);

  return {
    ok: true,
    stats: {
      artists: artists.length,
      albums: albums.length,
      tracks: tracks.length,
      streams: tracks.reduce((sum, track) => sum + track.streams, 0),
      uploads: tracks.length,
      users: readJsonFile(usersFile).length
    },
    artists: artists.map((artist) => {
      const artistTracks = tracks.filter((track) => track.artistId === artist.id || track.artist === artist.name);
      return {
        ...artist,
        albums: albums.filter((album) => album.artistId === artist.id).length,
        tracks: artistTracks.length,
        streams: artistTracks.reduce((sum, track) => sum + track.streams, 0)
      };
    }),
    albums: albums.map((album) => ({
      ...album,
      artist: getArtistName(album.artistId, artists),
      tracks: tracks.filter((track) => track.albumId === album.id).length,
      streams: tracks.filter((track) => track.albumId === album.id).reduce((sum, track) => sum + track.streams, 0)
    })),
    tracks: [...tracks].sort((a, b) => b.streams - a.streams),
    recentStreams: readJsonFile(streamsFile).slice(-12).reverse()
  };
}

function getPublicMediaLibrary() {
  const counts = streamCountsByTrack();
  const uploads = uploadedTracks().map((item) => ({
    ...item,
    baselineStreams: 0
  }));
  return [...builtInTracks, ...uploads]
    .map((item) => ({
      ...item,
      size: item.size || 0,
      originalName: item.originalName || `${item.title}.mp3`,
      storedName: item.storedName || "",
      downloadUrl: `/api/download?trackId=${encodeURIComponent(item.id)}`,
      streams: (item.baselineStreams || 0) + (counts[item.id] || 0)
    }))
    .sort((a, b) => Number(a.trackNumber || 999) - Number(b.trackNumber || 999) || b.streams - a.streams);
}

function allCatalogTracks() {
  return getPublicMediaLibrary();
}

function findCatalogTrack(trackId) {
  return allCatalogTracks().find((track) => track.id === trackId);
}

function filePathForTrack(track) {
  if (!track || track.provider === "youtube") return "";
  if (track.provider === "blob") return "";
  if (track.storedName) return path.join(mediaDir, track.storedName);
  if (String(track.url || "").startsWith("/audio/")) return path.join(publicDir, track.url.replace(/^\//, ""));
  if (String(track.url || "").startsWith("/media/")) return path.join(mediaDir, path.basename(track.url));
  return "";
}

function recordStreamEvent(request, trackId, trackPath = "") {
  const streams = readJsonFile(streamsFile);
  const user = getUserFromSession(request);
  streams.push({
    id: crypto.randomUUID(),
    trackId,
    path: trackPath,
    userId: user?.id || null,
    createdAt: new Date().toISOString(),
    userAgent: sanitizeText(request.headers.get("user-agent"), "unknown")
  });
  writeJsonFile(streamsFile, streams.slice(-5000));
}

export function initRuntimeData() {
  ensureStorage();
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) return;
  const users = getUsers();
  const existing = users.find((user) => user.email === email);
  if (existing) {
    existing.password = hashPassword(password);
    existing.role = "admin";
    existing.updatedAt = new Date().toISOString();
  } else {
    users.push({
      id: crypto.randomUUID(),
      email,
      password: hashPassword(password),
      name: String(process.env.ADMIN_NAME || "NEXAStudios Admin"),
      role: "admin",
      createdAt: new Date().toISOString()
    });
  }
  saveUsers(users);
  adminEmails.add(email);
}

export async function handleApi(request, pathParts) {
  initRuntimeData();
  const pathname = `/api/${(pathParts || []).join("/")}`;
  try {
    if (pathname === "/api/media" && request.method === "GET") {
      return json({ ok: true, media: getPublicMediaLibrary() });
    }
    if (pathname === "/api/blob-upload" && request.method === "POST") {
      if (!requireAdmin(request)) return json({ ok: false, error: "Admin access is required to upload media." }, 403);
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return json({ ok: false, error: "Vercel Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel, then retry the upload." }, 500);
      }
      const body = await request.json();
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async () => {
          return {
            allowedContentTypes: [...allowedMediaTypes],
            maximumSizeInBytes: 100 * 1024 * 1024,
            addRandomSuffix: true
          };
        }
      });
      return json(result);
    }
    if (pathname === "/api/media" && request.method === "POST") {
      if (!requireAdmin(request)) return json({ ok: false, error: "Admin access is required to upload media." }, 403);
      const body = await request.json();
      const parsed = parseDataUrl(body.dataUrl);
      const youtube = parseYouTubeUrl(body.youtubeUrl);
      const blobUrl = sanitizeText(body.blobUrl || body.url);
      const isBlobUpload = Boolean(blobUrl && blobUrlPattern.test(blobUrl));
      const uploadSources = [Boolean(parsed), Boolean(youtube), isBlobUpload].filter(Boolean).length;
      if (!uploadSources) return json({ ok: false, error: "Upload an audio/video file or provide a valid YouTube URL." }, 400);
      if (uploadSources > 1) return json({ ok: false, error: "Choose only one upload source: file upload, Blob URL, or YouTube URL." }, 400);
      if (parsed && !allowedMediaTypes.has(parsed.mimeType)) return json({ ok: false, error: "Upload must be an audio or video file." }, 400);
      if (parsed && parsed.buffer.length > 25 * 1024 * 1024) return json({ ok: false, error: "File must be 25MB or smaller." }, 413);

      const cleanName = sanitizeFilename(body.fileName || body.originalName || body.title || "youtube-video");
      const ext = parsed ? path.extname(cleanName) || (parsed.mimeType.startsWith("video/") ? ".mp4" : ".wav") : "";
      const storedName = parsed ? `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${path.basename(cleanName, ext)}${ext}` : "";
      if (parsed) fs.writeFileSync(path.join(mediaDir, storedName), parsed.buffer);
      const mimeType = sanitizeText(body.mimeType || body.contentType);
      const blobKind = mimeType.startsWith("video/") ? "video" : "audio";
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
        kind: sanitizeText(body.kind, youtube ? "music video" : parsed ? parsed.mimeType.startsWith("video/") ? "video" : "audio" : blobKind),
        releaseStatus: sanitizeText(body.releaseStatus, "draft"),
        isSnippet: body.isSnippet === "on" || body.isSnippet === true || String(body.kind || "").includes("snippet"),
        provider: youtube ? "youtube" : isBlobUpload ? "blob" : "file",
        youtubeId: youtube?.videoId || "",
        embedUrl: youtube?.embedUrl || "",
        mimeType: youtube ? "text/youtube" : isBlobUpload ? mimeType : parsed.mimeType,
        originalName: cleanName,
        storedName,
        size: parsed ? parsed.buffer.length : Number(body.size || 0),
        url: youtube ? youtube.url : isBlobUpload ? blobUrl : `/media/${storedName}`
      };
      const media = readJsonFile(mediaIndexFile);
      media.unshift(mediaItem);
      writeJsonFile(mediaIndexFile, media);
      return json({ ok: true, media: mediaItem }, 201);
    }
    if (pathname === "/api/artists" && request.method === "GET") return json({ ok: true, artists: readJsonFile(artistsFile) });
    if (pathname === "/api/artists" && request.method === "POST") {
      if (!requireAdmin(request)) return json({ ok: false, error: "Admin access is required." }, 403);
      const body = await request.json();
      const name = sanitizeText(body.name);
      if (!name) return json({ ok: false, error: "Artist name is required." }, 400);
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
      return json({ ok: true, artist }, 201);
    }
    if (pathname === "/api/albums" && request.method === "GET") return json({ ok: true, albums: readJsonFile(albumsFile) });
    if (pathname === "/api/albums" && request.method === "POST") {
      if (!requireAdmin(request)) return json({ ok: false, error: "Admin access is required." }, 403);
      const body = await request.json();
      const title = sanitizeText(body.title);
      if (!title || !body.artistId) return json({ ok: false, error: "Album title and artist are required." }, 400);
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
      return json({ ok: true, album }, 201);
    }
    if (pathname === "/api/admin/dashboard" && request.method === "GET") {
      if (!requireAdmin(request)) return json({ ok: false, error: "Admin access is required." }, 403);
      return json(getDashboardData());
    }
    if (pathname === "/api/contact" && request.method === "POST") {
      const body = await request.json();
      const submission = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: sanitizeText(body.name),
        email: sanitizeText(body.email),
        type: sanitizeText(body.type, "general"),
        useCase: sanitizeText(body.useCase),
        budget: sanitizeText(body.budget),
        message: sanitizeLongText(body.message)
      };
      if (!submission.name || !submission.email || !submission.message) return json({ ok: false, error: "Name, email, and message are required." }, 400);
      const submissions = readJsonFile(contactFile);
      submissions.unshift(submission);
      writeJsonFile(contactFile, submissions.slice(0, 500));
      return json({ ok: true, id: submission.id });
    }
    if (pathname === "/api/signup" && request.method === "POST") {
      const body = await request.json();
      const email = sanitizeText(body.email).toLowerCase();
      if (!email || !body.password || !body.name) return json({ ok: false, error: "Email, password, and name are required." }, 400);
      if (body.password.length < 6) return json({ ok: false, error: "Password must be at least 6 characters." }, 400);
      const users = getUsers();
      if (users.find((user) => user.email === email)) return json({ ok: false, error: "Email already registered." }, 409);
      const user = {
        id: crypto.randomUUID(),
        email,
        password: hashPassword(body.password),
        name: sanitizeText(body.name),
        role: users.length === 0 || adminEmails.has(email) ? "admin" : "user",
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
      const session = createSession(user);
      return json({ ok: true, user: publicUser(user), token: session.token }, 201);
    }
    if (pathname === "/api/login" && request.method === "POST") {
      const body = await request.json();
      const email = sanitizeText(body.email).toLowerCase();
      const user = getUsers().find((item) => item.email === email);
      if (!user || user.password !== hashPassword(body.password)) return json({ ok: false, error: "Invalid email or password." }, 401);
      const session = createSession(user);
      return json({ ok: true, user: publicUser(user), token: session.token });
    }
    if (pathname === "/api/logout" && request.method === "POST") {
      const token = getCookie(request, "session");
      if (token) deleteSession(token);
      return json({ ok: true });
    }
    if (pathname === "/api/me" && request.method === "GET") {
      const user = getUserFromSession(request);
      if (!user) return json({ ok: true, user: null });
      return json({ ok: true, user: publicUser(user) });
    }
    if (pathname === "/api/profile" && request.method === "PUT") {
      const user = getUserFromSession(request);
      if (!user) return json({ ok: false, error: "Sign in is required." }, 401);
      const body = await request.json();
      const users = getUsers();
      const index = users.findIndex((item) => item.id === user.id || item.email === user.email);
      if (index === -1) return json({ ok: false, error: "Profile record was not found. Sign in again." }, 404);
      const nextName = sanitizeText(body.name, users[index].name);
      if (!nextName) return json({ ok: false, error: "Display name is required." }, 400);
      users[index].name = nextName;
      if (body.newPassword) {
        if (String(body.newPassword).length < 6) return json({ ok: false, error: "New password must be at least 6 characters." }, 400);
        if (!body.currentPassword || users[index].password !== hashPassword(body.currentPassword)) return json({ ok: false, error: "Current password is incorrect." }, 403);
        users[index].password = hashPassword(body.newPassword);
      }
      users[index].updatedAt = new Date().toISOString();
      saveUsers(users);
      const session = createSession(users[index]);
      return json({ ok: true, user: publicUser(users[index]), token: session.token });
    }
    if (pathname === "/api/subscribe" && request.method === "POST") {
      const user = getUserFromSession(request);
      if (!user) return json({ ok: false, error: "Sign in before subscribing to live streaming." }, 401);
      const body = await request.json();
      const users = getUsers();
      const index = users.findIndex((item) => item.id === user.id || item.email === user.email);
      if (index === -1) return json({ ok: false, error: "Profile record was not found. Sign in again." }, 404);
      users[index].subscription = {
        liveStreaming: true,
        plan: sanitizeText(body.plan, "live-streaming-monthly"),
        artistId: sanitizeText(body.artistId, "all-artists"),
        activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveUsers(users);
      const session = createSession(users[index]);
      return json({ ok: true, user: publicUser(users[index]), token: session.token });
    }
    if (pathname === "/api/stream" && request.method === "POST") {
      const body = await request.json();
      const trackId = sanitizeText(body.trackId);
      const track = findCatalogTrack(trackId);
      if (!track) return json({ ok: false, error: "Track not found." }, 404);
      recordStreamEvent(request, track.id, track.url || "");
      return json({ ok: true, trackId: track.id });
    }
    if (pathname === "/api/download" && request.method === "GET") {
      const user = getUserFromSession(request);
      if (!user) return json({ ok: false, error: "Sign in is required to download media files." }, 401);
      if (!hasLiveStreamingSubscription(user)) return json({ ok: false, error: "A live streaming subscription is required to download media files." }, 403);
      const trackId = sanitizeText(new URL(request.url).searchParams.get("trackId"));
      const track = findCatalogTrack(trackId);
      if (!track) return json({ ok: false, error: "Track not found." }, 404);
      if (track.provider === "blob" && blobUrlPattern.test(String(track.url || ""))) {
        return Response.redirect(track.url, 302);
      }
      const filePath = filePathForTrack(track);
      if (!filePath || !fs.existsSync(filePath)) return json({ ok: false, error: "Download file is not available." }, 404);
      const ext = path.extname(filePath).toLowerCase();
      const filename = sanitizeFilename(track.originalName || `${track.title}${ext}`);
      return new Response(Readable.toWeb(fs.createReadStream(filePath)), {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Content-Length": String(fs.statSync(filePath).size),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache"
        }
      });
    }
    if (pathname === "/api/checkout" && request.method === "POST") {
      return json({ ok: false, error: "Stripe checkout is not configured yet.", productName: "NEXAStudios Music product" }, 501);
    }
    return json({ ok: false, error: "API route not found" }, 404);
  } catch (error) {
    return json({ ok: false, error: error.message || "Server error" }, 500);
  }
}

export function resolvePublicFile(slugParts = []) {
  const requested = !slugParts.length ? "index" : slugParts.join("/");
  const safe = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return path.join(publicDir, `${safe}.html`);
}

export function servePage(filePath, request) {
  initRuntimeData();
  const pathname = new URL(request.url).pathname;
  if ((pathname === "/admin" || pathname === "/admin.html") && !isAdminUser(getUserFromSession(request))) {
    return Response.redirect(new URL("/auth", request.url), 302);
  }
  const target = fs.existsSync(filePath) && filePath.startsWith(publicDir) ? filePath : path.join(publicDir, "index.html");
  return new Response(fs.readFileSync(target), {
    headers: { "Content-Type": mimeTypes[".html"], "Cache-Control": "no-cache" }
  });
}

export function serveMedia(request, filename) {
  initRuntimeData();
  const clean = path.basename(decodeURIComponent(filename || ""));
  const filePath = path.join(mediaDir, clean);
  if (!filePath.startsWith(mediaDir) || !fs.existsSync(filePath)) return new Response("Audio file not found", { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  const isAudio = ext === ".mp3" || ext === ".wav" || ext === ".m4a";
  const isSnippet = clean.includes("-snippet");
  const isPreview = new URL(request.url).searchParams.get("preview") === "1";
  if (isAudio && !isSnippet && !isPreview && !getUserFromSession(request)) {
    return json({ error: "Authentication required for full tracks" }, 401);
  }

  const stat = fs.statSync(filePath);
  const range = request.headers.get("range");
  const headers = {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache"
  };

  if (range) {
    const [startText, endText] = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(startText, 10);
    const end = endText ? Number.parseInt(endText, 10) : stat.size - 1;
    const size = end - start + 1;
    if (start === 0) recordStreamFromRequest(request, filePath);
    return new Response(Readable.toWeb(fs.createReadStream(filePath, { start, end })), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(size) }
    });
  }

  recordStreamFromRequest(request, filePath);
  return new Response(Readable.toWeb(fs.createReadStream(filePath)), {
    headers: { ...headers, "Content-Length": String(stat.size) }
  });
}

function trackIdForPath(filePath) {
  const media = readJsonFile(mediaIndexFile);
  const mediaItem = media.find((item) => item.storedName === path.basename(filePath));
  return mediaItem ? mediaItem.id : path.basename(filePath);
}

function recordStreamFromRequest(request, filePath) {
  const streams = readJsonFile(streamsFile);
  const user = getUserFromSession(request);
  streams.push({
    id: crypto.randomUUID(),
    trackId: trackIdForPath(filePath),
    path: filePath.replace(rootDir, "").replace(/\\/g, "/"),
    userId: user?.id || null,
    createdAt: new Date().toISOString(),
    userAgent: sanitizeText(request.headers.get("user-agent"), "unknown")
  });
  writeJsonFile(streamsFile, streams.slice(-5000));
}
