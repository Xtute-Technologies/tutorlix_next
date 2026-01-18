"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  LayoutDashboard,
  Package,
  Tag,
  Percent,
  ShoppingCart,
  Users,
  Video,
  CheckSquare,
  GraduationCap,
  DollarSign,
  MessageSquare,
  DollarSignIcon,
  ChevronsUpDown,
  Lightbulb,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarRail } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { user } = useAuth();

  const navItems = React.useMemo(() => {
    // Seller Specific Navigation
    if (user?.role === "seller") {
      return [
        {
          title: "Seller Dashboard",
          url: "/admin/seller",
          icon: LayoutDashboard,
          isActive: true,
          items: [
            { title: "View Bookings", url: "/admin/seller/bookings" },
          ],
        },
      ];
    }

    // Admin Navigation
    if (user?.role === "admin") {
      return [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
          isActive: true,
          items: [{ title: "Overview", url: "/admin" }],
        },
        {
          title: "Management",
          url: "#",
          icon: Settings2,
          isActive: true,
          items: [
            { title: "Users", url: "/admin/users-management", icon: Users },
            { title: "Products", url: "/admin/products", icon: Package },
            { title: "Categories", url: "/admin/categories", icon: Tag },
            { title: "Offers", url: "/admin/offers", icon: Percent },
            { title: "Bookings", url: "/admin/bookings", icon: ShoppingCart },
          ],
        },
        {
          title: "Academic",
          url: "#",
          icon: BookOpen,
          isActive: true,
          items: [
            { title: "Student Classes", url: "/admin/classes-student", icon: Users },
            { title: "Course Classes", url: "/admin/classes-course", icon: BookOpen },
            { title: "Recordings", url: "/admin/recordings", icon: Video },
            { title: "Attendance", url: "/admin/attendance", icon: CheckSquare },
            { title: "Test Scores", url: "/admin/test-scores", icon: GraduationCap },
          ],
        },
        {
          title: "Finance",
          url: "#",
          icon: DollarSign,
          isActive: true,
          items: [
            { title: "Expenses", url: "/admin/expenses", icon: DollarSign },
            { title: "Seller Expenses", url: "/admin/seller-expenses", icon: DollarSign },
          ],
        },
        {
          title: "Communication",
          url: "#",
          icon: MessageSquare,
          isActive: true,
          items: [{ title: "Messages", url: "/admin/messages", icon: MessageSquare }],
        },
        {
          title: "Seller Dashboard",
          url: "/admin/seller/bookings",
          icon: LayoutDashboard,
          isActive: true,
          items: [{ title: "Bookings", url: "/admin/seller/bookings" }],
        },
      ];
    }

    // Default / fallback items
    return data.navMain;
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          <div className="font-black bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Lightbulb className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-lg leading-tight">
            <span className="truncate font-medium">Tutorlix</span>
            {/* <span className="truncate text-xs">by XDI</span> */}
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
