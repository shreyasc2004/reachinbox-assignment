'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Upload, Send as SendIcon } from 'lucide-react';
import Link from 'next/link';

export default function ComposePage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  
  // CSV Upload parsing logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
      if (emails) {
        setTo((prev) => prev ? prev + ', ' + emails.join(', ') : emails.join(', '));
        alert(`Found ${emails.length} emails!`);
      }
    };
    reader.readAsText(file);
  };

  const handleSchedule = async () => {
    if (!to || !subject || !body || !scheduledAt) return alert("Please fill all fields");
    
    setLoading(true);
    const emails = to.split(',').map(e => e.trim()).filter(e => e);
    
    try {
      // Schedule each email individually
      for (const email of emails) {
        await fetch('http://localhost:3001/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session?.user?.id,
            userEmail: session?.user?.email,
            userName: session?.user?.name,
            to: email,
            subject,
            body,
            scheduledAt
          })
        });
      }
      
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      alert("Failed to schedule");
    } finally {
      setLoading(false);
      setShowSchedulePopup(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Compose New Email</h1>
        </div>
        
        <button 
          onClick={() => setShowSchedulePopup(true)}
          className="bg-white border border-green-600 text-green-700 font-medium py-2 px-6 rounded-full flex items-center justify-center gap-2 hover:bg-green-50 transition-colors"
        >
          <Clock className="w-4 h-4" /> Send Later
        </button>
      </div>

      {/* Form Content */}
      <div className="p-8 max-w-4xl mx-auto w-full flex-1">
        
        <div className="flex items-center border-b border-gray-100 py-4">
          <span className="w-24 text-gray-500 font-medium text-sm">From</span>
          <select className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none">
            <option>{session?.user?.email}</option>
          </select>
        </div>
        
        <div className="flex items-center border-b border-gray-100 py-4 relative">
          <span className="w-24 text-gray-500 font-medium text-sm">To</span>
          <input 
            type="text" 
            placeholder="recipient@example.com" 
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 focus:outline-none text-sm"
          />
          <div className="absolute right-0">
            <input type="file" id="csv-upload" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <label htmlFor="csv-upload" className="cursor-pointer flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700">
              <Upload className="w-4 h-4" /> Upload List
            </label>
          </div>
        </div>
        
        <div className="flex items-center border-b border-gray-100 py-4">
          <span className="w-24 text-gray-500 font-medium text-sm">Subject</span>
          <input 
            type="text" 
            placeholder="Subject" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 focus:outline-none text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium text-sm">Delay between 2 emails</span>
            <input 
              type="number" 
              defaultValue="00" 
              className="w-16 border border-gray-200 rounded-md px-2 py-1 text-sm text-center focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium text-sm">Hourly Limit</span>
            <input 
              type="number" 
              defaultValue="00" 
              className="w-16 border border-gray-200 rounded-md px-2 py-1 text-sm text-center focus:outline-none"
            />
          </div>
        </div>
        
        <div className="py-8">
          <textarea 
            placeholder="Type Your Reply..." 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-64 focus:outline-none text-sm resize-none"
          />
        </div>
        
      </div>

      {/* Schedule Popup */}
      {showSchedulePopup && (
        <div className="absolute top-16 right-8 w-80 bg-white shadow-xl border border-gray-200 rounded-lg p-4 z-50">
          <h3 className="font-semibold mb-4 text-sm">Send Later</h3>
          
          <input 
            type="datetime-local" 
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mb-4"
          />
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowSchedulePopup(false)}
              className="text-gray-500 text-sm font-medium hover:text-gray-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleSchedule}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
