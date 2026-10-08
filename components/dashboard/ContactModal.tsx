'use client';

import React, { useState } from 'react';
import { X, Mail, Copy, Check, ExternalLink, Shield } from 'lucide-react';
import Link from 'next/link';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'support@crackrr.app';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0C0E14] p-6 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Contact Crackrr Support
              </h2>
              <p className="text-xs text-zinc-400">Reach our team directly</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close Contact Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Method Card */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Support & Feedback Email</span>
              <span className="text-[10px] text-emerald-400 font-medium">Official Channel</span>
            </div>

            <div className="flex items-center justify-between bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2">
              <span className="font-mono text-xs text-white selection:bg-[#FF9D50]/30 selection:text-white">
                {supportEmail}
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-[#FF9D50] hover:text-[#FFAA66] font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold tracking-wide transition-all shadow-sm active:scale-[0.99]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Open in Email Client</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Legal & Privacy Links */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs text-zinc-400">
            <Link
              href="/terms"
              onClick={onClose}
              className="hover:text-white hover:underline transition-colors"
            >
              Terms of Service
            </Link>
            <span>·</span>
            <Link
              href="/privacy"
              onClick={onClose}
              className="hover:text-white hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
