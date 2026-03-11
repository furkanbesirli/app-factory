"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Pre-defined password
        const VALID_PASSWORD = 'furkan724';

        if (password === VALID_PASSWORD) {
            // Set cookie for 24 hours
            const expires = new Date();
            expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000));
            document.cookie = `admin_session=valid; expires=${expires.toUTCString()}; path=/`;

            router.push('/');
            router.refresh();
        } else {
            setError('Hatalı şifre. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <span className="text-4xl text-white">🔒</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Admin Girişi</h1>
                    <p className="text-gray-500 text-sm">Panel güvenliği için lütfen şifrenizi girin.</p>
                </div>

                <div className="bg-[#111111] border border-[#222222] rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-[gradient_3s_linear_infinite]"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Şifre</label>
                            <div className="relative group/input">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#181818] border border-[#262626] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all duration-300 placeholder:text-gray-700"
                                    autoFocus
                                />
                                <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl flex items-center gap-2 animate-shake">
                                <span className="text-lg">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                    Giriş Yapılıyor...
                                </div>
                            ) : (
                                'PANELE GİRİŞ YAP'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-gray-600 text-xs">
                    Built with Security for Policies Builder
                </p>
            </div>

            <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
        </div>
    );
}
