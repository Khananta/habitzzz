'use client';

import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ListTodo, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  CalendarRange,
  X,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Pencil
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// timezone-safe local date string formatting (YYYY-MM-DD)
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayLocalDateStr = () => {
  return formatLocalDate(new Date());
};

// Indonesian day and month names mapping
const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAY_SHORTS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Get dates of the current week (Monday to Sunday)
const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  // Monday is 1, Sunday is 0. Calculate difference to Monday.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + diffToMonday + i);
    const dateStr = formatLocalDate(d);
    
    week.push({
      name: DAY_NAMES[i],
      shortName: DAY_SHORTS[i],
      dateStr,
      isToday: dateStr === getTodayLocalDateStr(),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('id-ID', { month: 'short' })
    });
  }
  return week;
};

// Generate calendar days for a selected month/year grid
const getMonthlyCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6;
  
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  
  // Padding days at start
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push({ isPadding: true });
  }
  
  // Active days of the month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = formatLocalDate(d);
    calendarDays.push({
      isPadding: false,
      dayNum: day,
      dateStr
    });
  }

  // Padding days at end
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ isPadding: true });
  }

  return calendarDays;
};

export default function DailyActivityPage() {
  const { user } = useAuth();
  
  const [activities, setActivities] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Plan Modal state (Add Mode)
  const [showAddModal, setShowAddModal] = useState(false);
  const [planDate, setPlanDate] = useState(getTodayLocalDateStr());
  const [planName, setPlanName] = useState('');
  const [planTime, setPlanTime] = useState('');
  const [planLocation, setPlanLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal state
  const [editingActivity, setEditingActivity] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Verification dialog state
  const [confirmingActivity, setConfirmingActivity] = useState(null);
  const [confirmingDeleteActivity, setConfirmingDeleteActivity] = useState(null);

  // Monthly Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  
  // Date Details Modal state (clicked calendar date)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Mobile layout state: track which day index is active on mobile
  const weekDates = getCurrentWeekDates();
  const todayIdx = weekDates.findIndex(wd => wd.isToday);
  const [activeMobileDayIndex, setActiveMobileDayIndex] = useState(todayIdx !== -1 ? todayIdx : 0);

  useEffect(() => {
    if (!user) return;
    fetchActivities();
  }, [user?.id, calendarMonth, calendarYear]);

  const fetchActivities = async () => {
    setLoadingData(true);
    try {
      const startOfWeek = weekDates[0].dateStr;
      const endOfWeek = weekDates[6].dateStr;
      
      const startOfCalendarMonth = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`;
      const endOfCalendarMonth = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-31`;
      
      const datesArr = [startOfWeek, endOfWeek, startOfCalendarMonth, endOfCalendarMonth].sort();
      const minDate = datesArr[0];
      const maxDate = datesArr[datesArr.length - 1];

      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('activity_date', minDate)
        .lte('activity_date', maxDate)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err.message);
      toast.error('Gagal memuat data aktivitas.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error('Nama kegiatan tidak boleh kosong!');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Menambahkan kegiatan...');
    try {
      const { data, error } = await supabase
        .from('daily_activities')
        .insert([
          {
            user_id: user.id,
            activity_name: planName.trim(),
            activity_date: planDate,
            activity_time: planTime.trim() || null,
            location: planLocation.trim() || null,
            is_completed: false
          }
        ])
        .select();

      if (error) throw error;

      toast.success('Kegiatan berhasil direncanakan! 🎯', { id: toastId });
      setPlanName('');
      setPlanTime('');
      setPlanLocation('');
      setShowAddModal(false);
      
      if (data && data.length > 0) {
        setActivities(prev => [...prev, data[0]]);
      } else {
        fetchActivities();
      }
    } catch (err) {
      console.error('Error adding activity:', err.message);
      toast.error('Gagal menambahkan kegiatan.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (activity) => {
    setEditingActivity(activity);
    setEditName(activity.activity_name);
    setEditDate(activity.activity_date);
    setEditTime(activity.activity_time || '');
    setEditLocation(activity.location || '');
  };

  const handleEditActivitySubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Nama kegiatan tidak boleh kosong!');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Memperbarui kegiatan...');
    try {
      const { data, error } = await supabase
        .from('daily_activities')
        .update({
          activity_name: editName.trim(),
          activity_date: editDate,
          activity_time: editTime.trim() || null,
          location: editLocation.trim() || null,
        })
        .eq('id', editingActivity.id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      toast.success('Kegiatan berhasil diperbarui! 📝', { id: toastId });
      setEditingActivity(null);
      
      if (data && data.length > 0) {
        setActivities(prev => prev.map(act => act.id === editingActivity.id ? data[0] : act));
      } else {
        fetchActivities();
      }
    } catch (err) {
      console.error('Error updating activity:', err.message);
      toast.error('Gagal memperbarui kegiatan.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddActivityFromDetails = async (e) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error('Nama kegiatan tidak boleh kosong!');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Menambahkan kegiatan...');
    try {
      const { data, error } = await supabase
        .from('daily_activities')
        .insert([
          {
            user_id: user.id,
            activity_name: planName.trim(),
            activity_date: selectedCalendarDate,
            activity_time: planTime.trim() || null,
            location: planLocation.trim() || null,
            is_completed: false
          }
        ])
        .select();

      if (error) throw error;

      toast.success('Kegiatan berhasil ditambahkan! 🎯', { id: toastId });
      setPlanName('');
      setPlanTime('');
      setPlanLocation('');
      
      if (data && data.length > 0) {
        setActivities(prev => [...prev, data[0]]);
      } else {
        fetchActivities();
      }
    } catch (err) {
      console.error('Error adding activity:', err.message);
      toast.error('Gagal menambahkan kegiatan.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleClick = (activity) => {
    if (!activity.is_completed) {
      setConfirmingActivity(activity);
    } else {
      executeToggleComplete(activity.id, activity.is_completed);
    }
  };

  const executeToggleComplete = async (activityId, currentStatus) => {
    const targetStatus = !currentStatus;
    
    // Optimistic update
    setActivities(prev => 
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
    } catch (err) {
      console.error('Error toggling activity status:', err.message);
      toast.error('Gagal memperbarui status kegiatan.');
      // Rollback
      setActivities(prev => 
        prev.map(act => act.id === activityId ? { ...act, is_completed: currentStatus } : act)
      );
    }
  };

  const handleDeleteActivity = async (activityId) => {
    const originalActivities = [...activities];
    
    // Optimistic update
    setActivities(prev => prev.filter(act => act.id !== activityId));

    try {
      const { error } = await supabase
        .from('daily_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Kegiatan berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting activity:', err.message);
      toast.error('Gagal menghapus kegiatan.');
      // Rollback
      setActivities(originalActivities);
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const calendarDays = getMonthlyCalendarDays(calendarYear, calendarMonth);

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-600 animate-pulse" />
            Daily Activity
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agenda Mingguan & Perencanaan Bulanan: {todayDateFormatted}
          </p>
        </div>

        <button
          onClick={() => {
            setPlanDate(getTodayLocalDateStr());
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/15 active:scale-[0.98] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Plan Kegiatan
        </button>
      </div>

      {/* 2. Mobile Day Selector Tab Strip (Visible on mobile only) */}
      <div className="flex md:hidden overflow-x-auto gap-2 pb-2.5 mb-2 scrollbar-hidden select-none">
        {weekDates.map((wd, dayIdx) => (
          <button
            key={wd.dateStr}
            onClick={() => setActiveMobileDayIndex(dayIdx)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeMobileDayIndex === dayIdx
                ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-sm shadow-blue-500/15'
                : wd.isToday
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                : 'bg-white dark:bg-slate-900 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {wd.shortName} ({wd.dayNum})
          </button>
        ))}
      </div>

      {/* 3. Main Weekly Columns Grid */}
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bentar euy, loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {weekDates.map((wd, dayIdx) => {
            const dayActivities = activities
              .filter(act => act.activity_date === wd.dateStr)
              .sort((a, b) => {
                if (a.is_completed === b.is_completed) {
                  return new Date(a.created_at) - new Date(b.created_at);
                }
                return a.is_completed ? 1 : -1;
              });
            const maxVisible = 3;
            const visibleActivities = dayActivities.slice(0, maxVisible);
            
            return (
              <div 
                key={wd.dateStr}
                className={`bg-white dark:bg-slate-900 rounded-[28px] p-5 flex flex-col gap-4.5 min-h-[340px] transition-all duration-300 border ${
                  dayIdx === activeMobileDayIndex ? 'flex' : 'hidden md:flex'
                } ${
                  wd.isToday 
                    ? 'border-2 border-blue-500 shadow-md shadow-blue-500/10 dark:shadow-blue-500/5' 
                    : 'border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${wd.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {wd.name}
                      </h3>
                      {wd.isToday && (
                        <span className="text-[8px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{wd.dayNum} {wd.monthShort}</p>
                  </div>

                  <button
                    onClick={() => {
                      setPlanDate(wd.dateStr);
                      setShowAddModal(true);
                    }}
                    className="w-7 h-7 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 flex items-center justify-center transition-all cursor-pointer"
                    title={`Tambah kegiatan untuk hari ${wd.name}`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Day Activities List */}
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] scrollbar-hidden">
                  {visibleActivities.map(activity => (
                    <div 
                      key={activity.id}
                      className={`flex flex-col p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 shadow-3xs hover:shadow-2xs transition-all ${
                        activity.is_completed ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100/30 dark:border-emerald-900/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 w-full">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleClick(activity)}
                            className="focus:outline-none flex-shrink-0 cursor-pointer mt-0.5"
                          >
                            {activity.is_completed ? (
                              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3.5]" />
                              </div>
                            ) : (
                              <div className="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-blue-500 transition-colors bg-white dark:bg-slate-800" />
                            )}
                          </button>
                          <span className={`text-xs leading-snug break-words pr-2 transition-all ${
                            activity.is_completed 
                              ? 'line-through text-slate-400 dark:text-slate-500 font-medium' 
                              : 'text-slate-800 dark:text-slate-200 font-semibold'
                          }`}>
                            {activity.activity_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditClick(activity)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteActivity(activity)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Time and Location Sub-badges */}
                      {(activity.activity_time || activity.location) && (
                        <div className="flex flex-wrap gap-2 items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 text-[9px] text-slate-400">
                          {activity.activity_time && (
                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium border border-slate-200/50 dark:border-slate-700">
                              <Clock className="w-2.5 h-2.5 text-blue-500" />
                              {activity.activity_time}
                            </span>
                          )}
                          {activity.location && (
                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium border border-slate-200/50 dark:border-slate-700 truncate max-w-[150px]" title={activity.location}>
                              <MapPin className="w-2.5 h-2.5 text-rose-500" />
                              {activity.location}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {dayActivities.length === 0 && (
                    <div className="text-center py-12 text-[10px] text-slate-400 dark:text-slate-505 border border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-2xl bg-slate-50/10 dark:bg-slate-950/5 select-none">
                      Belum ada agenda
                    </div>
                  )}
                </div>

                {/* View All Button if exceeds limit */}
                {dayActivities.length > maxVisible && (
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate(wd.dateStr)}
                    className="w-full text-center py-2 text-[10px] font-bold text-blue-600 dark:text-blue-450 hover:text-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 rounded-xl transition-all cursor-pointer mt-1"
                  >
                    Lihat Semua ({dayActivities.length} kegiatan)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Kalender Riwayat Kegiatan (Monthly view) */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Riwayat & Kalender Bulanan
        </h2>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">Kalender Riwayat Kegiatan</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Pantau riwayat plan bulanan dan klik tanggal untuk detail agenda</p>
            </div>

            {/* Month/Year Selection Filters */}
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={calendarMonth}
                onChange={(e) => setCalendarMonth(Number(e.target.value))}
                className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.75 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
              
              <select
                value={calendarYear}
                onChange={(e) => setCalendarYear(Number(e.target.value))}
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
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName) => (
                <div key={dayName} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider py-1 select-none">
                  {dayName}
                </div>
              ))}
              
              {calendarDays.map((day, idx) => {
                if (day.isPadding) {
                  return (
                    <div key={idx} className="aspect-square w-full rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200/30 dark:border-slate-800/10" />
                  );
                }

                const dayTasks = activities.filter(act => act.activity_date === day.dateStr);
                const completedCount = dayTasks.filter(t => t.is_completed).length;
                const hasTasks = dayTasks.length > 0;
                const allCompleted = hasTasks && completedCount === dayTasks.length;
                const isToday = day.dateStr === getTodayLocalDateStr();

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCalendarDate(day.dateStr)}
                    title={`${day.dateStr}: ${dayTasks.length} agenda`}
                    className={`aspect-square w-full rounded-2xl flex flex-col items-center justify-center relative group transition-all duration-200 border cursor-pointer ${
                      isToday
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-transparent'
                    } ${
                      !hasTasks
                        ? 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white'
                        : allCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/50'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold">{day.dayNum}</span>
                    {hasTasks && (
                      <div className="absolute bottom-1.5 flex gap-0.5 justify-center">
                        {dayTasks.slice(0, 3).map((t, tIdx) => (
                          <span 
                            key={tIdx} 
                            className={`w-1 h-1 rounded-full ${
                              t.is_completed ? 'bg-emerald-500' : 'bg-blue-500'
                            }`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modal/Popup Tambah Kegiatan */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-blue-500" />
                  Tambah Plan Kegiatan
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Tanggal</label>
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu (Opsional)</label>
                    <input
                      type="time"
                      value={planTime}
                      onChange={(e) => setPlanTime(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempat (Opsional)</label>
                    <input
                      type="text"
                      value={planLocation}
                      onChange={(e) => setPlanLocation(e.target.value)}
                      placeholder="Lokasi..."
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Kegiatan</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Contoh: Belajar Next.js, Beli sayur..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-medium placeholder-slate-400 dark:placeholder-slate-550 transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    Simpan Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Modal/Popup Edit Kegiatan */}
      <AnimatePresence>
        {editingActivity && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-blue-500" />
                  Edit Plan Kegiatan
                </h3>
                <button 
                  onClick={() => setEditingActivity(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditActivitySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Tanggal</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu (Opsional)</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempat (Opsional)</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Lokasi..."
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Kegiatan</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Contoh: Belajar Next.js..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-medium placeholder-slate-400 dark:placeholder-slate-550 transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingActivity(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Modal/Popup Detail Tanggal Kalender (Manage Date Activities) */}
      <AnimatePresence>
        {selectedCalendarDate && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Detail Agenda
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    {new Date(selectedCalendarDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCalendarDate(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List of activities for selected calendar date */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1 scrollbar-hidden">
                {activities
                  .filter(act => act.activity_date === selectedCalendarDate)
                  .sort((a, b) => {
                    if (a.is_completed === b.is_completed) {
                      return new Date(a.created_at) - new Date(b.created_at);
                    }
                    return a.is_completed ? 1 : -1;
                  })
                  .map(activity => (
                  <div 
                    key={activity.id}
                    className={`flex flex-col p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/85 bg-slate-50/30 dark:bg-slate-900/40 shadow-3xs ${
                      activity.is_completed ? 'bg-emerald-50/20 border-emerald-100/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5 w-full">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleClick(activity)}
                          className="focus:outline-none flex-shrink-0 cursor-pointer mt-0.5"
                        >
                          {activity.is_completed ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 hover:border-blue-500 transition-colors bg-white dark:bg-slate-800" />
                          )}
                        </button>
                        <span className={`text-xs leading-snug break-words pr-2 ${
                          activity.is_completed ? 'line-through text-slate-400 font-medium' : 'text-slate-800 dark:text-slate-200 font-semibold'
                        }`}>
                          {activity.activity_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCalendarDate(null);
                            handleEditClick(activity);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteActivity(activity)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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

                {activities.filter(act => act.activity_date === selectedCalendarDate).length === 0 && (
                  <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-550 border border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-xl bg-slate-50/10">
                    Belum ada agenda direncanakan.
                  </p>
                )}
              </div>

              {/* Add form inside details modal */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Tambah Agenda Cepat</span>
                <form onSubmit={handleAddActivityFromDetails} className="space-y-3">
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Nama kegiatan..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={planTime}
                      onChange={(e) => setPlanTime(e.target.value)}
                      className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    />
                    <input
                      type="text"
                      value={planLocation}
                      onChange={(e) => setPlanLocation(e.target.value)}
                      placeholder="Lokasi..."
                      className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    Simpan Agenda
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Custom Verification Alert Modal */}
      <AnimatePresence>
        {confirmingActivity && (
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
                      "{confirmingActivity.activity_name}"
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingActivity(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    executeToggleComplete(confirmingActivity.id, confirmingActivity.is_completed);
                    setConfirmingActivity(null);
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

      {/* Custom Delete Verification Modal */}
      <AnimatePresence>
        {confirmingDeleteActivity && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-955 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto animate-pulse">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hapus Kegiatan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Apakah Anda yakin ingin menghapus kegiatan ini secara permanen?
                    <span className="block font-bold text-slate-800 dark:text-slate-100 mt-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      "{confirmingDeleteActivity.activity_name}"
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDeleteActivity(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    handleDeleteActivity(confirmingDeleteActivity.id);
                    setConfirmingDeleteActivity(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
