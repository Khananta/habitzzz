'use client';

import { useAuth } from '@/utils/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
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
  StickyNote,
  Download,
  Loader2,
  Save,
  Award,
  TrendingUp,
  BookOpen,
  Flame,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Theme, Sidebar, Minimize & Settings Modal states
  const [theme, setTheme] = useState('light');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [reportType, setReportType] = useState('habits'); // 'habits' | 'daily'
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

  const formatLocalDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchReportData = async () => {
    if (!user) return;
    setReportLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

      // 1. Fetch completed daily activities count this month
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_activities')
        .select('id, activity_name, activity_date, activity_time, location')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('activity_date', monthStartStr)
        .order('activity_date', { ascending: true })
        .order('activity_time', { ascending: true });

      if (dailyError && !dailyError.message.includes('relation "daily_activities" does not exist')) {
        throw dailyError;
      }

      // 2. Fetch monthly focus session minutes
      const { data: focusData, error: focusError } = await supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('created_at', `${monthStartStr}T00:00:00Z`);

      if (focusError && !focusError.message.includes('relation "focus_sessions" does not exist')) {
        throw focusError;
      }

      // 3. Fetch habits list & completions in last 30 days
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id);

      if (habitsError) throw habitsError;

      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id, logged_date')
        .eq('user_id', user.id);

      let finalLogs = logsData || [];
      if (logsError && !logsError.message.includes('relation "habit_logs" does not exist')) {
        throw logsError;
      }

      const startOf30Days = new Date();
      startOf30Days.setDate(startOf30Days.getDate() - 29);
      const startOf30DaysStr = formatLocalDate(startOf30Days);

      const habitsSummary = (habitsData || []).map(h => {
        const count = finalLogs.filter(l => l.habit_id === h.id && l.logged_date >= startOf30DaysStr).length;
        return { ...h, completions30Days: count };
      });

      // 4. Fetch completed academic tasks this month
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('name, due_date, status')
        .eq('user_id', user.id)
        .eq('status', 'Completed')
        .gte('due_date', monthStartStr);

      if (tasksError) throw tasksError;

      // Group completed daily activities by date
      const groupedDaily = {};
      (dailyData || []).forEach(act => {
        const dateStr = act.activity_date;
        const dateObj = new Date(dateStr);
        const indonesianDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (!groupedDaily[indonesianDate]) {
          groupedDaily[indonesianDate] = [];
        }
        groupedDaily[indonesianDate].push(act);
      });

      setReportData({
        completedDailyActivitiesCount: dailyData?.length || 0,
        completedDailyActivities: dailyData || [],
        groupedDailyActivities: groupedDaily,
        totalFocusMinutes: (focusData || []).reduce((acc, curr) => acc + curr.duration_minutes, 0),
        habitsSummary,
        completedTasks: tasksData || []
      });
    } catch (err) {
      console.error('Error fetching report data:', err, err.message, err.details, err.hint);
      toast.error(`Gagal memuat data laporan: ${err.message || err}`);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    const toastId = toast.loading('Sedang menyiapkan laporan...');
    try {
      const element = document.getElementById('report-template');
      if (!element) {
        throw new Error('Elemen template laporan tidak ditemukan.');
      }

      // Capture canvas with 3x scale for crystal clear HD rendering
      const canvas = await html2canvas(element, {
        scale: 3, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // jsPDF setup (A4 standard: 210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // mm
      const pageHeight = 297; // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const now = new Date();
      const monthName = now.toLocaleDateString('id-ID', { month: 'long' });
      const year = now.getFullYear();
      
      const filename = reportType === 'habits' 
        ? `Habitzzz_Laporan_Habits_${monthName}_${year}.pdf`
        : `Habitzzz_Laporan_Agenda_${monthName}_${year}.pdf`;

      pdf.save(filename);
      toast.success('Laporan berhasil diunduh! 🎯', { id: toastId });
      setShowReportModal(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Gagal mengunduh laporan.', { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
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
            {/* Download Monthly Report Button */}
            <button
              onClick={() => {
                setShowReportModal(true);
                fetchReportData();
              }}
              className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.75 rounded-full border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all cursor-pointer shadow-3xs"
              title="Unduh Laporan Bulanan (PDF)"
            >
              <Download className="w-3.5 h-3.5 text-blue-500 dark:text-white" />
              <span className="hidden sm:inline">Laporan Bulanan</span>
            </button>

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

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-[890px] w-full shadow-2xl overflow-hidden relative z-50 my-8 animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  Pratinjau Laporan Bulanan (PDF)
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Report Type Selector Switcher */}
              <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-950/10 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReportType('habits')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    reportType === 'habits'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-200/70 dark:hover:bg-slate-700/80'
                  }`}
                >
                  Performa & Habits
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('daily')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    reportType === 'daily'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-200/70 dark:hover:bg-slate-700/80'
                  }`}
                >
                  Agenda Daily Selesai
                </button>
              </div>

              {/* Modal Body: Scrollable Preview of PDF */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950/50 max-h-[60vh] overflow-y-auto overflow-x-auto w-full flex flex-col items-center">
                {reportLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-500">Menghimpun Data Laporan...</p>
                  </div>
                ) : reportData ? (
                  <div className="w-full flex flex-col items-center gap-6">
                    
                    {/* The Printable A4 Container (794px x 1123px standard A4 px size for crystal clear HD rendering) */}
                    <div 
                      id="report-template" 
                      className="w-[794px] min-h-[1123px] bg-white border border-slate-200 shadow-sm p-12 text-slate-850 flex flex-col justify-between font-sans text-left relative overflow-hidden"
                      style={{ color: '#1e293b' }}
                    >
                      {/* Watermark/Background Accent */}
                      <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none" />

                      <div className="space-y-8 relative z-10 w-full flex-grow flex flex-col justify-start">
                        {/* Report Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <img src="/favicon.ico" alt="Logo" className="w-6 h-6 object-contain" />
                              <span className="text-lg font-black tracking-tight text-slate-900">habitzzz.</span>
                            </div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {reportType === 'habits' ? 'Laporan Produktivitas Bulanan' : 'Laporan Kegiatan Harian Selesai'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </span>
                            <span className="block mt-2 text-[10px] font-bold text-slate-500">
                              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {reportType === 'habits' ? (
                          <>
                            {/* Ringkasan Statistik Cards */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Stat 1: Daily completed activities */}
                              <div className="bg-slate-50/70 border border-slate-100 p-4.5 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                  <ListTodo className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Agenda Selesai</span>
                                  <span className="text-lg font-black text-slate-800">{reportData.completedDailyActivitiesCount}</span>
                                  <span className="block text-[8px] font-medium text-slate-400 mt-0.5">kegiatan bulan ini</span>
                                </div>
                              </div>

                              {/* Stat 2: Total focus session minutes */}
                              <div className="bg-slate-50/70 border border-slate-100 p-4.5 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-750 flex items-center justify-center">
                                  <Clock className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Durasi Fokus</span>
                                  <span className="text-lg font-black text-slate-800">{reportData.totalFocusMinutes} Mins</span>
                                  <span className="block text-[8px] font-medium text-slate-400 mt-0.5">dalam focus sessions</span>
                                </div>
                              </div>
                            </div>

                            {/* Sektor Habits (30 Days Summary) */}
                            <div className="space-y-2.5">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                Sektor Habit Tracker (30 Hari Terakhir)
                              </h4>
                              {reportData.habitsSummary.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Belum ada kebiasaan yang dicatat.</p>
                              ) : (
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                      <th className="py-2 px-3 font-bold uppercase text-[9px]">Nama Kebiasaan</th>
                                      <th className="py-2 px-3 font-bold uppercase text-[9px] text-right">Akumulasi Centang Sukses</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {reportData.habitsSummary.map((h, index) => (
                                      <tr key={h.id} className="border-b border-slate-100/50 hover:bg-slate-50/20">
                                        <td className="py-2 px-3 font-semibold text-slate-700">{h.name}</td>
                                        <td className="py-2 px-3 font-extrabold text-slate-800 text-right">{h.completions30Days} Kali</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* Sektor Academic Hub Summary */}
                            <div className="space-y-2.5">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                                Sektor Academic Hub (Tugas Selesai Bulan Ini)
                              </h4>
                              {reportData.completedTasks.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Belum ada tugas akademik yang diselesaikan bulan ini.</p>
                              ) : (
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                      <th className="py-2 px-3 font-bold uppercase text-[9px]">Judul Tugas</th>
                                      <th className="py-2 px-3 font-bold uppercase text-[9px] text-right">Tanggal Selesai</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {reportData.completedTasks.map((t, index) => (
                                      <tr key={index} className="border-b border-slate-100/50 hover:bg-slate-50/20">
                                        <td className="py-2 px-3 font-semibold text-slate-700">{t.name}</td>
                                        <td className="py-2 px-3 font-bold text-slate-800 text-right">
                                          {t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Daily Activity (Grouping Completed Only) */}
                            <div className="space-y-4 flex-grow w-full">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                                Riwayat Agenda Kegiatan Terlaksana
                              </h4>
                              {Object.keys(reportData.groupedDailyActivities).length === 0 ? (
                                <div className="text-center py-16">
                                  <ListTodo className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                  <p className="text-xs text-slate-400 italic">Belum ada agenda kegiatan yang terlaksana pada bulan ini.</p>
                                </div>
                              ) : (
                                <div className="space-y-5 w-full">
                                  {Object.keys(reportData.groupedDailyActivities).map((dateKey) => (
                                    <div key={dateKey} className="space-y-2 w-full">
                                      <h5 className="text-[11px] font-extrabold text-slate-800 bg-slate-50/70 border border-slate-100 px-3.5 py-1.5 rounded-xl border-l-4 border-blue-500 flex items-center justify-between">
                                        <span>{dateKey}</span>
                                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                          {reportData.groupedDailyActivities[dateKey].length} Selesai
                                        </span>
                                      </h5>
                                      <div className="pl-4.5 space-y-2.5 border-l border-slate-100 ml-2">
                                        {reportData.groupedDailyActivities[dateKey].map((act) => (
                                          <div key={act.id} className="flex justify-between items-center text-xs text-slate-700 py-1 border-b border-dashed border-slate-100/70">
                                            <div className="flex items-center gap-2">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                              <span className="font-semibold text-slate-700">{act.activity_name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                                              {act.activity_time && (
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3 text-slate-300" />
                                                  {act.activity_time}
                                                </span>
                                              )}
                                              {act.location && (
                                                <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-400">
                                                  {act.location}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* PDF Report Footer */}
                      <div className="border-t border-slate-100 pt-5 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Laporan ini dihasilkan secara otomatis oleh Habitzzz.</span>
                        <span className="font-semibold text-slate-400">Halaman 1 dari 1</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-10">Data tidak tersedia.</p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-2.5 p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4.5 py-2 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || reportLoading || !reportData}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold px-4.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengunduh PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Unduh Laporan (PDF)
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
