"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { forumNotificationAPI } from "@/lib/lmsService";

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const [listData, unreadData] = await Promise.all([
        forumNotificationAPI.list({ page_size: 10 }),
        forumNotificationAPI.unreadCount(),
      ]);
      setItems(listData.results || listData || []);
      setUnreadCount(unreadData.unread_count || 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  const markAllRead = async () => {
    if (!unreadCount) return;
    try {
      await forumNotificationAPI.markAllRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch {
      // no-op
    }
  };

  const markRead = async (notificationId) => {
    try {
      await forumNotificationAPI.markRead(notificationId);
      setItems((prev) => prev.map((item) => (
        item.id === notificationId ? { ...item, is_read: true } : item
      )));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // no-op
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          markAllRead();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative size-10 rounded-full border transition-colors ${
            unreadCount > 0
              ? "border-amber-300 bg-amber-50 text-slate-900 shadow-sm hover:bg-amber-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Bell className="h-5 w-5 stroke-[2.6]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mt-2 w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 ? <span className="text-xs text-slate-500">{unreadCount} unread</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : items.length ? (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              asChild
              className={`cursor-pointer items-start ${item.is_read ? "" : "bg-slate-50"}`}
            >
              <Link href={item.post_url || "/forum"} onClick={() => markRead(item.id)} className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-slate-900">{item.message}</span>
                <span className="text-xs text-slate-500">{formatTimestamp(item.created_at)}</span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-slate-500">No notifications yet.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
