import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const storageDir = process.env.NEXA_STORAGE_DIR || (process.env.VERCEL ? "/tmp/nexa-storage" : path.join(rootDir, "storage"));
const sessionsFile = path.join(storageDir, "meta", "sessions.json");
const usersFile = path.join(storageDir, "meta", "users.json");

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function cookieValue(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sessionSecret() {
  return String(process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "nexastudios-local-session-secret");
}

function verifySignedSession(token) {
  if (!token || !token.includes(".")) return null;
  try {
    const [payload, signature] = token.split(".");
    const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function isAdminRequest(req) {
  const token = cookieValue(req, "session");
  if (!token) return false;
  const signedUser = verifySignedSession(token);
  if (signedUser) return signedUser.role === "admin";
  const session = readJsonFile(sessionsFile).find((item) => item.token === token && item.expiresAt > Date.now());
  if (!session) return false;
  const user = readJsonFile(usersFile).find((item) => item.id === session.userId);
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user && (user.role === "admin" || adminEmails.includes(String(user.email || "").toLowerCase())));
}

export function serveHtmlPage(req, res, slugParts = []) {
  const slug = slugParts.length ? slugParts.join("/") : "index";
  if (slug === "admin" && !isAdminRequest(req)) {
    res.writeHead(302, { Location: "/auth" });
    res.end();
    return { props: {} };
  }

  const safeSlug = path.normalize(slug).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, `${safeSlug}.html`);
  const target = filePath.startsWith(publicDir) && fs.existsSync(filePath)
    ? filePath
    : path.join(publicDir, "index.html");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(fs.readFileSync(target, "utf8"));
  return { props: {} };
}

export default function EmptyPage() {
  return null;
}
