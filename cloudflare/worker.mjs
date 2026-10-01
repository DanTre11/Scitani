var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
import { randomUUID as randomUUID2 } from "node:crypto";

// src/accounts.js
import { scrypt, randomBytes, randomUUID, createHash, timingSafeEqual } from "node:crypto";
var q = /* @__PURE__ */ __name((db, sql, ...args) => db.prepare(sql).bind(...args), "q");
var token = /* @__PURE__ */ __name(() => randomBytes(32).toString("hex"), "token");
var hash = /* @__PURE__ */ __name((t) => createHash("sha256").update(t).digest("hex"), "hash");
function fail(status, error) {
  throw Object.assign(Error(error), { status, publicError: error });
}
__name(fail, "fail");
function text(v, key, max = 300) {
  if (typeof v !== "string" || !v.trim() || v.length > max) fail(400, "invalid_" + key);
  return v;
}
__name(text, "text");
var derive = /* @__PURE__ */ __name((p, s) => new Promise((resolve, reject) => scrypt(p, s, 64, { N: 32768, r: 8, p: 3, maxmem: 67108864 }, (e, k) => e ? reject(e) : resolve(k))), "derive");
async function passwordHash(p) {
  if (typeof p !== "string" || p.length < 12 || p.length > 128) fail(400, "password_length");
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await derive(p, salt)).toString("hex");
}
__name(passwordHash, "passwordHash");
async function verify(p, stored) {
  const [salt, h] = stored.split(":");
  return timingSafeEqual(await derive(String(p || "").slice(0, 129), salt), Buffer.from(h, "hex"));
}
__name(verify, "verify");
var safe = /* @__PURE__ */ __name((a) => a && { id: a.id, email: a.email, name: a.name, role: a.role, active: !!a.active }, "safe");
var rawCookie = /* @__PURE__ */ __name((req) => (req.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("traffic_session="))?.slice(16), "rawCookie");
var cookie = /* @__PURE__ */ __name((t, expired = false) => `traffic_session=${t}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expired ? 0 : 2592e3}`, "cookie");
function role(a, roles) {
  if (!a) fail(401, "login_required");
  if (!roles.includes(a.role)) fail(403, "forbidden");
}
__name(role, "role");
var Accounts = class {
  static {
    __name(this, "Accounts");
  }
  constructor(db) {
    this.db = db;
  }
  async audit(actor, action, target) {
    await q(this.db, "INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)", (/* @__PURE__ */ new Date()).toISOString(), actor, action, target).run();
  }
  async current(req) {
    const t = rawCookie(req);
    if (!t || !/^[a-f0-9]{64}$/.test(t)) return null;
    return q(this.db, "SELECT a.* FROM accounts a JOIN logins l ON a.id=l.account_id WHERE l.hash=? AND l.expires>? AND a.active=1", hash(t), Date.now()).first();
  }
  async rate(key, limit) {
    const now = Date.now(), expiry = now + 9e5;
    const r = await q(this.db, `INSERT INTO attempts(key,n,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN until<? THEN 1 ELSE MIN(n+1,100000) END,until=CASE WHEN until<? THEN ? ELSE until END RETURNING n`, key, expiry, now, now, expiry).first();
    if (r.n > limit) fail(429, "try_later");
  }
  async create(x, actor) {
    text(x.name, "name", 100);
    if (typeof x.email !== "string" || x.email.length > 254 || !/^\S+@\S+\.\S+$/.test(x.email)) fail(400, "invalid_email");
    if (!["user", "organizer"].includes(x.role)) fail(403, "forbidden");
    const id = randomUUID(), email = x.email.trim().toLowerCase();
    if (await q(this.db, "SELECT id FROM accounts WHERE email=?", email).first()) fail(409, "email_exists");
    const pw = await passwordHash(x.password);
    const r = await q(this.db, "INSERT INTO accounts(id,email,name,role,password) VALUES(?,?,?,?,?) ON CONFLICT(email) DO NOTHING", id, email, x.name.trim(), x.role, pw).run();
    if (!r.meta.changes) fail(409, "email_exists");
    await this.audit(actor, "account-created", id);
    return safe(await q(this.db, "SELECT * FROM accounts WHERE id=?", id).first());
  }
  async login(x, req) {
    const email = String(x.email || "").trim().toLowerCase();
    await this.rate("login-ip:" + hash(req.headers.get("cf-connecting-ip") || "test"), 40);
    await this.rate("login-email:" + hash(email), 10);
    const a = await q(this.db, "SELECT * FROM accounts WHERE email=?", email).first();
    const ok = await verify(x.password, a?.password || "0".repeat(32) + ":" + "00".repeat(64));
    if (!a || !a.active || !ok) fail(401, "invalid_credentials");
    await this.logout(req);
    const t = token();
    await q(this.db, "INSERT INTO logins(hash,account_id,expires) SELECT ?,id,? FROM accounts WHERE id=? AND active=1 AND password=?", hash(t), Date.now() + 2592e6, a.id, a.password).run();
    return { account: safe(a), cookie: cookie(t) };
  }
  async logout(req) {
    const t = rawCookie(req);
    if (t) await q(this.db, "DELETE FROM logins WHERE hash=?", hash(t)).run();
  }
  async update(id, x, actor) {
    const a = await q(this.db, "SELECT * FROM accounts WHERE id=?", id).first();
    if (!a) fail(404, "not_found");
    if (a.role === "admin") fail(403, "admin_local_only");
    const name = x.name === void 0 ? a.name : text(x.name, "name", 100), r = x.role === void 0 ? a.role : x.role, active = x.active === void 0 ? a.active : Number(x.active === true);
    if (!["user", "organizer"].includes(r)) fail(400, "invalid_role");
    const pw = x.password ? await passwordHash(x.password) : a.password;
    await this.db.batch([q(this.db, "UPDATE accounts SET name=?,role=?,active=?,password=? WHERE id=?", name.trim(), r, active, pw, id), q(this.db, "DELETE FROM logins WHERE account_id=?", id), q(this.db, "INSERT INTO audit(at,actor,action,target) VALUES(?,?,?,?)", (/* @__PURE__ */ new Date()).toISOString(), actor, "account-updated", id)]);
    return safe(await q(this.db, "SELECT * FROM accounts WHERE id=?", id).first());
  }
};

// src/worker.js
var FILES = /* @__PURE__ */ new Set(["/", "/index.html", "/app.bundle.js", "/app.js", "/accounts.js", "/boot.js", "/modern.css", "/sheet-gesture.js", "/sw.js", "/manifest.json", "/icon-192.png", "/icon-512.png"]);
var json = /* @__PURE__ */ __name((x, status = 200, extra = {}) => Response.json(x, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY", ...extra } }), "json");
async function body(req) {
  const reader = req.body?.getReader();
  let size = 0, parts = [];
  if (reader) while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      fail(413, "body_too_large");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  let x;
  try {
    x = JSON.parse(new TextDecoder().decode(bytes) || "{}");
  } catch {
    fail(400, "invalid_json");
  }
  if (!x || typeof x !== "object" || Array.isArray(x)) fail(400, "invalid_body");
  return x;
}
__name(body, "body");
async function getSession(db, c) {
  const s = await q(db, "SELECT * FROM sessions WHERE code=?", c).first();
  if (!s) fail(404, "not_found");
  return s;
}
__name(getSession, "getSession");
async function sessionView(db, c, paged = true) {
  const s = await getSession(db, c);
  const users = await q(db, "SELECT data,finished_at,last_seen FROM users WHERE code=? ORDER BY id", c).all();
  let records = [];
  if (!paged) {
    records = (await q(db, "SELECT data FROM records WHERE code=? ORDER BY id LIMIT 5001", c).all()).results;
    if (records.length > 5e3) fail(413, "use_paged_records");
  }
  return { ...JSON.parse(s.data), ownerId: s.owner_id, ended: !!s.ended, endedAt: s.ended_at, users: users.results.map((u) => ({ ...JSON.parse(u.data), finishedAt: u.finished_at, lastSeen: u.last_seen })), records: records.map((r) => JSON.parse(r.data)), ...paged ? { pagedRecords: true } : {} };
}
__name(sessionView, "sessionView");
function manage(a, s, req) {
  if (a?.role === "admin") return;
  if (s.owner_id) {
    if (a?.role === "organizer" && a.id === s.owner_id) return;
    fail(403, "forbidden");
  }
  const t = req.headers.get("x-admin-token");
  if (!t || hash(t) !== hash(s.admin_token)) fail(403, "forbidden");
}
__name(manage, "manage");
async function member(db, req, c, id) {
  const u = await q(db, "SELECT * FROM users WHERE code=? AND id=?", c, id || "").first();
  if (!u || hash(req.headers.get("x-participant-token") || "") !== u.token_hash) fail(403, "participant_required");
  return u;
}
__name(member, "member");
function sessionInput(x) {
  if (typeof x.code !== "string" || !/^[A-Z0-9]{6}$/.test(x.code)) fail(400, "invalid_code");
  for (const k of ["place", "station", "group"]) text(x[k], k);
  if (!Array.isArray(x.directions) || x.directions.length < 2 || x.directions.length > 100) fail(400, "invalid_directions");
  const directions = x.directions.map((d) => {
    text(d?.name, "direction");
    if (!Array.isArray(d.moves) || d.moves.length > 100) fail(400, "invalid_movements");
    return { name: d.name, moves: d.moves.map((m) => text(m, "movement")) };
  });
  const hourlyRate = Number(x.hourlyRate || 0);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) fail(400, "invalid_hourly_rate");
  return { hourlyRate, code: x.code, place: x.place, station: x.station, group: x.group, directions, created: (/* @__PURE__ */ new Date()).toISOString() };
}
__name(sessionInput, "sessionInput");
async function handle(req, env) {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), db = env.DB.withSession ? env.DB.withSession("first-primary") : env.DB, accounts = new Accounts(db);
  if (url.pathname === "/health" && req.method === "GET") {
    await q(db, "SELECT 1").first();
    return json({ ok: true, app: "scitani-dopravy", version: "1.4.0", environment: "production", storage: "cloudflare-d1" });
  }
  if (p[0] !== "api") {
    if (!["GET", "HEAD"].includes(req.method) || !FILES.has(url.pathname)) fail(404, "not_found");
    const embedded = RELEASE_ASSETS[url.pathname === "/" ? "/index.html" : url.pathname];
    const asset = embedded ? new Response(req.method === "HEAD" ? null : embedded.body, {headers: {"Content-Type": embedded.type}}) : await env.ASSETS.fetch(req);
    const r = new Response(asset.body, asset);
    r.headers.set("Cache-Control", "no-cache");
    r.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    r.headers.set("X-Content-Type-Options", "nosniff");
    r.headers.set("Referrer-Policy", "same-origin");
    return r;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("Origin");
    if (origin && origin !== url.origin) fail(403, "origin_not_allowed");
    if (req.headers.get("sec-fetch-site") === "cross-site") fail(403, "origin_not_allowed");
    if (req.method !== "DELETE" && !req.headers.get("Content-Type")?.startsWith("application/json")) fail(415, "json_required");
  }
  const a = await accounts.current(req);
  if (p[1] === "auth") {
    if (req.method === "GET" && p[2] === "me") return json({ account: safe(a) });
    if (req.method === "POST" && p[2] === "login") {
      const result = await accounts.login(await body(req), req);
      return json({ account: result.account }, 200, { "Set-Cookie": result.cookie });
    }
    if (req.method === "POST" && p[2] === "logout") {
      await accounts.logout(req);
      return json({ ok: true }, 200, { "Set-Cookie": cookie("", true) });
    }
    if (req.method === "POST" && p[2] === "register") {
      await accounts.rate("register:" + hash(req.headers.get("cf-connecting-ip") || "test"), 5);
      await accounts.create({ ...await body(req), role: "user" }, "self-registration");
      return json({ ok: true }, 201);
    }
    fail(404, "not_found");
  }
  if (p[1] === "archive") {
    role(a, ["admin"]);
    if (req.method !== "GET") fail(405, "method");
    if (p.length === 2) return json((await q(db, "SELECT metadata FROM historical_archive ORDER BY code").all()).results.map((r) => JSON.parse(r.metadata)));
    if (p.length === 3 && /^[A-Z0-9]{6}$/.test(p[2])) {
      const row = await q(db, "SELECT xlsx_base64,sha256 FROM historical_archive WHERE code=?", p[2]).first();
      if (!row) fail(404, "not_found");
      return json({ filename: "spolecne-scitani-" + p[2] + ".xlsx", base64: row.xlsx_base64, sha256: row.sha256 });
    }
    fail(404, "not_found");
  }
  if (p[1] === "accounts") {
    role(a, ["admin"]);
    if (req.method === "GET" && p.length === 2) return json((await q(db, "SELECT id,email,name,role,active FROM accounts ORDER BY name").all()).results.map(safe));
    if (req.method === "POST" && p.length === 2) return json(await accounts.create(await body(req), a.id), 201);
    if (req.method === "PATCH" && p.length === 3) return json(await accounts.update(p[2], await body(req), a.id));
    fail(404, "not_found");
  }
  if (p[1] === "dashboard") {
    role(a, ["organizer", "admin"]);
    if (req.method !== "GET") fail(405, "method");
    const rows = await q(db, `SELECT s.*,a.name AS owner_name,a.email AS owner_email,(SELECT COUNT(*) FROM users u WHERE u.code=s.code) AS user_count,(SELECT COUNT(*) FROM users u WHERE u.code=s.code AND u.finished_at IS NULL AND u.last_seen>?) AS active_count,(SELECT COUNT(*) FROM records r WHERE r.code=s.code) AS record_count FROM sessions s LEFT JOIN accounts a ON a.id=s.owner_id WHERE (?='admin' OR s.owner_id=?) ORDER BY json_extract(s.data,'$.created') DESC`, new Date(Date.now() - 12e4).toISOString(), a.role, a.id).all();
    return json(rows.results.map((s2) => ({ ...JSON.parse(s2.data), ownerId: s2.owner_id, owner: s2.owner_id ? { name: s2.owner_name, email: s2.owner_email } : null, ended: !!s2.ended, endedAt: s2.ended_at, users: s2.user_count, activeUsers: s2.ended ? 0 : s2.active_count, vehicles: s2.record_count })));
  }
  if (p[1] !== "sessions") fail(404, "not_found");
  if (req.method === "POST" && p.length === 2) {
    await accounts.rate("create:" + hash(req.headers.get("cf-connecting-ip") || "test"), 100);
    const s2 = sessionInput(await body(req)), adminToken = token(), owner = a && ["organizer", "admin"].includes(a.role) ? a.id : null;
    for (let i = 0; i < 8; i++) {
      const result = await q(db, "INSERT INTO sessions(code,data,owner_id,admin_token) VALUES(?,?,?,?) ON CONFLICT(code) DO NOTHING", s2.code, JSON.stringify(s2), owner, adminToken).run();
      if (result.meta.changes) return json({ session: { ...s2, ownerId: owner, users: [], records: [], ended: false, endedAt: null }, adminToken: owner ? "account" : adminToken }, 201);
      s2.code = token().slice(0, 6).toUpperCase();
    }
    fail(503, "code_unavailable");
  }
  const c = (p[2] || "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(c)) fail(404, "not_found");
  const s = await getSession(db, c), data = JSON.parse(s.data);
  if (req.method === "GET" && p.length === 3) return json(await sessionView(db, c, url.searchParams.get("summary") === "1"));
  if (p[3] === "manage" && p.length === 4) {
    manage(a, s, req);
    if (req.method === "GET") return json(await sessionView(db, c));
    if (req.method === "PATCH") {
      const x = await body(req);
      for (const k of ["place", "station", "group"]) if (x[k] !== void 0) text(x[k], k);
      let owner = s.owner_id;
      if (x.ownerId !== void 0) {
        role(a, ["admin"]);
        const o = await q(db, "SELECT id FROM accounts WHERE id=? AND active=1 AND role='organizer'", x.ownerId).first();
        if (!o) fail(400, "invalid_owner");
        owner = o.id;
      }
      await q(db, `UPDATE sessions SET data=json_set(data,'$.place',COALESCE(?,json_extract(data,'$.place')),'$.station',COALESCE(?,json_extract(data,'$.station')),'$.group',COALESCE(?,json_extract(data,'$.group'))),owner_id=? WHERE code=?`, x.place ?? null, x.station ?? null, x.group ?? null, owner, c).run();
      await accounts.audit(a?.id || "guest", "session-updated", c);
      return json(await sessionView(db, c));
    }
  }
  if (req.method === "GET" && p[3] === "records" && p.length === 4) {
    const after = url.searchParams.get("after") || "";
    if (after.length > 200) fail(400, "invalid_cursor");
    const rows = (await q(db, "SELECT id,data FROM records WHERE code=? AND id>? ORDER BY id LIMIT 501", c, after).all()).results;
    return json({ records: rows.slice(0, 500).map((r) => JSON.parse(r.data)), next: rows.length > 500 ? rows[499].id : null });
  }
  if (req.method === "POST" && p[3] === "users" && p.length === 4) {
    const x = await body(req);
    for (const k of ["id", "name", "direction"]) text(x[k], k);
    if (!data.directions.some((d) => d.name === x.direction)) fail(400, "invalid_direction");
    const t = req.headers.get("x-participant-token") || "";
    if (!/^[a-f0-9]{64}$/.test(t)) fail(400, "participant_token_required");
    const existing = await q(db, "SELECT token_hash FROM users WHERE code=? AND id=?", c, x.id).first();
    if (existing) {
      if (hash(t) !== existing.token_hash) fail(403, "participant_required");
      return json({ ok: true });
    }
    if (s.ended) fail(409, "ended");
    const now = (/* @__PURE__ */ new Date()).toISOString(), u = { id: x.id, name: x.name, direction: x.direction, joined: now, lastActivity: now };
    const result = await q(db, "INSERT INTO users(code,id,data,token_hash,account_id,last_seen) SELECT code,?,?,?,?,? FROM sessions WHERE code=? AND ended=0 ON CONFLICT(code,id) DO NOTHING", x.id, JSON.stringify(u), hash(t), a?.id || null, now, c).run();
    if (!result.meta.changes) {
      await member(db, req, c, x.id);
      if (s.ended) fail(409, "ended");
    }
    return json({ ok: true }, 201);
  }
  if (req.method === "POST" && p[3] === "users" && p.length === 6 && ["heartbeat", "presence", "finish"].includes(p[5])) {
    let u = await member(db, req, c, p[4]);
    const x = await body(req), now = new Date().toISOString();
    const activitySql = "COALESCE(json_extract(data,'$.lastActivity'),(SELECT MAX(time) FROM records WHERE code=users.code AND user_id=users.id),json_extract(data,'$.joined'),last_seen)";
    if (p[5] === "presence") {
      if (s.ended || u.finished_at) fail(409, "finished");
      const result = await q(db, "UPDATE users SET last_seen=?,data=json_set(data,'$.lastActivity',?,'$.presenceConfirmedAt',?) WHERE code=? AND id=? AND finished_at IS NULL AND EXISTS(SELECT 1 FROM sessions WHERE code=? AND ended=0)", now, now, now, c, u.id, c).run();
      if (!result.meta.changes) fail(409, "finished");
      return json({ok:true,lastActivity:now});
    }
    if (p[5] === "finish") {
      const reason = x.reason === "inactivity" ? "inactivity" : "manual";
      await q(db, "UPDATE users SET last_seen=?,data=CASE WHEN finished_at IS NULL THEN json_set(data,'$.finishReason',?) ELSE data END,finished_at=COALESCE(finished_at,?) WHERE code=? AND id=?", now, reason, now, c, u.id).run();
    } else {
      const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      await q(db, `UPDATE users SET finished_at=?,data=json_set(data,'$.finishReason','inactivity') WHERE code=? AND id=? AND finished_at IS NULL AND ${activitySql}<=? AND EXISTS(SELECT 1 FROM sessions WHERE code=? AND ended=0)`, now, c, u.id, cutoff, c).run();
      await q(db, "UPDATE users SET last_seen=? WHERE code=? AND id=?", now, c, u.id).run();
    }
    u = await q(db, `SELECT *,${activitySql} AS activity_at FROM users WHERE code=? AND id=?`, c, u.id).first();
    const idleMs = Math.max(0, Date.now() - Date.parse(u.activity_at || now));
    return json({ok:true,ended:!!s.ended,autoFinished:!!u.finished_at && JSON.parse(u.data).finishReason === "inactivity",finishedAt:u.finished_at,idleMs,presenceDue:!u.finished_at && idleMs >= 10 * 60 * 1000});
  }
  if (req.method === "POST" && p[3] === "records" && p.length === 4) {
    const x = await body(req), u = await member(db, req, c, x.userId), ud = JSON.parse(u.data);
    text(x.id, "id", 200);
    const prior = await q(db, "SELECT user_id FROM records WHERE code=? AND id=?", c, x.id).first();
    if (prior) {
      if (prior.user_id !== u.id) fail(409, "duplicate_id");
      return json({ ok: true });
    }
    const t = Date.parse(x.time);
    if (!Number.isFinite(t) || t > Date.now() + 6e4) fail(400, "invalid_time");
    if (x.direction !== ud.direction || !["Osobn\xED auta", "N\xE1kladn\xED auta", "Kamiony", "Autobusy"].includes(x.category)) fail(400, "invalid_record");
    const dir = data.directions.find((d) => d.name === ud.direction);
    if (typeof x.movement !== "string" || (dir.moves.length ? !dir.moves.includes(x.movement) : x.movement !== "")) fail(400, "invalid_movement");
    const time = new Date(t).toISOString(), r = { id: x.id, time, userId: u.id, user: ud.name, direction: ud.direction, movement: x.movement, category: x.category, station: data.station, group: data.group };
    const results = await db.batch([q(db, `INSERT INTO records(code,id,data,time,user_id) SELECT s.code,?,?,?,u.id FROM sessions s JOIN users u ON u.code=s.code WHERE s.code=? AND u.id=? AND (s.ended=0 OR ?<=s.ended_at) AND (u.finished_at IS NULL OR ?<=u.finished_at) ON CONFLICT(code,id) DO NOTHING`, x.id, JSON.stringify(r), time, c, u.id, time, time), q(db, "UPDATE users SET last_seen=?,data=json_set(data,'$.lastActivity',MAX(COALESCE(json_extract(data,'$.lastActivity'),json_extract(data,'$.joined'),?),?)) WHERE code=? AND id=? AND finished_at IS NULL AND EXISTS(SELECT 1 FROM records WHERE code=? AND id=? AND user_id=?)", new Date().toISOString(), time, time, c, u.id, c, x.id, u.id)]);
    if (!results[0].meta.changes) {
      const duplicate = await q(db, "SELECT user_id FROM records WHERE code=? AND id=?", c, x.id).first();
      if (duplicate?.user_id === u.id) return json({ ok: true });
      if (duplicate) fail(409, "duplicate_id");
      fail(409, "ended");
    }
    return json(r, 201);
  }
  if (req.method === "DELETE" && p[3] === "records" && p.length === 5) {
    const u = await member(db, req, c, req.headers.get("x-user-id"));
    let id;
    try {
      id = decodeURIComponent(p[4]);
    } catch {
      fail(400, "invalid_id");
    }
    const r = await q(db, "SELECT user_id FROM records WHERE code=? AND id=?", c, id).first();
    if (r && r.user_id !== u.id) fail(403, "forbidden");
    await q(db, "DELETE FROM records WHERE code=? AND id=? AND user_id=?", c, id, u.id).run();
    return json({ ok: true });
  }
  if (req.method === "POST" && p[3] === "end" && p.length === 4) {
    manage(a, s, req);
    await body(req);
    const now = new Date().toISOString();
    await db.batch([
      q(db, "UPDATE sessions SET ended=1,ended_at=COALESCE(ended_at,?) WHERE code=?", now, c),
      q(db, "UPDATE users SET finished_at=(SELECT ended_at FROM sessions WHERE code=?),data=json_set(data,'$.finishReason','session-ended') WHERE code=? AND finished_at IS NULL", c, c)
    ]);
    await accounts.audit(a?.id || "guest", "session-ended", c);
    return json(await sessionView(db, c));
  }
  fail(405, "method");
}
__name(handle, "handle");
var worker_default = { async fetch(req, env) {
  try {
    return await handle(req, env);
  } catch (e) {
    if (!e.status) console.error("Staging request failed:", e.message);
    return json({ error: e.publicError || "server_error" }, e.status || 500);
  }
} };
export {
  worker_default as default
};

