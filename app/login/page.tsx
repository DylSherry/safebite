"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
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
        setStatus("Signup successful — redirecting...");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setStatus("Signed in — redirecting...");
      }
      setEmail("");
      setPassword("");
      setTimeout(() => router.push("/"), 500);
    } catch (err: any) {
      setStatus(err?.message || "Authentication error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setStatus("Signed out");
  };

  return (
    <main className="flex items-center justify-center w-full h-full bg-emerald-950 p-4">
      <div className="w-full max-w-md rounded-lg bg-emerald-900 p-8 shadow-lg border border-emerald-800">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{mode === "login" ? "Welcome Back" : "Join SafeBite"}</h1>
          <p className="text-emerald-200 text-sm">
            {mode === "login" ? "Sign in to your account" : "Create a new account to get started"}
          </p>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-800 p-4">
              <p className="text-emerald-100 text-sm">Signed in as</p>
              <p className="text-white font-semibold mt-1">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="block text-center text-emerald-300 hover:text-emerald-200 text-sm"
            >
              Back to Shop
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-emerald-100">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-4 py-2 text-white placeholder-emerald-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-emerald-100">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-4 py-2 text-white placeholder-emerald-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium hover:bg-emerald-700 transition-colors mt-6"
              >
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {status && (
              <div className={`mt-4 rounded-lg p-3 text-sm ${
                status.includes("Error") || status.includes("error")
                  ? "bg-red-900/30 text-red-200 border border-red-800"
                  : "bg-green-900/30 text-green-200 border border-green-800"
              }`}>
                {status}
              </div>
            )}

            <div className="mt-6 border-t border-emerald-800 pt-6">
              <p className="text-center text-sm text-emerald-300 mb-2">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full rounded-lg border border-emerald-600 px-4 py-2 text-emerald-200 font-medium hover:bg-emerald-800/50 transition-colors"
              >
                {mode === "login" ? "Create One" : "Sign In Instead"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
