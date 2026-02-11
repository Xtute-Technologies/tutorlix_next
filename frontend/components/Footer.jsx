"use client";

import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";

// Fixed X (Twitter) Icon Component
const XIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 16 16"
    className={className} // Accepts tailwind classes from parent
  >
    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { label: "Terms and Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cancellation Policy", href: "/cancellation" },
    { label: "Shipping Policy", href: "/shipping" },
    // { label: "Sitemaps", href: "/sitemap" },
  ];

  // Updated with correct URLs and Handles
  const socialLinks = [
    {
      icon: Facebook,
      href: "https://www.facebook.com/profile.php?id=100093690186104",
      label: "Facebook",
      handle: "Tutorlix", // Facebook uses ID, so we use the Brand Name
    },
    {
      icon: XIcon,
      href: "https://x.com/tutorlix",
      label: "X (Twitter)",
      handle: "@tutorlix",
    },
    {
      icon: Instagram,
      href: "https://www.instagram.com/tutorlix",
      label: "Instagram",
      handle: "@tutorlix",
    },
    {
      icon: Youtube,
      href: "https://youtube.com/@datastructurebytutorlix",
      label: "YouTube",
      handle: "@datastructurebytutorlix",
    },
  ];

  return (
    <footer className="bg-black text-neutral-400 pt-20 pb-10 border-t border-neutral-900 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* CSS for Shimmer Effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
        .text-shimmer {
          background: linear-gradient(
            120deg,
            #1a1a1a 40%,
            #404040 50%,
            #1a1a1a 60%
          );
          background-size: 200% auto;
          color: #1a1a1a;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 8s linear infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        {/* --- TOP: LOGO ONLY --- */}
        <div className="mb-16">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="flex items-center justify-center text-white group-hover:bg-primary transition-colors">
              <img
                src={"/logo.png"}
                alt="Tutorlix Logo"
                className="h-16 w-full rounded-full bg-white pr-2 pl-1 object-contain"
              />
            </div>
            <span className="sr-only">Tutorlix</span>
          </Link>
        </div>

        {/* --- MIDDLE: GRID CONTENT --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 mb-24">
          {/* Description */}
          <div className="md:col-span-5 lg:col-span-6 space-y-6">
            <h3 className="text-white font-medium tracking-wide text-sm uppercase opacity-80">
              About
            </h3>
            <p className="text-sm leading-7 text-neutral-500 max-w-md hover:text-neutral-300 transition-colors duration-500">
              Discover a world of opportunities with our Maths and Computer
              Science learning platform. Get hands-on experience with
              interactive lessons, challenges and projects.
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="text-white font-medium tracking-wide text-sm uppercase opacity-80 mb-6">
              Legal
            </h3>
            <ul className="space-y-4">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 hover:text-white transition-all duration-300 block w-fit"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="text-white font-medium tracking-wide text-sm uppercase opacity-80 mb-6">
              Connect
            </h3>
            <div className="flex flex-col space-y-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-sm text-neutral-500 hover:text-white transition-colors duration-300 w-fit"
                  aria-label={`Follow us on ${social.label}`}
                >
                  <span className="group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    <social.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{social.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* --- COPYRIGHT LINE --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-700 font-medium border-t border-neutral-900 pt-8 mb-12">
          <p>&copy; {currentYear} XTUTE TECHNOLOGIES PVT LTD.</p>
          <p>All Rights Reserved.</p>
        </div>
      </div>

      {/* --- BOTTOM: GIANT SHIMMER TEXT --- */}
      <div className="w-full overflow-hidden select-none pointer-events-none opacity-80">
        <h1 className="text-[13vw] leading-[0.8] font-black tracking-tighter text-center text-shimmer">
          TUTORLIX
        </h1>
      </div>
    </footer>
  );
}