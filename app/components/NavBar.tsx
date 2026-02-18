"use client";

import Link from "next/link";
import React from "react";

export default function NavBar() {
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
          <Link href="/login" className="text-sm text-zinc-700 hover:text-zinc-900">
            Login
          </Link>
          <Link href="/signup" className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
