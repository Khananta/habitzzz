'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  AlertCircle, 
  Dumbbell,
  Calendar, 
  Check, 
  X, 
  Loader2,
  Clipboard,
  Sparkles,
  Award,
  Clock,
  List,
  LayoutGrid,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
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

const DAYS_INDONESIAN = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Helper for muscle group emoji icons
const getMuscleGroupIcon = (group) => {
  switch (group) {
    case 'Upper Body': return '🏋️';
    case 'Leg Day': return '🦵';
    case 'Push': return '👊';
    case 'Pull': return '👐';
    case 'Core': return '🧘';
    case 'Cardio': return '🏃';
    case 'Rest Day': return '🛌';
    default: return '💪';
  }
};

export default function GymSchedulePage() {
  const { user } = useAuth();
  
  // Data States
  const [exercises, setExercises] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNeedsMigration, setTableNeedsMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Active Tab & Layout Modes
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'schedule', 'shelf'
  const [shelfLayoutMode, setShelfLayoutMode] = useState('grid'); // 'list' or 'grid'

  // Modal States
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleEditModalOpen, setScheduleEditModalOpen] = useState(false);
  const [editingScheduleStep, setEditingScheduleStep] = useState(null);

  // Form - Exercise Fields
  const [exName, setExName] = useState('');
  const [exMuscleGroup, setExMuscleGroup] = useState('Upper Body');
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState('12 Reps');
  const [exNotes, setExNotes] = useState('');

  // Form - Schedule Fields (supports multi-select)
  const [schedExIds, setSchedExIds] = useState([]); // Selected exercise IDs for bulk add
  const [schedDays, setSchedDays] = useState([false, false, false, false, false, false, false]); // Mon-Sun
  const [schedTime, setSchedTime] = useState('AM'); // 'AM' or 'PM'

  // Form - Schedule Edit Fields
  const [editSchedExId, setEditSchedExId] = useState('');
  const [editSchedTime, setEditSchedTime] = useState('AM');
  const [editSchedDay, setEditSchedDay] = useState(0);

  // Drag state
  const [draggedStepId, setDraggedStepId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Load layout mode preference from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('gym_shelf_layout_mode');
    if (savedMode === 'list' || savedMode === 'grid') {
      setShelfLayoutMode(savedMode);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setTableNeedsMigration(false);
    try {
      // 1. Fetch exercises
      const { data: exData, error: exError } = await supabase
        .from('gym_exercises')
        .select('*')
        .order('name', { ascending: true });

      if (exError) {
        if (exError.code === 'PGRST116' || exError.message.includes('relation "gym_exercises" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw exError;
      }
      setExercises(exData || []);

      // 2. Fetch schedules
      const { data: schedData, error: schedError } = await supabase
        .from('gym_schedule')
        .select(`
          *,
          gym_exercises (
            id,
            name,
            muscle_group,
            sets,
            reps
          )
        `)
        .order('order_index', { ascending: true });

      if (schedError) {
        if (schedError.code === 'PGRST116' || schedError.message.includes('relation "gym_schedule" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw schedError;
      }
      setSchedule(schedData || []);

      // 3. Fetch logs
      const { data: logData, error: logError } = await supabase
        .from('gym_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_date', { ascending: false });

      if (logError) {
        if (logError.code === 'PGRST116' || logError.message.includes('relation "gym_logs" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw logError;
      }
      setLogs(logData || []);

    } catch (err) {
      console.error('Error fetching gym schedule data:', err.message);
      toast.error('Gagal memuat data jadwal gym.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = () => {
    const sqlQuery = `-- 1. Tabel Daftar Gerakan Latihan Gym
CREATE TABLE IF NOT EXISTS public.gym_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  muscle_group text NOT NULL,
  sets integer DEFAULT 3 NOT NULL,
  reps text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own gym exercises" ON public.gym_exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Tabel Jadwal Latihan Mingguan
CREATE TABLE IF NOT EXISTS public.gym_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL,
  routine_time text NOT NULL,
  exercise_id uuid REFERENCES public.gym_exercises(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.gym_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own gym schedule" ON public.gym_schedule FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Tabel Log Penyelesaian Latihan
CREATE TABLE IF NOT EXISTS public.gym_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date DEFAULT CURRENT_DATE NOT NULL,
  routine_time text NOT NULL,
  workout_feeling text DEFAULT 'Fit' NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_date_routine_gym UNIQUE (user_id, logged_date, routine_time)
);

ALTER TABLE public.gym_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own gym logs" ON public.gym_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    toast.success('Skrip SQL berhasil disalin!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Exercise CRUD
  const handleOpenExerciseModal = (ex = null) => {
    if (ex) {
      setEditingExercise(ex);
      setExName(ex.name);
      setExMuscleGroup(ex.muscle_group);
      setExSets(ex.sets);
      setExReps(ex.reps);
      setExNotes(ex.notes || '');
    } else {
      setEditingExercise(null);
      setExName('');
      setExMuscleGroup('Upper Body');
      setExSets(3);
      setExReps('12 Reps');
      setExNotes('');
    }
    setExerciseModalOpen(true);
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: exName.trim(),
      muscle_group: exMuscleGroup,
      sets: Number(exSets),
      reps: exReps.trim(),
      notes: exNotes.trim() || null
    };

    const tid = toast.loading(editingExercise ? 'Memperbarui latihan...' : 'Menambahkan latihan...');
    try {
      if (editingExercise) {
        const { error } = await supabase
          .from('gym_exercises')
          .update(payload)
          .eq('id', editingExercise.id);
        if (error) throw error;
        toast.success('Gerakan latihan diperbarui!', { id: tid });
      } else {
        const { error } = await supabase
          .from('gym_exercises')
          .insert([payload]);
        if (error) throw error;
        toast.success('Gerakan baru berhasil ditambahkan!', { id: tid });
      }
      setExerciseModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses gerakan.', { id: tid });
    }
  };

  const handleDeleteExercise = async (id, name) => {
    const confirm = await Swal.fire({
      title: 'Hapus Gerakan Latihan?',
      text: `Apakah Anda yakin ingin menghapus "${name}"? Tindakan ini juga akan menghapus gerakan ini dari seluruh jadwal rutin gym Anda.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
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

    try {
      const { error } = await supabase
        .from('gym_exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Gerakan berhasil dihapus.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus gerakan.');
    }
  };

  // Schedule CRUD (with bulk selection and validation checks)
  const handleOpenScheduleModal = () => {
    if (exercises.length === 0) {
      toast.error('Silakan tambahkan gerakan latihan ke Daftar Latihan terlebih dahulu!');
      return;
    }
    setSchedExIds([]);
    setSchedDays([false, false, false, false, false, false, false]);
    setSchedTime('AM');
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const selectedDays = schedDays.map((val, idx) => val ? idx : null).filter(val => val !== null);
    if (selectedDays.length === 0) {
      toast.error('Silakan pilih minimal 1 hari jadwal!');
      return;
    }

    if (schedExIds.length === 0) {
      toast.error('Silakan pilih minimal 1 gerakan latihan!');
      return;
    }

    // Validation checks
    for (const day of selectedDays) {
      const dayName = DAYS_INDONESIAN[day];
      
      for (const exId of schedExIds) {
        const exObj = exercises.find(e => e.id === exId);
        if (!exObj) continue;

        // Check if exact same exercise already exists on that day and session time
        const isAlreadyAdded = schedule.some(s => 
          s.day_of_week === day && 
          s.routine_time === schedTime && 
          s.exercise_id === exId
        );
        if (isAlreadyAdded) {
          toast.error(`Latihan "${exObj.name}" sudah ada di jadwal ${dayName} ${schedTime === 'AM' ? 'Pagi' : 'Sore/Malam'}!`);
          return;
        }
      }
    }

    const tid = toast.loading('Menyusun jadwal gym...');
    try {
      const inserts = [];
      selectedDays.forEach(day => {
        const currentCount = schedule.filter(s => s.day_of_week === day && s.routine_time === schedTime).length;
        
        schedExIds.forEach((exId, index) => {
          inserts.push({
            user_id: user.id,
            day_of_week: day,
            routine_time: schedTime,
            exercise_id: exId,
            order_index: currentCount + index + 1
          });
        });
      });

      const { error } = await supabase
        .from('gym_schedule')
        .insert(inserts);

      if (error) throw error;
      toast.success('Jadwal gym berhasil diperbarui!', { id: tid });
      setScheduleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan jadwal.', { id: tid });
    }
  };

  // Open Edit Schedule Step
  const handleOpenEditScheduleModal = (step) => {
    setEditingScheduleStep(step);
    setEditSchedExId(step.exercise_id);
    setEditSchedTime(step.routine_time);
    setEditSchedDay(step.day_of_week);
    setScheduleEditModalOpen(true);
  };

  const handleEditScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !editingScheduleStep) return;

    const exObj = exercises.find(ex => ex.id === editSchedExId);
    if (!exObj) return;

    // 1. Same exercise check
    const isAlreadyAdded = schedule.some(s => 
      s.id !== editingScheduleStep.id &&
      s.day_of_week === editSchedDay && 
      s.routine_time === editSchedTime && 
      s.exercise_id === editSchedExId
    );
    if (isAlreadyAdded) {
      toast.error(`Latihan "${exObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[editSchedDay]} ${editSchedTime === 'AM' ? 'Pagi' : 'Sore/Malam'}!`);
      return;
    }

    const tid = toast.loading('Mengupdate jadwal latihan...');
    try {
      const { error } = await supabase
        .from('gym_schedule')
        .update({
          exercise_id: editSchedExId,
          routine_time: editSchedTime,
          day_of_week: editSchedDay
        })
        .eq('id', editingScheduleStep.id);

      if (error) throw error;
      toast.success('Jadwal latihan berhasil diperbarui!', { id: tid });
      setScheduleEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui jadwal latihan.', { id: tid });
    }
  };

  const handleDeleteSchedule = async (schedId) => {
    const oldSchedule = [...schedule];
    setSchedule(schedule.filter(s => s.id !== schedId));

    try {
      const { error } = await supabase
        .from('gym_schedule')
        .delete()
        .eq('id', schedId);
      if (error) throw error;
      toast.success('Langkah latihan dilepas.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal melepas langkah latihan.');
      setSchedule(oldSchedule); // Rollback
    }
  };

  // Reorder Schedule steps using mobile arrows (Optimistic UI)
  const handleMoveStep = async (step, direction) => {
    const oldSchedule = [...schedule];
    const groupSorted = [...schedule.filter(s => s.day_of_week === step.day_of_week && s.routine_time === step.routine_time)]
      .sort((a, b) => a.order_index - b.order_index);

    const idx = groupSorted.findIndex(s => s.id === step.id);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = groupSorted[idx - 1];
      groupSorted[idx - 1] = groupSorted[idx];
      groupSorted[idx] = temp;
    } else if (direction === 'down' && idx < groupSorted.length - 1) {
      const temp = groupSorted[idx + 1];
      groupSorted[idx + 1] = groupSorted[idx];
      groupSorted[idx] = temp;
    } else {
      return;
    }

    // Apply Optimistic update locally
    const updatedGroup = groupSorted.map((s, index) => ({ ...s, order_index: index + 1 }));
    const newSchedule = schedule.map(s => {
      const match = updatedGroup.find(ug => ug.id === s.id);
      return match ? match : s;
    });
    setSchedule(newSchedule);

    try {
      const promises = updatedGroup.map((s) => {
        return supabase
          .from('gym_schedule')
          .update({ order_index: s.order_index })
          .eq('id', s.id);
      });
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengubah urutan.');
      setSchedule(oldSchedule); // Rollback
    }
  };

  // HTML5 Drag and Drop handlers (Optimistic UI + Validation)
  const handleDragStart = (e, stepId) => {
    e.dataTransfer.setData('text/plain', stepId);
    setDraggedStepId(stepId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStep) => {
    e.preventDefault();
    const sourceStepId = e.dataTransfer.getData('text/plain') || draggedStepId;
    if (!sourceStepId || sourceStepId === targetStep.id) return;

    const sourceStep = schedule.find(s => s.id === sourceStepId);
    if (!sourceStep) return;

    const oldSchedule = [...schedule];

    // Dragged to a different day/time group
    if (sourceStep.day_of_week !== targetStep.day_of_week || sourceStep.routine_time !== targetStep.routine_time) {
      const exObj = exercises.find(ex => ex.id === sourceStep.exercise_id);
      if (!exObj) return;

      // 1. Same exercise duplication check
      const isAlreadyAdded = schedule.some(s => 
        s.id !== sourceStepId &&
        s.day_of_week === targetStep.day_of_week && 
        s.routine_time === targetStep.routine_time && 
        s.exercise_id === sourceStep.exercise_id
      );
      if (isAlreadyAdded) {
        toast.error(`Latihan "${exObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[targetStep.day_of_week]} ${targetStep.routine_time === 'AM' ? 'Pagi' : 'Sore/Malam'}!`);
        return;
      }

      const targetSteps = schedule.filter(s => s.day_of_week === targetStep.day_of_week && s.routine_time === targetStep.routine_time);
      const newOrderIndex = targetSteps.length + 1;
      
      // Apply Optimistic state change
      const updatedSteps = schedule.map(s => {
        if (s.id === sourceStepId) {
          return { ...s, day_of_week: targetStep.day_of_week, routine_time: targetStep.routine_time, order_index: newOrderIndex };
        }
        return s;
      });
      setSchedule(updatedSteps);

      try {
        const { error } = await supabase
          .from('gym_schedule')
          .update({
            day_of_week: targetStep.day_of_week,
            routine_time: targetStep.routine_time,
            order_index: newOrderIndex
          })
          .eq('id', sourceStepId);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        toast.error('Gagal memindahkan latihan.');
        setSchedule(oldSchedule); // Rollback
      }
      return;
    }

    // Reorder inside the same cell
    const groupSorted = [...schedule.filter(s => s.day_of_week === targetStep.day_of_week && s.routine_time === targetStep.routine_time)]
      .sort((a, b) => a.order_index - b.order_index);

    const sourceIdx = groupSorted.findIndex(s => s.id === sourceStep.id);
    const targetIdx = groupSorted.findIndex(s => s.id === targetStep.id);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = groupSorted.splice(sourceIdx, 1);
    groupSorted.splice(targetIdx, 0, moved);

    // Apply Optimistic local update
    const updatedGroup = groupSorted.map((s, index) => ({ ...s, order_index: index + 1 }));
    const newSchedule = schedule.map(s => {
      const match = updatedGroup.find(ug => ug.id === s.id);
      return match ? match : s;
    });
    setSchedule(newSchedule);

    try {
      const promises = updatedGroup.map((s) => {
        return supabase
          .from('gym_schedule')
          .update({ order_index: s.order_index })
          .eq('id', s.id);
      });
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui urutan.');
      setSchedule(oldSchedule); // Rollback
    }
  };

  const handleDropEmpty = async (e, dayIdx, routineTime) => {
    e.preventDefault();
    const sourceStepId = e.dataTransfer.getData('text/plain') || draggedStepId;
    if (!sourceStepId) return;

    const sourceStep = schedule.find(s => s.id === sourceStepId);
    if (!sourceStep) return;

    const exObj = exercises.find(ex => ex.id === sourceStep.exercise_id);
    if (!exObj) return;

    // 1. Same exercise duplication check
    const isAlreadyAdded = schedule.some(s => 
      s.id !== sourceStepId &&
      s.day_of_week === dayIdx && 
      s.routine_time === routineTime && 
      s.exercise_id === sourceStep.exercise_id
    );
    if (isAlreadyAdded) {
      toast.error(`Latihan "${exObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[dayIdx]} ${routineTime === 'AM' ? 'Pagi' : 'Sore/Malam'}!`);
      return;
    }

    const oldSchedule = [...schedule];

    // Optimistically update Day / Routine time
    const updatedSteps = schedule.map(s => {
      if (s.id === sourceStepId) {
        return { ...s, day_of_week: dayIdx, routine_time: routineTime, order_index: 1 };
      }
      return s;
    });
    setSchedule(updatedSteps);

    try {
      const { error } = await supabase
        .from('gym_schedule')
        .update({
          day_of_week: dayIdx,
          routine_time: routineTime,
          order_index: 1
        })
        .eq('id', sourceStepId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Gagal memindahkan langkah.');
      setSchedule(oldSchedule); // Rollback
    }
  };

  // Workout Centang Logger (Direct Logging with Optimistic UI + XP reward)
  const handleLogDirect = async (routineTime) => {
    if (!user) return;

    const todayDateStr = formatLocalDate(new Date());
    const tempLogId = `temp-${Date.now()}`;
    const newLogItem = {
      id: tempLogId,
      user_id: user.id,
      logged_date: todayDateStr,
      routine_time: routineTime,
      workout_feeling: 'Fit',
      notes: null,
      created_at: new Date().toISOString()
    };
    
    const oldLogs = [...logs];
    setLogs([newLogItem, ...logs]);

    const tid = toast.loading('Mencatat sesi latihan gym...');
    try {
      const { error } = await supabase
        .from('gym_logs')
        .insert([{
          user_id: user.id,
          logged_date: todayDateStr,
          routine_time: routineTime,
          workout_feeling: 'Fit',
          notes: null
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Sesi gym ini sudah Anda centang hari ini!', { id: tid });
          setLogs(oldLogs);
          return;
        }
        throw error;
      }
      toast.success('Latihan selesai! +1 XP ditambahkan ke Level Dasbor 🎯', { id: tid });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat penyelesaian latihan.', { id: tid });
      setLogs(oldLogs); // Rollback
    }
  };

  const handleDeleteLog = async (logId) => {
    const confirm = await Swal.fire({
      title: 'Hapus Riwayat Latihan?',
      text: 'Apakah Anda yakin ingin menghapus log penyelesaian gym ini? Pengurangan XP akan disesuaikan pada dasbor utama.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
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

    try {
      const { error } = await supabase
        .from('gym_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
      toast.success('Penyelesaian sesi gym dibatalkan.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus log.');
    }
  };

  // Precomputations
  const todayDay = new Date().getDay(); // 0-6
  const todayDateStr = formatLocalDate(new Date());

  const todayAmSchedule = schedule
    .filter(s => s.day_of_week === todayDay && s.routine_time === 'AM')
    .sort((a, b) => a.order_index - b.order_index);
  const todayPmSchedule = schedule
    .filter(s => s.day_of_week === todayDay && s.routine_time === 'PM')
    .sort((a, b) => a.order_index - b.order_index);

  const todayAmLog = logs.find(l => l.logged_date === todayDateStr && l.routine_time === 'AM');
  const todayPmLog = logs.find(l => l.logged_date === todayDateStr && l.routine_time === 'PM');

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Gym Schedule</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Susun jadwal latihan angkat beban, kelompokkan berdasarkan muscle group (Upper, Legday, Pull, Push), dan catat penyelesaian latihan untuk klaim XP.
          </p>
        </div>

        {!tableNeedsMigration && (
          <div className="flex gap-2.5 w-full sm:w-auto">
            {activeTab === 'shelf' ? (
              <button
                onClick={() => handleOpenExerciseModal(null)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Tambah Gerakan
              </button>
            ) : activeTab === 'schedule' ? (
              <button
                onClick={handleOpenScheduleModal}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <Calendar className="w-4 h-4" />
                Tambah Jadwal Latihan
              </button>
            ) : null}
          </div>
        )}
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
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Fitur Gym Schedule memerlukan tiga tabel baru di Supabase (`gym_exercises`, `gym_schedule`, dan `gym_logs`). Jalankan query SQL di bawah ini pada editor SQL Supabase Anda.
              </p>
            </div>
          </div>
          
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">create_gym_tables.sql</span>
              <button 
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {copiedSql ? 'Disalin!' : 'Salin SQL'}
              </button>
            </div>
            <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 scrollbar-hidden">
              <code>{`CREATE TABLE public.gym_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  muscle_group text NOT NULL,
  sets integer DEFAULT 3 NOT NULL,
  reps text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.gym_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL,
  routine_time text NOT NULL,
  exercise_id uuid REFERENCES public.gym_exercises(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.gym_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date DEFAULT CURRENT_DATE NOT NULL,
  routine_time text NOT NULL,
  workout_feeling text DEFAULT 'Fit' NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_date_routine_gym UNIQUE (user_id, logged_date, routine_time)
);`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!tableNeedsMigration && (
        <>
          {/* Tab Navigation & Shelf Layout Toggler */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tab Navigation */}
            <div className="flex gap-1 overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs max-w-max">
              {[
                { id: 'today', label: 'Hari Ini', icon: Check },
                { id: 'schedule', label: 'Jadwal Mingguan', icon: Calendar },
                { id: 'shelf', label: 'Daftar Latihan', icon: Dumbbell }
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Layout Toggler (Only for Shelf tab) */}
            {activeTab === 'shelf' && exercises.length > 0 && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs self-start sm:self-auto">
                <button
                  onClick={() => { setShelfLayoutMode('list'); localStorage.setItem('gym_shelf_layout_mode', 'list'); }}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    shelfLayoutMode === 'list'
                      ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                      : 'text-slate-400 hover:text-slate-755 dark:text-slate-500 dark:hover:text-slate-355'
                  }`}
                  title="Tampilan Tabel"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShelfLayoutMode('grid'); localStorage.setItem('gym_shelf_layout_mode', 'grid'); }}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    shelfLayoutMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                      : 'text-slate-400 hover:text-slate-755 dark:text-slate-500 dark:hover:text-slate-355'
                  }`}
                  title="Tampilan Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tab Content Display */}
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Memuat jadwal gym...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'today' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* AM Routine Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5 relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌅</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sesi Pagi (AM)</h3>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500">Latihan pagi hari - Segar & Berenergi</p>
                          </div>
                        </div>

                        {todayAmLog ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-0.5">
                              Selesai
                            </span>
                            <button
                              onClick={() => handleDeleteLog(todayAmLog.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan centang"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Belum centang</span>
                        )}
                      </div>

                      {/* Product Steps list */}
                      <div className="space-y-2.5">
                        {todayAmSchedule.length > 0 ? (
                          todayAmSchedule.map((step, idx) => (
                            <div key={step.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                              <span className="text-[10px] font-extrabold w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.gym_exercises?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.gym_exercises?.muscle_group} ({step.gym_exercises?.sets} Sets x {step.gym_exercises?.reps})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Tidak ada latihan dijadwalkan Pagi ini.</p>
                        )}
                      </div>
                    </div>

                    {todayAmSchedule.length > 0 && !todayAmLog && (
                      <button
                        onClick={() => handleLogDirect('AM')}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Tandai Selesai Sesi Pagi
                      </button>
                    )}
                  </div>

                  {/* PM Routine Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5 relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌃</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sesi Sore/Malam (PM)</h3>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500">Latihan sore/malam - Pelepasan Stres</p>
                          </div>
                        </div>

                        {todayPmLog ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-0.5">
                              Selesai
                            </span>
                            <button
                              onClick={() => handleDeleteLog(todayPmLog.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-650 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan centang"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Belum centang</span>
                        )}
                      </div>

                      {/* Product Steps list */}
                      <div className="space-y-2.5">
                        {todayPmSchedule.length > 0 ? (
                          todayPmSchedule.map((step, idx) => (
                            <div key={step.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                              <span className="text-[10px] font-extrabold w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.gym_exercises?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.gym_exercises?.muscle_group} ({step.gym_exercises?.sets} Sets x {step.gym_exercises?.reps})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Tidak ada latihan dijadwalkan Sore/Malam ini.</p>
                        )}
                      </div>
                    </div>

                    {todayPmSchedule.length > 0 && !todayPmLog && (
                      <button
                        onClick={() => handleLogDirect('PM')}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Tandai Selesai Sesi Sore/Malam
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'schedule' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs overflow-x-auto">
                    <p className="text-[10px] text-slate-405 dark:text-slate-500 mb-4 italic">
                      💡 Info: Anda dapat menarik & melepas (Drag & Drop) gerakan di bawah untuk mengubah jadwal hari/sesi atau menyusun urutan latihan. Gunakan tombol panah pada mobile.
                    </p>
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          <th className="py-3 pr-4 w-28">Hari</th>
                          <th className="py-3 px-4">🌅 Sesi Pagi (AM)</th>
                          <th className="py-3 px-4">🌃 Sesi Sore/Malam (PM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {DAYS_INDONESIAN.map((dayName, dayIdx) => {
                          const amSteps = schedule
                            .filter(s => s.day_of_week === dayIdx && s.routine_time === 'AM')
                            .sort((a, b) => a.order_index - b.order_index);
                          const pmSteps = schedule
                            .filter(s => s.day_of_week === dayIdx && s.routine_time === 'PM')
                            .sort((a, b) => a.order_index - b.order_index);
                          const isToday = todayDay === dayIdx;

                          return (
                            <tr key={dayName} className={isToday ? 'bg-blue-50/10 dark:bg-blue-950/10 font-medium' : ''}>
                              <td className="py-4 pr-4 align-top">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isToday
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'text-slate-700 dark:text-slate-355 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {dayName}
                                </span>
                              </td>
                              
                              {/* AM Cell */}
                              <td 
                                className="py-3 px-4 align-top space-y-2 min-h-[80px]"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropEmpty(e, dayIdx, 'AM')}
                              >
                                {amSteps.length > 0 ? (
                                  amSteps.map((step, idx) => (
                                    <div 
                                      key={step.id} 
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, step.id)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, step)}
                                      className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all max-w-sm cursor-grab active:cursor-grabbing"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.gym_exercises?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.gym_exercises?.sets} Set x {step.gym_exercises?.reps} ({step.gym_exercises?.muscle_group})</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {idx > 0 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'up')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke atas"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {idx < amSteps.length - 1 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'down')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke bawah"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditScheduleModal(step)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                          title="Edit gerakan"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSchedule(step.id)}
                                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-650 rounded-lg cursor-pointer"
                                          title="Hapus gerakan ini"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center text-[10px] text-slate-400 select-none">
                                    Tarik ke sini
                                  </div>
                                )}
                              </td>

                              {/* PM Cell */}
                              <td 
                                className="py-3 px-4 align-top space-y-2 min-h-[80px]"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropEmpty(e, dayIdx, 'PM')}
                              >
                                {pmSteps.length > 0 ? (
                                  pmSteps.map((step, idx) => (
                                    <div 
                                      key={step.id} 
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, step.id)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, step)}
                                      className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all max-w-sm cursor-grab active:cursor-grabbing"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.gym_exercises?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.gym_exercises?.sets} Set x {step.gym_exercises?.reps} ({step.gym_exercises?.muscle_group})</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {idx > 0 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'up')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke atas"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {idx < pmSteps.length - 1 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'down')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke bawah"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditScheduleModal(step)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                          title="Edit gerakan"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSchedule(step.id)}
                                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-655 rounded-lg cursor-pointer"
                                          title="Hapus gerakan ini"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center text-[10px] text-slate-400 select-none">
                                    Tarik ke sini
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'shelf' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {exercises.length > 0 ? (
                    shelfLayoutMode === 'list' ? (
                      /* List Table Layout for Shelf */
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                <th className="px-6 py-4">Nama Gerakan</th>
                                <th className="px-6 py-4">Target Otot (Klasifikasi)</th>
                                <th className="px-6 py-4">Sets</th>
                                <th className="px-6 py-4">Reps / Durasi</th>
                                <th className="px-6 py-4">Catatan</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                              {exercises.map((ex) => {
                                return (
                                  <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                      {ex.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-slate-50 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                                        <span>{getMuscleGroupIcon(ex.muscle_group)}</span>
                                        <span>{ex.muscle_group}</span>
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                      {ex.sets} Set
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500 dark:text-slate-455">
                                      {ex.reps}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate italic text-slate-400 dark:text-slate-500" title={ex.notes}>
                                      {ex.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleOpenExerciseModal(ex)}
                                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-205 rounded-lg transition-colors cursor-pointer"
                                          title="Edit Gerakan"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteExercise(ex.id, ex.name)}
                                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus Gerakan"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Grid Cards Layout for Shelf */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exercises.map((ex) => {
                          return (
                            <div
                              key={ex.id}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 group relative overflow-hidden"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{ex.name}</h3>
                                    <p className="text-[10px] text-slate-455 dark:text-slate-550 font-semibold">{ex.sets} Sets x {ex.reps}</p>
                                  </div>

                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                                    <span>{getMuscleGroupIcon(ex.muscle_group)}</span>
                                    <span>{ex.muscle_group}</span>
                                  </span>
                                </div>

                                {ex.notes && (
                                  <p className="text-[10px] italic text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full">
                                    "{ex.notes}"
                                  </p>
                                )}
                              </div>

                              {/* Actions footer */}
                              <div className="flex items-center justify-end gap-1.5 pt-3.5 border-t border-slate-50 dark:border-slate-800/80">
                                <button
                                  onClick={() => handleOpenExerciseModal(ex)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-455 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Gerakan"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExercise(ex.id, ex.name)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Gerakan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] text-center p-8 shadow-xs">
                      <Dumbbell className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto stroke-[1.5]" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">Daftar Latihan Kosong</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                        Silakan tambahkan gerakan latihan gym Anda terlebih dahulu dengan mengklik tombol di atas.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}

      {/* Exercise Modal */}
      <AnimatePresence>
        {exerciseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-500" />
                  {editingExercise ? 'Edit Gerakan Latihan' : 'Tambah Gerakan Latihan'}
                </h3>
                <button
                  onClick={() => setExerciseModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleExerciseSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Nama Gerakan / Latihan</label>
                  <input
                    type="text"
                    required
                    value={exName}
                    onChange={(e) => setExName(e.target.value)}
                    placeholder="Contoh: Bench Press, Squat, dll."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Jumlah Sets</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={exSets}
                      onChange={(e) => setExSets(Number(e.target.value))}
                      placeholder="Cth: 3"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Reps / Durasi</label>
                    <input
                      type="text"
                      required
                      value={exReps}
                      onChange={(e) => setExReps(e.target.value)}
                      placeholder="Cth: 12 reps atau 30 detik"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Klasifikasi Latihan (Muscle Group)</label>
                  <select
                    value={exMuscleGroup}
                    onChange={(e) => setExMuscleGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {['Upper Body', 'Leg Day', 'Push', 'Pull', 'Core', 'Cardio', 'Rest Day', 'Other'].map(grp => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Catatan Tambahan (Beban / Pengaturan Alat)</label>
                  <input
                    type="text"
                    value={exNotes}
                    onChange={(e) => setExNotes(e.target.value)}
                    placeholder="Opsional, cth: Beban 40kg, Posisi sandaran 2"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setExerciseModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-755 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-850 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Modal (Bulk Multi-select with Interactive Premium Cards) */}
      <AnimatePresence>
        {scheduleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Tambah Jadwal Latihan Gym
                </h3>
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-left">
                
                {/* Premium checklist cards with scroll styling */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 block mb-1">
                    Pilih Gerakan Latihan
                  </label>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (schedExIds.length === exercises.length) {
                          setSchedExIds([]);
                        } else {
                          setSchedExIds(exercises.map(e => e.id));
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-750 dark:text-blue-455 dark:hover:text-blue-400 cursor-pointer"
                    >
                      {schedExIds.length === exercises.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                    <span className="text-[10px] text-slate-400 font-semibold">{schedExIds.length} terpilih</span>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                    {exercises.map(ex => {
                      const isChecked = schedExIds.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => {
                            if (isChecked) {
                              setSchedExIds(schedExIds.filter(id => id !== ex.id));
                            } else {
                              setSchedExIds([...schedExIds, ex.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-blue-50/15 border-blue-500/80 dark:bg-blue-950/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                              isChecked
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {getMuscleGroupIcon(ex.muscle_group)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-850 dark:text-slate-200 truncate">{ex.name}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">{ex.sets} Set x {ex.reps} • {ex.muscle_group}</p>
                            </div>
                          </div>
                          <div className={`w-4 w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white scale-110'
                              : 'border-slate-300 dark:border-slate-700 bg-transparent'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Waktu Latihan (Sesi)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['AM', 'PM'].map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSchedTime(time)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          schedTime === time
                            ? 'bg-blue-55 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900 text-blue-600 dark:text-blue-450 shadow-xs font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-505 hover:text-slate-705 dark:hover:text-slate-355'
                        }`}
                      >
                        {time === 'AM' ? '🌅 Pagi (AM)' : '🌃 Sore/Malam (PM)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 block mb-1">Pilih Hari Latihan</label>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS_INDONESIAN.map((day, idx) => {
                      const isSelected = schedDays[idx];
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const nextDays = [...schedDays];
                            nextDays[idx] = !nextDays[idx];
                            setSchedDays(nextDays);
                          }}
                          className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 text-slate-505 hover:text-slate-705 dark:hover:text-slate-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Simpan Langkah Latihan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Edit Modal */}
      <AnimatePresence>
        {scheduleEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Edit Langkah Jadwal Latihan
                </h3>
                <button
                  onClick={() => setScheduleEditModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-205 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditScheduleSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 dark:text-slate-400 block mb-1">Pilih Gerakan</label>
                  <select
                    value={editSchedExId}
                    onChange={(e) => setEditSchedExId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {exercises.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Sesi Latihan</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['AM', 'PM'].map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setEditSchedTime(time)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          editSchedTime === time
                            ? 'bg-blue-55 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900 text-blue-600 dark:text-blue-450 shadow-xs font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-705 dark:hover:text-slate-355'
                        }`}
                      >
                        {time === 'AM' ? '🌅 Pagi (AM)' : '🌃 Sore/Malam (PM)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 block mb-1">Hari Latihan</label>
                  <select
                    value={editSchedDay}
                    onChange={(e) => setEditSchedDay(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {DAYS_INDONESIAN.map((day, idx) => (
                      <option key={day} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setScheduleEditModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-505 hover:text-slate-705 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-750 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
