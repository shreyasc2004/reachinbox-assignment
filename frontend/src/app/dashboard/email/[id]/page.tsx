'use client';

import { useEffect, useState, use } from 'react';
import { ArrowLeft, Star, Archive, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';

export default function EmailViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [email, setEmail] = useState<any>(null);

  useEffect(() => {
    // Fetch email by ID from backend
    fetch(`http://localhost:3001/api/emails/${id}`)
      .then(res => res.json())
      .then(data => setEmail(data))
      .catch(e => console.error(e));
  }, [id]);

  if (!email) return <div className="p-8 text-gray-500">Loading email...</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl text-gray-800 font-medium truncate max-w-2xl">
            {email.subject}
          </h1>
        </div>
        
        <div className="flex items-center gap-4 text-gray-400">
          <button className="hover:text-gray-600 transition-colors"><Star className="w-4 h-4" /></button>
          <button className="hover:text-gray-600 transition-colors"><Archive className="w-4 h-4" /></button>
          <button className="hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          <img src={session?.user?.image || "https://ui-avatars.com/api/?name=User"} className="w-6 h-6 rounded-full ml-2" alt="avatar" />
        </div>
      </div>

      {/* Email Content */}
      <div className="p-8 max-w-4xl">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              {email.to.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{email.to.split('@')[0]}</span>
                <span className="text-sm text-gray-500">&lt;{email.to}&gt;</span>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                to me <span className="text-[10px]">▼</span>
              </span>
            </div>
          </div>
          
          <span className="text-xs text-gray-400 font-medium">
            {email.sentAt ? format(new Date(email.sentAt), 'MMM d, h:mm a') : format(new Date(email.scheduledAt), 'MMM d, h:mm a')}
          </span>
        </div>

        {/* Body Text */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4">
          <div className="whitespace-pre-wrap">{email.body}</div>
          
          {/* Optional: Render a mock special callout block if it matches the text from the screenshot for fidelity */}
          {email.body.includes('Exclusive') && (
            <div className="bg-[#FFFDF4] border-l-2 border-yellow-400 p-4 rounded-r-md my-6">
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </p>
              <p className="text-gray-600 mt-2">
                To explore securing your private transformation, simply reply right now with <span className="font-bold">"FLY OUT FIX"</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
