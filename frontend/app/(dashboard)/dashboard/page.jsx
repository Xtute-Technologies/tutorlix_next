"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; // Ensure you have this hook
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2, Smile } from "lucide-react";

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // 1. Redirect logic for Admin/Seller
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "seller") {
        router.push("/seller");
      }
      if (user.role === "student") {
        router.push("/student");
      }
      if (user.role === "teacher") {
        router.push("/teacher");
      }
      // Students stay here, so no redirect for them
    } else if (!loading && !user) {
      // Optional: Redirect to login if not authenticated
      router.push("/login");
    }
  }, [user, loading, router]);

  // 2. Show Loading State while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 3. Return null if redirecting (prevents flash of content)
  if (user?.role === "admin" || user?.role === "seller") {
    return null;
  }

  // 4. Render "Coming Soon" for Students
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <Smile className="h-10 w-10 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}</h1>
         {/* <p className="text-lg text-gray-600">Your student dashboard is coming soon.</p> */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mt-6 bg-white">
          <p className="text-sm text-gray-500"> 
            You are currently logged in. Feel free to explore your profile or settings if available. We are building great features for your
            learning journey!
          </p>
        </div>
      </div>
    </div>
  );
}
