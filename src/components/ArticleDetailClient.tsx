'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Eye, Calendar, User, MessageCircle, Send, ThumbsUp, Reply } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface ArticleDetailClientProps {
  article: {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    category: string;
    content: string;
    thumbnail: string | null;
    views: number;
    created_at: string;
  };
  currentUser: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
    permissions?: any;
  } | null;
}

interface Comment {
  id: number;
  parent_id: number | null;
  content: string;
  gif_url: string | null;
  is_spoiler: boolean;
  is_pinned?: boolean | null;
  created_at: string;
  likeCount: number;
  isLiked: boolean;
  users: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
  };
}

export default function ArticleDetailClient({ article, currentUser }: ArticleDetailClientProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
  const articleBodyRef = useRef<HTMLDivElement>(null);

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyIsSpoiler, setReplyIsSpoiler] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());

  const handleCommentAction = async (commentId: number, action: 'pin' | 'unpin' | 'delete' | 'ban', type: 'movie' | 'article' = 'article') => {
    let banDays = 0;
    if (action === 'ban') {
      const daysStr = window.prompt("Nhập số ngày cấm bình luận (để trống hoặc 0 để cấm vĩnh viễn):", "7");
      if (daysStr === null) return;
      banDays = parseInt(daysStr) || 0;
    } else if (action === 'delete') {
      if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    }

    try {
      const res = await fetch('/api/admin/comments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action, banDays, type })
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'delete') {
          setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        } else if (action === 'pin' || action === 'unpin') {
          setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: action === 'pin' } : c));
        } else if (action === 'ban') {
          alert('Đã cấm thành viên bình luận thành công!');
        }
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
    setActiveActionMenuId(null);
  };
  const STEP = 5;

  // Time ago helper
  const timeAgo = useCallback((isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/articles/comments?articleId=${article.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [article.id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Increment views only when user actually visits the page (client-side)
  const viewCounted = useRef(false);
  useEffect(() => {
    if (viewCounted.current) return;
    viewCounted.current = true;
    fetch('/api/articles/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: article.id })
    }).catch(console.error);
  }, [article.id]);

  // Like handler
  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/articles/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => prev.map(c =>
          c.id === commentId ? { ...c, isLiked: data.liked, likeCount: data.likeCount } : c
        ));
      }
    } catch (err) { console.error(err); }
  };

  // Reply submit
  const handleSubmitReply = async (e: React.FormEvent, parentId: number, parentName: string) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser) return;
    setIsSubmittingReply(true);
    try {
      const res = await fetch('/api/articles/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          content: `@${parentName} ${replyText}`,
          isSpoiler: replyIsSpoiler,
          parentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setExpandedReplies(prev => new Set([...prev, parentId]));
        setActiveReplyId(null);
        setReplyText('');
      }
    } catch (err) { console.error(err); } finally {
      setIsSubmittingReply(false);
    }
  };

  // Collect all images in article body as slides and add visual cues
  useEffect(() => {
    const container = articleBodyRef.current;
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    const slides = imgs.map(img => ({ src: img.src }));
    setLightboxSlides(slides);

    imgs.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.style.pointerEvents = 'auto'; // Ensure pointer events are active
      img.title = 'Nhấn để xem ảnh lớn';
    });
  }, [article.content]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/articles/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          content: commentContent,
          isSpoiler,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCommentContent('');
        setComments(prev => [data.comment, ...prev]);
      } else {
        setSubmitError(data.error || 'Đã xảy ra lỗi.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Lỗi kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0f111a] text-white">

      {/* Article content renderer styles – covers all TinyMCE output */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;700&display=swap');

        .article-body { color: #d4d4d8; font-size: 15px; line-height: 1.8; }
        .article-body * { box-sizing: border-box; }

        /* Headings */
        .article-body h1 { font-size: 1.75rem; font-weight: 800; color: #fff; margin: 1.75rem 0 0.75rem; line-height: 1.3; }
        .article-body h2 { font-size: 1.4rem; font-weight: 700; color: #fff; margin: 1.5rem 0 0.65rem; line-height: 1.35; }
        .article-body h3 { font-size: 1.15rem; font-weight: 700; color: #fff; margin: 1.25rem 0 0.5rem; }
        .article-body h4, .article-body h5, .article-body h6 { font-weight: 700; color: #e4e4e7; margin: 1rem 0 0.4rem; }

        /* Paragraph */
        .article-body p { margin-bottom: 1rem; line-height: 1.8; }
        .article-body p:last-child { margin-bottom: 0; }

        /* Links */
        .article-body a { color: #FFD166; text-decoration: underline; font-weight: 600; transition: color 0.2s; }
        .article-body a:hover { color: #ffb703; }

        /* Bold / Italic / etc */
        .article-body strong, .article-body b { color: #fff; font-weight: 700; }
        .article-body em, .article-body i { font-style: italic; }
        .article-body u { text-decoration: underline; }
        .article-body s, .article-body del, .article-body strike { text-decoration: line-through; opacity: 0.7; }
        .article-body sub { font-size: 0.75em; vertical-align: sub; }
        .article-body sup { font-size: 0.75em; vertical-align: super; }

        /* Blockquote */
        .article-body blockquote {
          border-left: 4px solid #FFD166;
          background: rgba(255,209,102,0.05);
          padding: 0.75rem 1.25rem;
          margin: 1.5rem 0;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #a1a1aa;
        }
        .article-body blockquote p { margin: 0; }

        /* Lists */
        .article-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .article-body ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .article-body li { margin-bottom: 0.35rem; line-height: 1.7; }
        .article-body ul ul { list-style-type: circle; margin-top: 0.35rem; }
        .article-body ul ul ul { list-style-type: square; }

        /* Images */
        .article-body img {
          max-width: 100%; height: auto;
          border-radius: 10px;
          margin: 1.25rem auto;
          display: block;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .article-body figure { margin: 1.5rem 0; text-align: center; }
        .article-body figcaption { font-size: 0.8rem; color: #71717a; margin-top: 0.4rem; }

        /* Tables */
        .article-body table {
          width: 100%; border-collapse: collapse;
          margin: 1.5rem 0; font-size: 0.9rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; overflow: hidden;
        }
        .article-body th {
          background: rgba(255,209,102,0.12);
          color: #FFD166; font-weight: 700;
          padding: 10px 14px; text-align: left;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .article-body td {
          padding: 9px 14px; color: #d4d4d8;
          border: 1px solid rgba(255,255,255,0.07);
          vertical-align: top;
        }
        .article-body tr:nth-child(even) td { background: rgba(255,255,255,0.025); }
        .article-body tr:hover td { background: rgba(255,209,102,0.04); }

        /* Code */
        .article-body code {
          font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
          font-size: 0.85em;
          background: rgba(255,255,255,0.08);
          padding: 2px 6px; border-radius: 4px;
          color: #86efac;
        }
        .article-body pre {
          background: #0d1117; border: 1px solid rgba(255,255,255,0.1);
          padding: 1rem 1.25rem; border-radius: 10px;
          overflow-x: auto; margin: 1.25rem 0;
          font-family: 'Fira Code', Consolas, monospace;
          font-size: 0.875rem; line-height: 1.6; color: #e2e8f0;
        }
        .article-body pre code { background: none; padding: 0; color: inherit; font-size: inherit; }

        /* Horizontal rule */
        .article-body hr {
          border: none; border-top: 1px solid rgba(255,255,255,0.1);
          margin: 2rem 0;
        }

        /* Video / iframe embeds */
        .article-body iframe {
          max-width: 100%; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          margin: 1.25rem auto; display: block;
        }
        .article-body .media-wrapper {
          position: relative; padding-bottom: 56.25%;
          height: 0; overflow: hidden; margin: 1.25rem 0; border-radius: 10px;
        }
        .article-body .media-wrapper iframe {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; margin: 0; border-radius: 10px;
        }

        /* Alignment (TinyMCE outputs text-align inline but also these classes) */
        .article-body .align-left, .article-body [style*="text-align: left"] { text-align: left; }
        .article-body .align-center, .article-body [style*="text-align: center"] { text-align: center; }
        .article-body .align-right, .article-body [style*="text-align: right"] { text-align: right; }
        .article-body .align-justify, .article-body [style*="text-align: justify"] { text-align: justify; }
      `}} />


      {/* Large Premium Blurred Background Cover Banner (RoPhim Style) */}
      <div className="absolute top-0 left-0 right-0 h-[420px] sm:h-[520px] -z-10 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0f111a]/60 to-[#0f111a] z-10" />
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-50 blur-[2px] scale-102"
          />
        ) : (
          <div className="w-full h-full bg-zinc-950" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 relative z-20">

        {/* Navigation Breadcrumbs */}
        <nav className="mb-6 text-xs sm:text-sm text-zinc-400 font-semibold flex items-center gap-2">
          <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/bai-viet" className="hover:text-white transition-colors">Bài Viết</Link>
          <span>/</span>
          <span className="text-[#FFD166] truncate max-w-[200px] sm:max-w-md">{article.title}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-6 tracking-tight drop-shadow-md">
          {article.title}
        </h1>

        {/* Premium Metadata row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-semibold mb-10 pb-4 border-b border-white/5">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#FFD166]" />
            Tác giả: admin
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#FFD166]" />
            {new Date(article.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#FFD166]" />
            {article.views} lượt xem
          </span>

          {/* Yellow Badge Category */}
          <span className="ml-auto px-3 py-1 bg-[#FFD166] text-[#0f111a] text-[10px] font-black rounded-lg uppercase tracking-wider shadow-md">
            {article.category || 'Thông tin'}
          </span>
        </div>

        {/* Article Body Content */}
        <article className="prose prose-invert max-w-none text-zinc-300 leading-relaxed mb-16 text-sm sm:text-base bg-[#161824]/50 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
          <div
            ref={articleBodyRef}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG') {
                e.preventDefault();
                e.stopPropagation();
                const container = articleBodyRef.current;
                if (!container) return;
                const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
                const idx = imgs.indexOf(target as HTMLImageElement);
                if (idx >= 0) setLightboxIndex(idx);
              }
            }}
            dangerouslySetInnerHTML={{ __html: article.content }}
            className="article-body"
          />
        </article>

        {/* ──────────────── Comments Section ──────────────── */}
        <div className="mt-16 border-t border-white/10 pt-10">
          <div className="flex items-center gap-2.5 mb-6">
            <MessageCircle className="w-6 h-6 text-white fill-white" />
            <h2 className="text-xl font-bold text-white">Bình luận <span className="text-white/60">({comments.length})</span></h2>
          </div>

          {/* Form write comment */}
          {currentUser ? (
            <form onSubmit={handleSubmitComment} className="mb-8 p-4 bg-[#161824] border border-white/5 rounded-xl">
              <div className="flex items-center gap-2.5 px-1 mb-3">
                <div className="relative shrink-0">
                  <div className={currentUser.role === 'admin' ? "avatar-ring-premium" : "w-7 h-7 rounded-full overflow-hidden bg-[#FFD166] flex items-center justify-center text-[#1c1c1c] font-bold text-xs shrink-0"}>
                    <div className={currentUser.role === 'admin' ? "w-7 h-7 rounded-full overflow-hidden bg-[#2a2a35] flex items-center justify-center text-white font-bold text-[10px] relative z-10" : "w-full h-full"}>
                      {currentUser.avatar ? (
                        <img alt="" className="w-full h-full object-cover" src={currentUser.avatar} />
                      ) : (
                        <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  {currentUser.role === 'admin' && (
                    <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[2px] shadow-md border-[1.5px] border-[#12121a]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-[7px] h-[7px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
                    </div>
                  )}
                </div>
                {currentUser.role === 'admin' && (
                  <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-[#FFD166] text-[#0f111a] text-[9px] font-black tracking-wider shrink-0">ADMIN</span>
                )}
                <span className="text-[13px] font-semibold text-white" style={currentUser.role === 'admin' ? { background: 'linear-gradient(rgb(255, 255, 255), rgb(255, 209, 102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
                  {currentUser.name}
                </span>
                {currentUser.role === 'admin' && (
                  <img alt="emoji" loading="lazy" width="20" height="20" className="w-[18px] h-[18px] object-contain shrink-0" src="/gif/03.gif" />
                )}
              </div>

              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Nhập suy nghĩ của bạn về bài viết này..."
                rows={3}
                className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FFD166] transition-colors resize-none"
              />

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="spoiler-check"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-amber-500 bg-[#0f111a] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="spoiler-check" className="text-xs text-zinc-400 font-medium cursor-pointer select-none">Bình luận chứa Spoilers</label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !commentContent.trim()}
                  className="px-4 py-2 bg-[#FFD166] hover:bg-amber-400 disabled:opacity-50 text-[#0f111a] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi
                </button>
              </div>

              {submitError && (
                <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {submitError}
                </div>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-3 mb-8 p-4 bg-[#161824] border border-white/5 rounded-xl">
              <p className="text-sm text-zinc-400">
                <Link href="/pages/login" className="text-amber-400 hover:underline font-semibold">Đăng nhập</Link> để viết bình luận.
              </p>
            </div>
          )}

          {/* Comments List rendering */}
          {(() => {
            const topLevel = comments
              .filter(c => !c.parent_id)
              .sort((a, b) => {
                if (b.is_pinned && !a.is_pinned) return 1;
                if (!b.is_pinned && a.is_pinned) return -1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
            const getReplies = (id: number) => comments.filter(c => c.parent_id === id);

            const renderComment = (c: Comment, isReply = false) => {
              const avatarSrc = c.users.avatar;
              const displayName = c.users.name || 'Unknown';
              const isSpoiler = c.is_spoiler;
              const isRevealed = revealedSpoilers.has(c.id);
              const replies = getReplies(c.id);
              const isExpanded = expandedReplies.has(c.id);

              return (
                <div key={c.id} className={`${isReply ? 'py-2 sm:py-3' : (c.is_pinned ? 'py-3 sm:py-5 bg-[#FFD166]/[0.04] border border-[#FFD166]/15 rounded-xl px-3 sm:px-4 my-1.5' : 'py-3 sm:py-5 border-b border-white/5 last:border-b-0')} transition-all duration-300`}>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <div className="relative shrink-0">
                        <div className={c.users.role === 'admin' ? 'avatar-ring-premium' : 'ring-1 ring-white/15 rounded-full p-[2px] transition-colors'}>
                          <div className={`${isReply ? 'w-7 h-7 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-11 sm:h-11'} rounded-full bg-[#2a2a35] overflow-hidden flex items-center justify-center font-bold text-white uppercase text-xs relative z-10`}>
                            {avatarSrc
                              ? <img src={avatarSrc} alt="" loading="lazy" className="w-full h-full object-cover" />
                              : <span>{c.users.name?.charAt(0) || 'U'}</span>
                            }
                          </div>
                        </div>
                        {c.users.role === 'admin' && (
                          <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[2px] shadow-md border-[1.5px] border-[#12121a]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[7px] h-[7px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 relative group/comment">
                      {!isReply && c.is_pinned && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-[#FFD166] font-bold text-[12px] sm:text-[13px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-3.5 h-3.5"><path d="M16 11V6.5A4.5 4.5 0 0 0 11.5 2h-1A4.5 4.5 0 0 0 6 6.5V11l-2 4h6.5v7h3v-7H20l-2-4z" /></svg>
                          Ghim bởi Admin
                        </div>
                      )}

                      {currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_article_comments')) && (
                        <div className="absolute top-0 right-0 z-10">
                          <button
                            onClick={() => setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id)}
                            className="p-1 sm:p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                          </button>
                          {activeActionMenuId === c.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-[#1e1e28] border border-white/10 rounded-lg shadow-xl overflow-hidden text-[13px] z-50">
                              {!isReply && (
                                <button onClick={() => handleCommentAction(c.id, c.is_pinned ? 'unpin' : 'pin')} className="w-full text-left px-3 py-2 hover:bg-white/5 text-white flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11V6.5A4.5 4.5 0 0 0 11.5 2h-1A4.5 4.5 0 0 0 6 6.5V11l-2 4h6.5v7h3v-7H20l-2-4z" /></svg>
                                  {c.is_pinned ? 'Bỏ ghim' : 'Ghim bình luận'}
                                </button>
                              )}
                              <button onClick={() => handleCommentAction(c.id, 'ban')} className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-amber-500 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                                Cấm bình luận
                              </button>
                              <button onClick={() => handleCommentAction(c.id, 'delete')} className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                Xóa bình luận
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap pr-6">
                        {c.users.role === 'admin' && (
                          <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-[#FFD166] text-[#0f111a] text-[9px] font-black tracking-wider shrink-0">ADMIN</span>
                        )}
                        <span
                          className="font-bold text-[12px] sm:text-[13px] text-white"
                          style={c.users.role === 'admin' ? { background: 'linear-gradient(rgb(255,255,255),rgb(255,209,102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}
                        >
                          {displayName}
                        </span>
                        {isSpoiler && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium ml-1">
                            Spoiler
                          </span>
                        )}
                        <span className="text-[11px] sm:text-[12px] text-zinc-500 ml-1">{timeAgo(c.created_at)}</span>
                      </div>

                      {/* Text */}
                      <div className="mt-1.5">
                        <p
                          className={`text-[#AAAAAA] leading-[1.7] whitespace-pre-wrap break-words text-[12px] sm:text-[13px] transition-all duration-300 ${isSpoiler && !isRevealed ? 'blur-sm select-none cursor-pointer' : ''}`}
                          onClick={() => {
                            if (isSpoiler && !isRevealed) {
                              setRevealedSpoilers(prev => {
                                const newSet = new Set(prev);
                                newSet.add(c.id);
                                return newSet;
                              });
                            }
                          }}
                        >
                          {c.content.startsWith('@') ? (
                            <>
                              <span className="text-[#FFD166] font-semibold">{c.content.split(' ')[0]}</span>
                              {' ' + c.content.split(' ').slice(1).join(' ')}
                            </>
                          ) : c.content}
                        </p>
                      </div>

                      {/* Actions: like + reply */}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleLikeComment(c.id)}
                          className={`flex items-center gap-1.5 rounded-full text-xs transition-colors ${c.isLiked ? 'text-[#FFD166]' : 'text-zinc-500 hover:text-white'}`}
                          title={currentUser ? (c.isLiked ? 'Bỏ thích' : 'Thích') : 'Đăng nhập để thích'}
                        >
                          <ThumbsUp className={`w-4 h-4 ${c.isLiked ? 'fill-[#FFD166]' : ''}`} />
                          {c.likeCount > 0 && <span className="font-semibold">{c.likeCount}</span>}
                        </button>

                        {currentUser && !isReply && (
                          <button
                            onClick={() => { setActiveReplyId(activeReplyId === c.id ? null : c.id); setReplyText(''); }}
                            className="flex items-center gap-1.5 text-xs transition-colors text-zinc-500 hover:text-white"
                          >
                            <Reply className="w-4 h-4" />
                            <span className="font-medium">Trả lời</span>
                          </button>
                        )}
                      </div>

                      {/* Reply form */}
                      {activeReplyId === c.id && (
                        <form onSubmit={e => handleSubmitReply(e, c.id, displayName)} className="mt-3 flex gap-2 items-start">
                          {currentUser?.avatar
                            ? <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                            : <div className="w-7 h-7 rounded-full bg-[#FFD166] flex items-center justify-center text-[#1c1c1c] font-bold text-xs shrink-0 mt-0.5">{currentUser?.name.charAt(0)}</div>
                          }
                          <div className="flex-1">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder={`Trả lời ${displayName}...`}
                              rows={2}
                              autoFocus
                              className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FFD166] transition-colors resize-none"
                            />
                            <div className="flex items-center gap-2 mt-1.5">
                              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                                <input type="checkbox" checked={replyIsSpoiler} onChange={e => setReplyIsSpoiler(e.target.checked)} className="w-3 h-3 rounded" />
                                Spoiler
                              </label>
                              <button type="button" onClick={() => setActiveReplyId(null)} className="text-xs text-zinc-500 hover:text-white ml-auto">Hủy</button>
                              <button
                                type="submit"
                                disabled={isSubmittingReply || !replyText.trim()}
                                className="px-3 py-1 bg-[#FFD166] text-[#0f111a] font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-50 transition-all"
                              >
                                <Send className="w-3 h-3" /> Gửi
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* Expand/collapse replies */}
                      {!isReply && replies.length > 0 && (
                        <button
                          onClick={() => setExpandedReplies(prev => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          })}
                          className="flex items-center gap-1.5 mt-3 text-[13px] text-[#FFD166] hover:text-[#FFD166]/80 font-medium transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
                          {isExpanded ? 'Ẩn phản hồi' : `Xem ${replies.length} phản hồi`}
                        </button>
                      )}

                      {/* Nested replies */}
                      {!isReply && isExpanded && replies.length > 0 && (
                        <div className="mt-2 ml-1 border-l-2 border-white/5 pl-3">
                          {replies.map(r => renderComment(r, true))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            const visibleTopLevel = topLevel.slice(0, visibleCount);
            const hasMore = topLevel.length > visibleCount;
            const isExpanded = visibleCount > STEP;

            return (
              <div className="space-y-1 divide-y divide-white/5">
                {isLoadingComments ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                    <span className="text-zinc-500 text-xs font-medium">Đang tải bình luận...</span>
                  </div>
                ) : topLevel.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs font-semibold">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm xúc!</div>
                ) : (
                  visibleTopLevel.map(c => renderComment(c))
                )}

                {/* Load more / Collapse buttons */}
                {!isLoadingComments && topLevel.length > STEP && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    {hasMore && (
                      <button
                        onClick={() => setVisibleCount(prev => prev + STEP)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                        Xem thêm bình luận
                      </button>
                    )}
                    {isExpanded && (
                      <button
                        onClick={() => setVisibleCount(STEP)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-[#FFD166]/80 hover:text-[#FFD166] transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
                        Thu gọn
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>

      {/* Image Lightbox — yet-another-react-lightbox with Zoom plugin */}
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={lightboxSlides}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
        carousel={{
          finite: lightboxSlides.length <= 1,
        }}
        styles={{
          container: { backgroundColor: 'rgba(0,0,0,0.92)' },
        }}
      />
    </div>
  );
}
