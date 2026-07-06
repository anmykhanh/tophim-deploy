'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2, Eye, EyeOff, RefreshCw, MessageSquare, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArticleComment {
  id: number;
  content: string;
  status: boolean;
  is_spoiler: boolean;
  created_at: string;
  user: { id: number; name: string; avatar: string | null; role: string } | null;
  article: { id: number; title: string; slug: string } | null;
}

export default function AdminArticleCommentsTab() {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchComments = useCallback(async (p = page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/article-comments?page=${p}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      showToast('Lỗi tải dữ liệu!', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchComments(page);
  }, [page]);

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa bình luận này?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/article-comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setComments(prev => prev.filter(c => c.id !== id));
        setTotal(prev => prev - 1);
        showToast('Đã xóa bình luận!');
      } else {
        showToast(data.error || 'Xóa thất bại!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối!', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (comment: ArticleComment) => {
    setActionLoading(comment.id);
    try {
      const res = await fetch('/api/admin/article-comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: comment.id, status: !comment.status }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, status: data.status } : c));
        showToast(data.status ? 'Đã hiện bình luận!' : 'Đã ẩn bình luận!');
      } else {
        showToast(data.error || 'Thất bại!', 'error');
      }
    } catch {
      showToast('Lỗi kết nối!', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = search
    ? comments.filter(c =>
        c.content.toLowerCase().includes(search.toLowerCase()) ||
        c.user?.name.toLowerCase().includes(search.toLowerCase()) ||
        c.article?.title.toLowerCase().includes(search.toLowerCase())
      )
    : comments;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Bình luận Bài viết
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Tổng: <span className="font-bold text-slate-700">{total}</span> bình luận</p>
        </div>
        <button
          onClick={() => fetchComments(page)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo nội dung, người dùng, tên bài viết..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Không có bình luận nào.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Người dùng</th>
                <th className="px-4 py-3 text-left">Nội dung</th>
                <th className="px-4 py-3 text-left">Bài viết</th>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!c.status ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{c.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
                        {c.user?.avatar
                          ? <img src={c.user.avatar} alt="" className="w-full h-full object-cover" />
                          : (c.user?.name?.charAt(0) || '?')
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {c.user?.name || 'Unknown'}
                          </span>
                          {c.is_spoiler && (
                            <span className="text-[9px] px-1 py-0.5 bg-red-100 text-red-600 rounded font-bold border border-red-200">
                              SPOILER
                            </span>
                          )}
                        </div>
                        {c.user?.role === 'admin' && (
                          <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">ADMIN</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{c.content}</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.article ? (
                      <Link
                        href={`/bai-viet/${c.article.slug}`}
                        target="_blank"
                        className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 line-clamp-1 max-w-[180px]"
                      >
                        {c.article.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status ? 'Hiện' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={actionLoading === c.id}
                        title={c.status ? 'Ẩn bình luận' : 'Hiện bình luận'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                      >
                        {c.status ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={actionLoading === c.id}
                        title="Xóa bình luận"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> Trước
          </button>
          <span className="text-sm text-slate-500 font-semibold">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Sau <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
