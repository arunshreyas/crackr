'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Award,
  Settings,
  Flame,
  HelpCircle,
  Mail,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { HelpModal } from './HelpModal';
import { ContactModal } from './ContactModal';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string;
}

function NavItem({ href, label, icon: Icon, isActive, onClick, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
        isActive
          ? 'bg-[#FF9D50]/10 text-[#FF9D50] font-semibold border border-[#FF9D50]/20'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-4 h-4 transition-colors ${
            isActive ? 'text-[#FF9D50]' : 'text-zinc-400 group-hover:text-zinc-200'
          }`}
        />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#FF9D50]/10 text-[#FF9D50] border border-[#FF9D50]/20">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Close drawer automatically on navigation change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const mainNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/practice', label: 'Practice', icon: BookOpen },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
    { href: '/profile', label: 'Ranks & Levels', icon: Award },
  ];

  const progressNav = [
    { href: '/progress', label: 'Streak', icon: Flame },
  ];

  return (
    <>
      {/* 1. Desktop Sidebar (Sticky, Full Height) */}
      <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-[#0C0E14] border-r border-white/[0.08] p-5 justify-between select-none z-40">
        <div className="space-y-8">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1 group">
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#FF9D50] transition-colors">
              crackrr<span className="text-[#FF9D50]">•</span>
            </span>
          </Link>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
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

          {/* Progress Section */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Progress
            </div>
            {progressNav.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href && item.label !== 'Streak'}
              />
            ))}
          </nav>
        </div>

        {/* Support & Settings */}
        <div className="space-y-3 pt-6 border-t border-white/[0.08]">
          <div className="px-3 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Support
          </div>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>Help</span>
          </button>
          <button
            onClick={() => setIsContactOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all"
          >
            <Mail className="w-4 h-4 text-zinc-400" />
            <span>Contact Us</span>
          </button>

          <div className="pt-2 border-t border-white/[0.06]">
            <NavItem
              href="/settings"
              label="Settings"
              icon={Settings}
              isActive={pathname === '/settings'}
            />
          </div>
        </div>
      </aside>

      {/* 2. Mobile Top Navigation Header with Hamburger on the LEFT */}
      <header className="md:hidden sticky top-0 inset-x-0 h-14 bg-[#0C0E14]/90 backdrop-blur-md border-b border-white/[0.08] px-4 flex items-center justify-between z-40">
        {/* Left: Hamburger Menu Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 -ml-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Crackrr Logo */}
        <Link href="/dashboard" className="flex items-center gap-1">
          <span className="font-bold text-base tracking-tight text-white">
            crackrr<span className="text-[#FF9D50]">•</span>
          </span>
        </Link>

        {/* Right: Quick Practice Action */}
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-[11px] font-bold tracking-wide transition-all shadow-sm active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Practice</span>
        </Link>
      </header>

      {/* 3. Mobile Left Navigation Drawer (Slides from the LEFT) */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container (Sliding in from Left) */}
          <div className="relative w-[280px] max-w-[82vw] h-full bg-[#0C0E14] border-r border-white/[0.1] p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            <div className="space-y-6 overflow-y-auto">
              {/* Drawer Top Header with Logo and Close button */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-1"
                >
                  <span className="font-bold text-lg tracking-tight text-white">
                    crackrr<span className="text-[#FF9D50]">•</span>
                  </span>
                </Link>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Sections */}
              <div className="space-y-5">
                {/* MAIN */}
                <div className="space-y-1">
                  <div className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Main
                  </div>
                  {mainNav.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={pathname === item.href}
                      onClick={() => setIsDrawerOpen(false)}
                    />
                  ))}
                </div>

                {/* PROGRESS */}
                <div className="space-y-1">
                  <div className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Progress
                  </div>
                  {progressNav.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={pathname === item.href && item.label !== 'Streak'}
                      onClick={() => setIsDrawerOpen(false)}
                    />
                  ))}
                </div>

                {/* SUPPORT */}
                <div className="space-y-1">
                  <div className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Support
                  </div>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsHelpOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                    <span>Help</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsContactOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all text-left"
                  >
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span>Contact Us</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer: Settings */}
            <div className="pt-4 border-t border-white/[0.08]">
              <NavItem
                href="/settings"
                label="Settings"
                icon={Settings}
                isActive={pathname === '/settings'}
                onClick={() => setIsDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Mobile Bottom Navigation Bar (4 clean quick-switch tabs) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 bg-[#0C0E14]/95 backdrop-blur-lg border-t border-white/[0.08] px-4 py-2 z-40 flex items-center justify-around"
      >
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#FF9D50] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF9D50]' : 'text-zinc-400'}`} />
              <span>{item.label === 'Ranks & Levels' ? 'Ranks' : item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
