'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, RotateCw, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      fetchEmails();
    }
  }, [session]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/emails/scheduled/${session?.user?.id}`);
      const data = await res.json();
      setEmails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return fetchEmails();
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/emails/search?q=${search}&userId=${session?.user?.id}`);
      const data = await res.json();
      setEmails(data.filter((e: any) => e.status === 'PENDING'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <form onSubmit={handleSearch} className="relative w-full max-w-xl flex items-center">
          <Search className="w-5 h-5 text-gray-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </form>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
            <Filter className="w-5 h-5" />
          </button>
          <button onClick={fetchEmails} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RotateCw className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-gray-500">
            <p>No scheduled emails found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email: any) => (
              <Link key={email.id} href={`/dashboard/email/${email.id}`} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:shadow-sm hover:bg-gray-50 transition-all block cursor-pointer">
                <div className="flex flex-col gap-1 w-1/3">
                  <span className="text-sm font-semibold text-gray-900">To: {email.to}</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-sm text-gray-700 truncate">{email.subject}</span>
                </div>
                <div className="flex items-center gap-4 w-1/4 justify-end">
                  <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {format(new Date(email.scheduledAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
