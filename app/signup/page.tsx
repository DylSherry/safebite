"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Creating account...");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const token = await userCred.user.getIdToken();
      // Call server API to create the user document securely
      const res = await fetch("/api/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, uid }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Server error creating profile");
      }
      setStatus("Account created — redirecting...");
      setEmail("");
      setPassword("");
      setTimeout(() => router.push("/"), 500);
    } catch (err: any) {
      setStatus(err?.message || "Error creating account");
    }
  };

  return (
    <main className="flex items-center justify-center w-full h-full bg-emerald-950 p-4">
      <div className="w-full max-w-md rounded-lg bg-emerald-900 p-8 shadow-lg border border-emerald-800">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Join SafeBite</h1>
          <p className="text-emerald-200 text-sm">Create a new account to get started</p>
        </div>

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
            Create Account
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

        <div className="mt-6 border-t border-emerald-800 pt-6 text-center">
          <p className="text-sm text-emerald-300 mb-3">Already have an account?</p>
          <Link
            href="/login"
            className="inline-block rounded-lg border border-emerald-600 px-4 py-2 text-emerald-200 font-medium hover:bg-emerald-800/50 transition-colors"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </main>
  );
}
