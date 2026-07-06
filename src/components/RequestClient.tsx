'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RequestItem {
  id: number;
  title: string;
  original_title: string | null;
  imdb_url: string | null;
  reference_url: string | null;
  description: string;
  status: string;
  created_at: string;
  users: {
    name: string;
    avatar: string | null;
  } | null;
}

interface RequestClientProps {
  initialUser: {
    id: number;
    name: string;
    avatar: string | null;
  } | null;
}

export default function RequestClient({ initialUser }: RequestClientProps) {
  const [user] = useState(initialUser);

  // Form states
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [imdbUrl, setImdbUrl] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Request list states
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isLoadingList, setIsLoadingList] = useState(true);

  const fetchRequests = async (status: 'pending' | 'completed') => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`/api/requests?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRequests(data.requests || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      setFormError('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }

    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          originalTitle,
          imdbUrl,
          referenceUrl,
          description,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Gửi yêu cầu phim thành công! Chúng tôi sẽ xem xét sớm nhất.');
        setTitle('');
        setOriginalTitle('');
        setImdbUrl('');
        setReferenceUrl('');
        setDescription('');
        // Refresh request list
        fetchRequests(activeTab);
      } else {
        setFormError(data.error || 'Gửi yêu cầu thất bại.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="wrapper" className="min-h-screen bg-[#0f111a] text-white pt-24 pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        #wrapper .fluid-gap {
          margin-top: 0px !important;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 1.5rem;
        }
        #wrapper .cards-row.fixed {
          position: relative !important;
          inset: auto !important;
          width: 100% !important;
          height: auto !important;
          z-index: 1 !important;
          background-color: #121420/75;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
        }
        #wrapper .form-control.v-form-control {
          background-color: #0a0b10 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.875rem !important;
          width: 100% !important;
          transition: all 0.2s ease !important;
        }
        #wrapper .form-control.v-form-control:focus {
          border-color: #ffd875 !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(255, 216, 117, 0.2) !important;
        }
      `}} />
      
      <h1 style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>Yêu Cầu Phim - Rổ Phim</h1>
      
      <div className="fluid-gap">
        <div className="jsx-48ad41321615274d cards-row fixed">
          <div className="jsx-48ad41321615274d row-header">
            <h2 className="jsx-48ad41321615274d category-name text-2xl font-black tracking-tight text-white m-0">Yêu Cầu Phim</h2>
          </div>
          
          <div className="jsx-48ad41321615274d row-content">
            <div className="jsx-48ad41321615274d row flex flex-col lg:flex-row gap-8">
              <div className="jsx-48ad41321615274d col-lg-8 col-md-7 lg:w-2/3">
                <p className="jsx-48ad41321615274d mb-4" style={{ opacity: 0.7, fontSize: '14px' }}>
                  Gửi yêu cầu phim mà bạn muốn xem. Chúng tôi sẽ cố gắng thêm sớm nhất có thể.
                </p>
                
                <form autoComplete="off" className="jsx-48ad41321615274d v-form space-y-4" onSubmit={handleSubmit}>
                  {formSuccess && (
                    <div className="bg-[#ffd875]/10 border border-[#ffd875]/20 text-[#ffd875] px-4 py-3 rounded-xl text-sm font-semibold">
                      {formSuccess}
                    </div>
                  )}
                  {formError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-semibold">
                      {formError}
                    </div>
                  )}

                  <div className="jsx-48ad41321615274d">
                    <div className="jsx-48ad41321615274d row flex flex-col md:flex-row gap-4">
                      <div className="jsx-48ad41321615274d col-md-6 flex-1">
                        <label className="jsx-48ad41321615274d form-label small mb-1.5 text-xs font-bold text-zinc-400 block">
                          Tên phim (Tiếng Việt) <span className="jsx-48ad41321615274d" style={{ color: 'rgb(241, 196, 15)' }}>*</span>
                        </label>
                        <div className="jsx-48ad41321615274d" style={{ position: 'relative' }}>
                          <input
                            placeholder="VD: Vùng Đất Linh Hồn"
                            autoComplete="off"
                            required
                            disabled={!user}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="jsx-48ad41321615274d form-control v-form-control"
                            name="vietnamese_name"
                          />
                        </div>
                      </div>
                      
                      <div className="jsx-48ad41321615274d col-md-6 flex-1">
                        <label className="jsx-48ad41321615274d form-label small mb-1.5 text-xs font-bold text-zinc-400 block">
                          Tên gốc (tuỳ chọn)
                        </label>
                        <div className="jsx-48ad41321615274d" style={{ position: 'relative' }}>
                          <input
                            placeholder="VD: Spirited Away"
                            autoComplete="off"
                            disabled={!user}
                            value={originalTitle}
                            onChange={(e) => setOriginalTitle(e.target.value)}
                            className="jsx-48ad41321615274d form-control v-form-control"
                            name="original_name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="jsx-48ad41321615274d row flex flex-col md:flex-row gap-4">
                    <div className="jsx-48ad41321615274d col-md-6 flex-1">
                      <label className="jsx-48ad41321615274d form-label small mb-1.5 text-xs font-bold text-zinc-400 block">
                        Link TMDB hoặc IMDB (tuỳ chọn)
                      </label>
                      <input
                        placeholder="https://www.themoviedb.org/movie/..."
                        type="url"
                        disabled={!user}
                        value={imdbUrl}
                        onChange={(e) => setImdbUrl(e.target.value)}
                        className="jsx-48ad41321615274d form-control v-form-control"
                        name="tmdb_url"
                      />
                    </div>
                    
                    <div className="jsx-48ad41321615274d col-md-6 flex-1">
                      <label className="jsx-48ad41321615274d form-label small mb-1.5 text-xs font-bold text-zinc-400 block">
                        Link tham khảo (tuỳ chọn)
                      </label>
                      <input
                        placeholder="Link phim từ nguồn khác"
                        type="url"
                        disabled={!user}
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        className="jsx-48ad41321615274d form-control v-form-control"
                        name="reference_url"
                      />
                    </div>
                  </div>

                  <div className="jsx-48ad41321615274d mb-3">
                    <label className="jsx-48ad41321615274d form-label small mb-1.5 text-xs font-bold text-zinc-400 block">
                      Nội dung yêu cầu <span className="jsx-48ad41321615274d" style={{ color: 'rgb(241, 196, 15)' }}>*</span>
                    </label>
                    <textarea
                      name="content"
                      rows={3}
                      required
                      disabled={!user}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả chi tiết về phim bạn muốn yêu cầu..."
                      className="jsx-48ad41321615274d form-control v-form-control resize-none"
                    />
                  </div>

                  <div className="jsx-48ad41321615274d">
                    {user ? (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="jsx-48ad41321615274d btn btn-primary px-6 py-3 bg-[#ffd875] hover:bg-[#ffe194] text-zinc-950 font-bold rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                      >
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                      </button>
                    ) : (
                      <div className="jsx-48ad41321615274d d-flex gap-2 flex-wrap align-items-center flex items-center pt-2">
                        <Link
                          href="/pages/login?redirect=/yeu-cau"
                          className="jsx-48ad41321615274d btn btn-primary px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm active:scale-[0.98] flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                          Đăng nhập để gửi yêu cầu
                        </Link>
                        <span className="jsx-48ad41321615274d mx-2 text-zinc-500 text-xs">hoặc</span>
                        <Link
                          href="/pages/register"
                          className="jsx-48ad41321615274d btn btn-outline-light btn-sm px-4 py-2 bg-transparent border border-white/[0.1] hover:border-white/20 text-zinc-400 hover:text-white text-xs font-semibold rounded-xl transition-all"
                        >
                          Đăng ký tài khoản
                        </Link>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="jsx-48ad41321615274d col-lg-4 col-md-5 mt-4 mt-md-0 lg:w-1/3">
                <div className="jsx-48ad41321615274d guide-sidebar bg-zinc-950/45 border border-white/[0.05] rounded-2xl p-5 space-y-4">
                  <h4 className="jsx-48ad41321615274d guide-sidebar__title text-sm font-bold text-white uppercase tracking-wider mt-0 border-b border-white/5 pb-2">Hướng dẫn</h4>
                  <div className="jsx-48ad41321615274d guide-sidebar__steps space-y-4">
                    <div className="jsx-48ad41321615274d guide-step flex items-start gap-3">
                      <div className="jsx-48ad41321615274d guide-step__number w-6 h-6 rounded-full bg-zinc-900 border border-white/[0.08] text-xs font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">1</div>
                      <p className="jsx-48ad41321615274d guide-step__text text-xs text-zinc-400 leading-relaxed">Nhập thông tin phim bạn muốn yêu cầu</p>
                    </div>
                    <div className="jsx-48ad41321615274d guide-step flex items-start gap-3">
                      <div className="jsx-48ad41321615274d guide-step__number w-6 h-6 rounded-full bg-zinc-900 border border-white/[0.08] text-xs font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">2</div>
                      <p className="jsx-48ad41321615274d guide-step__text text-xs text-zinc-400 leading-relaxed">Cung cấp TMDB hoặc IMDB để chúng tôi dễ dàng tìm kiếm</p>
                    </div>
                    <div className="jsx-48ad41321615274d guide-step flex items-start gap-3">
                      <div className="jsx-48ad41321615274d guide-step__number w-6 h-6 rounded-full bg-zinc-900 border border-white/[0.08] text-xs font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">3</div>
                      <p className="jsx-48ad41321615274d guide-step__text text-xs text-zinc-400 leading-relaxed">Cung cấp link tham khảo nếu có</p>
                    </div>
                    <div className="jsx-48ad41321615274d guide-step flex items-start gap-3">
                      <div className="jsx-48ad41321615274d guide-step__number w-6 h-6 rounded-full bg-zinc-900 border border-white/[0.08] text-xs font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">4</div>
                      <p className="jsx-48ad41321615274d guide-step__text text-xs text-zinc-400 leading-relaxed">Giải thích lý do tại sao bạn muốn xem phim này</p>
                    </div>
                    <div className="jsx-48ad41321615274d guide-step guide-step--done flex items-start gap-3 border-t border-white/5 pt-4">
                      <div className="jsx-48ad41321615274d guide-step__number guide-step__number--done w-6 h-6 rounded-full bg-[#ffd875]/10 text-[#ffd875] border border-[#ffd875]/20 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                      <p className="jsx-48ad41321615274d guide-step__text text-xs text-[#ffd875] font-semibold leading-relaxed">Chúng tôi sẽ xem xét và cập nhật phim sớm nhất có thể</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List Section */}
        <div className="jsx-48ad41321615274d cards-row fixed mt-4">
          <div className="jsx-48ad41321615274d row-header flex items-center justify-between flex-wrap gap-2">
            <h3 className="jsx-48ad41321615274d category-name text-xl font-bold text-white m-0">Danh sách yêu cầu</h3>
            
            <div className="jsx-48ad41321615274d flex gap-1">
              <button
                onClick={() => setActiveTab('pending')}
                className={`jsx-48ad41321615274d btn btn-sm px-4 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer outline-none ${
                  activeTab === 'pending'
                    ? 'btn-primary bg-[#ffd875]/10 text-[#ffd875] border-[#ffd875]/25'
                    : 'btn-outline-light bg-transparent border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Đang chờ
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`jsx-48ad41321615274d btn btn-sm px-4 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer outline-none ${
                  activeTab === 'completed'
                    ? 'btn-primary bg-[#ffd875]/10 text-[#ffd875] border-[#ffd875]/25'
                    : 'btn-outline-light bg-transparent border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Hoàn thành
              </button>
            </div>
          </div>

          <div className="row-content mt-4">
            {isLoadingList ? (
              <div className="text-center py-12 text-zinc-500 text-sm animate-pulse">
                Đang tải danh sách yêu cầu...
              </div>
            ) : requests.length === 0 ? (
              <p className="jsx-48ad41321615274d opacity-50 text-center py-10 m-0 text-sm text-zinc-500">Chưa có yêu cầu nào.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map((item) => {
                  const date = new Date(item.created_at).toLocaleDateString('vi-VN');
                  const userAvatar = item.users?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.users?.name || 'User')}`;
                  
                  return (
                    <div key={item.id} className="bg-[#12131a] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-300">
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h4 className="text-base font-bold text-white mt-0 mb-0.5">{item.title}</h4>
                            {item.original_title && (
                              <p className="text-xs text-zinc-500 italic mt-0">{item.original_title}</p>
                            )}
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-[#ffd875]/10 text-[#ffd875] border border-[#ffd875]/20'
                          }`}>
                            {item.status === 'completed' ? 'Hoàn thành' : item.status === 'rejected' ? 'Từ chối' : 'Đang chờ'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-3">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                        <div className="flex items-center gap-2">
                          <img src={userAvatar} alt="User avatar" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                          <span className="text-xs font-semibold text-zinc-400">{item.users?.name || 'Ẩn danh'}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
