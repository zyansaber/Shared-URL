"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Task = {
  id: string;
  title: string;
  body?: string;
  status: string;
  dueDate?: string;
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
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function normalizeStatus(s?: string) {
  if (!s) return "open";
  const v = s.toLowerCase();
  return v === "resolved" ? "closed" : v;
}
export default function TaskPage() {
  const params = useParams() as { id: string };
  const { status } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [state, setState] = useState<"open" | "closed">("open");

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/tasks/${params.id}`)
      .then((r) => r.json())
      .then(setTask);
    fetch(`/api/tasks/${params.id}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [params?.id]);

  useEffect(() => {
    if (task?.status) setState(normalizeStatus(task.status) as any);
  }, [task]);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch(`/api/tasks/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newComment }),
    });
    setNewComment("");
    const res = await fetch(`/api/tasks/${params.id}/comments`);
    setComments(await res.json());
  }

  async function updateStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const s = e.target.value as any;
    setState(s);
    await fetch(`/api/tasks/${params.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    const res = await fetch(`/api/tasks/${params.id}`);
    setTask(await res.json());
  }

  if (!task) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded-lg border">
            {normalizeStatus(task.status)}
          </span>
        </div>
        {task.body && (
          <p className="text-gray-700 mt-3 whitespace-pre-wrap">{task.body}</p>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Created: {formatAU(task.created_at)}
        </div>
        {task.dueDate && (
          <div className="text-xs text-gray-500">
            Due: {formatAU(task.dueDate)}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="font-medium mb-3">Comments</h2>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="border rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">
                  {c.author_name || "Unknown"}
                </span>
                <span className="text-gray-500">
                  {" "}
                  • {formatAU(c.created_at)}
                </span>
              </div>
              <div className="text-gray-700 mt-1 whitespace-pre-wrap">
                {c.message}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addComment} className="mt-4 flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Write a comment…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            type="submit"
          >
            Post
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <label className="block text-sm text-gray-600 mb-1">
          Change status
        </label>
        <select
          value={state}
          onChange={updateStatus}
          className="border rounded-lg px-3 py-2"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
}
