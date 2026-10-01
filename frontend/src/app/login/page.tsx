'use client';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="bg-white rounded-xl p-10 w-[420px] flex flex-col items-center border border-gray-100 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Login</h1>
        
        <button 
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 bg-[#EDF3EF] rounded-md py-3 hover:bg-[#e2eadf] transition-colors mb-6"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span className="text-sm font-medium text-gray-800">Login with Google</span>
        </button>
        
        <div className="flex items-center w-full mb-6">
          <hr className="flex-grow border-gray-100" />
          <span className="px-3 text-xs font-medium text-gray-400">or sign up through email</span>
          <hr className="flex-grow border-gray-100" />
        </div>
        
        <div className="w-full space-y-4">
          <input 
            type="email" 
            placeholder="Email ID" 
            className="w-full bg-[#F5F8F5] text-gray-900 placeholder-gray-400 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-shadow"
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full bg-[#F5F8F5] text-gray-900 placeholder-gray-400 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-shadow"
          />
          <button className="w-full bg-[#0FAA47] hover:bg-[#0d953d] text-white font-medium rounded-md py-3 text-sm transition-colors mt-4">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
