'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CircleUserRound,
  Heart,
  Loader2,
  Megaphone,
  MessageSquare,
  PenSquare,
  PlusSquare,
  Repeat2,
  Send,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useAuthModal } from '@/context/AuthModalContext';
import { useProfile } from '@/context/ProfileContext';
import { forumAPI, productAPI } from '@/lib/lmsService';
import { publicNoteAPI } from '@/lib/notesService';

const RichTextEditor = dynamic(() => import('@/components/admin/products/Editor'), {
  ssr: false,
  loading: () => <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">Loading editor...</div>,
});

const TutorlixRenderer = dynamic(() => import('@/components/notes/TutorlixRenderer'), {
  ssr: false,
  loading: () => <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-500">Loading post...</div>,
});

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function appendFeedCopies(items, suffix) {
  return items.map((item, index) => ({
    ...item,
    _feedKey: `${item.id}-${suffix}-${index}`,
  }));
}

function mergeUniquePosts(existing, incoming) {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  incoming.forEach((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  });
  return merged;
}

function extractPlainText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toRichTextHTML(post) {
  const content = (post?.content || '').trim();
  if (content) {
    return content;
  }

  const fallbackText = (post?.preview_text || '').trim();
  return fallbackText ? `<p>${fallbackText}</p>` : '';
}

function ForumComposer({ isAuthenticated, onRequireAuth, onCreate, submitting }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);

  const submit = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!extractPlainText(content)) {
      toast.error('Write something before posting.');
      return;
    }

    const created = await onCreate({
      title: title.trim(),
      content,
    });

    if (created) {
      setTitle('');
      setContent('');
      setEditorKey((value) => value + 1);
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <PenSquare className="h-5 w-5 text-primary" />
          Share with the community
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Optional title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={180}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <RichTextEditor
            key={editorKey}
            value={content}
            onChange={setContent}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Logged in users can post, like, and comment. Everyone can read and share.
          </p>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ForumComposerSheet({ open, onOpenChange, isAuthenticated, onRequireAuth, onCreate, submitting }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-3xl border-x-0 border-b-0 px-0">
        <SheetHeader className="px-4 pb-2 sm:px-6">
          <SheetTitle>Create post</SheetTitle>
          <SheetDescription>Share a question, update, or useful insight with the community.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 sm:px-6">
          <ForumComposer
            isAuthenticated={isAuthenticated}
            onRequireAuth={onRequireAuth}
            onCreate={async (payload) => {
              const created = await onCreate(payload);
              if (created) {
                onOpenChange(false);
              }
              return created;
            }}
            submitting={submitting}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ForumAdCard({ ad }) {
  if (!ad) return null;

  const href = ad.kind === 'course' ? `/courses/${ad.id}` : `/notes/${ad.slug || ad.id}`;
  const price = ad.kind === 'course'
    ? `₹${ad.effective_price || ad.discounted_price || ad.price || 0}`
    : ad.effective_price || ad.discounted_price || ad.price
      ? `₹${ad.effective_price || ad.discounted_price || ad.price}`
      : 'Free';

  return (
    <Card className="border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-amber-50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              <Megaphone className="h-3.5 w-3.5" />
              Sponsored
            </div>
            <h3 className="text-xl font-bold text-slate-900">{ad.title}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{ad.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {ad.kind === 'course' ? 'Course' : 'Paid note'}
              </div>
              <div className="text-lg font-black text-slate-900">{price}</div>
            </div>
            <Button asChild className="rounded-full">
              <Link href={href}>Explore</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ForumPostBody({ post }) {
  if ((post.content || '').trim()) {
    return (
      <div
        className="prose prose-slate max-w-none overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    );
  }

  if (Array.isArray(post.rich_content) && post.rich_content.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
        <TutorlixRenderer content={post.rich_content} />
      </div>
    );
  }

  return <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.content}</p>;
}

function ForumPostCard({
  post,
  isAuthenticated,
  onRequireAuth,
  onToggleLike,
  onCommentAdded,
  onSaveEdit,
  onDeletePost,
  startEditing,
  onEditingHandled,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(post.recent_comments || []);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(toRichTextHTML(post));
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    setComments(post.recent_comments || []);
  }, [post.recent_comments]);

  useEffect(() => {
    setEditTitle(post.title || '');
    setEditContent(toRichTextHTML(post));
  }, [post]);

  useEffect(() => {
    if (startEditing) {
      setEditing(true);
      onEditingHandled?.(post.id);
    }
  }, [startEditing, onEditingHandled, post.id]);

  const loadComments = async () => {
    if (commentsLoaded || commentsLoading) return;
    setCommentsLoading(true);
    try {
      const response = await forumAPI.getComments(post.id, { page_size: 20 });
      setComments(response.results || response);
      setCommentsLoaded(true);
    } catch {
      toast.error('Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) loadComments();
  };

  const submitComment = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty.');
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await forumAPI.createComment(post.id, { content: commentText.trim() });
      setComments((prev) => [...prev, created]);
      setCommentText('');
      setCommentsOpen(true);
      setCommentsLoaded(true);
      onCommentAdded(post.id, created);
    } catch (error) {
      toast.error(error.response?.data?.content?.[0] || 'Failed to add comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const sharePost = async () => {
    const shareUrl = `${window.location.origin}/forum?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'Tutorlix Forum Post',
          text: (post.preview_text || post.content || '').slice(0, 120),
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Post link copied.');
      }
    } catch {
      // no-op
    }
  };

  const saveEdit = async () => {
    if (!extractPlainText(editContent)) {
      toast.error('Post content cannot be empty.');
      return;
    }

    setEditSubmitting(true);
    try {
      const updated = await onSaveEdit(post.id, {
        title: editTitle.trim(),
        content: editContent,
      });
      if (updated) {
        setEditing(false);
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const deletePost = async () => {
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) return;

    setDeleteSubmitting(true);
    try {
      await onDeletePost(post.id);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const initials = post.author?.full_name?.slice(0, 1)?.toUpperCase() || 'U';

  return (
    <Card id={`post-${post.id}`} className="border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-11 border border-slate-200">
            <AvatarImage src={post.author?.profile_image} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-slate-900">{post.author?.full_name || 'User'}</span>
                <span className="text-xs text-slate-500">{formatTimestamp(post.created_at)}</span>
              </div>
              {post.can_edit || post.can_delete ? (
                <div className="flex items-center gap-2">
                  {post.can_edit ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditing((value) => !value)}>
                      Edit
                    </Button>
                  ) : null}
                  {post.can_delete ? (
                    <Button type="button" variant="ghost" size="icon" className="rounded-full text-rose-600" onClick={deletePost} disabled={deleteSubmitting}>
                      {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {editing ? (
              <div className="mt-3 space-y-3">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Optional title" maxLength={180} />
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <RichTextEditor key={`edit-${post.id}`} value={editContent} onChange={setEditContent} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveEdit} disabled={editSubmitting}>
                    {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={editSubmitting}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {post.title ? <h3 className="mt-2 text-lg font-bold text-slate-900">{post.title}</h3> : null}
                <div className="mt-3">
                  <ForumPostBody post={post} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant={post.liked_by_me ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => (isAuthenticated ? onToggleLike(post.id) : onRequireAuth())}
          >
            <Heart className="h-4 w-4" />
            {post.likes_count}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={toggleComments}>
            <MessageSquare className="h-4 w-4" />
            {post.comments_count}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={sharePost}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {commentsOpen ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading comments...
                </div>
              ) : comments.length ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">{comment.author?.full_name || 'User'}</span>
                      <span className="text-xs text-slate-500">{formatTimestamp(comment.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No comments yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="bg-white"
              />
              <Button type="button" onClick={submitComment} disabled={commentSubmitting} className="sm:self-end">
                {commentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Comment
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ForumProfileSection({ user, isAuthenticated, onRequireAuth, myPosts, loadingMyPosts, onEditRequest, onDeletePost }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your forum profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated ? (
          <>
            <p className="text-sm leading-6 text-slate-600">
              Sign in to publish posts, update your own posts, and manage your activity.
            </p>
            <Button type="button" className="w-full rounded-full" onClick={onRequireAuth}>
              Join the discussion
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              Signed in as <span className="font-semibold">{user?.first_name || user?.username}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">My posts</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{myPosts.length}</div>
            </div>
            <div className="space-y-3">
              {loadingMyPosts ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your posts...
                </div>
              ) : myPosts.length ? (
                myPosts.slice(0, 8).map((post) => (
                  <div key={post.id} className="rounded-2xl border border-slate-200 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{post.title || post.preview_text || 'Untitled post'}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTimestamp(post.created_at)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onEditRequest(post.id)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-rose-600"
                        onClick={() => {
                          if (window.confirm('Delete this post?')) {
                            onDeletePost(post.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No posts yet.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ForumPage() {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { profileType } = useProfile();
  const searchParams = useSearchParams();
  const sentinelRef = useRef(null);

  const [sourcePosts, setSourcePosts] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loopCount, setLoopCount] = useState(0);
  const [feedError, setFeedError] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [activeView, setActiveView] = useState('timeline');
  const [postSheetOpen, setPostSheetOpen] = useState(false);

  const selectedPostId = searchParams.get('post');

  const requireAuth = () => openAuthModal('login');

  const updatePostEverywhere = (postId, updater) => {
    setSourcePosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
    setFeedPosts((prev) => prev.map((post) => (post.id === postId ? { ...updater(post), _feedKey: post._feedKey } : post)));
    setMyPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
  };

  const removePostEverywhere = (postId) => {
    setSourcePosts((prev) => prev.filter((post) => post.id !== postId));
    setFeedPosts((prev) => prev.filter((post) => post.id !== postId));
    setMyPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const loadAds = async () => {
    try {
      const [products, notes] = await Promise.all([
        productAPI.getAll({ page_size: 8, type: profileType }),
        publicNoteAPI.browse({ page_size: 8, profile_type: profileType, privacy: 'purchaseable' }),
      ]);

      const productAds = (products.results || products || []).map((item) => ({
        kind: 'course',
        id: item.id,
        title: item.name,
        description: item.description,
        effective_price: item.effective_price,
        discounted_price: item.discounted_price,
        price: item.price,
      }));

      const noteAds = (notes.results || []).map((item) => ({
        kind: 'note',
        id: item.id,
        slug: item.slug,
        title: item.title,
        description: item.description,
        effective_price: item.effective_price,
        discounted_price: item.discounted_price,
        price: item.price,
      }));
      const paidNoteAds = noteAds.filter((item) => Number(item.price || item.effective_price || 0) > 0);

      const mixedAds = [];
      const maxLen = Math.max(productAds.length, paidNoteAds.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (productAds[i]) mixedAds.push(productAds[i]);
        if (paidNoteAds[i]) mixedAds.push(paidNoteAds[i]);
      }
      setAds(mixedAds);
    } catch {
      setAds([]);
    }
  };

  const loadMyPosts = async () => {
    if (!isAuthenticated) {
      setMyPosts([]);
      return;
    }
    setLoadingMyPosts(true);
    try {
      const response = await forumAPI.mine({ page_size: 20 });
      setMyPosts(response.results || response || []);
    } catch {
      setMyPosts([]);
    } finally {
      setLoadingMyPosts(false);
    }
  };

  const fetchPage = async (pageNumber, initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      setFeedError(null);
      const response = await forumAPI.list({ page: pageNumber, page_size: 10 });
      const results = response.results || [];

      setSourcePosts((prev) => {
        const merged = mergeUniquePosts(prev, results);
        if (pageNumber === 1) {
          setFeedPosts(appendFeedCopies(merged, 'base'));
        } else {
          const newUnique = merged.filter((item) => !prev.some((existing) => existing.id === item.id));
          if (newUnique.length) {
            setFeedPosts((current) => [...current, ...appendFeedCopies(newUnique, `page-${pageNumber}`)]);
          }
        }
        return merged;
      });

      setHasMorePages(!!response.next);
      setPage(pageNumber);
    } catch (error) {
      setHasMorePages(false);
      setFeedError(error.response?.data?.detail || error.response?.data?.error || 'Failed to load forum posts.');
      if (initial) {
        setSourcePosts([]);
        setFeedPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setSourcePosts([]);
    setFeedPosts([]);
    setPage(1);
    setHasMorePages(true);
    setLoopCount(0);
    fetchPage(1, true);
    loadAds();
  }, [profileType]);

  useEffect(() => {
    loadMyPosts();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedPostId) return;
    if (sourcePosts.some((post) => String(post.id) === String(selectedPostId))) return;

    const loadSelected = async () => {
      try {
        const post = await forumAPI.getById(selectedPostId);
        setSourcePosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
        setFeedPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)].map((item, index) => ({
          ...item,
          _feedKey: `${item.id}-selected-${index}`,
        })));
      } catch {
        // ignore invalid shared id
      }
    };

    loadSelected();
  }, [selectedPostId, sourcePosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting || loading || loadingMore) return;

        if (hasMorePages) {
          fetchPage(page + 1, false);
          return;
        }

        if (sourcePosts.length) {
          const nextLoop = loopCount + 1;
          setLoopCount(nextLoop);
          setFeedPosts((prev) => [...prev, ...appendFeedCopies(sourcePosts, `loop-${nextLoop}`)]);
        }
      },
      { rootMargin: '500px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMorePages, loading, loadingMore, page, sourcePosts, loopCount]);

  const handleCreatePost = async (payload) => {
    try {
      setCreating(true);
      const created = await forumAPI.create(payload);
      setSourcePosts((prev) => [created, ...prev]);
      setFeedPosts((prev) => [{ ...created, _feedKey: `${created.id}-new` }, ...prev]);
      setMyPosts((prev) => [created, ...prev]);
      toast.success('Post published.');
      return created;
    } catch (error) {
      toast.error(error.response?.data?.rich_content?.[0] || error.response?.data?.content?.[0] || 'Failed to create post.');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (postId, payload) => {
    try {
      const updated = await forumAPI.update(postId, payload);
      updatePostEverywhere(postId, () => updated);
      toast.success('Post updated.');
      return updated;
    } catch (error) {
      toast.error(error.response?.data?.rich_content?.[0] || error.response?.data?.content?.[0] || 'Failed to update post.');
      return null;
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await forumAPI.delete(postId);
      removePostEverywhere(postId);
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete post.');
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const result = await forumAPI.toggleLike(postId);
      updatePostEverywhere(postId, (post) => ({
        ...post,
        liked_by_me: result.liked,
        likes_count: result.likes_count,
      }));
    } catch {
      toast.error('Failed to update like.');
    }
  };

  const handleCommentAdded = (postId, comment) => {
    updatePostEverywhere(postId, (post) => ({
      ...post,
      comments_count: (post.comments_count || 0) + 1,
      recent_comments: [...(post.recent_comments || []), comment].slice(-3),
    }));
  };

  const handleEditRequest = (postId) => {
    setEditingPostId(postId);
    const node = document.getElementById(`post-${postId}`);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const feedItems = useMemo(() => {
    const items = [];
    let adIndex = 0;

    feedPosts.forEach((post, index) => {
      items.push({ kind: 'post', post });
      if ((index + 1) % 4 === 0 && ads.length) {
        items.push({ kind: 'ad', ad: ads[adIndex % ads.length], key: `ad-${index}-${adIndex}` });
        adIndex += 1;
      }
    });

    return items;
  }, [feedPosts, ads]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              Community Forum
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Discuss, share, and learn in public.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Logged in users can post, edit their own posts, like, and comment. Anyone can browse and share posts.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-28">
        {activeView === 'timeline' ? (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="flex items-center justify-center gap-3 p-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading forum feed...
                </CardContent>
              </Card>
            ) : feedError ? (
              <Card className="border-red-200 bg-white shadow-sm">
                <CardContent className="space-y-4 p-10 text-center">
                  <p className="text-sm text-red-700">{feedError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setHasMorePages(true);
                      setPage(1);
                      setLoopCount(0);
                      fetchPage(1, true);
                    }}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : feedItems.length ? (
              <div className="space-y-5">
                {feedItems.map((item, index) => (
                  item.kind === 'post' ? (
                    <ForumPostCard
                      key={item.post._feedKey || `${item.post.id}-${index}`}
                      post={item.post}
                      isAuthenticated={isAuthenticated}
                      onRequireAuth={requireAuth}
                      onToggleLike={handleToggleLike}
                      onCommentAdded={handleCommentAdded}
                      onSaveEdit={handleSaveEdit}
                      onDeletePost={handleDeletePost}
                      startEditing={editingPostId === item.post.id}
                      onEditingHandled={() => setEditingPostId(null)}
                    />
                  ) : (
                    <ForumAdCard key={item.key} ad={item.ad} />
                  )
                ))}

                <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-slate-500">
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more posts...
                    </span>
                  ) : hasMorePages ? (
                    'Scroll for more posts'
                  ) : sourcePosts.length ? (
                    <span className="inline-flex items-center gap-2">
                      <Repeat2 className="h-4 w-4" />
                      Replaying posts from the top
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-10 text-center text-slate-500">
                  No posts yet. Be the first to start the discussion.
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <ForumProfileSection
              user={user}
              isAuthenticated={isAuthenticated}
              onRequireAuth={requireAuth}
              myPosts={myPosts}
              loadingMyPosts={loadingMyPosts}
              onEditRequest={handleEditRequest}
              onDeletePost={handleDeletePost}
            />

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Forum guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
                <p>Share useful questions, study wins, project updates, and thoughtful advice.</p>
                <p>Use the like button to boost helpful posts. Open comments to continue the discussion.</p>
                <p>Admins can remove any post. Users can update or delete their own posts.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            className={`h-11 rounded-full ${activeView === 'timeline' ? 'bg-black text-white hover:bg-black/90 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveView('timeline')}
          >
            <Repeat2 className="h-4 w-4" />
            Timeline
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-full bg-slate-700 text-white hover:bg-slate-600 hover:text-white"
            onClick={() => {
              if (!isAuthenticated) {
                requireAuth();
                return;
              }
              setPostSheetOpen(true);
            }}
          >
            <PlusSquare className="h-4 w-4" />
            Post
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`h-11 rounded-full ${activeView === 'profile' ? 'bg-black text-white hover:bg-black/90 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveView('profile')}
          >
            <CircleUserRound className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </div>

      <ForumComposerSheet
        open={postSheetOpen}
        onOpenChange={setPostSheetOpen}
        isAuthenticated={isAuthenticated}
        onRequireAuth={requireAuth}
        onCreate={handleCreatePost}
        submitting={creating}
      />
    </div>
  );
}
