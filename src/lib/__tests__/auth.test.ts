// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession, deleteSession, verifySession } =
  await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

function makeRequest(token?: string) {
  return {
    cookies: {
      get: (name: string) =>
        token && name === "auth-token" ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession sets cookie with correct name", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [cookieName] = mockCookieStore.set.mock.calls[0];
  expect(cookieName).toBe("auth-token");
});

test("createSession sets httpOnly, sameSite, and path options", async () => {
  await createSession("user-1", "test@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession sets secure: false outside production", async () => {
  await createSession("user-1", "test@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.secure).toBe(false);
});

test("createSession sets expires to approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("createSession cookie value is a valid JWT", async () => {
  await createSession("user-1", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload).toBeDefined();
});

test("createSession JWT contains the provided userId and email", async () => {
  await createSession("user-42", "alice@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("alice@example.com");
});

// --- getSession ---

test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null when cookie value is not a valid JWT", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not-a-jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null when JWT is expired", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "test@example.com" },
    "-1s"
  );
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for a valid JWT", async () => {
  const token = await makeToken({ userId: "user-7", email: "bob@example.com" });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-7");
  expect(session?.email).toBe("bob@example.com");
});

test("getSession reads the auth-token cookie by name", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();
  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});

// --- deleteSession ---

test("deleteSession deletes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when request has no auth-token cookie", async () => {
  const session = await verifySession(makeRequest());
  expect(session).toBeNull();
});

test("verifySession returns null when cookie value is not a valid JWT", async () => {
  const session = await verifySession(makeRequest("not-a-jwt"));
  expect(session).toBeNull();
});

test("verifySession returns null when JWT is expired", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "test@example.com" },
    "-1s"
  );
  const session = await verifySession(makeRequest(token));
  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid JWT", async () => {
  const token = await makeToken({
    userId: "user-5",
    email: "carol@example.com",
  });
  const session = await verifySession(makeRequest(token));

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-5");
  expect(session?.email).toBe("carol@example.com");
});
