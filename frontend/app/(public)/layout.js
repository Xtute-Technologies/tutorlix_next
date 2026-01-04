'use client';

import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-gray-50 ${inter.className}`}>
      {/* Header/Navbar */}


      {/* Main Content */}
      <main>{children}</main>

   
    </div>
  );
}
