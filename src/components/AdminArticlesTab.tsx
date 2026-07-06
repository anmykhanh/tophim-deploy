'use client';

import { useState, useEffect } from 'react';
import TiptapEditor from './TiptapEditor';

interface Article {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  content: string;
  thumbnail: string | null;
  views: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    id: number;
    name: string;
    role: string;
    avatar?: string;
  };
}

export default function AdminArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // true if form is open
  const [currentArticle, setCurrentArticle] = useState<Partial<Article> | null>(null); // null if creating, object if editing
  
  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Thông tin');
  const [thumbnail, setThumbnail] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/articles?admin=true');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setArticles(data.articles || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese signs
      .replace(/[đĐ]/g, 'd')
      .replace(/([^a-z0-9\s-]|_)+/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!currentArticle?.id) {
      setSlug(generateSlug(val));
    }
  };

  const handleOpenCreate = () => {
    setCurrentArticle(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setCategory('Thông tin');
    setThumbnail('');
    setContent('');
    setStatus(true);
    setIsEditing(true);
  };

  const handleOpenEdit = (article: Article) => {
    setCurrentArticle(article);
    setTitle(article.title);
    setSlug(article.slug);
    setDescription(article.description || '');
    setCategory(article.category || 'Thông tin');
    setThumbnail(article.thumbnail || '');
    setContent(article.content);
    setStatus(article.status);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !content.trim()) {
      alert('Vui lòng nhập đầy đủ Tiêu đề, Slug và Nội dung!');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!currentArticle?.id;
      const url = isEdit ? `/api/articles/${currentArticle!.id}` : '/api/articles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description, category, content, thumbnail, status }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(isEdit ? 'Cập nhật bài viết thành công!' : 'Tạo bài viết mới thành công!');
        setIsEditing(false);
        fetchArticles();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Đã xóa bài viết thành công!');
        fetchArticles();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Quản Lý Bài Viết</h2>
        {!isEditing && (
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            + Viết Bài Mới
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">
              {currentArticle?.id ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Hủy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Review phim Dune: Part Two..."
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00ac47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (Đường dẫn tĩnh) *</label>
                <input
                  type="text"
                  required
                  placeholder="dune-part-two-review"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00ac47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn (SEO Description)</label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả tóm tắt ngắn cho bài viết để hiển thị ngoài trang danh sách và SEO..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00ac47] resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Danh mục bài viết *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00ac47]"
                >
                  <option value="Thông tin">Thông tin</option>
                  <option value="Review phim">Review phim</option>
                  <option value="Tin tức">Tin tức</option>
                  <option value="Hậu trường">Hậu trường</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Ảnh đại diện (Thumbnail)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg hoặc /uploads/image.jpg..."
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00ac47]"
                />
              </div>

              {thumbnail && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img src={thumbnail} alt="Thumbnail preview" className="h-full w-auto object-contain" />
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-4">
                <input
                  type="checkbox"
                  id="article-status"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 text-[#00ac47] focus:ring-[#00ac47] border-slate-300 rounded"
                />
                <label htmlFor="article-status" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                  Xuất bản công khai (Hiển thị ngay trên website)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Nội dung chi tiết *</label>
            <TiptapEditor value={content} onChange={setContent} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu bài viết'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-semibold animate-pulse">
              Đang tải danh sách bài viết...
            </div>
          ) : articles.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold">
              Chưa có bài viết nào được tạo. Nhấn "Viết Bài Mới" để bắt đầu!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Ảnh</th>
                    <th className="py-4 px-6">Tiêu đề / Slug</th>
                    <th className="py-4 px-6">Danh mục</th>
                    <th className="py-4 px-6">Lượt xem</th>
                    <th className="py-4 px-6">Tác giả</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6">Ngày tạo</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {article.thumbnail ? (
                            <img src={article.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">No Image</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 block line-clamp-1">{article.title}</span>
                        <span className="text-xs text-slate-400 block font-mono mt-0.5">/bai-viet/{article.slug}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-xs">{article.category}</span>
                      </td>
                      <td className="py-4 px-6 font-bold">{article.views}</td>
                      <td className="py-4 px-6">
                        {article.users ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              {article.users.avatar ? (
                                <img src={article.users.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">{article.users.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 line-clamp-1">{article.users.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-semibold px-2 py-1 bg-slate-100 rounded-md">Admin</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {article.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            Công khai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Chờ duyệt
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {new Date(article.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {!article.status && article.users && (
                          <button
                            onClick={async () => {
                              if (!confirm('Duyệt bài viết này và hiển thị công khai?')) return;
                              try {
                                const res = await fetch(`/api/articles/${article.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...article, status: true }),
                                });
                                if (res.ok) fetchArticles();
                              } catch (e) { console.error(e); }
                            }}
                            className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Duyệt
                          </button>
                        )}
                        <a
                          href={`/bai-viet/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-block"
                        >
                          Xem trước
                        </a>
                        <button
                          onClick={() => handleOpenEdit(article)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
