"use client";

import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Creating account...");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        email,
        role: "user",
        createdAt: serverTimestamp(),
      });
      setStatus("Account created — signed in");
      setEmail("");
      setPassword("");
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
