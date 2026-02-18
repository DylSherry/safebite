"use client";

import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(mode === "login" ? "Signing in…" : "Signing up…");
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        setStatus("Signup successful");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setStatus("Signed in");
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setStatus(err?.message || "Authentication error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setStatus("Signed out");
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow text-black">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{mode === "login" ? "Login" : "Sign up"}</h1>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-blue-600 hover:underline"
          >
            {mode === "login" ? "Create account" : "Have an account?"}
          </button>
        </div>

        {user ? (
          <div>
            <p className="mb-3">Signed in as {user.email}</p>
            <button
              onClick={handleSignOut}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-2 block text-sm font-medium text-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-4 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-500"
            />

            <label className="mb-2 block text-sm font-medium text-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-4 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-500"
            />

            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        {status && <p className="mt-3 text-sm text-black">{status}</p>}
      </div>
    </main>
  );
}
