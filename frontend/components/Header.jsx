"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, LayoutDashboard, BookOpen, Menu, Sparkles, Lightbulb } from "lucide-react";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const userInitials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || user.username?.[0] || "U"}`.toUpperCase() : "G";

  const isActive = (path) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home", public: true },
    { href: "/courses", label: "Courses", public: true },
    { href: "/dashboard", label: "Dashboard", auth: true },
    { href: "/contact", label: "Contact", public: true },
  ];

  // Role-based navigation
  const roleBasedLinks = {
    admin: [{ href: "/admin", label: "Admin", icon: Settings }],
    teacher: [{ href: "/my-classes", label: "Classes", icon: BookOpen }],
    seller: [{ href: "/my-products", label: "Products", icon: BookOpen }],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-900/10 bg-white/95 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* --- LOGO --- */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-900 text-white group-hover:bg-primary transition-colors">
            <Lightbulb className="h-4 w-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Tutorlix</span>
        </Link>

        {/* --- DESKTOP NAVIGATION --- */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            if (link.public || (link.auth && user)) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-slate-900 ${
                    isActive(link.href) ? "text-slate-900 font-semibold" : "text-slate-600"
                  }`}>
                  {link.label}
                </Link>
              );
            }
            return null;
          })}

          {/* Role Links integrated cleanly */}
          {user &&
            roleBasedLinks[user.role]?.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-slate-900 ${
                  isActive(link.href) ? "text-slate-900 font-semibold" : "text-slate-500"
                }`}>
                {link.label}
              </Link>
            ))}
        </nav>

        {/* --- RIGHT ACTION AREA --- */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100"></div>
          ) : user ? (
            <>
              {/* Minimal User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-slate-100 transition-all p-0">
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarImage src={user.profile_image} alt={user.username} className="object-cover" />
                      <AvatarFallback className="bg-slate-50 text-slate-600 text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-slate-900">
                        {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                      </p>
                      <p className="text-xs leading-none text-slate-500">{user.email}</p>
                      {/* Role Badge moved here for cleanliness */}
                      <div className="pt-2">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 capitalize">
                          {user.role} Account
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>

                  {user.role === "admin" && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin">
                        <Settings className="mr-2 h-4 w-4 text-slate-500" />
                        <span>Admin Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hidden sm:inline-flex" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6" asChild>
                <Link href="/register">Become a Seller</Link>
              </Button>
            </div>
          )}

          {/* --- MOBILE TOGGLE --- */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-slate-600">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              {navLinks.map((link) => {
                if (link.public || (link.auth && user)) {
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="cursor-pointer font-medium">
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                return null;
              })}
              {user &&
                roleBasedLinks[user.role]?.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer font-medium">
                      <link.icon className="mr-2 h-4 w-4 text-slate-500" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              {!user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login">Sign In</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/register">Get Started</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
