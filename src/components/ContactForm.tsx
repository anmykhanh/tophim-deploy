'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatusMsg({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin!' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: 'Cảm ơn bạn đã liên hệ! Chúng tôi đã nhận được lời nhắn.' });
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Có lỗi xảy ra khi gửi lời nhắn.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Họ & Tên *</label>
          <input
            type="text"
            required
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-white outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Địa chỉ Email *</label>
          <input
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-white outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tiêu đề (Không bắt buộc)</label>
        <input
          type="text"
          placeholder="Hợp tác quảng cáo, Báo lỗi bản quyền..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-white outline-none transition-all text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lời nhắn của bạn *</label>
        <textarea
          required
          rows={5}
          placeholder="Nhập nội dung chi tiết bạn muốn nhắn gửi..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-white outline-none transition-all text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
            Đang gửi đi...
          </>
        ) : (
          'Gửi lời nhắn ngay'
        )}
      </button>
    </form>
  );
}
