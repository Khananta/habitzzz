'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, Mail, Sparkles, ArrowRight, Eye, EyeOff, Calendar, Flame, CheckCircle2, Award } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const { login, user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Harap isi semua field!');
      return;
    }

    setLoadingSubmit(true);
    const toastId = toast.loading('Memproses masuk...');

    try {
      const { data, error } = await login(email, password);
      if (error) {
        toast.error(error.message || 'Gagal masuk. Periksa kembali email dan password Anda.', { id: toastId });
      } else {
        toast.success(`Selamat datang kembali!`, { id: toastId });
        router.push('/');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem.', { id: toastId });
      console.error(err);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Memeriksa Sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-slate-800 font-sans overflow-hidden">
      
      {/* LEFT COLUMN: SaaS Web App Preview & Branding (Centered Layout, Non-Scrollable) */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 py-10 px-16 flex-col justify-between relative overflow-hidden h-full">
        {/* Decorative Grid Overlay & Light Glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-400/25 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none z-0"></div>

        {/* Logo/Brand Header - Centered */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5 z-10 select-none">
          <img src="/favicon.ico" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-white">habitzzz.</span>
        </div>

        {/* Headline & Stacked SaaS Mockups - Centered */}
        <div className="my-auto space-y-8 relative z-10 w-full max-w-xl mx-auto flex flex-col items-center">
          <div className="space-y-3.5 text-center max-w-md">
            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Perubahan berasal<br />dari hal kecil.
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Habitzzz menyelaraskan target akademik dan rutinitas harian Anda dalam satu tempat dengan desain visual minimalis yang memukau.
            </p>
          </div>

          {/* Interactive Stacked SaaS Card Mockup - Compact & Solid */}
          <div className="relative w-full max-w-[420px] h-[310px] mt-1 flex justify-center items-center">
            
            {/* Card 1: HabitForge Card (Base layer, floating slightly left/up) */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute left-0 top-0 w-[84%] bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl space-y-3.5 z-10"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div>
                  <span className="text-[12px] font-bold text-white block">HabitForge Hari Ini</span>
                  <span className="text-[10px] text-blue-200">Rutinitas produktivitas Anda</span>
                </div>
                <span className="text-[10px] bg-sky-400/20 border border-sky-400/35 text-sky-200 px-2.5 py-0.5 rounded-full font-bold">2/3 Selesai</span>
              </div>
              
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-[10px] text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="font-medium line-through text-white/60">Minum Air Putih 2L</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-[10px] text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="font-medium line-through text-white/60">Latihan Coding 1 Jam</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-[10px] text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/30"></div>
                    <span className="font-medium">Membaca Buku 10 Halaman</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Academic Hub Task Card (Overlapping layer, floating slightly right/down) */}
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
              className="absolute right-0 bottom-2 w-[76%] bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl p-4.5 shadow-2xl space-y-3 z-20"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-left">
                <div>
                  <span className="text-[12px] font-bold text-white block">Tugas Terdekat</span>
                  <span className="text-[10px] text-blue-200">Deadline akademik terdekat</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-1 text-left">
                <h4 className="text-[11px] font-bold text-white leading-tight">Laporan Jaringan Saraf Tiruan</h4>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-blue-100 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-250" />
                    Besok, 23:59
                  </span>
                  <span className="text-[9px] bg-rose-500/30 border border-rose-500/50 text-rose-200 px-2 py-0.5 rounded-full font-bold">
                    High
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Badge: Flame Streak (Floating dynamically) */}
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -left-4 bottom-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1.5 z-30"
            >
              <Flame className="w-4 h-4 fill-white" />
              <span>12d Streak!</span>
            </motion.div>

            {/* Badge: GPA Award (Floating dynamically) */}
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
              className="absolute right-[34%] top-[-12px] bg-white text-blue-600 border border-blue-100 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1.5 z-30"
            >
              <Award className="w-4 h-4 text-blue-500" />
              <span>IPK 3.88</span>
            </motion.div>

          </div>
        </div>

        {/* Footer Credit - Centered */}
        <div className="text-xs text-blue-200/60 relative z-10 text-center">
          &copy; 2026 habitzzz - Powered By Khananta
        </div>
      </div>

      {/* RIGHT COLUMN: Clean Light-Themed Login Form (Non-Scrollable page-level, internal scroll fallback) */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-slate-50/50 relative h-full overflow-y-auto">
        
        <div className="w-full max-w-sm mx-auto space-y-8">
          
          {/* Logo on Mobile (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-200" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">habitzzz.</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Selamat datang kembali
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Silakan masuk menggunakan akun terdaftar Anda untuk mengelola kebiasaan & tugas akademik.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-650 hover:to-indigo-650 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-6"
            >
              {loadingSubmit ? 'Memproses...' : 'Masuk ke Aplikasi'}
              {!loadingSubmit && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
