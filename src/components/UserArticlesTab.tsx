'use client';

import { useState, useEffect } from 'react';
import TiptapEditor from './TiptapEditor';

interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  status: boolean;
  created_at: string;
  views: number;
}

export default function UserArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Thông tin');
  const [thumbnail, setThumbnail] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/articles');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setArticles(data.articles || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !content.trim()) {
      setError('Vui lòng nhập tiêu đề và nội dung bài viết!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, thumbnail, content })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra!');
      } else {
        setSuccess('Đăng bài thành công! Bài viết của bạn đang chờ Admin duyệt.');
        // Reset form
        setTitle('');
        setDescription('');
        setThumbnail('');
        setContent('');
        setIsWriting(false);
        fetchArticles();
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối tới máy chủ!');
    } finally {
      setIsSaving(false);
    }
  };

  if (isWriting) {
    return (
      <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Viết bài mới</h3>
          <button
            onClick={() => { setIsWriting(false); setError(''); setSuccess(''); }}
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Quay lại
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Tiêu đề bài viết *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
              placeholder="Nhập tiêu đề..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Danh mục *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
              >
                <option value="Thông tin">Thông tin</option>
                <option value="Review phim">Review phim</option>
                <option value="Tin tức">Tin tức</option>
                <option value="Hậu trường">Hậu trường</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Ảnh đại diện (Link)</label>
              <input
                type="text"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Mô tả ngắn</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm resize-none"
              placeholder="Nhập mô tả tóm tắt..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Nội dung bài viết *</label>
            <div className="bg-white text-black rounded-xl overflow-hidden">
              <TiptapEditor value={content} onChange={setContent} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50 active:scale-[0.98]"
            >
              {isSaving ? 'Đang gửi...' : 'Gửi bài viết'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 shadow-md flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Quản lý bài viết</h3>
          <p className="text-sm text-zinc-400">Chia sẻ bài viết, tin tức hoặc review của bạn đến cộng đồng. Bài viết cần được Admin duyệt trước khi hiển thị.</p>
        </div>
        <button
          onClick={() => setIsWriting(true)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all text-sm shadow-md"
        >
          + Viết bài mới
        </button>
      </div>

      <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden shadow-md">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">Đang tải...</div>
        ) : articles.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-zinc-600 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <p className="text-zinc-400 font-semibold mb-2">Bạn chưa có bài viết nào</p>
            <p className="text-zinc-500 text-xs">Hãy nhấn "Viết bài mới" để bắt đầu chia sẻ nhé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Tiêu đề</th>
                  <th className="py-4 px-6 font-semibold">Danh mục</th>
                  <th className="py-4 px-6 font-semibold">Ngày đăng</th>
                  <th className="py-4 px-6 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm text-zinc-300">
                {articles.map(article => (
                  <tr key={article.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-medium text-white max-w-[200px] truncate">{article.title}</td>
                    <td className="py-4 px-6">{article.category}</td>
                    <td className="py-4 px-6 text-zinc-500">{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-4 px-6">
                      {article.status ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
