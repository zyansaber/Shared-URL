// components/UsersManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "user" | "admin";
};

export default function UsersManager() {
  // Create form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // List + editing
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");

  async function fetchJson<T>(url: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  }

  async function loadUsers() {
    setLoading(true);
    const data = await fetchJson<UserRow[]>("/api/users", []);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // --- Create user ---
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in full name, email, and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, role, password }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(data?.error || "Failed to create user.");
      } else {
        setOk("User created.");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirm("");
        setRole("user");
        await loadUsers();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Edit user (inline) ---
  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditFullName(u.fullName);
    setEditRole(u.role);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  async function saveEdit(id: string) {
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editFullName, role: editRole }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(data?.error || "Failed to update user.");
      } else {
        setEditingId(null);
        await loadUsers();
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  // --- Delete user ---
  async function deleteUser(id: string) {
    setError(null);
    setOk(null);
    if (!confirmDelete()) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(data?.error || "Failed to delete user.");
      } else {
        setOk("User deleted.");
        await loadUsers();
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  function confirmDelete() {
    return window.confirm("Are you sure you want to delete this user?");
  }

  // --- UI ---
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Add new users and manage existing accounts.
        </p>
      </div>

      {/* Create User */}
      <form
        onSubmit={onCreate}
        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
      >
        {(error || ok) && (
          <div className="flex items-center justify-between">
            {error && <div className="text-sm text-red-600">{error}</div>}
            {ok && <div className="text-sm text-green-700">{ok}</div>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      {/* Users List */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">All users</h2>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="align-top">
                    <td className="px-5 py-3">
                      <span className="text-gray-900">{u.fullName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-gray-700">{u.email}</span>
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select
                          className="border border-gray-300 rounded-md px-2 py-1"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className="text-gray-700">{u.role}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(u.id)}
                              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(u)}
                              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && !loading && (
                <tr>
                  <td className="px-5 py-6 text-gray-500" colSpan={4}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
