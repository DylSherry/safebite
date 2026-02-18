"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded bg-white p-6 shadow text-black">
        <h1 className="mb-4 text-2xl font-semibold">Sign up</h1>

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

        <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Create account
        </button>

        {status && <p className="mt-3 text-sm text-black">{status}</p>}
      </form>
    </main>
  );
}
