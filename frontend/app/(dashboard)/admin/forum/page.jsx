'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import DataTable, { SortableHeader } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authService } from '@/lib/authService';
import { forumAPI } from '@/lib/lmsService';

export default function AdminForumPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningPostId, setActioningPostId] = useState(null);
  const [actioningUserId, setActioningUserId] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await forumAPI.list({ page_size: 1000 });
      setPosts(response.results || response || []);
    } catch (error) {
      setPosts([]);
      toast.error('Failed to load forum posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this forum post?')) return;

    try {
      setActioningPostId(postId);
      await forumAPI.delete(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      toast.success('Forum post deleted.');
    } catch (error) {
      toast.error('Failed to delete forum post.');
    } finally {
      setActioningPostId(null);
    }
  };

  const handleTogglePostingBlock = async (post) => {
    const author = post.author;
    if (!author?.id) return;

    try {
      setActioningUserId(author.id);
      const updatedUser = await authService.updateUser(author.id, {
        forum_posting_blocked: !author.forum_posting_blocked,
      });

      setPosts((prev) => prev.map((item) => (
        item.author?.id === author.id
          ? {
              ...item,
              author: {
                ...item.author,
                forum_posting_blocked: updatedUser.forum_posting_blocked,
              },
            }
          : item
      )));

      toast.success(updatedUser.forum_posting_blocked ? 'User blocked from posting.' : 'User posting restored.');
    } catch (error) {
      toast.error('Failed to update user posting permission.');
    } finally {
      setActioningUserId(null);
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column}>Post</SortableHeader>,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{row.original.title || 'Untitled post'}</p>
          <p className="line-clamp-2 max-w-xl text-sm text-slate-500">{row.original.preview_text || row.original.content || ''}</p>
        </div>
      ),
    },
    {
      accessorKey: 'author.full_name',
      header: ({ column }) => <SortableHeader column={column}>Posted By</SortableHeader>,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{row.original.author?.full_name || 'Unknown user'}</p>
          <div className="flex flex-wrap gap-2">
            {row.original.author?.forum_posting_blocked ? (
              <Badge variant="destructive">Posting blocked</Badge>
            ) : (
              <Badge variant="secondary">Posting allowed</Badge>
            )}
            {!row.original.is_active ? <Badge variant="outline">Deleted</Badge> : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {new Date(row.original.created_at).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      id: 'stats',
      header: 'Engagement',
      cell: ({ row }) => (
        <div className="flex gap-3 text-sm text-slate-600">
          <span>{row.original.likes_count || 0} likes</span>
          <span>{row.original.comments_count || 0} comments</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const post = row.original;
        const postingBlocked = !!post.author?.forum_posting_blocked;
        const isDeleting = actioningPostId === post.id;
        const isTogglingUser = actioningUserId === post.author?.id;

        return (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!post.author?.id || isTogglingUser}
              onClick={() => setConfirmUser(post)}
            >
              {postingBlocked ? 'Unblock User' : 'Block User'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isDeleting || !post.is_active}
              onClick={() => handleDeletePost(post.id)}
            >
              Delete Post
            </Button>
          </div>
        );
      },
    },
  ], [actioningPostId, actioningUserId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Forum Moderation</h1>
        <p className="mt-1 text-slate-600">Review all forum posts, remove posts, and block or unblock users from posting.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Forum Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading forum posts...</div>
          ) : (
            <DataTable
              columns={columns}
              data={posts}
              searchPlaceholder="Search posts, authors, or content..."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmUser} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmUser?.author?.forum_posting_blocked ? 'Unblock user?' : 'Block user?'}
            </DialogTitle>
            <DialogDescription>
              {confirmUser?.author?.forum_posting_blocked
                ? `Are you sure you want to allow ${confirmUser?.author?.full_name || 'this user'} to post in the forum again?`
                : `Are you sure you want to block ${confirmUser?.author?.full_name || 'this user'} from posting in the forum?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmUser(null)}>
              No
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const target = confirmUser;
                setConfirmUser(null);
                if (target) {
                  await handleTogglePostingBlock(target);
                }
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
