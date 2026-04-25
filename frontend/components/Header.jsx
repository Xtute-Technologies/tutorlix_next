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
import { User, LogOut, Settings, LayoutDashboard, BookOpen, Menu, Repeat, LogIn, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ProfileTypeModal from "@/components/ProfileTypeModal";
import { useProfile } from "@/context/ProfileContext";
import NotificationBell from "@/components/NotificationBell";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openTutorialGroup, setOpenTutorialGroup] = useState(null);
  const { updateProfile, profileType, profileTypes, activeHomeContent, loading: profileLoading } = useProfile();

  useEffect(() => {
    const profile = localStorage.getItem("tutorlix_profile");
    if (!profile && !profileLoading && profileTypes.length > 0) {
      setShowProfileModal(true);
    }
  }, [profileLoading, profileTypes]);

  const handleProfileSelect = (type) => {
    updateProfile(type);
    setShowProfileModal(false);
  };

  const openProfileModalFromMobile = () => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => {
      setShowProfileModal(true);
    });
  };

  const userInitials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || user.username?.[0] || "U"}`.toUpperCase() : "G";

  const isActive = (path) => pathname === path;
  const navigationContent = activeHomeContent?.navigation || {};
  const tutorialTopics = Array.isArray(activeHomeContent?.tutorials) ? activeHomeContent.tutorials : [];
  const configuredSubnavGroups = Array.isArray(navigationContent?.subnav_groups) ? navigationContent.subnav_groups : [];
  const subnavRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const questionBanksLink = {
    href: navigationContent.question_banks_url || "/question-banks",
    label: navigationContent.question_banks_label || "Question Banks",
  };
  const fallbackPrimaryLinks = [
    { label: "Home", url: "/", visibility: "public" },
    { label: "Live Classes", url: "/courses", visibility: "public" },
    { label: questionBanksLink.label, url: questionBanksLink.href, visibility: "public" },
    { label: "Notes", url: "/notes", visibility: "public" },
    { label: "Forum", url: "/forum", visibility: "public" },
    { label: "Masterclass", url: "/masterclass", visibility: "public" },
    { label: "Contact", url: "/contact", visibility: "public" },
  ];

  const navLinks = useMemo(() => {
    const links = Array.isArray(navigationContent.primary_links) && navigationContent.primary_links.length > 0
      ? navigationContent.primary_links
      : fallbackPrimaryLinks;

    const visibleLinks = links.filter((link) => {
      const visibility = link.visibility || "public";
      if (visibility === "auth") return !!user;
      if (visibility === "both") return true;
      return true;
    });
    if (!visibleLinks.some((link) => link.url === "/forum")) {
      visibleLinks.splice(Math.min(visibleLinks.length, 4), 0, { label: "Forum", url: "/forum", visibility: "public" });
    }
    return visibleLinks;
  }, [navigationContent.primary_links, fallbackPrimaryLinks, user]);

  const studyMaterialsLinks = useMemo(() => {
    const findByUrl = (url, fallbackLabel) => navLinks.find((link) => link.url === url) || { label: fallbackLabel, url };

    return [
      findByUrl("/courses", "Live Classes"),
      findByUrl(questionBanksLink.href, questionBanksLink.label),
      findByUrl("/notes", "Notes"),
    ];
  }, [navLinks, questionBanksLink.href, questionBanksLink.label]);

  const topLevelNavLinks = useMemo(() => {
    const excludedUrls = new Set(studyMaterialsLinks.map((link) => link.url));
    const filtered = navLinks.filter((link) => !excludedUrls.has(link.url));
    const homeIndex = filtered.findIndex((link) => link.url === "/");
    const insertAt = homeIndex >= 0 ? homeIndex + 1 : 0;
    filtered.splice(insertAt, 0, { label: "Study Materials", url: null, type: "study-materials" });
    return filtered;
  }, [navLinks, studyMaterialsLinks]);

  const subnavGroups = useMemo(() => {
    if (configuredSubnavGroups.length > 0) {
      return configuredSubnavGroups
        .map((group) => ({
          label: group?.label || "",
          items: Array.isArray(group?.items) ? group.items.filter((item) => item?.label && item?.url) : [],
        }))
        .filter((group) => group.label && group.items.length > 0);
    }

    return tutorialTopics
      .map((topic) => {
        const pages = Array.isArray(topic.pages) ? topic.pages : topic?.slug ? [topic] : [];
        return {
          label: topic.title,
          items: pages
            .filter((page) => page?.title && page?.slug)
            .map((page) => ({
              label: page.title,
              url: `/tutorial/${topic.slug}/${page.slug}`,
            })),
        };
      })
      .filter((group) => group.label && group.items.length > 0);
  }, [configuredSubnavGroups, tutorialTopics]);

  const updateScrollState = () => {
    const el = subnavRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollState();
    const handleResize = () => updateScrollState();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [tutorialTopics, profileType, pathname]);

  useEffect(() => {
    setOpenTutorialGroup(null);
  }, [pathname]);

  const scrollSubnav = (direction) => {
    const el = subnavRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 260, behavior: "smooth" });
  };

  // Role-based navigation
  const roleBasedLinks = {
    admin: [{ href: "/admin", label: "Admin", icon: Settings }],
    teacher: [{ href: "/teacher", label: "Dashboard", icon: BookOpen }],
    seller: [{ href: "/", label: "Dashboard", icon: BookOpen }],
    student: [{ href: "/student", label: "Dashboard", icon: BookOpen }],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-900/10 bg-white/95 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* --- LOGO --- */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center text-white transition-colors">
            <img src={"/logo.png"} alt="Tutorlix Logo" className="h-12 w-full rounded-3xl pr-2 pl-1" />
          </div>
          <span className="sr-only">Tutorlix</span>
        </Link>

        {/* --- DESKTOP NAVIGATION --- */}
        <nav className="hidden md:flex items-center gap-8">
          {topLevelNavLinks.map((link) => {
            if (link.type === "study-materials") {
              const studyActive = studyMaterialsLinks.some((item) => pathname === item.url);
              return (
                <div key="study-materials-desktop" className="group relative">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-slate-900 ${studyActive ? "text-slate-900 font-semibold" : "text-slate-600"}`}
                  >
                    <span>Study Materials</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    {studyMaterialsLinks.map((item) => (
                      <Link
                        key={`${item.url}-${item.label}`}
                        href={item.url}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-slate-900 ${pathname === item.url ? "bg-slate-50 text-slate-900" : "text-slate-600"}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            if (link.url) {
              return (
                <Link
                  key={`${link.url}-${link.label}`}
                  href={link.url}
                  className={`text-sm font-medium transition-colors hover:text-slate-900 ${isActive(link.url) ? "text-slate-900 font-semibold" : "text-slate-600"
                    }`}>
                  {link.label}
                </Link>
              );
            }
            return null;
          })}
        </nav>

        {/* --- RIGHT ACTION AREA --- */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100"></div>
          ) : user ? (
            <>
              <NotificationBell />
              {/* Authenticated User Dropdown */}
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
            /* --- NON-AUTH BUTTONS (Desktop Only) --- */
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900"
                onClick={() => setShowProfileModal(true)}
              >
                <Repeat className="h-4 w-4 mr-1" />
                Switch Profile
              </Button>

              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" asChild>
                <Link href="/login">Login</Link>
              </Button>

              <Button
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 text-sm"
                asChild
              >
                <Link href="/register">Become a Seller</Link>
              </Button>
            </div>
          )}

          {/* --- MOBILE TOGGLE & MENU --- */}
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-slate-600">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 p-2">
              
              {/* Standard Nav Links */}
              {topLevelNavLinks.map((link) => {
                if (link.type === "study-materials") {
                  return (
                    <div key="study-materials-mobile">
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-2 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Study Materials
                      </DropdownMenuLabel>
                      {studyMaterialsLinks.map((item) => (
                        <DropdownMenuItem key={`${item.url}-${item.label}`} asChild>
                          <Link href={item.url} className="cursor-pointer font-medium">
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </div>
                  );
                }
                if (link.url) {
                  return (
                    <DropdownMenuItem key={`${link.url}-${link.label}`} asChild>
                      <Link href={link.url} className="cursor-pointer font-medium">
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                return null;
              })}

              {/* Role Based Links (Mobile) */}
              {user &&
                roleBasedLinks[user.role]?.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer font-medium">
                      <link.icon className="mr-2 h-4 w-4 text-slate-500" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}

              {/* Non-Auth Specific Links (Mobile Only) */}
              {!user && (
                <>
                  <DropdownMenuSeparator />
                  
                  {/* Switch Profile (Moved here for mobile) */}
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onSelect={(event) => {
                      event.preventDefault();
                      openProfileModalFromMobile();
                    }}
                  >
                    <Repeat className="mr-2 h-4 w-4 text-slate-500" />
                    <span>Switch Profile</span>
                  </DropdownMenuItem>

                   {/* Become a Seller (Moved here for mobile) */}
                   <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/register" className="text-slate-900 font-semibold">
                      {/* <House className="mr-2 h-4 w-4 text-amber-500" /> */}
                      <span>Become a Seller</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  {/* Login */}
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center w-full">
                       <LogIn className="mr-2 h-4 w-4 text-slate-500" />
                       Sign In
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {navigationContent.tutorials_enabled && subnavGroups.length > 0 && (
        <div className="border-t border-slate-200/80 bg-[#1d2a35] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => scrollSubnav(-1)}
                className={`absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-md bg-[#0f1720]/90 px-2 py-2 text-slate-200 shadow-lg md:block ${canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}
                aria-label="Scroll tutorials left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div
                ref={subnavRef}
                onScroll={updateScrollState}
                className="flex gap-1 overflow-x-auto overflow-y-visible scroll-smooth whitespace-nowrap scrollbar-none md:px-10"
              >
                {subnavGroups.map((group) => {
                  const active = group.items.some((item) => pathname === item.url);
                  const isOpen = openTutorialGroup === group.label;

                  return (
                    <DropdownMenu
                      key={group.label}
                      open={isOpen}
                      onOpenChange={(open) => setOpenTutorialGroup(open ? group.label : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onMouseEnter={() => setOpenTutorialGroup(group.label)}
                          onFocus={() => setOpenTutorialGroup(group.label)}
                          onClick={() => setOpenTutorialGroup((current) => (current === group.label ? null : group.label))}
                          className={`shrink-0 border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                            active || isOpen
                              ? "border-emerald-400 bg-[#263543] text-white"
                              : "border-transparent text-slate-200 hover:bg-[#263543] hover:text-white"
                          }`}
                          aria-expanded={isOpen}
                        >
                          <span className="inline-flex items-center gap-2">
                            {group.label}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="bottom"
                        sideOffset={10}
                        className="z-[120] w-72 rounded-xl border-slate-200 p-2 shadow-2xl"
                        onMouseEnter={() => setOpenTutorialGroup(group.label)}
                        onMouseLeave={() => setOpenTutorialGroup((current) => (current === group.label ? null : current))}
                        onCloseAutoFocus={(event) => event.preventDefault()}
                      >
                        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {group.label}
                        </DropdownMenuLabel>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <DropdownMenuItem key={`${group.label}-${item.url}`} asChild className="cursor-pointer p-0 focus:bg-transparent">
                              <Link
                                href={item.url}
                                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  pathname === item.url
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                                onMouseEnter={() => setOpenTutorialGroup(group.label)}
                                onClick={() => setOpenTutorialGroup(null)}
                              >
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollSubnav(1)}
                className={`absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-l-md bg-[#0f1720]/90 px-2 py-2 text-slate-200 shadow-lg md:block ${canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"}`}
                aria-label="Scroll tutorials right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ProfileTypeModal
        open={showProfileModal}
        onSelect={handleProfileSelect}
      />
    </header>
  );
}
