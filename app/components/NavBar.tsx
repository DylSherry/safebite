"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setEmail(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <nav className="w-full bg-white/90 backdrop-blur-sm border-b border-zinc-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold text-zinc-900">
            SafeBite
          </Link>
          <Link href="/products" className="text-sm text-zinc-700 hover:text-zinc-900">
            Products
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {email ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-zinc-700">Signed in as {email}</div>
              <button
                onClick={handleSignOut}
                className="text-sm rounded bg-zinc-100 px-2 py-1 text-zinc-800 hover:bg-zinc-200"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-700 hover:text-zinc-900">
                Login
              </Link>
              <Link href="/signup" className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
