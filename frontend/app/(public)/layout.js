'use client';

import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-gray-50 ${inter.className}`}>
      {/* Header/Navbar */}
      <Header />

      {/* Main Content */}
      <main>{children}</main>
      <Footer />


    </div>
  );
}
