'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Award,
  ArrowRight,
  Loader2,
  Activity,
  Flame,
  Clock,
  ListTodo,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Helper to format local YYYY-MM-DD
const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateVal = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
};

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

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Generate calendar days for a selected month/year
const getDaysInMonthCalendar = (year, month, logsList) => {
  const firstDay = new Date(year, month, 1);
  // Monday is 0, Tuesday 1, ..., Sunday 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6; 
  
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  
  const logCounts = {};
  logsList.forEach(log => {
    logCounts[log.logged_date] = (logCounts[log.logged_date] || 0) + 1;
  });

  // 1. Padding days at start
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push({ isPadding: true });
  }
  
  // 2. Active days of the month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = formatLocalDate(d);
    const count = logCounts[dateStr] || 0;
    calendarDays.push({
      isPadding: false,
      dayNum: day,
      dateStr,
      count
    });
  }

  // 3. Padding days at end to complete standard 7-column rows
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ isPadding: true });
  }

  return calendarDays;
};

// Generate Weekly completion trend
const getWeeklyTrend = (logsList) => {
  const trend = [];
  const logCounts = {};
  logsList.forEach(log => {
    logCounts[log.logged_date] = (logCounts[log.logged_date] || 0) + 1;
  });

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
    trend.push({
      dateStr,
      dayName,
      count: logCounts[dateStr] || 0
    });
  }
  return trend;
};

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [confirmingDailyActivity, setConfirmingDailyActivity] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);
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
      if (logsError && !logsError.message.includes('relation "habit_logs" does not exist')) {
        throw logsError;
      }

      // Map logs to habits to check if done today
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
      setLogs(finalLogs);

      // 3. Fetch academic tasks (Pending, closest due dates)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, course:courses(name)')
        .eq('user_id', user.id)
        .eq('status', 'Pending')
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // 4. Fetch daily activities for today
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_date', todayStr)
        .order('created_at', { ascending: true });

      if (dailyError && !dailyError.message.includes('relation "daily_activities" does not exist')) {
        throw dailyError;
      }
      setDailyActivities(dailyData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
      toast.error('Gagal memuat data dasbor.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDailyActivityClick = (activity) => {
    if (!activity.is_completed) {
      setConfirmingDailyActivity(activity);
    } else {
      executeToggleDailyActivity(activity.id, activity.is_completed);
    }
  };

  const executeToggleDailyActivity = async (activityId, currentStatus) => {
    const targetStatus = !currentStatus;
    
    // Optimistic update
    setDailyActivities(prev =>
      prev.map(act => act.id === activityId ? { ...act, is_completed: targetStatus } : act)
    );

    try {
      const { error } = await supabase
        .from('daily_activities')
        .update({ is_completed: targetStatus })
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (targetStatus) {
        toast.success('Kegiatan berhasil diselesaikan! 🎉');
      } else {
        toast.success('Kegiatan diubah ke belum selesai.');
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Error toggling daily activity:', err.message);
      toast.error('Gagal memperbarui status kegiatan.');
      // Rollback
      setDailyActivities(prev =>
        prev.map(act => act.id === activityId ? { ...act, is_completed: currentStatus } : act)
      );
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const toggleHabit = async (habitId, isCurrentlyDoneToday, habitTitle) => {
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
          popup: 'rounded-[20px] font-sans bg-white dark:bg-slate-900',
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
        text: `Apakah Anda yakin ingin membatalkan penyelesaian "${habitTitle}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-[20px] font-sans bg-white dark:bg-slate-900',
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
        return {
          ...h,
          done: nextDone,
          streak: nextDone ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));

    try {
      if (isCurrentlyDoneToday) {
        await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('logged_date', todayStr)
          .eq('user_id', user.id);
        toast.success('Kebiasaan diubah ke belum selesai.');
      } else {
        await supabase
          .from('habit_logs')
          .insert([{ habit_id: habitId, logged_date: todayStr, user_id: user.id }]);
        toast.success('Luar biasa! Kebiasaan selesai dicentang. 🔥');
      }
      fetchDashboardData();
    } catch (err) {
      toast.error('Gagal memperbarui status kebiasaan.');
      console.error(err);
      fetchDashboardData();
    }
  };

  const completedHabitsCount = habits.filter(h => h.done).length;
  const totalHabits = habits.length;
  const habitsPercent = totalHabits ? Math.round((completedHabitsCount / totalHabits) * 100) : 0;
  const maxStreak = totalHabits ? Math.max(...habits.map(h => h.streak), 0) : 0;

  // Leveling XP Calculation
  const totalLogsCount = logs.length;
  const userLevel = Math.floor(totalLogsCount / 10) + 1;
  const xpInCurrentLevel = totalLogsCount % 10;
  const progressPercent = (xpInCurrentLevel / 10) * 100;

  // Calendar pre-computations
  const calendarDays = getDaysInMonthCalendar(selectedYear, selectedMonth, logs);

  // Weekly Trend Graph calculations
  const weeklyTrend = getWeeklyTrend(logs);
  const maxWeeklyCount = Math.max(...weeklyTrend.map(t => t.count), 3);
  const linePoints = weeklyTrend.map((t, idx) => ({
    x: idx * (300 / 6),
    y: 85 - (t.count / maxWeeklyCount) * 70
  }));
  const linePath = linePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePoints.length ? `${linePath} L ${linePoints[linePoints.length-1].x} 95 L 0 95 Z` : '';

  // Donut circumference
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (habitsPercent / 100) * circumference;

  const username = user?.user_metadata?.username || 'Habitzter';

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
      
      {/* Hide Scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hidden::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-hidden {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />

      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Halo, {username}! <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mari buat hari ini lebih produktif. Berikut ringkasan dan analisis performa harian Anda.
          </p>
        </div>
      </div>

      {/* Leveling XP Card Widget */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-500/20">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <Award className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Level Dasbor</span>
              <h2 className="text-xl font-black tracking-tight mt-0.5">Habit Master Lvl {userLevel}</h2>
            </div>
          </div>

          <p className="text-xs text-blue-100 max-w-md">
            Anda telah mengumpulkan <strong>{totalLogsCount} XP</strong> dari penyelesaian aktivitas.
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

      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stat 1: Habits Compliance */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Kepatuhan Habit</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{habitsPercent}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{completedHabitsCount} dari {totalHabits} selesai hari ini</p>
          </div>
        </div>

        {/* Stat 2: Active Tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Tugas Kuliah</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{tasks.length} Aktif</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{tasks.filter(t => t.priority === 'High').length} prioritas tinggi</p>
          </div>
        </div>

        {/* Stat 3: Longest Streak */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Streak Terpanjang</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{maxStreak} Hari</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pertahankan ritme produktif Anda!</p>
          </div>
        </div>
      </div>

      {/* Charts & Interactive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Completion Trend Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Tren Produktivitas Mingguan
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Jumlah aktivitas sukses yang dicentang selama 7 hari terakhir</p>
          </div>

          <div className="relative pt-4">
            <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradientDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="15" x2="300" y2="15" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="85" x2="300" y2="85" stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeWidth="0.5" strokeDasharray="4 4" />
              
              {/* Area fill */}
              {areaPath && <path d={areaPath} fill="url(#areaGradientDash)" />}
              
              {/* Line path */}
              {linePath && <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />}
              
              {/* Dots */}
              {linePoints.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  className="fill-blue-500 stroke-white dark:stroke-slate-900 cursor-pointer hover:r-5 transition-all"
                  strokeWidth="1.5"
                  title={`${weeklyTrend[idx].dayName}: ${weeklyTrend[idx].count} selesai`}
                />
              ))}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 px-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            {weeklyTrend.map((t, idx) => (
              <span key={idx} className="w-[42px] text-center">{t.dayName}</span>
            ))}
          </div>
        </div>

        {/* Circular Donut Progress Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center gap-4 text-center">
          <div className="w-full text-left">
            <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Kepatuhan Harian
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Persentase kebiasaan harian yang dicentang hari ini</p>
          </div>

          {/* Donut Chart */}
          <div className="relative flex items-center justify-center w-28 h-28 my-1.5">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800/60"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-blue-500 transition-all duration-500"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">{habitsPercent}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Rasio Sukses</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">
            {completedHabitsCount} dari {totalHabits} habit harian selesai.
          </div>
        </div>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Activity Hari Ini Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ListTodo className="w-5 h-5 text-blue-500" />
                  Daily Activity Hari Ini
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}'s spontaneous plan
                </p>
              </div>
              <Link href="/daily-activity" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group">
                Kelola 
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {[...dailyActivities]
                .sort((a, b) => {
                  if (a.is_completed === b.is_completed) {
                    return new Date(a.created_at) - new Date(b.created_at);
                  }
                  return a.is_completed ? 1 : -1;
                })
                .slice(0, 4)
                .map((activity) => (
                <div 
                  key={activity.id}
                  onClick={() => handleDailyActivityClick(activity)}
                  className={`flex flex-col p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 cursor-pointer select-none transition-all ${
                    activity.is_completed 
                      ? 'bg-slate-50/40 dark:bg-slate-800/40 border-emerald-100/10 text-slate-400' 
                      : 'bg-white dark:bg-slate-900 hover:shadow-2xs text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 w-full">
                    <button className="focus:outline-none flex-shrink-0 mt-0.5">
                      {activity.is_completed ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3.5]" />
                        </div>
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-slate-300 dark:text-slate-650" />
                      )}
                    </button>
                    <span className={`text-xs leading-snug break-words truncate pr-2 ${
                      activity.is_completed ? 'line-through font-medium' : 'font-semibold'
                    }`}>
                      {activity.activity_name}
                    </span>
                  </div>

                  {(activity.activity_time || activity.location) && (
                    <div className="flex flex-wrap gap-1.5 items-center mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[8px] text-slate-400">
                      {activity.activity_time && (
                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700">
                          <Clock className="w-2 h-2 text-blue-500" />
                          {activity.activity_time}
                        </span>
                      )}
                      {activity.location && (
                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700 truncate max-w-[150px]">
                          <MapPin className="w-2 h-2 text-rose-500" />
                          {activity.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {dailyActivities.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Belum ada agenda untuk hari ini.</p>
                  <Link href="/daily-activity" className="text-xs text-blue-650 font-semibold mt-2 inline-block">
                    Tambah Agenda Hari Ini &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {dailyActivities.length > 4 && (
            <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Link href="/daily-activity" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Lihat {dailyActivities.length - 4} agenda lainnya...
              </Link>
            </div>
          )}
        </div>

        {/* Today's Habits Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Habitz Forge Hari Ini</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pantau dan centang kebiasaan harian Anda</p>
              </div>
              <Link href="/habit-forge" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group">
                Kelola 
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {habits.slice(0, 4).map((habit) => (
                <div 
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id, habit.done, habit.name)}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer select-none ${
                    habit.done 
                      ? 'bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 shadow-xs' 
                      : 'bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm text-slate-805 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button className="focus:outline-none flex-shrink-0 mt-0.5">
                      {habit.done ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-650" />
                      )}
                    </button>
                    <span className={`text-sm truncate ${habit.done ? 'line-through text-slate-400' : 'font-medium'}`}>
                      {habit.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      🔥 {habit.streak}d
                    </span>
                  </div>
                </div>
              ))}
              {habits.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Belum ada kebiasaan yang dibuat di database.</p>
                  <Link href="/habit-forge" className="text-xs text-blue-650 font-semibold mt-2 inline-block">
                    Tambah Habit Baru &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {habits.length > 4 && (
            <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Link href="/habit-forge" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Lihat {habits.length - 4} kebiasaan lainnya...
              </Link>
            </div>
          )}
        </div>

        {/* Academic Tasks Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tugas Terdekat</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tugas kuliah dengan tenggat waktu terdekat</p>
              </div>
              <Link href="/academic" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group">
                Kelola 
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {tasks.slice(0, 3).map((task) => (
                <div 
                  key={task.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                      {task.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold border border-slate-200 dark:border-slate-700">
                        {task.course?.name || 'Mata Kuliah'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Tenggat: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    task.priority === 'High' 
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
                      : task.priority === 'Medium'
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Semua tugas akademik selesai! 🎉</p>
                  <Link href="/academic" className="text-xs text-blue-650 font-semibold mt-2 inline-block">
                    Tambah Tugas Baru &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {tasks.length > 3 && (
            <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Link href="/academic" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Lihat {tasks.length - 3} tugas lainnya...
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Monthly Contribution Heatmap Tracker */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Kontribusi Bulanan
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Riwayat centang aktivitas habit bulanan dengan filter kustom</p>
          </div>

          {/* Month/Year Selection Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.75 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.75 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Calendar Grid Layout */}
        <div className="w-full">
          <div className="grid grid-cols-7 gap-2.5 sm:gap-3.5 w-full">
            {/* Headers */}
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName) => (
              <div key={dayName} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1 select-none">
                {dayName}
              </div>
            ))}
            
            {/* Active and Padding Cells */}
            {calendarDays.map((day, idx) => {
              if (day.isPadding) {
                return (
                  <div key={idx} className="aspect-square w-full rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200/30 dark:border-slate-800/10" />
                );
              }
              
              return (
                <div
                  key={idx}
                  title={`${day.dateStr}: ${day.count} selesai`}
                  className={`aspect-square w-full rounded-2xl flex flex-col items-center justify-center relative group transition-all duration-200 border border-transparent shadow-xs hover:scale-105 hover:shadow-sm cursor-pointer ${
                    day.count === 0
                      ? 'bg-slate-50 dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-white'
                      : day.count === 1
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                      : day.count === 2
                      ? 'bg-emerald-300 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold'
                      : day.count === 3
                      ? 'bg-emerald-400 dark:bg-emerald-700 text-white font-bold'
                      : 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold">{day.dayNum}</span>
                  {day.count > 0 && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-current" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <span>Total Kontribusi Bulan Ini: {logs.filter(l => new Date(l.logged_date).getFullYear() === selectedYear && new Date(l.logged_date).getMonth() === selectedMonth).length} Aktivitas</span>
          <div className="flex items-center gap-1">
            <span>Kurang</span>
            <div className="w-2 h-2 rounded-[1px] bg-slate-100 dark:bg-slate-800" />
            <div className="w-2 h-2 rounded-[1px] bg-emerald-100 dark:bg-emerald-950/60" />
            <div className="w-2 h-2 rounded-[1px] bg-emerald-300 dark:bg-emerald-900" />
            <div className="w-2 h-2 rounded-[1px] bg-emerald-400 dark:bg-emerald-700" />
            <div className="w-2 h-2 rounded-[1px] bg-emerald-600 dark:bg-emerald-500" />
            <span>Lebih</span>
          </div>
        </div>
      </div>

      {/* Custom Verification Alert Modal for Daily Activities on Dashboard */}
      <AnimatePresence>
        {confirmingDailyActivity && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verifikasi Kegiatan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Apakah Anda yakin ingin menyelesaikan kegiatan:
                    <span className="block font-bold text-slate-800 dark:text-slate-100 mt-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      "{confirmingDailyActivity.activity_name}"
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDailyActivity(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    executeToggleDailyActivity(confirmingDailyActivity.id, confirmingDailyActivity.is_completed);
                    setConfirmingDailyActivity(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Ya, Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
