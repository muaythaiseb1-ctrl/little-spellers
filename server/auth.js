// Server-side login and session tokens.
//
// Teacher and admin passwords are read from environment variables, never from
// the frontend bundle. Student logins are checked against the server's roster.
// After a successful login the server hands back a signed token, and the
// teacher/admin-only API endpoints check that token instead of trusting a
// "role" field sent by the browser.
import crypto from 'node:crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Constant-time string comparison so response timing does not leak how many
// characters of a password were correct.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function createAuth(env = process.env) {
  const accounts = {
    teacher: {
      username: (env.TEACHER_USERNAME || 'teacher').trim().toLowerCase(),
      password: env.TEACHER_PASSWORD || '',
      displayName: 'Teacher',
    },
    admin: {
      username: (env.ADMIN_USERNAME || 'admin').trim().toLowerCase(),
      password: env.ADMIN_PASSWORD || '',
      displayName: 'Administrator',
    },
  };

  // Without SESSION_SECRET a random one is made at startup, which means
  // everyone is logged out when the server restarts.
  const secret = env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  const missing = ['TEACHER_PASSWORD', 'ADMIN_PASSWORD'].filter((k) => !env[k]);
  if (missing.length) {
    console.warn(
      `[auth] ${missing.join(' and ')} not set: that login is disabled. ` +
        'Copy .env.example to .env and fill it in.'
    );
  }
  if (!env.SESSION_SECRET) {
    console.warn('[auth] SESSION_SECRET not set: logins will not survive a server restart.');
  }

  function sign(payload) {
    const body = base64url(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  function verifyToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (!safeEqual(sig, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!payload.exp || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  // Returns { ok: true, user, token } or { ok: false, status, error }.
  function login({ role, username, password, studentName }, students = []) {
    if (role === 'teacher' || role === 'admin') {
      const account = accounts[role];
      if (!account.password) {
        return { ok: false, status: 503, error: `${account.displayName} login is not set up on the server yet.` };
      }
      const userOk = safeEqual(String(username || '').trim().toLowerCase(), account.username);
      const passOk = safeEqual(String(password || ''), account.password);
      if (!userOk || !passOk) {
        return { ok: false, status: 401, error: 'Incorrect username or password.' };
      }
      const user = { name: account.displayName, role, grade: null };
      return { ok: true, user, token: sign({ ...user, exp: Date.now() + TOKEN_TTL_MS }) };
    }

    if (role === 'student') {
      const student = students.find((s) => s.name === studentName);
      // Students still log in with their student ID; the check now happens here.
      if (!student || !safeEqual(String(password || '').trim(), String(student.id))) {
        return { ok: false, status: 401, error: 'Incorrect password. Please use your Student ID.' };
      }
      const user = { name: student.name, role: 'student', grade: student.grade };
      return { ok: true, user, token: sign({ ...user, exp: Date.now() + TOKEN_TTL_MS }) };
    }

    return { ok: false, status: 400, error: 'Unknown role.' };
  }

  // Reads "Authorization: Bearer <token>" from a Node request.
  function userFromRequest(req) {
    const header = req.headers?.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    return match ? verifyToken(match[1]) : null;
  }

  function isStaff(user) {
    return !!user && (user.role === 'teacher' || user.role === 'admin');
  }

  return { login, verifyToken, userFromRequest, isStaff };
}

// Simple in-memory limit on failed logins per client, to slow down guessing.
export function createLoginLimiter({ maxFailures = 10, windowMs = 10 * 60 * 1000 } = {}) {
  const failures = new Map();
  return {
    isBlocked(key) {
      const entry = failures.get(key);
      if (!entry) return false;
      if (Date.now() - entry.first > windowMs) {
        failures.delete(key);
        return false;
      }
      return entry.count >= maxFailures;
    },
    recordFailure(key) {
      const entry = failures.get(key);
      if (!entry || Date.now() - entry.first > windowMs) {
        failures.set(key, { count: 1, first: Date.now() });
      } else {
        entry.count += 1;
      }
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
