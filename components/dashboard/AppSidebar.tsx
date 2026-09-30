'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings,
  User,
} from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
        isActive
          ? 'bg-[#FF9D50]/10 text-[#FF9D50] font-semibold'
          : 'text-zinc-400 hover:text-[#FFF9D8] hover:bg-white/[0.04]'
      }`}
    >
      <Icon
        className={`w-4 h-4 transition-colors ${
          isActive ? 'text-[#FF9D50]' : 'text-zinc-400 group-hover:text-[#FFF9D8]'
        }`}
      />
      <span>{label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  const mainNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/practice', label: 'Practice', icon: BookOpen },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
  ];

  const secondaryNav = [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar (Sticky, Full Height) */}
      <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-[#0C0E14] border-r border-white/[0.08] p-5 justify-between select-none z-40">
        <div className="space-y-8">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1 group">
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-[#FF9D50] transition-colors">
              crackr<span className="text-[#FF9D50]">•</span>
            </span>
          </Link>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Main
            </div>
            {mainNav.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div className="space-y-4 pt-6 border-t border-white/[0.08]">
          <nav className="space-y-1">
            {secondaryNav.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 inset-x-0 bg-[#0C0E14]/95 backdrop-blur-lg border-t border-white/[0.08] px-4 py-2 z-50 flex items-center justify-around">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#FF9D50] font-semibold' : 'text-zinc-400 hover:text-[#FFF9D8]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF9D50]' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/profile' ? 'text-[#FF9D50] font-semibold' : 'text-zinc-400 hover:text-[#FFF9D8]'
          }`}
        >
          <User className={`w-4 h-4 ${pathname === '/profile' ? 'text-[#FF9D50]' : 'text-zinc-400'}`} />
          <span>Profile</span>
        </Link>
      </nav>
    </>
  );
}
