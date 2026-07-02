'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Flame,
  Loader2,
  Calendar,
  Zap,
  Target,
  ArrowRight,
  Clipboard,
  Check,
  X,
  LayoutGrid,
  List,
  Info,
  Pencil,
  Award,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Get local YYYY-MM-DD string from Date object
const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateVal = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
};

// Get today's ISO date string local time
const getTodayLocalDateStr = () => {
  return formatLocalDate(new Date());
};

// Calculate Current Streak from logs
const calculateCurrentStreak = (logsList) => {
  if (!logsList || logsList.length === 0) return 0;
  
  // Sort logs descending by date
  const dates = [...new Set(logsList.map(l => l.logged_date))].sort().reverse();
  
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0,0,0,0);
  
  const todayStr = formatLocalDate(checkDate);
  
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  const yesterdayStr = formatLocalDate(yesterday);
  
  // If neither today nor yesterday is logged, streak is 0
  if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
    return 0;
  }
  
  let currentCheck = dates.includes(todayStr) ? new Date() : yesterday;
  
  while (true) {
    const checkStr = formatLocalDate(currentCheck);
    if (dates.includes(checkStr)) {
      streak++;
      currentCheck.setDate(currentCheck.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

// Generate 30 days contribution history (today first on the left, going backward to the right)
const getContributionDays = (logsList) => {
  const days = [];
  const loggedDates = new Set(logsList.map(l => l.logged_date));
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);
    days.push({
      dateStr,
      isCompleted: loggedDates.has(dateStr),
      dayLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    });
  }
  return days;
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default function HabitzForgePage() {
  const { user } = useAuth();
  
  const [habits, setHabits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tableNeedsMigration, setTableNeedsMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Layout View Modes, Filter, Sort State
  const [habitViewMode, setHabitViewMode] = useState('list');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Pending' | 'Completed'
  const [sortBy, setSortBy] = useState('Newest'); // 'Newest' | 'Name' | 'Streak'

  // Form State inside Modal
  const [activeModal, setActiveModal] = useState(null); // 'addHabit' | 'editHabit'
  const [editingHabit, setEditingHabit] = useState(null);
  const [habitName, setHabitName] = useState('');
  const [identityGoal, setIdentityGoal] = useState('');
  const [cueRoutine, setCueRoutine] = useState('');

  // Load layout mode on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('habitViewMode');
    if (savedMode) setHabitViewMode(savedMode);
  }, []);

  const changeHabitViewMode = (mode) => {
    setHabitViewMode(mode);
    localStorage.setItem('habitViewMode', mode);
  };

  useEffect(() => {
    if (!user) return;
    fetchHabitsAndLogs();
  }, [user?.id]);

  const fetchHabitsAndLogs = async () => {
    setLoadingData(true);
    setTableNeedsMigration(false);
    try {
      // 1. Fetch habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      // 2. Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id);

      let finalLogs = logsData || [];
      if (logsError) {
        if (logsError.code === 'PGRST116' || logsError.message.includes('relation "habit_logs" does not exist') || logsError.message.includes('column "identity_goal" does not exist')) {
          setTableNeedsMigration(true);
        } else {
          throw logsError;
        }
      }

      // Check if tables have columns we need
      const sampleHabit = habitsData?.[0];
      if (sampleHabit && (!('identity_goal' in sampleHabit) || !('cue_routine' in sampleHabit))) {
        setTableNeedsMigration(true);
      }

      // Map logs and stats to habits
      const todayStr = getTodayLocalDateStr();
      const mappedHabits = (habitsData || []).map(h => {
        const hLogs = finalLogs.filter(l => l.habit_id === h.id);
        const doneToday = hLogs.some(l => l.logged_date === todayStr);
        return {
          ...h,
          logs: hLogs,
          done: doneToday,
          streak: calculateCurrentStreak(hLogs)
        };
      });

      setHabits(mappedHabits);
    } catch (err) {
      console.error('Error fetching habits data:', err.message);
      toast.error('Gagal memuat data kebiasaan.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleHabit = async (habitId, isCurrentlyDoneToday, habitTitle) => {
    if (!user) return;
    const todayStr = getTodayLocalDateStr();

    // Confirmation Alert
    if (!isCurrentlyDoneToday) {
      const confirm = await Swal.fire({
        title: 'Selesaikan Kebiasaan?',
        text: `Apakah Anda yakin sudah menyelesaikan kebiasaan "${habitTitle}" hari ini?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Selesai!',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
          title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
          htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
          confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
        },
        buttonsStyling: false
      });
      if (!confirm.isConfirmed) return;
    } else {
      const confirm = await Swal.fire({
        title: 'Batalkan Centang?',
        text: `Apakah Anda yakin ingin membatalkan penyelesaian "${habitTitle}"? Streak berturut-turut Anda akan dihitung ulang.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
          title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
          htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
          confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
        },
        buttonsStyling: false
      });
      if (!confirm.isConfirmed) return;
    }

    // Optimistic Update
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const nextDone = !isCurrentlyDoneToday;
        let nextLogs = [...h.logs];
        if (nextDone) {
          nextLogs.push({ habit_id: habitId, logged_date: todayStr });
        } else {
          nextLogs = nextLogs.filter(l => l.logged_date !== todayStr);
        }
        return {
          ...h,
          done: nextDone,
          logs: nextLogs,
          streak: calculateCurrentStreak(nextLogs)
        };
      }
      return h;
    }));

    try {
      if (isCurrentlyDoneToday) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('logged_date', todayStr)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Kebiasaan diubah ke belum selesai.');
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .insert([{ habit_id: habitId, logged_date: todayStr, user_id: user.id }]);
        if (error) throw error;
        toast.success('Luar biasa! Kebiasaan selesai dicentang hari ini. 🔥');
      }
      fetchHabitsAndLogs();
    } catch (err) {
      toast.error('Gagal memperbarui status kebiasaan.');
      console.error(err);
      fetchHabitsAndLogs();
    }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!habitName.trim()) {
      toast.error('Nama kebiasaan tidak boleh kosong!');
      return;
    }

    const toastId = toast.loading('Menambahkan kebiasaan baru...');
    try {
      const { data, error } = await supabase
        .from('habits')
        .insert([
          {
            name: habitName.trim(),
            identity_goal: identityGoal.trim() || null,
            cue_routine: cueRoutine.trim() || null,
            user_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast.success('Kebiasaan baru berhasil ditambahkan! 🚀', { id: toastId });
        setActiveModal(null);
        setHabitName('');
        setIdentityGoal('');
        setCueRoutine('');
        fetchHabitsAndLogs();
      }
    } catch (err) {
      toast.error('Gagal menambahkan kebiasaan ke database.', { id: toastId });
      console.error(err);
    }
  };

  const handleOpenEditHabit = (habit, e) => {
    e.stopPropagation();
    setEditingHabit(habit);
    setHabitName(habit.name);
    setIdentityGoal(habit.identity_goal || '');
    setCueRoutine(habit.cue_routine || '');
    setActiveModal('editHabit');
  };

  const handleEditHabit = async (e) => {
    e.preventDefault();
    if (!user || !editingHabit) return;
    if (!habitName.trim()) {
      toast.error('Nama kebiasaan tidak boleh kosong!');
      return;
    }

    const toastId = toast.loading('Memperbarui kebiasaan...');
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          name: habitName.trim(),
          identity_goal: identityGoal.trim() || null,
          cue_routine: cueRoutine.trim() || null
        })
        .eq('id', editingHabit.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Kebiasaan berhasil diperbarui! 📝', { id: toastId });
      setActiveModal(null);
      setEditingHabit(null);
      setHabitName('');
      setIdentityGoal('');
      setCueRoutine('');
      fetchHabitsAndLogs();
    } catch (err) {
      toast.error('Gagal memperbarui kebiasaan.', { id: toastId });
      console.error(err);
    }
  };

  const handleDeleteHabit = async (id, name) => {
    if (!user) return;
    const confirm = await Swal.fire({
      title: 'Hapus Kebiasaan?',
      text: `Apakah Anda yakin ingin menghapus kebiasaan "${name}"? Seluruh riwayat kontribusi akan ikut terhapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!confirm.isConfirmed) return;

    const toastId = toast.loading('Menghapus kebiasaan...');
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Kebiasaan berhasil dihapus.', { id: toastId });
      fetchHabitsAndLogs();
    } catch (err) {
      toast.error('Gagal menghapus kebiasaan.', { id: toastId });
      console.error(err);
    }
  };

  const handleResetToday = async () => {
    if (!user) return;
    const confirm = await Swal.fire({
      title: 'Reset Checklist Hari Ini?',
      text: 'Semua centangan yang Anda lakukan hari ini akan dihapus dari riwayat log. Apakah Anda yakin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Reset!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!confirm.isConfirmed) return;

    const toastId = toast.loading('Mereset checklist...');
    try {
      const todayStr = getTodayLocalDateStr();
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('logged_date', todayStr)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Checklist hari ini di-reset!', { id: toastId });
      fetchHabitsAndLogs();
    } catch (err) {
      toast.error('Gagal mereset checklist.', { id: toastId });
      console.error(err);
    }
  };

  const handleCopySql = () => {
    const sqlQuery = `-- 1. Tambah kolom baru ke tabel habits jika belum ada
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS identity_goal text;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS cue_routine text;

-- 2. Membuat tabel habit_logs jika belum ada
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  logged_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_habit_date UNIQUE (habit_id, logged_date)
);

-- 3. Aktifkan RLS untuk habit_logs
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Buat policy RLS untuk habit_logs
CREATE POLICY "Users can manage their own habit logs"
  ON public.habit_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    toast.success('Query SQL berhasil disalin!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const completedCount = habits.filter(h => h.done).length;
  const totalCount = habits.length;
  const completionPercentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const maxStreak = totalCount ? Math.max(...habits.map(h => h.streak), 0) : 0;

  // Leveling XP Calculation
  const totalLogsCount = habits.reduce((acc, h) => acc + h.logs.length, 0);
  const userLevel = Math.floor(totalLogsCount / 10) + 1;
  const xpInCurrentLevel = totalLogsCount % 10;
  const progressPercent = (xpInCurrentLevel / 10) * 100;

  // Filter & Sort processed habits
  const processedHabits = [...habits]
    .filter(h => {
      if (filterStatus === 'Pending' && h.done) return false;
      if (filterStatus === 'Completed' && !h.done) return false;
      return true;
    })
    .sort((a, b) => {
      // Primary sort: incomplete first, completed last
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      // Secondary sort
      if (sortBy === 'Name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'Streak') {
        return b.streak - a.streak;
      }
      // 'Newest'
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bentar euy, loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Hide Scrollbar Style Block */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hidden::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-hidden {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Habitz Forge <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bangun rutinitas harian dengan rumus Atomic Habits dan pantau konsistensi tracker kontribusi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleResetToday}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Reset centangan hari ini"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Hari Ini
          </button>
          
          <button
            onClick={() => {
              setHabitName('');
              setIdentityGoal('');
              setCueRoutine('');
              setEditingHabit(null);
              setActiveModal('addHabit');
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-white" />
            Tambah Habit Baru
          </button>
        </div>
      </div>

      {/* Leveling XP Card Widget */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-500/20">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <Award className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Level Anda</span>
              <h2 className="text-xl font-black tracking-tight mt-0.5">Habit Master Lvl {userLevel}</h2>
            </div>
          </div>

          <p className="text-xs text-blue-100 max-w-md">
            Anda telah menyelesaikan <strong>{totalLogsCount} total centangan (XP)</strong>. 
            Selesaikan <strong>{10 - xpInCurrentLevel} centangan</strong> lagi untuk naik ke Level {userLevel + 1}!
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full md:w-64 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-blue-200">
            <span>Progress Level {userLevel}</span>
            <span className="text-white">{xpInCurrentLevel}/10 XP</span>
          </div>
          <div className="w-full h-3 bg-blue-900/60 rounded-full overflow-hidden border border-blue-700/50 p-[2px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* SQL Migration Assistant */}
      {tableNeedsMigration && (
        <div className="p-5 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-4 text-left animate-in fade-in">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Struktur Database Perlu Migrasi
              </h4>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Fitur lanjutan Habitz Forge memerlukan kolom target identitas (`identity_goal`), rumus habit stacking (`cue_routine`), serta tabel pencatatan log harian (`habit_logs`). Jalankan query SQL di bawah ini pada editor SQL Supabase Anda.
              </p>
            </div>
          </div>
          <div className="relative">
            <pre className="text-[9px] bg-slate-900 dark:bg-black text-slate-300 p-4 rounded-xl overflow-x-auto font-mono max-h-[180px] leading-relaxed">
              {`ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS identity_goal text;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS cue_routine text;

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  logged_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_habit_date UNIQUE (habit_id, logged_date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own habit logs" ON public.habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`}
            </pre>
            <button
              onClick={handleCopySql}
              className="absolute top-2.5 right-2.5 p-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1 text-[9px] font-bold cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
              {copiedSql ? 'Tersalin' : 'Salin SQL'}
            </button>
          </div>
        </div>
      )}

      {/* Habits Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Kebiasaan</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Selesai Hari Ini</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{completionPercentage}% <span className="text-xs text-slate-400 font-medium">({completedCount}/{totalCount})</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Streak Terpanjang</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{maxStreak} Hari</p>
          </div>
        </div>
      </div>

      {/* Habits Checklist Area */}
      <div className="space-y-3.5">
        
        {/* Sub-header Filter and Switcher Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Checklist Harian ({completedCount}/{totalCount})
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Lakukan rutinitas secara konsisten setiap hari untuk membentuk kebiasaan baru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Filter Status */}
            <div className="w-full sm:w-auto h-9 flex items-center gap-1 border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm text-[10px] font-bold">
              <button 
                onClick={() => setFilterStatus('All')}
                className={`flex-1 sm:flex-initial h-full px-3 rounded-md transition-colors cursor-pointer flex items-center justify-center ${filterStatus === 'All' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Semua
              </button>
              <button 
                onClick={() => setFilterStatus('Pending')}
                className={`flex-1 sm:flex-initial h-full px-3 rounded-md transition-colors cursor-pointer flex items-center justify-center ${filterStatus === 'Pending' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Belum Centang
              </button>
              <button 
                onClick={() => setFilterStatus('Completed')}
                className={`flex-1 sm:flex-initial h-full px-3 rounded-md transition-colors cursor-pointer flex items-center justify-center ${filterStatus === 'Completed' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Sudah Centang
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex-1 sm:flex-initial h-9 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="text-slate-400">Urutkan:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer dark:bg-slate-800 dark:text-slate-200 text-[10px] font-bold h-full"
              >
                <option value="Newest" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Terbaru</option>
                <option value="Name" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Nama (A-Z)</option>
                <option value="Streak" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Streak</option>
              </select>
            </div>

            {/* Grid vs List Switcher */}
            <div className="h-9 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg flex items-center gap-0.5 shadow-sm">
              <button
                onClick={() => changeHabitViewMode('grid')}
                className={`p-1 h-full aspect-square flex items-center justify-center rounded-md transition-colors cursor-pointer ${habitViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => changeHabitViewMode('list')}
                className={`p-1 h-full aspect-square flex items-center justify-center rounded-md transition-colors cursor-pointer ${habitViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Habits Checklist Render */}
        <div className="space-y-3">
          {processedHabits.length > 0 ? (
            habitViewMode === 'list' ? (
              // LIST VIEW
              <div className="space-y-3">
                {processedHabits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      habit.done
                        ? 'bg-emerald-50/10 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/40 text-slate-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Left Section: Checkbox, Name, and Stacking Details */}
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => handleToggleHabit(habit.id, habit.done, habit.name)}
                        className="mt-1 focus:outline-none transition-transform active:scale-90 flex-shrink-0 cursor-pointer"
                        title={habit.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                      >
                        {habit.done ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-bold truncate leading-tight ${habit.done ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-100'}`}>
                            {habit.name}
                          </h3>
                          <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                            🔥 {habit.streak}d streak
                          </span>
                        </div>

                        {habit.identity_goal && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                            <Target className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="truncate">Tujuan Identitas: <strong className="font-semibold">{habit.identity_goal}</strong></span>
                          </div>
                        )}

                        {habit.cue_routine && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800/60 w-fit max-w-full">
                            <span className="truncate">Habit Stacking: "{habit.cue_routine}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section: Contribution Grid Tracker (Last 30 Days) */}
                    <div className="space-y-1.5 w-full md:w-auto flex-shrink-0">
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>30 Hari Terakhir</span>
                        <span>{habit.logs.length} Total</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1 max-w-[210px] md:max-w-none scrollbar-hidden">
                        {getContributionDays(habit.logs).map((day) => (
                          <div
                            key={day.dateStr}
                            title={`${day.dayLabel}: ${day.isCompleted ? 'Selesai' : 'Belum Selesai'}`}
                            className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-all border ${
                              day.isCompleted
                                ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800/80'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center justify-end flex-shrink-0 md:pl-2 gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEditHabit(habit, e)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Edit Kebiasaan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHabit(habit.id, habit.name)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Hapus Kebiasaan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              // GRID VIEW
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {processedHabits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4.5 min-h-[220px] ${
                      habit.done
                        ? 'bg-emerald-50/10 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/40 text-slate-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Checkbox, Edit and Delete */}
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => handleToggleHabit(habit.id, habit.done, habit.name)}
                          className="focus:outline-none transition-transform active:scale-90 flex-shrink-0 cursor-pointer"
                          title={habit.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                        >
                          {habit.done ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          ) : (
                            <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500" />
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleOpenEditHabit(habit, e)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit Kebiasaan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id, habit.name)}
                            className="p-1.5 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                            title="Hapus Kebiasaan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Habit Info */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-bold truncate leading-tight ${habit.done ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-100'}`}>
                            {habit.name}
                          </h3>
                          <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🔥 {habit.streak}d
                          </span>
                        </div>

                        {habit.identity_goal && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{habit.identity_goal}</span>
                          </p>
                        )}

                        {habit.cue_routine && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800/60 w-fit max-w-full truncate">
                            "{habit.cue_routine}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contribution Grid */}
                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>30 Hari Terakhir</span>
                        <span>{habit.logs.length} Selesai</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hidden">
                        {getContributionDays(habit.logs).map((day) => (
                          <div
                            key={day.dateStr}
                            title={`${day.dayLabel}: ${day.isCompleted ? 'Selesai' : 'Belum Selesai'}`}
                            className={`w-3 h-3 rounded-sm flex-shrink-0 transition-all border ${
                              day.isCompleted
                                ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800/80'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada kebiasaan yang cocok</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                Silakan ubah filter Anda atau tambah kebiasaan baru melalui tombol di bagian kanan atas.
              </p>
              <button
                onClick={() => {
                  setHabitName('');
                  setIdentityGoal('');
                  setCueRoutine('');
                  setActiveModal('addHabit');
                }}
                className="mt-4 inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4 text-white" />
                Tambah Habit Pertama Anda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Habit Modal Popup */}
      <AnimatePresence>
        {activeModal === 'addHabit' && (
          <Modal
            isOpen={activeModal === 'addHabit'}
            onClose={() => setActiveModal(null)}
            title="Tambah Kebiasaan Baru"
          >
            <form onSubmit={handleAddHabit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Nama Kebiasaan
                </label>
                <input
                  type="text"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="Contoh: Olahraga Pagi, Membaca Al-Qur'an, Minum Air..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Target Identitas (Identity Goal)
                </label>
                <input
                  type="text"
                  value={identityGoal}
                  onChange={(e) => setIdentityGoal(e.target.value)}
                  placeholder="Contoh: Menjadi programmer yang disiplin & bugar"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                />
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Mendefinisikan siapa diri Anda dengan kebiasaan ini (Prinsip Atomic Habits).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Pemicu & Rutinitas (Habit Stacking)
                </label>
                <input
                  type="text"
                  value={cueRoutine}
                  onChange={(e) => setCueRoutine(e.target.value)}
                  placeholder="Contoh: Setelah saya [sholat subuh], saya akan [push up 10 kali]"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                />
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Gunakan pola "Setelah saya [kebiasaan lama], saya akan [kebiasaan baru]".
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
                >
                  Tambah Kebiasaan
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit Habit Modal Popup */}
      <AnimatePresence>
        {activeModal === 'editHabit' && (
          <Modal
            isOpen={activeModal === 'editHabit'}
            onClose={() => {
              setActiveModal(null);
              setEditingHabit(null);
            }}
            title="Edit Kebiasaan"
          >
            <form onSubmit={handleEditHabit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Nama Kebiasaan
                </label>
                <input
                  type="text"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="Contoh: Olahraga Pagi, Membaca Al-Qur'an, Minum Air..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Target Identitas (Identity Goal)
                </label>
                <input
                  type="text"
                  value={identityGoal}
                  onChange={(e) => setIdentityGoal(e.target.value)}
                  placeholder="Contoh: Menjadi programmer yang disiplin & bugar"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                />
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Mendefinisikan siapa diri Anda dengan kebiasaan ini (Prinsip Atomic Habits).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Pemicu & Rutinitas (Habit Stacking)
                </label>
                <input
                  type="text"
                  value={cueRoutine}
                  onChange={(e) => setCueRoutine(e.target.value)}
                  placeholder="Contoh: Setelah saya [sholat subuh], saya akan [push up 10 kali]"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                />
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Gunakan pola "Setelah saya [kebiasaan lama], saya akan [kebiasaan baru]".
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingHabit(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}
