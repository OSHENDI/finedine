import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { authenticateUser, passwordStamp, validateSessionUser } from "@/lib/store";

const cookieName = "finedine_session";
const devSecret = "dev-only-change-this-secret-before-production";
const placeholderSecret = "replace-with-a-long-random-secret-before-production";

export type Role = "owner" | "manager" | "staff";

type SessionPayload = {
  userId: string;
  businessId: string;
  role: Role;
};

let cachedSecret: Uint8Array | null = null;

// Read lazily so `next build` (NODE_ENV=production, no runtime env) does not throw.
function getSecret() {
  if (cachedSecret) return cachedSecret;
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!value || value.length < 32 || value === placeholderSecret) {
      throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters in production");
    }
  }
  cachedSecret = new TextEncoder().encode(value ?? devSecret);
  return cachedSecret;
}

type SessionUser = { id: string; businessId: string; role: string; passwordHash: string };

// Signs a session token for the user and sets the cookie. `pv` ties the token to the current password.
export async function issueSession(user: SessionUser) {
  const token = await new SignJWT({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    pv: passwordStamp(user.passwordHash)
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function signIn(email: string, password: string) {
  const user = await authenticateUser(email, password);
  if (!user) return null;
  await issueSession(user);
  return { id: user.id, name: user.name, role: user.role as Role };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

// One database lookup per request, even when the layout and the page both ask.
const checkUser = cache(validateSessionUser);

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  let payload: Partial<SessionPayload> & { pv?: string };
  try {
    payload = (await jwtVerify(token, getSecret(), { algorithms: ["HS256"] })).payload as typeof payload;
  } catch {
    return null;
  }
  if (!payload.userId || !payload.businessId || !payload.role) return null;
  // A valid signature is not enough: disabled users, password resets and role changes must apply at once.
  return checkUser(payload.userId, payload.businessId, payload.pv);
}

// For server components/pages: send signed-out visitors to the login screen.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

type ApiAuth = { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse };

// For route handlers: 401 when signed out, 403 when the role is not allowed.
export async function requireApiSession(allowedRoles?: Role[]): Promise<ApiAuth> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
