"use client";

import { AppSidebar } from "@//components/app-sidebar";
import Header from "@/components/Header";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";
import { ThemeProvider } from "@/components/theme-provider"

export default function AdminRootLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter(Boolean);

    return pathSegments.map((segment, index) => {
      const href = `/${pathSegments.slice(0, index + 1).join("/")}`;

      // Format the title: "create-booking" -> "Create Booking"
      const title = segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

      const isLast = index === pathSegments.length - 1;

      return (
        <React.Fragment key={href}>
          <BreadcrumbItem className={isLast ? "" : "hidden md:block"}>
            {isLast ? <BreadcrumbPage>{title}</BreadcrumbPage> : <BreadcrumbLink href={href}>{title}</BreadcrumbLink>}
          </BreadcrumbItem>
          {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
        </React.Fragment>
      );
    });
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen bg-slate-100">
        <Header />
        <div className="min-h-[calc(100svh-4rem)]">
          <SidebarProvider>
            <AppSidebar variant="inset" className="top-16 h-[calc(100svh-4rem)]" />
            <SidebarInset className="min-h-[calc(100svh-4rem)] bg-transparent">
              <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 shadow-sm backdrop-blur md:px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
                <Breadcrumb>
                  <BreadcrumbList>{generateBreadcrumbs()}</BreadcrumbList>
                </Breadcrumb>
              </header>
              <div className="flex flex-1 flex-col p-3 md:p-4">
                <div className="min-h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                  {children}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </ThemeProvider>
  );
}
