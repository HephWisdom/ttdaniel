import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

// Model a browser where another tab owns the auth lock. The default auth
// lifecycle must work without asking Navigator LockManager for that lock.
const values = new Map();
const visibilityListeners = new Set();
let lockRequests = 0;
globalThis.window = {
  location: { href: "https://example.test/" },
  addEventListener(name, callback) {
    if (name === "visibilitychange") visibilityListeners.add(callback);
  },
  removeEventListener(name, callback) {
    if (name === "visibilitychange") visibilityListeners.delete(callback);
  },
};
globalThis.document = { visibilityState: "hidden" };
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      async request() {
        lockRequests += 1;
        throw new Error("Auth lock is held by another browser tab");
      },
    },
  },
});
globalThis.BroadcastChannel = undefined;

const { createClient } = await import("@supabase/supabase-js");

function session(refreshToken = "original-refresh-token") {
  return {
    access_token: "test-access-token",
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "test-user", email: "admin@example.test" },
  };
}

let clientId = 0;
function createTestClient(t, { savedSession, fetch } = {}) {
  document.visibilityState = "hidden";
  const host = `auth-lock-test-${++clientId}`;
  const storageKey = `sb-${host}-auth-token`;
  if (savedSession) localStorage.setItem(storageKey, JSON.stringify(savedSession));
  const client = createClient(`https://${host}.supabase.co`, "test-anon-key", {
    global: {
      fetch: fetch ?? (() => { throw new Error("Unexpected network request"); }),
    },
  });
  t.after(async () => {
    await client.auth.dispose();
    assert.equal(lockRequests, 0, "auth must not acquire browser locks");
  });
  return { client, storageKey };
}

test("anonymous session initializes while the browser auth lock is unavailable", async (t) => {
  const { client } = createTestClient(t);
  const result = await client.auth.getSession();
  assert.equal(result.error, null);
  assert.equal(result.data.session, null);
});

test("saved admin session survives concurrent reads without a browser lock", async (t) => {
  const savedSession = session();
  const { client } = createTestClient(t, { savedSession });
  const results = await Promise.all(Array.from({ length: 5 }, () => client.auth.getSession()));
  for (const result of results) {
    assert.equal(result.error, null);
    assert.equal(result.data.session.refresh_token, savedSession.refresh_token);
    assert.equal(result.data.session.user.id, savedSession.user.id);
  }
});

test("concurrent refreshes share one request and persist the rotated session", async (t) => {
  let refreshRequests = 0;
  const rotatedSession = session("rotated-refresh-token");
  const { client, storageKey } = createTestClient(t, {
    savedSession: session(),
    fetch: async (url) => {
      assert.match(String(url), /\/auth\/v1\/token\?grant_type=refresh_token$/);
      refreshRequests += 1;
      await delay(20);
      return Response.json(rotatedSession);
    },
  });
  await client.auth.getSession();
  const results = await Promise.all(Array.from({ length: 3 }, () => client.auth.refreshSession()));
  assert.equal(refreshRequests, 1);
  for (const result of results) {
    assert.equal(result.error, null);
    assert.equal(result.data.session.refresh_token, rotatedSession.refresh_token);
  }
  assert.equal(JSON.parse(localStorage.getItem(storageKey)).refresh_token, rotatedSession.refresh_token);
});

test("returning to a visible tab refreshes an expiring session without lock errors", async (t) => {
  let refreshRequests = 0;
  const rotatedSession = session("visibility-refresh-token");
  const { client, storageKey } = createTestClient(t, {
    savedSession: session(),
    fetch: async () => {
      refreshRequests += 1;
      return Response.json(rotatedSession);
    },
  });
  await client.auth.getSession();
  localStorage.setItem(storageKey, JSON.stringify({
    ...session(),
    expires_at: Math.floor(Date.now() / 1000) + 10,
  }));
  document.visibilityState = "visible";
  await Promise.all([...visibilityListeners].map((callback) => callback()));
  const result = await client.auth.getSession();
  assert.equal(result.error, null);
  assert.equal(result.data.session.refresh_token, rotatedSession.refresh_token);
  assert.equal(refreshRequests, 1);
});
