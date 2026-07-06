'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TiptapEditor from '@/components/TiptapEditor';

export default function WriteArticleClient() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Thông tin');
  const [thumbnail, setThumbnail] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        if (res.status === 401) {
          setError('Bạn cần đăng nhập để viết bài!');
        } else {
          setError(data.error || 'Có lỗi xảy ra!');
        }
      } else {
        setSuccess('Đăng bài thành công! Bài viết của bạn đang chờ Admin duyệt.');
        // Redirect to profile articles tab after 2 seconds
        setTimeout(() => {
          router.push('/pages/profile?tab=articles');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối tới máy chủ!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 sm:p-8 shadow-xl mt-8">
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Viết bài mới</h1>
          <p className="text-sm text-zinc-400">Chia sẻ góc nhìn, review phim hoặc tin tức điện ảnh với cộng đồng.</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Hủy & Quay lại
        </button>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-medium">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Tiêu đề bài viết *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#FFD166]/60 focus:ring-1 focus:ring-[#FFD166]/30 transition-all text-sm font-medium"
            placeholder="Nhập tiêu đề thu hút..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Danh mục *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#FFD166]/60 focus:ring-1 focus:ring-[#FFD166]/30 transition-all text-sm"
            >
              <option value="Thông tin">Thông tin</option>
              <option value="Review phim">Review phim</option>
              <option value="Tin tức">Tin tức</option>
              <option value="Hậu trường">Hậu trường</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Ảnh đại diện (Link) *</label>
            <input
              type="text"
              required
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#FFD166]/60 focus:ring-1 focus:ring-[#FFD166]/30 transition-all text-sm"
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
            className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white focus:outline-none focus:border-[#FFD166]/60 focus:ring-1 focus:ring-[#FFD166]/30 transition-all text-sm resize-none"
            placeholder="Nhập mô tả tóm tắt để hiển thị trên thẻ bài viết..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Nội dung bài viết *</label>
          <div className="bg-white text-black rounded-xl overflow-hidden border border-white/10">
            <TiptapEditor value={content} onChange={setContent} />
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-white/5">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-extrabold rounded-xl transition-all shadow-lg hover:shadow-[#FFD166]/20 disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? 'Đang gửi duyệt...' : 'Gửi bài viết'}
          </button>
        </div>
      </form>
    </div>
  );
}
