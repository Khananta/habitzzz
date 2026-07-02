'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Timer, 
  Bell, 
  Flame,
  Zap,
  CheckCircle2,
  Calendar,
  Loader2,
  Settings,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FocusPage() {
  const { user } = useAuth();
  
  // Timer Config States
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  
  // Active Timer States
  const [mode, setMode] = useState('focus'); // 'focus' or 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  // Settings Modal Toggle
  const [showConfig, setShowConfig] = useState(false);

  // Chime reference
  const chimeRef = useRef(null);

  // Stats States
  const [todaySessions, setTodaySessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // 1. Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, mode, focusMinutes, breakMinutes]);

  // Adjust time left when mode or duration config changes
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
    }
  }, [focusMinutes, breakMinutes, mode]);

  const handleModeChange = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Play chime and insert session on complete
  const handleTimerComplete = async () => {
    if (chimeRef.current) {
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(e => console.log('Audio autoplay blocked:', e));
    }

    if (mode === 'focus') {
      toast.success(`Selamat! Sesi fokus ${focusMinutes} menit selesai.`, {
        icon: '🎉',
        duration: 4000
      });

      // Save to Supabase
      if (user) {
        try {
          const { error } = await supabase
            .from('focus_sessions')
            .insert([
              { 
                user_id: user.id, 
                duration_minutes: focusMinutes 
              }
            ]);

          if (error) throw error;
          fetchTodayStats(); // Refresh stats
        } catch (err) {
          console.error('Error saving focus session:', err.message);
        }
      }

      // Toggle to break mode
      setMode('break');
      setTimeLeft(breakMinutes * 60);
    } else {
      toast.success('Waktu istirahat selesai! Siap untuk fokus kembali?', {
        icon: '💪',
        duration: 4000
      });
      setMode('focus');
      setTimeLeft(focusMinutes * 60);
    }
  };

  // 2. Custom Duration Validation and Setters
  const changeFocusDuration = (mins) => {
    if (isRunning) return;
    
    // Bounds check
    let validMins = Math.max(10, Math.min(60, mins || 25));
    setFocusMinutes(validMins);
  };

  const changeBreakDuration = (mins) => {
    if (isRunning) return;
    
    // Bounds check
    let validMins = Math.max(2, Math.min(30, mins || 5));
    setBreakMinutes(validMins);
  };

  // 3. Stats Logic
  useEffect(() => {
    if (user) {
      fetchTodayStats();
    }
  }, [user?.id]);

  const fetchTodayStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.toISOString();

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodaySessions(data || []);
    } catch (err) {
      console.error('Error fetching focus stats:', err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  // Circular progress calculations
  const totalSeconds = mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60;
  const percentage = (timeLeft / totalSeconds) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const totalFocusMinutesToday = todaySessions.reduce((acc, curr) => acc + curr.duration_minutes, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Hidden audio chime tag */}
      <audio ref={chimeRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Focus Room <Timer className="w-6 h-6 text-blue-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gunakan teknik Pomodoro dengan durasi kustom untuk menjaga produktivitas fokus Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Pomodoro Interface & Customization */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Pomodoro Timer Interface */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center relative overflow-hidden">
            
            {/* Top Toolbar: Mode Switcher & Settings Gear */}
            <div className="flex items-center justify-between w-full mb-8 gap-2">
              {/* Left spacer to center the switcher on desktop */}
              <div className="w-8.5 h-8.5 hidden sm:block"></div>

              {/* Mode Switcher */}
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                <button
                  onClick={() => handleModeChange('focus')}
                  className={`px-4 py-1.75 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'focus'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                  }`}
                >
                  Fokus ({focusMinutes}m)
                </button>
                <button
                  onClick={() => handleModeChange('break')}
                  className={`px-4 py-1.75 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'break'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                  }`}
                >
                  Istirahat ({breakMinutes}m)
                </button>
              </div>

              {/* Custom Settings button */}
              <button
                onClick={() => setShowConfig(true)}
                disabled={isRunning}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isRunning 
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 shadow-xs'
                }`}
                title="Atur Durasi Sesi"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Timer Ring */}
            <div className="relative w-64 h-64 flex items-center justify-center select-none">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-blue-500 transition-all duration-300"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-black text-slate-850 dark:text-white font-mono tracking-wider">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                  {mode === 'focus' ? (
                    <>
                      <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      Fokus
                    </>
                  ) : (
                    <>
                      <Flame className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" />
                      Istirahat
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4 mt-8 w-full max-w-xs">
              <button
                onClick={toggleTimer}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer shadow-md ${
                  isRunning
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-amber-500/10'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-blue-500/10'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Jeda
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Mulai
                  </>
                )}
              </button>
              <button
                onClick={resetTimer}
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-xs"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Daily Stats & History */}
        <div className="space-y-8">
          
          {/* Today Stats Summary Card */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-[28px] border border-blue-400/10 shadow-md flex flex-col justify-between gap-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <div className="space-y-4">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-100">Fokus Hari Ini</h3>
                <p className="text-3xl font-black mt-1 select-none">
                  {totalFocusMinutesToday} <span className="text-lg font-medium text-blue-200">Menit</span>
                </p>
              </div>
            </div>

            <div className="text-[10px] text-blue-200 font-medium">
              Target harian: 100 menit. {Math.round((totalFocusMinutesToday / 100) * 100)}% tercapai.
            </div>
          </div>

          {/* Session History Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Daftar Sesi Hari Ini ({todaySessions.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {loadingStats ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : todaySessions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Mulai sesi fokus pertamamu sekarang!</span>
                </div>
              ) : (
                todaySessions.map((session) => {
                  const sTime = new Date(session.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5.5 h-5.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350">Sesi Fokus</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{sTime} • {session.duration_minutes}m</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 4. Modal/Popup Pengaturan Sesi */}
      <AnimatePresence>
        {showConfig && !isRunning && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-5 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-500" />
                  Atur Durasi Sesi
                </h3>
                <button 
                  onClick={() => setShowConfig(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu Fokus (10 - 60 Menit)</label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={focusMinutes}
                    onChange={(e) => changeFocusDuration(parseInt(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu Istirahat (2 - 30 Menit)</label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={breakMinutes}
                    onChange={(e) => changeBreakDuration(parseInt(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center leading-normal">
                  * Batasan durasi diterapkan untuk menjaga kejujuran dan produktivitas Anda.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowConfig(false)}
                  className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98] text-center"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
