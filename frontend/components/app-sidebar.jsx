"use client";

import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarRail } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { getNavItems } from "@/config/navigation";

export function AppSidebar({ ...props }) {
  const { user } = useAuth();

  const navItems = React.useMemo(() => {
    return getNavItems(user?.role);
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          size="lg"
          asChild
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground gap-0">
          <Link href="/">
            {/* Icon */}
            <div className="flex aspect-square data-[state=open]:size-11 size-8 mr-0 items-center justify-center rounded-lg text-sidebar-primary-foreground">
              <img src="/logosq.png" alt="Tutorlix Icon" className="size-full rounded-md object-cover" />
            </div>

            {/* Branding */}
            <div className="flex flex-1 items-center overflow-hidden">
              <img src="/logotxt.png" alt="Tutorlix" className="h-11 w-auto object-contain object-left" />
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
