'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Send, PenSquare, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch Scheduled Count
      fetch(`http://localhost:3001/api/emails/scheduled/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setScheduledCount(data.length);
        }).catch(() => {});
        
      // Fetch Sent Count
      fetch(`http://localhost:3001/api/emails/sent/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setSentCount(data.length);
        }).catch(() => {});
    }
  }, [session]);

  return (
    <div className="w-[260px] h-screen bg-[#FDFDFD] border-r border-gray-200 flex flex-col p-4">
      {/* Logo Placeholder */}
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold">R</div>
        <span className="font-bold text-xl tracking-tight">ReachInbox</span>
      </div>

      {/* User Dropdown */}
      <div className="relative mb-6">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <div className="flex items-center gap-3">
            <img 
              src={session?.user?.image || "https://ui-avatars.com/api/?name=User"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full"
            />
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold truncate w-[140px]">
                {session?.user?.name || "Oliver Brown"}
              </span>
              <span className="text-xs text-gray-500 truncate w-[140px]">
                {session?.user?.email || "oliver.brown@domain.io"}
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
        
        {dropdownOpen && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden z-10">
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <Link 
        href="/dashboard/compose"
        className="w-full bg-green-50 text-green-700 border border-green-200 font-medium py-2.5 rounded-md flex items-center justify-center gap-2 mb-8 hover:bg-green-100 transition-colors"
      >
        Compose
      </Link>

      {/* Nav Links */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-400 px-2 mb-2">CORE</span>
        
        <Link 
          href="/dashboard"
          className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
            pathname === '/dashboard' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Scheduled</span>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{scheduledCount}</span>
        </Link>
        
        <Link 
          href="/dashboard/sent"
          className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
            pathname === '/dashboard/sent' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">Sent</span>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sentCount}</span>
        </Link>
      </div>
    </div>
  );
}
