"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  Percent,
  ShoppingCart,
  GraduationCap,
  DollarSign,
  MessageSquare,
  Menu,
  X,
  Users,
  BookOpen,
  Video,
  CheckSquare,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Categories", href: "/admin/categories", icon: Tag },
  { name: "Offers", href: "/admin/offers", icon: Percent },
  { name: "Bookings", href: "/admin/bookings", icon: ShoppingCart },
  { name: "Student Classes", href: "/admin/classes-student", icon: Users },
  { name: "Course Classes", href: "/admin/classes-course", icon: BookOpen },
  { name: "Recordings", href: "/admin/recordings", icon: Video },
  { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
  { name: "Test Scores", href: "/admin/test-scores", icon: GraduationCap },
  { name: "Expenses", href: "/admin/expenses", icon: DollarSign },
  { name: "Messages", href: "/admin/messages", icon: MessageSquare },
];

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-1">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-background border-r 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b ">
            <Link href="/" className="flex items-center space-x-2">
              <div className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Tutorlix</div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-50"}
                      `}>
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          {/* <div className="border-t  p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user.first_name?.charAt(0) || user.username?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">Admin</p>
              </div>
            </div>
          </div> */}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
