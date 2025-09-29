"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data, status } = useSession();
  const pathname = usePathname();

  // Keep the address bar at "/" after navigation (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined" && pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  }, [pathname]);

  const isAuthed = status === "authenticated";
  const isAdmin = isAuthed && (data as any)?.role === "admin";

  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <a href="/" className="font-semibold tracking-tight text-gray-900">
            TaskHub
          </a>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {isAdmin && (
              <a
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Tasks
              </a>
            )}

            {isAdmin && (
              <a
                href="/users"
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Users
              </a>
            )}

            {/* Auth action */}
            {isAuthed ? (
              <button
                onClick={() => signOut()}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => signIn()}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
