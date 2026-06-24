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
  const cookieHeader = request.headers.cookie;
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

function collectBody(request, limitBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sanitizeText(value, fallback = "") {
  return String(value || fallback).trim().slice(0, 180);
}

function sanitizeFilename(filename) {
  const parsed = path.parse(String(filename || "upload"));
  const base = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "upload";
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
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
    
    if (!isSnippet) {
      const user = getUserFromSession(request);
      if (!user) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Authentication required for full tracks" }));
        return;
      }
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
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": mimeTypes[ext],
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache"
        };
        response.writeHead(200, head);
        fs.createReadStream(filePath).pipe(response);
      }
    } catch (error) {
      console.error("Audio file error:", error);
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

async function handleContact(request, response) {
  const body = JSON.parse(await collectBody(request, 1024 * 1024) || "{}");
  const submission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: sanitizeText(body.name),
    email: sanitizeText(body.email),
    type: sanitizeText(body.type, "general"),
    useCase: sanitizeText(body.useCase),
    budget: sanitizeText(body.budget),
    message: sanitizeText(body.message, "").slice(0, 2000)
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

async function handleMediaUpload(request, response) {
  const body = JSON.parse(await collectBody(request) || "{}");
  const parsed = parseDataUrl(body.dataUrl);

  if (!parsed || !allowedMediaTypes.has(parsed.mimeType)) {
    sendJson(response, 400, { ok: false, error: "Upload must be an audio or video file." });
    return;
  }

  if (parsed.buffer.length > 25 * 1024 * 1024) {
    sendJson(response, 413, { ok: false, error: "File must be 25MB or smaller." });
    return;
  }

  const cleanName = sanitizeFilename(body.fileName);
  const ext = path.extname(cleanName) || (parsed.mimeType.startsWith("video/") ? ".mp4" : ".wav");
  const storedName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${path.basename(cleanName, ext)}${ext}`;
  const filePath = path.join(mediaDir, storedName);
  fs.writeFileSync(filePath, parsed.buffer);

  const mediaItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: sanitizeText(body.title, cleanName),
    artist: sanitizeText(body.artist, "NEXAStudios Artist"),
    kind: sanitizeText(body.kind, parsed.mimeType.startsWith("video/") ? "video" : "audio"),
    mimeType: parsed.mimeType,
    originalName: cleanName,
    storedName,
    size: parsed.buffer.length,
    url: `/media/${storedName}`
  };

  const media = readJsonFile(mediaIndexFile);
  media.unshift(mediaItem);
  writeJsonFile(mediaIndexFile, media);
  sendJson(response, 201, { ok: true, media: mediaItem });
}

function handleMediaList(response) {
  sendJson(response, 200, { ok: true, media: readJsonFile(mediaIndexFile) });
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
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  const session = createSession(user.id);
  
  sendJson(response, 201, { 
    ok: true, 
    user: { id: user.id, email: user.email, name: user.name },
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
    user: { id: user.id, email: user.email, name: user.name },
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

function serveStoredMedia(urlPath, response) {
  const filename = path.basename(decodeURIComponent(urlPath.replace("/media/", "")));
  const filePath = path.join(mediaDir, filename);
  if (!filePath.startsWith(mediaDir)) {
    sendJson(response, 403, { ok: false, error: "Forbidden" });
    return;
  }
  serveFile(filePath, response);
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
        sendJson(response, 200, { ok: true, user: { id: user.id, email: user.email, name: user.name } });
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

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(request, response, url.pathname);
    if (!handled) sendJson(response, 404, { ok: false, error: "API route not found" });
    return;
  }

  if (url.pathname.startsWith("/media/")) {
    serveStoredMedia(url.pathname, response);
    return;
  }

  serveFile(resolvePublicFile(url.pathname + url.search), response, request);
});

server.listen(port, () => {
  console.log(`NEXAStudios™ Music website running at http://localhost:${port}`);
});
