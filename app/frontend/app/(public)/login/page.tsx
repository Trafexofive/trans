'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  
  // The backend URL is needed to construct the Google login link.
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <div className="page-container flex items-center justify-center">
        <div className="hero-gradient" style={{maxWidth: '450px'}}>
            <div className="hero-container solid-effect">
                <h1 className="hero-title text-2xl mb-4">Login</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="form-group">
                        <label className="form-label text-left">Email</label>
                        <div className="input-gradient">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-left">Password</label>
                        <div className="input-gradient">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="button-gradient mt-4">
                        <button type="submit" className="btn btn-primary w-full">
                            Login
                        </button>
                    </div>
                </form>

                {/* --- GOOGLE OAUTH BUTTON --- */}
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>
                
                <a href={`${API_BASE_URL}/login/google`} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.485 13.85C34.907 10.73 30.07 9 24 9C12.955 9 4 17.955 4 29s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
                        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039L38.485 13.85C34.907 10.73 30.07 9 24 9C16.318 9 9.656 13.318 6.306 19.691z"></path>
                        <path fill="#4CAF50" d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 40.593 26.715 42 24 42c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.477 16.227 48 24 48z"></path>
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.082 5.571l6.19 5.238C42.099 36.372 44 32.888 44 28c0-1.341-.138-2.65-.389-3.917z"></path>
                    </svg>
                    Continue with Google
                </a>
                
                <p className="text-center text-sm text-gray-400 mt-4">
                    Don't have an account? <Link href="/register" className="text-green-400 hover:underline">Register here</Link>
                </p>
            </div>
        </div>
    </div>
  );
}
