"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen, Trash2, Globe, FileText, Archive,
  ExternalLink, Search, RefreshCw, ChevronUp, ChevronDown,
} from "lucide-react";

type BlogPost = {
  id: number;
  slug: string;
  titleEn: string;
  titleRu: string | null;
  status: "draft" | "published" | "archived";
  category: string | null;
  authorName: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG = {
  published: { label: "Published", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  draft:     { label: "Draft",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  archived:  { label: "Archived",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function AdminBlogPage() {
  const [posts, setPosts]       = useState<BlogPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all" | "published" | "draft" | "archived">("all");
  const [sortDir, setSortDir]   = useState<"desc" | "asc">("desc");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blog");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter + search + sort
  const visible = posts
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.titleEn.toLowerCase().includes(q) ||
        (p.titleRu ?? "").toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db_ = new Date(b.createdAt).getTime();
      return sortDir === "desc" ? db_ - da : da - db_;
    });

  async function handleDelete(id: number) {
    setDeleting(id);
    const res = await fetch(`/api/admin/blog?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
    setConfirmId(null);
  }

  async function handleStatusChange(id: number, status: BlogPost["status"]) {
    setStatusChanging(id);
    const res = await fetch("/api/admin/blog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const { post } = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...post } : p)));
    }
    setStatusChanging(null);
  }

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
    archived: posts.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--cat-text)" }}>
            <BookOpen className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
            Blog
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {counts.published} published · {counts.draft} drafts · {counts.archived} archived
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <a
            href="/en/blog"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Blog
          </a>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div
          className="flex rounded-xl p-1 gap-0.5"
          style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}
        >
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={
                filter === s
                  ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                  : { color: "var(--cat-text-secondary)" }
              }
            >
              {s} <span className="opacity-60">({counts[s]})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
          <input
            type="text"
            placeholder="Search title, slug, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "var(--cat-card-bg)",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all hover:opacity-80"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
        >
          {sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        {/* Table header */}
        <div
          className="grid text-xs font-semibold uppercase tracking-wider px-5 py-3 border-b"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
            color: "var(--cat-text-muted)",
            borderColor: "var(--cat-card-border)",
          }}
        >
          <span>Article</span>
          <span>Category</span>
          <span>Status</span>
          <span>Created</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="py-16 text-center" style={{ color: "var(--cat-text-muted)" }}>
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 opacity-50" />
            Loading articles...
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--cat-text-muted)" }}>
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No articles found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
            {visible.map((post) => {
              const sc = STATUS_CONFIG[post.status];
              const isDeleting = deleting === post.id;
              const isConfirming = confirmId === post.id;
              const isChanging = statusChanging === post.id;

              return (
                <div
                  key={post.id}
                  className="grid items-center px-5 py-3.5 gap-4 hover:bg-black/[0.02] transition-colors"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto" }}
                >
                  {/* Article title + slug */}
                  <div className="min-w-0">
                    <div className="flex items-start gap-2.5">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "var(--cat-tag-bg)" }}
                        >
                          <FileText className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--cat-text)" }}
                          title={post.titleEn}
                        >
                          {post.titleEn}
                        </p>
                        {post.titleRu && (
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--cat-text-muted)" }}
                            title={post.titleRu}
                          >
                            {post.titleRu}
                          </p>
                        )}
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                          /{post.slug}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    {post.category ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
                      >
                        {post.category.replace(/-/g, " ")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--cat-text-muted)" }}>—</span>
                    )}
                  </div>

                  {/* Status + change */}
                  <div>
                    <select
                      value={post.status}
                      disabled={isChanging}
                      onChange={(e) => handleStatusChange(post.id, e.target.value as BlogPost["status"])}
                      className="text-xs px-2.5 py-1 rounded-full font-semibold border-none outline-none cursor-pointer transition-all"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    {formatDate(post.createdAt)}
                    {post.publishedAt && (
                      <div className="mt-0.5" style={{ color: "#10b981" }}>
                        ↗ {formatDate(post.publishedAt)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* View public */}
                    {post.status === "published" && (
                      <a
                        href={`/en/blog/${post.slug}`}
                        target="_blank"
                        title="View article"
                        className="p-1.5 rounded-lg transition-all hover:opacity-70"
                        style={{ color: "var(--cat-text-muted)" }}
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}

                    {/* Delete */}
                    {!isConfirming ? (
                      <button
                        onClick={() => setConfirmId(post.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={isDeleting}
                          className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                          style={{ background: "#ef4444", color: "#fff" }}
                        >
                          {isDeleting ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && visible.length > 0 && (
        <p className="text-xs text-right" style={{ color: "var(--cat-text-muted)" }}>
          Showing {visible.length} of {posts.length} articles
        </p>
      )}
    </div>
  );
}
