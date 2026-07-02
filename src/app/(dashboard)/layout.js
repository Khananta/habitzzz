'use client';

import { useAuth } from '@/utils/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Sparkles, 
  LogOut,
  Settings,
  Sun,
  Moon,
  X,
  Menu,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Timer,
  StickyNote
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Theme, Sidebar, Minimize & Settings Modal states
  const [theme, setTheme] = useState('light');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Sync sidebar minimize state with localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('isSidebarMinimized') === 'true';
    setIsSidebarMinimized(saved);
  }, []);

  const toggleSidebarMinimize = () => {
    const next = !isSidebarMinimized;
    setIsSidebarMinimized(next);
    localStorage.setItem('isSidebarMinimized', String(next));
  };

  // Sync username input with user metadata when modal opens
  useEffect(() => {
    if (showSettingsModal && user) {
      setUsernameInput(user.user_metadata?.username || 'Habitzter');
    }
  }, [showSettingsModal, user]);

  // Auto-save default username "Habitzter" to Supabase on mount/auth if empty
  useEffect(() => {
    if (user && !user.user_metadata?.username) {
      const autoSave = async () => {
        try {
          await supabase.auth.updateUser({
            data: { 
              username: 'Habitzter',
              display_name: 'Habitzter',
              full_name: 'Habitzter'
            }
          });
        } catch (err) {
          console.error('Error setting default username:', err);
        }
      };
      autoSave();
    }
  }, [user]);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      toast.error('Username tidak boleh kosong!');
      return;
    }
    const toastId = toast.loading('Memperbarui username...');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          username: usernameInput.trim(),
          display_name: usernameInput.trim(),
          full_name: usernameInput.trim()
        }
      });
      if (error) throw error;
      toast.success('Username berhasil diperbarui! 🎉', { id: toastId });
    } catch (err) {
      toast.error('Gagal memperbarui username.');
      console.error(err);
    }
  };

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Close sidebar on path change (mobile compatibility)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      toast.success('Mode Gelap diaktifkan!');
    } else {
      document.documentElement.classList.remove('dark');
      toast.success('Mode Terang diaktifkan!');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Berhasil keluar!');
      router.push('/login');
    } catch (err) {
      toast.error('Gagal keluar.');
      console.error(err);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Academic',
      path: '/academic',
      icon: GraduationCap,
    },
    {
      name: 'Habitz Forge',
      path: '/habit-forge',
      icon: Sparkles,
    },
    {
      name: 'Daily Activity',
      path: '/daily-activity',
      icon: ListTodo,
    },
    {
      name: 'Focus Room',
      path: '/focus',
      icon: Timer,
    },
    {
      name: 'Quick Notes',
      path: '/notes',
      icon: StickyNote,
    },
  ];

  const getInitials = (email, username) => {
    const finalUsername = username || 'Habitzter';
    return finalUsername.trim().substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-200">
      
      {/* Mobile Drawer Backdrop Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Responsive Slide-in drawers) */}
      <aside className={`fixed inset-y-0 left-0 lg:relative bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full z-40 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarMinimized ? 'w-20' : 'w-64'}`}>
        
        {/* Toggle Minimize Desktop Button (Floating on the right border) */}
        <button 
          onClick={toggleSidebarMinimize}
          className="hidden lg:flex absolute top-[18px] -right-3.5 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm hover:shadow-md cursor-pointer z-50 transition-all"
          title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          {isSidebarMinimized ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Top Section */}
        <div>
          {/* Logo Brand */}
          <div className={`h-16 flex items-center ${isSidebarMinimized ? 'justify-center px-4' : 'justify-between px-6'} border-b border-slate-100 dark:border-slate-800/80`}>
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/favicon.ico" alt="Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" />
              {!isSidebarMinimized && (
                <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100 text-lg animate-in fade-in duration-200">habitzzz.</span>
              )}
            </Link>
            
            {/* Close Button on Mobile Drawer */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-blue-400 to-blue-600 shadow-md shadow-blue-500/15'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                  title={isSidebarMinimized ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                    {!isSidebarMinimized && (
                      <span className="animate-in fade-in duration-200">{item.name}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - User Profile & Settings */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20">
          <div className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} mb-4 px-2`}>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex-shrink-0">
              {getInitials(user.email, user.user_metadata?.username)}
            </div>
            {!isSidebarMinimized && (
              <div className="overflow-hidden flex-1 animate-in fade-in duration-200">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.user_metadata?.username || 'Habitzter'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`w-full flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer`}
              title={isSidebarMinimized ? "Pengaturan" : undefined}
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              {!isSidebarMinimized && <span className="animate-in fade-in duration-200">Pengaturan</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 z-20">
          {/* Left side: Hamburger Toggle */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          {/* Right side: Date Badge (with Calendar icon) */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-1.75 rounded-full shadow-md shadow-blue-500/10 tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-white/95" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Content body scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Modal (Light/Dark Mode Toggler) */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-500" />
                  Pengaturan Aplikasi
                </h3>
                <button 
                  onClick={() => setShowSettingsModal(false)} 
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Theme Selector */}
                <div className="space-y-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pilih Mode Tampilan</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => toggleTheme('light')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/10 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-500" />
                      <span className="text-xs">Mode Terang</span>
                    </button>
                    <button
                      onClick={() => toggleTheme('dark')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/10 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs">Mode Gelap</span>
                    </button>
                  </div>
                </div>

                {/* Edit Username Section */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Edit Username</span>
                  <form onSubmit={handleUpdateUsername} className="flex gap-2">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Username baru..."
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      Simpan
                    </button>
                  </form>
                </div>

                {/* Account Section */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Akun Anda</span>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.user_metadata?.username || 'Habitzter'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-1 bg-red-50 dark:bg-red-955 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
