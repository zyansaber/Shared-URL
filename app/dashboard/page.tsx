"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Task = {
  id: string;
  title: string;
  body?: string;
  status: string;
  created_at?: string;
};

type Comment = {
  id: string;
  task_id: string;
  author_id: string;
  message: string;
  created_at?: string;
  author_name?: string;
  author_email?: string;
};

function formatAU(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Date only: DD/MM/YYYY (Australian format)
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeStatus(s?: string) {
  if (!s) return "open";
  const v = s.toLowerCase();
  return v === "resolved" ? "closed" : v;
}

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();

  // ---- Create form state ----
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // ---- Lists & selection ----
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- Detail panel state ----
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [detailStatus, setDetailStatus] = useState<"open" | "closed">("open");

  // Redirect if not authed
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // ---------- Data loading ----------
  async function fetchJsonSafe<T = any>(url: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      try {
        return await res.json();
      } catch {
        return fallback as T;
      }
    } catch {
      return fallback as T;
    }
  }

  async function loadTasks() {
    const data = await fetchJsonSafe<Task[]>("/api/tasks", []);
    setTasks(Array.isArray(data) ? data : []);
  }

  async function loadDetail(taskId: string) {
    const t = await fetchJsonSafe<Task>(`/api/tasks/${taskId}`, {} as any);
    setSelectedTask(t?.id ? t : null);
    if (t?.status) setDetailStatus(normalizeStatus(t.status) as any);
    const cs = await fetchJsonSafe<Comment[]>(
      `/api/tasks/${taskId}/comments`,
      []
    );
    setComments(Array.isArray(cs) ? cs : []);
  }

  // initial load
  useEffect(() => {
    loadTasks();
  }, []);

  // compute visible tasks (sorted newest first)
  const visibleTasks = useMemo(() => {
    const list = [...tasks].sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });
    return filter === "all"
      ? list
      : list.filter((t) => normalizeStatus(t.status) === filter);
  }, [tasks, filter]);

  // choose default selection when list changes
  useEffect(() => {
    if (!selectedId && visibleTasks.length > 0) {
      setSelectedId(visibleTasks[0].id);
    }
  }, [visibleTasks, selectedId]);

  // load detail when selection changes
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  // ---------- Actions ----------
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 🚫 no dueDate sent
      body: JSON.stringify({ title, body }),
    });
    setTitle("");
    setBody("");
    await loadTasks();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !newComment.trim()) return;
    await fetch(`/api/tasks/${selectedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newComment }),
    });
    setNewComment("");
    if (selectedId) {
      const cs = await fetchJsonSafe<Comment[]>(
        `/api/tasks/${selectedId}/comments`,
        []
      );
      setComments(cs);
    }
  }

  async function changeStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!selectedId) return;
    const s = e.target.value as "open" | "closed";
    setDetailStatus(s);
    await fetch(`/api/tasks/${selectedId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    // refresh detail and list
    if (selectedId) await loadDetail(selectedId);
    await loadTasks();
  }

  // ---------- UI ----------
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Create Task */}
      <form
        onSubmit={createTask}
        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="e.g. Prepare quarterly finance report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Details (optional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Add context, scope, or links…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {/* 🚫 Due date removed */}
        </div>
        <div className="flex justify-end">
          <button
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            type="submit"
          >
            Create task
          </button>
        </div>
      </form>

      {/* Split View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Task List */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <header className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-700">Task List</h2>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </header>

          <div className="max-h-[60vh] overflow-auto divide-y divide-gray-100">
            {visibleTasks.length === 0 && (
              <div className="px-5 py-6 text-sm text-gray-500">No tasks.</div>
            )}
            {visibleTasks.map((t) => {
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={[
                    "w-full text-left px-5 py-3",
                    "focus:outline-none hover:bg-gray-50",
                    isSelected ? "bg-gray-50/70" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-gray-900">{t.title}</div>
                    <span
                      className={[
                        "text-[10px] font-semibold tracking-wide uppercase",
                        "px-2 py-1 rounded border",
                        normalizeStatus(t.status) === "closed"
                          ? "bg-gray-100 border-gray-200 text-gray-700"
                          : "bg-green-50 border-green-200 text-green-700",
                      ].join(" ")}
                    >
                      {normalizeStatus(t.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t.created_at ? formatAU(t.created_at) : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Detail Panel */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <header className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Task Details</h2>

            {/* Status control + hint */}
            <div className="flex items-center gap-3">
              <select
                id="detail-status"
                aria-label="Status"
                value={detailStatus}
                onChange={changeStatus}
                disabled={!selectedId}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                title="Change here to close or reopen."
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <span className="hidden md:inline text-xs text-gray-500">
                Change here to close or reopen.
              </span>
            </div>
          </header>

          {!selectedTask && (
            <div className="px-5 py-6 text-sm text-gray-500">
              Select a task from the queue to view details.
            </div>
          )}

          {selectedTask && (
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTask.title}
                </h3>
              </div>

              {/* Body + date */}
              {selectedTask.body && (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{selectedTask.body}</p>
                </div>
              )}
              <div className="text-xs text-gray-500">
                {selectedTask.created_at && (
                  <>Created: {formatAU(selectedTask.created_at)}</>
                )}
              </div>

              {/* Messages */}
              <div className="pt-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Messages
                </h4>

                <div className="space-y-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="border border-gray-200 rounded-md px-3 py-2"
                    >
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {c.author_name || "Unknown"}
                        </span>
                        <span className="text-gray-500">
                          {" "}
                          • {formatAU(c.created_at)}
                        </span>
                      </div>
                      <div className="text-gray-700 mt-1 whitespace-pre-wrap text-sm">
                        {c.message}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={postComment} className="mt-3 flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Leave a message…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!selectedId}
                  />
                  <button
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                    type="submit"
                    disabled={!selectedId}
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
