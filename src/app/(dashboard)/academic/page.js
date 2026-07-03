'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Trash2, 
  AlertCircle,
  FileText,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Pencil,
  X,
  Sparkles,
  LayoutGrid,
  List,
  Clock,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
  User,
  Phone,
  Filter,
  MapPin,
  Users,
  Link2,
  ExternalLink,
  Copy,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Helper to parse semester number integer from semester name
const parseSemesterNumber = (name, index) => {
  const match = name.match(/\b([1-9]|1[0-9]|20)\b/);
  if (match) {
    return parseInt(match[1]);
  }
  const num = parseInt(name.replace(/\D/g, ''));
  if (!isNaN(num) && num >= 1 && num <= 20) {
    return num;
  }
  return index + 1;
};

// Weekdays (Saturday & Sunday excluded)
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

// Hours generated from 07:00 to 21:00 in 30-minute intervals
const generateHours = () => {
  const times = [];
  for (let h = 7; h <= 21; h++) {
    const hr = h < 10 ? `0${h}` : `${h}`;
    times.push(`${hr}:00`);
    times.push(`${hr}:30`);
  }
  return times;
};
const HOURS = generateHours();

// Time overlapping logic checker
const isTimeOverlapping = (startA, endA, startB, endB) => {
  const toMins = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  const sA = toMins(startA);
  const eA = toMins(endA);
  const sB = toMins(startB);
  const eB = toMins(endB);
  
  return (sA < eB && sB < eA);
};

// Calculate end time based on SKS (1 SKS = 60 minutes)
const calculateEndTime = (startTimeStr, sks) => {
  if (!startTimeStr) return '08:00';
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const durationMinutes = sks * 60;
  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  
  const endHour = Math.floor(endTotalMinutes / 60) % 24;
  const endMin = endTotalMinutes % 60;
  
  const hr = endHour < 10 ? `0${endHour}` : `${endHour}`;
  const mn = endMin < 10 ? `0${endMin}` : `${endMin}`;
  return `${hr}:${mn}`;
};

// Monthly Task Tracker Calendar component
const MonthlyTasksCalendar = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 4 + i);

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= numDays; d++) {
    days.push(new Date(year, month, d));
  }

  const prevMonth = (e) => {
    e.preventDefault();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.preventDefault();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleMonthChange = (e) => {
    setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearChange = (e) => {
    setCurrentDate(new Date(parseInt(e.target.value), month, 1));
  };

  const formatDateLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateStr = formatDateLocal(date);
    return tasks.filter(t => t.due_date === dateStr);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Kalender Pemantau Tugas
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={prevMonth}
            className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer text-[10px] font-bold transition-colors"
          >
            &larr;
          </button>
          
          <select
            value={month}
            onChange={handleMonthChange}
            className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold cursor-pointer focus:outline-none"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx} className="dark:bg-slate-900">{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={handleYearChange}
            className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold cursor-pointer focus:outline-none"
          >
            {years.map(y => (
              <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
            ))}
          </select>

          <button
            onClick={nextMonth}
            className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer text-[10px] font-bold transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
        <span>Min</span>
        <span>Sen</span>
        <span>Sel</span>
        <span>Rab</span>
        <span>Kam</span>
        <span>Jum</span>
        <span>Sab</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

          const dayTasks = getTasksForDate(day);
          const isToday = formatDateLocal(day) === formatDateLocal(new Date());

          return (
            <div
              key={`day-${day.getDate()}`}
              onClick={() => dayTasks.length > 0 && onDateClick(day, dayTasks)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all border ${
                dayTasks.length > 0
                  ? 'bg-blue-50/20 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100/30 dark:hover:bg-blue-900/40 cursor-pointer'
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
              } ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
            >
              <span className={`text-[10px] font-bold ${
                isToday 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : dayTasks.length > 0
                    ? 'text-slate-800 dark:text-slate-200 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400'
              }`}>
                {day.getDate()}
              </span>

              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-1">
                  {dayTasks.slice(0, 3).map((t) => {
                    const isCompleted = t.status === 'Completed';
                    return (
                      <span
                        key={t.id}
                        className={`w-1 h-1 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : t.task_type === 'Quiz'
                              ? 'bg-purple-500'
                              : 'bg-blue-500'
                        }`}
                      />
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <span className="text-[6px] font-bold text-blue-500 leading-none">+</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Get today's name in Indonesian (Monday to Friday, default Senin for Sat/Sun)
const getTodayIndonesian = () => {
  const dayIndex = new Date().getDay();
  const daysMap = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat'
  };
  return daysMap[dayIndex] || 'Senin';
};

// Get live course status (Berlangsung, Mendatang, or null)
const getCourseTimeStatus = (scheduleStr) => {
  if (!scheduleStr || !scheduleStr.includes(',')) return null;
  const parts = scheduleStr.split(',');
  const cDay = parts[0].trim();
  
  if (!parts[1] || !parts[1].includes('-')) return null;
  const [startStr, endStr] = parts[1].split('-').map(t => t.trim());
  
  const now = new Date();
  const dayIndex = now.getDay();
  const daysMap = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat'
  };
  const todayName = daysMap[dayIndex];
  
  if (cDay.toLowerCase() !== todayName?.toLowerCase()) return null;
  
  const toMins = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = toMins(startStr);
  const endMins = toMins(endStr);
  
  if (nowMins >= startMins && nowMins <= endMins) {
    return 'Berlangsung';
  }
  
  if (startMins > nowMins && (startMins - nowMins) <= 180) {
    return 'Mendatang';
  }
  
  return null;
};

// Format phone number to international WhatsApp format
const formatWhatsAppUrl = (phoneStr) => {
  if (!phoneStr) return '';
  let cleanNumber = phoneStr.replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  }
  if (!cleanNumber.startsWith('62') && cleanNumber.length >= 9 && cleanNumber.length <= 13) {
    cleanNumber = '62' + cleanNumber;
  }
  return `https://wa.me/${cleanNumber}`;
};

// Reusable Modal Component
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

export default function AcademicHubPage() {
  const { user } = useAuth();
  
  // Navigation Flow State (2 Level only: 'semesters' | 'courses' detail semester)
  const [currentView, setCurrentView] = useState('semesters');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');

  // View Mode States (Grid vs List, persisted in LocalStorage)
  const [semesterViewMode, setSemesterViewMode] = useState('grid');
  const [courseViewMode, setCourseViewMode] = useState('grid');
  const [taskViewMode, setTaskViewMode] = useState('list');
  
  // Task filter states
  const [taskFilterCourseId, setTaskFilterCourseId] = useState('All');
  const [taskFilterStatus, setTaskFilterStatus] = useState('All'); // 'All' | 'Pending' | 'Completed'
  
  // Data States
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Academic General Links State
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linksTableExists, setLinksTableExists] = useState(true);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [linksTableNeedsMigration, setLinksTableNeedsMigration] = useState(false);

  // Semester Evaluation Tracker states
  const [evaluations, setEvaluations] = useState([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(true);
  const [evaluationSemesterId, setEvaluationSemesterId] = useState('');
  const [ipsScore, setIpsScore] = useState('');
  const [selfReflection, setSelfReflection] = useState('');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);

  // Auto-suggest next empty semester for evaluation when semesters or evaluations change
  useEffect(() => {
    if (editingEvaluation) return; // Do not auto-suggest when editing
    if (semesters.length > 0 && evaluations.length >= 0) {
      const evaluatedNumbers = evaluations.map(e => e.semester_number);
      const nextSem = semesters.find((s, idx) => {
        const num = parseSemesterNumber(s.name, idx);
        return !evaluatedNumbers.includes(num);
      });
      if (nextSem) {
        setEvaluationSemesterId(nextSem.id);
      } else if (semesters.length > 0) {
        setEvaluationSemesterId(semesters[0].id);
      }
    }
  }, [semesters, evaluations, editingEvaluation]);

  const [runningSemesterCourses, setRunningSemesterCourses] = useState([]); // Courses for calendar (running semester)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(getTodayIndonesian());
  
  // Tasks Calendar tracking states
  const [allTasks, setAllTasks] = useState([]);
  const [showCoursesList, setShowCoursesList] = useState(true);
  const [taskFilterDate, setTaskFilterDate] = useState(null);
  
  // Advanced task filter states
  const [taskFilterStartDate, setTaskFilterStartDate] = useState('');
  const [taskFilterEndDate, setTaskFilterEndDate] = useState('');

  // Draft filter states for modal
  const [draftCourseId, setDraftCourseId] = useState('All');
  const [draftStatus, setDraftStatus] = useState('All');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  
  // Selected objects for editing
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Loading States
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingCoursesAndTasks, setLoadingCoursesAndTasks] = useState(false);
  
  // Modal toggle states
  const [activeModal, setActiveModal] = useState(null); // 'addSemester' | 'editSemester' | 'addCourse' | 'editCourse' | 'addTask' | 'editTask' | 'bulkAddTask' | 'addLink' | 'editLink'
  
  // Form input fields
  const [semesterName, setSemesterName] = useState('');
  const [semesterStatus, setSemesterStatus] = useState('Berjalan'); // 'Berjalan' | 'Selesai'
  
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseSks, setCourseSks] = useState(2);
  const [courseRoom, setCourseRoom] = useState('');
  
  // Structured schedule states
  const [courseDay, setCourseDay] = useState('Senin');
  const [courseTimeStart, setCourseTimeStart] = useState('08:00');
  
  // Lecturer contact states
  const [lecturerName, setLecturerName] = useState('');
  const [lecturerContact, setLecturerContact] = useState('');

  // Single Task form states
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('23:59'); // Jam Pengumpulan (Default)
  const [taskType, setTaskType] = useState('Tugas'); // 'Tugas' | 'Quiz'
  const [taskMethod, setTaskMethod] = useState('Individu'); // 'Individu' | 'Kelompok'

  // Bulk Task row items
  const [bulkRows, setBulkRows] = useState([
    { name: '', courseId: '', startDate: '', dueDate: '', dueTime: '23:59', taskType: 'Tugas', taskMethod: 'Individu', description: '' }
  ]);

  // Load view modes from localStorage on mount
  useEffect(() => {
    const savedSemMode = localStorage.getItem('semesterViewMode');
    const savedCourseMode = localStorage.getItem('courseViewMode');
    const savedTaskMode = localStorage.getItem('taskViewMode');
    if (savedSemMode) setSemesterViewMode(savedSemMode);
    if (savedCourseMode) setCourseViewMode(savedCourseMode);
    if (savedTaskMode) setTaskViewMode(savedTaskMode);
  }, []);

  // Fetch semesters and general links on load
  useEffect(() => {
    if (!user) return;
    fetchSemesters();
    fetchGeneralLinks();
    fetchAllTasks();
    fetchEvaluations();
  }, [user?.id]);

  // Fetch courses and tasks whenever the active semester changes
  useEffect(() => {
    if (!user || !selectedSemesterId) return;
    fetchCoursesAndTasks(selectedSemesterId);
    setTaskFilterCourseId('All');
  }, [user?.id, selectedSemesterId]);

  // Load courses of the RUNNING semester for the calendar
  useEffect(() => {
    if (!user || !semesters.length) return;
    const runningSem = semesters.find(s => s.status === 'Berjalan');
    if (runningSem) {
      fetchRunningSemesterCourses(runningSem.id);
    } else {
      setRunningSemesterCourses([]);
    }
  }, [user?.id, semesters]);

  const fetchAllTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, course:courses(name, code, semester_id)')
        .eq('user_id', user.id);
      if (error) throw error;
      setAllTasks(data || []);
    } catch (err) {
      console.error('Error fetching all tasks:', err.message);
    }
  };

  const fetchSemesters = async () => {
    setLoadingSemesters(true);
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSemesters(data || []);
    } catch (err) {
      console.error('Error fetching semesters:', err.message);
      toast.error('Gagal mengambil data semester.');
    } finally {
      setLoadingSemesters(false);
    }
  };

  const fetchEvaluations = async () => {
    if (!user) return;
    try {
      setLoadingEvaluations(true);
      const { data, error } = await supabase
        .from('semester_evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('semester_number', { ascending: true });

      if (error && !error.message.includes('relation "semester_evaluations" does not exist')) {
        throw error;
      }
      setEvaluations(data || []);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!evaluationSemesterId) {
      toast.error('Silakan pilih semester terlebih dahulu.');
      return;
    }

    const score = parseFloat(ipsScore);
    if (isNaN(score) || score < 0.00 || score > 4.00) {
      toast.error('Nilai IPS harus berkisar antara 0.00 dan 4.00');
      return;
    }

    if (!selfReflection.trim()) {
      toast.error('Mohon isi refleksi diri Anda.');
      return;
    }

    // Find semester object
    const selectedSem = semesters.find(s => s.id === evaluationSemesterId);
    const semIndex = semesters.findIndex(s => s.id === evaluationSemesterId);
    const semNum = parseSemesterNumber(selectedSem.name, semIndex);

    // Check duplication
    const isDuplicate = evaluations.some(ev => ev.semester_number === semNum && (!editingEvaluation || ev.id !== editingEvaluation.id));
    if (isDuplicate) {
      toast.error(`Evaluasi untuk ${selectedSem.name} (Semester ${semNum}) sudah diinput sebelumnya!`);
      return;
    }

    try {
      setIsSavingEvaluation(true);
      if (editingEvaluation) {
        const { error } = await supabase
          .from('semester_evaluations')
          .update({
            semester_number: semNum,
            ips_score: score,
            self_reflection: selfReflection.trim()
          })
          .eq('id', editingEvaluation.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success(`Evaluasi ${selectedSem.name} berhasil diperbarui! 🎯`);
        setEditingEvaluation(null);
      } else {
        const { error } = await supabase
          .from('semester_evaluations')
          .insert([{
            user_id: user.id,
            semester_number: semNum,
            ips_score: score,
            self_reflection: selfReflection.trim()
          }]);

        if (error) throw error;

        toast.success(`Evaluasi ${selectedSem.name} berhasil disimpan! 🎯`);
      }
      setIpsScore('');
      setSelfReflection('');
      fetchEvaluations();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      toast.error('Gagal menyimpan evaluasi semester.');
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const handleDeleteEvaluation = async (id, semNum) => {
    if (!user) return;

    const isDarkTheme = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: 'Hapus Evaluasi?',
      text: `Apakah Anda yakin ingin menghapus data evaluasi Semester ${semNum}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: isDarkTheme ? '#0f172a' : '#ffffff',
      color: isDarkTheme ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('semester_evaluations')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success(`Evaluasi Semester ${semNum} berhasil dihapus.`);
        fetchEvaluations();
      } catch (err) {
        console.error('Error deleting evaluation:', err);
        toast.error('Gagal menghapus evaluasi.');
      }
    }
  };

  const handleStartEditEvaluation = (item) => {
    setEditingEvaluation(item);
    const matchedSem = semesters.find((s, idx) => parseSemesterNumber(s.name, idx) === item.semester_number);
    setEvaluationSemesterId(matchedSem ? matchedSem.id : '');
    setIpsScore(item.ips_score.toString());
    setSelfReflection(item.self_reflection);
  };

  const handleIpsChange = (e) => {
    let val = e.target.value;
    if (val === '') {
      setIpsScore('');
      return;
    }
    
    // Extract digits only
    const digits = val.replace(/\D/g, '');
    
    if (digits.length === 0) {
      setIpsScore('');
      return;
    }
    
    if (digits.length === 1) {
      setIpsScore(digits);
    } else if (digits.length === 2) {
      setIpsScore(`${digits[0]}.${digits[1]}`);
    } else {
      const formatted = `${digits[0]}.${digits.substring(1, 3)}`;
      if (parseFloat(formatted) > 4.00) {
        setIpsScore('4.00');
      } else {
        setIpsScore(formatted);
      }
    }
  };

  const fetchRunningSemesterCourses = async (semId) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('semester_id', semId)
        .eq('user_id', user.id);
      if (error) throw error;
      setRunningSemesterCourses(data || []);
    } catch (err) {
      console.error('Error fetching running semester courses:', err);
    }
  };

  const fetchCoursesAndTasks = async (semesterId) => {
    setLoadingCoursesAndTasks(true);
    try {
      // 1. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('semester_id', semesterId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // 2. Fetch tasks for this semester (joined on courses to filter by semester_id)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, course:courses!inner(name, code, semester_id)')
        .eq('course.semester_id', semesterId)
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching courses & tasks:', err.message);
      toast.error('Gagal memuat data akademik.');
    } finally {
      setLoadingCoursesAndTasks(false);
    }
  };

  // Fetch general academic links from supabase (handles missing table gracefully)
  const fetchGeneralLinks = async () => {
    setLoadingLinks(true);
    setLinksTableExists(true);
    setLinksTableNeedsMigration(false);
    try {
      const { data, error } = await supabase
        .from('academic_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          // PostgreSQL table not found error code
          setLinksTableExists(false);
          return;
        } else {
          throw error;
        }
      }

      setLinks(data || []);

      // Check if table contains column semester_id (old schema)
      const { error: colError } = await supabase
        .from('academic_links')
        .select('semester_id')
        .limit(1);

      if (!colError) {
        // semester_id exists in columns, meaning the table is using the old schema!
        setLinksTableNeedsMigration(true);
      }
    } catch (err) {
      console.error('Error fetching general links:', err.message);
      toast.error('Gagal memuat link penting.');
    } finally {
      setLoadingLinks(false);
    }
  };

  const changeSemesterViewMode = (mode) => {
    setSemesterViewMode(mode);
    localStorage.setItem('semesterViewMode', mode);
  };

  const changeCourseViewMode = (mode) => {
    setCourseViewMode(mode);
    localStorage.setItem('courseViewMode', mode);
  };

  const changeTaskViewMode = (mode) => {
    setTaskViewMode(mode);
    localStorage.setItem('taskViewMode', mode);
  };

  // Add Semester (Enforces single active semester, prevents duplicates)
  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!semesterName.trim()) return;

    // Duplicate Check
    const semesterExists = semesters.some(s => s.name.toLowerCase().trim() === semesterName.toLowerCase().trim());
    if (semesterExists) {
      toast.error('Nama semester tersebut sudah ada! Silakan gunakan nama lain.');
      return;
    }

    const toastId = toast.loading('Menambahkan semester...');
    try {
      const { data, error } = await supabase
        .from('semesters')
        .insert([{ name: semesterName.trim(), status: 'Berjalan', user_id: user.id }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setSemesters(prev => prev.map(s => ({ ...s, status: 'Selesai' })).concat(data[0]));
        setSelectedSemesterId(data[0].id);
        setCurrentView('courses'); // Navigate automatically to detail level
        
        await supabase
          .from('semesters')
          .update({ status: 'Selesai' })
          .eq('user_id', user.id)
          .neq('id', data[0].id);

        toast.success('Semester baru ditambahkan & diaktifkan! 📚', { id: toastId });
      }
      setSemesterName('');
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal menambahkan semester.', { id: toastId });
      console.error(err);
    }
  };

  // Edit Semester (Enforces single active semester, prevents duplicates)
  const handleEditSemester = async (e) => {
    e.preventDefault();
    if (!semesterName.trim() || !editingSemester) return;

    // Duplicate Check
    const semesterExists = semesters.some(
      s => s.id !== editingSemester.id && s.name.toLowerCase().trim() === semesterName.toLowerCase().trim()
    );
    if (semesterExists) {
      toast.error('Nama semester tersebut sudah ada! Silakan gunakan nama lain.');
      return;
    }

    const toastId = toast.loading('Memperbarui semester...');
    try {
      const { error } = await supabase
        .from('semesters')
        .update({ name: semesterName.trim(), status: semesterStatus })
        .eq('id', editingSemester.id)
        .eq('user_id', user.id);

      if (error) throw error;

      let updatedSemesters = semesters.map(s => 
        s.id === editingSemester.id 
          ? { ...s, name: semesterName.trim(), status: semesterStatus } 
          : s
      );

      if (semesterStatus === 'Berjalan') {
        updatedSemesters = updatedSemesters.map(s => 
          s.id !== editingSemester.id ? { ...s, status: 'Selesai' } : s
        );
        
        await supabase
          .from('semesters')
          .update({ status: 'Selesai' })
          .eq('user_id', user.id)
          .neq('id', editingSemester.id);
      }

      setSemesters(updatedSemesters);
      toast.success('Semester berhasil diperbarui!', { id: toastId });
      
      setSemesterName('');
      setSemesterStatus('Berjalan');
      setEditingSemester(null);
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal memperbarui semester.', { id: toastId });
      console.error(err);
    }
  };

  // Delete Semester with SweetAlert
  const handleDeleteSemester = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Semester?',
      text: "Semua mata kuliah dan daftar tugas di dalamnya akan terhapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus semester...');
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSemesters(prev => prev.filter(s => s.id !== id));
      if (selectedSemesterId === id) {
        setSelectedSemesterId('');
        setCourses([]);
        setTasks([]);
        setCurrentView('semesters');
      }
      
      toast.success('Semester berhasil dihapus.', { id: toastId });
    } catch (err) {
      toast.error('Gagal menghapus semester.', { id: toastId });
      console.error(err);
    }
  };

  // Check Schedule Conflicts helper
  const checkConflict = (day, start, end, excludeId) => {
    for (const c of courses) {
      if (c.id === excludeId) continue;
      if (!c.schedule || !c.schedule.includes(',')) continue;
      
      const parts = c.schedule.split(',');
      const cDay = parts[0].trim();
      if (cDay.toLowerCase() !== day.toLowerCase()) continue;
      
      if (parts[1] && parts[1].includes('-')) {
        const [cStart, cEnd] = parts[1].split('-').map(t => t.trim());
        if (isTimeOverlapping(start, end, cStart, cEnd)) {
          return c;
        }
      }
    }
    return null;
  };

  // Add Course (Handles SKS end time calculation, conflict detection & automatic calendar sync)
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    // Check duplicate name within the active semester
    const courseExists = courses.some(
      c => c.name.toLowerCase().trim() === courseName.toLowerCase().trim()
    );
    if (courseExists) {
      toast.error('Mata kuliah dengan nama tersebut sudah ada di semester ini!');
      return;
    }

    const calculatedEnd = calculateEndTime(courseTimeStart, parseInt(courseSks));
    const scheduleString = `${courseDay}, ${courseTimeStart} - ${calculatedEnd}`;
    
    // Check conflicts
    const conflict = checkConflict(courseDay, courseTimeStart, calculatedEnd);
    if (conflict) {
      const confirm = await Swal.fire({
        title: 'Jadwal Kuliah Bentrok!',
        text: `Jadwal ini tumpang tindih dengan mata kuliah "${conflict.name}" (${conflict.schedule}). Tetap simpan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, tetap simpan!',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
          title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
          htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
          confirmButton: 'bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
        },
        buttonsStyling: false
      });
      if (!confirm.isConfirmed) return;
    }

    const toastId = toast.loading('Menambahkan mata kuliah...');
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            name: courseName.trim(),
            code: courseCode.trim() || null,
            sks: parseInt(courseSks),
            room: courseRoom.trim() || null,
            schedule: scheduleString,
            lecturer_name: lecturerName.trim() || null,
            lecturer_contact: lecturerContact.trim() || null,
            semester_id: selectedSemesterId,
            user_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCourses(prev => [...prev, data[0]]);
        
        // Dynamic calendar courses sync if this added course belongs to the active running semester
        const runningSem = semesters.find(s => s.status === 'Berjalan');
        if (runningSem && selectedSemesterId === runningSem.id) {
          setRunningSemesterCourses(prev => [...prev, data[0]]);
        }
        
        toast.success('Mata kuliah berhasil ditambahkan! 📖', { id: toastId });
      }
      
      // Reset form
      setCourseName('');
      setCourseCode('');
      setCourseSks(2);
      setCourseRoom('');
      setCourseDay('Senin');
      setCourseTimeStart('08:00');
      setLecturerName('');
      setLecturerContact('');
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal menambahkan mata kuliah.', { id: toastId });
      console.error(err);
    }
  };

  // Edit Course (with dynamic calendar courses sync)
  const handleEditCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim() || !editingCourse) return;

    // Check duplicate name within the active semester (excluding self)
    const courseExists = courses.some(
      c => c.id !== editingCourse.id && c.name.toLowerCase().trim() === courseName.toLowerCase().trim()
    );
    if (courseExists) {
      toast.error('Mata kuliah dengan nama tersebut sudah ada di semester ini!');
      return;
    }

    const calculatedEnd = calculateEndTime(courseTimeStart, parseInt(courseSks));
    const scheduleString = `${courseDay}, ${courseTimeStart} - ${calculatedEnd}`;
    
    // Check conflicts
    const conflict = checkConflict(courseDay, courseTimeStart, calculatedEnd, editingCourse.id);
    if (conflict) {
      const confirm = await Swal.fire({
        title: 'Jadwal Kuliah Bentrok!',
        text: `Jadwal ini tumpang tindih dengan mata kuliah "${conflict.name}" (${conflict.schedule}). Tetap simpan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, tetap simpan!',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
          title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
          htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
          confirmButton: 'bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
        },
        buttonsStyling: false
      });
      if (!confirm.isConfirmed) return;
    }

    const toastId = toast.loading('Memperbarui mata kuliah...');
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          name: courseName.trim(),
          code: courseCode.trim() || null,
          sks: parseInt(courseSks),
          room: courseRoom.trim() || null,
          schedule: scheduleString,
          lecturer_name: lecturerName.trim() || null,
          lecturer_contact: lecturerContact.trim() || null,
        })
        .eq('id', editingCourse.id)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedObj = { 
        ...editingCourse, 
        name: courseName.trim(),
        code: courseCode.trim() || null,
        sks: parseInt(courseSks),
        room: courseRoom.trim() || null,
        schedule: scheduleString,
        lecturer_name: lecturerName.trim() || null,
        lecturer_contact: lecturerContact.trim() || null,
      };

      setCourses(prev => prev.map(c => c.id === editingCourse.id ? updatedObj : c));

      // Also update runningSemesterCourses instantly for calendar representation
      const runningSem = semesters.find(s => s.status === 'Berjalan');
      if (runningSem && selectedSemesterId === runningSem.id) {
        setRunningSemesterCourses(prev => prev.map(c => c.id === editingCourse.id ? updatedObj : c));
      }

      // Update tasks locally joined course info
      setTasks(prev => prev.map(t => t.course_id === editingCourse.id ? {
        ...t,
        course: {
          ...t.course,
          name: courseName.trim(),
          code: courseCode.trim() || null
        }
      } : t));

      toast.success('Mata kuliah berhasil diperbarui!', { id: toastId });
      
      setCourseName('');
      setCourseCode('');
      setCourseSks(2);
      setCourseRoom('');
      setCourseDay('Senin');
      setCourseTimeStart('08:00');
      setLecturerName('');
      setLecturerContact('');
      setEditingCourse(null);
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal memperbarui mata kuliah.', { id: toastId });
      console.error(err);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Mata Kuliah?',
      text: "Semua tugas yang terhubung di dalamnya juga akan terhapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus mata kuliah...');
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCourses(prev => prev.filter(c => c.id !== id));
      setTasks(prev => prev.filter(t => t.course_id !== id));
      
      // Update calendar widget
      setRunningSemesterCourses(prev => prev.filter(c => c.id !== id));
      
      toast.success('Mata kuliah berhasil dihapus.', { id: toastId });
    } catch (err) {
      toast.error('Gagal menghapus mata kuliah.', { id: toastId });
      console.error(err);
    }
  };

  // Add General Link (automatically appends https:// if missing)
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const toastId = toast.loading('Menambahkan link penting...');
    try {
      const { data, error } = await supabase
        .from('academic_links')
        .insert([
          {
            name: linkName.trim(),
            url: formattedUrl,
            user_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setLinks(prev => [...prev, data[0]]);
        toast.success('Link penting ditambahkan! 🔗', { id: toastId });
      }
      setLinkName('');
      setLinkUrl('');
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || 'Gagal menambahkan link penting.', { id: toastId });
      console.error('Error adding link:', err);
    }
  };

  // Edit General Link
  const handleEditLink = async (e) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim() || !editingLink) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const toastId = toast.loading('Memperbarui link penting...');
    try {
      const { error } = await supabase
        .from('academic_links')
        .update({
          name: linkName.trim(),
          url: formattedUrl
        })
        .eq('id', editingLink.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLinks(prev => prev.map(l => l.id === editingLink.id ? { ...l, name: linkName.trim(), url: formattedUrl } : l));
      toast.success('Link penting diperbarui!', { id: toastId });

      setLinkName('');
      setLinkUrl('');
      setEditingLink(null);
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui link penting.', { id: toastId });
      console.error('Error updating link:', err);
    }
  };

  // Delete General Link
  const handleDeleteLink = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Link Penting?',
      text: "Link penting ini akan terhapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus link penting...');
    try {
      const { error } = await supabase
        .from('academic_links')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLinks(prev => prev.filter(l => l.id !== id));
      toast.success('Link penting berhasil dihapus.', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus link penting.', { id: toastId });
      console.error('Error deleting link:', err);
    }
  };

  // Add Task (Supports Jam Pengumpulan)
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim() || !taskCourseId || !taskStartDate || !taskDueDate) {
      toast.error('Harap lengkapi nama tugas, mata kuliah, tanggal pemberian, dan tenggat!');
      return;
    }

    const toastId = toast.loading('Menambahkan tugas...');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            name: taskName.trim(),
            description: taskDesc.trim() || null,
            course_id: taskCourseId,
            start_date: taskStartDate,
            due_date: taskDueDate,
            due_time: taskDueTime || '23:59',
            task_type: taskType,
            task_method: taskMethod,
            priority: 'Medium',
            status: 'Pending',
            user_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const courseInfo = courses.find(c => c.id === taskCourseId);
        const newTaskWithJoin = {
          ...data[0],
          course: {
            name: courseInfo.name,
            code: courseInfo.code,
            semester_id: selectedSemesterId
          }
        };
        setTasks(prev => [...prev, newTaskWithJoin]);
        fetchAllTasks(); // Sync calendar
        toast.success('Tugas kuliah berhasil ditambahkan! 🎓', { id: toastId });
      }

      // Reset form
      setTaskName('');
      setTaskDesc('');
      setTaskCourseId('');
      setTaskStartDate('');
      setTaskDueDate('');
      setTaskDueTime('23:59');
      setTaskType('Tugas');
      setTaskMethod('Individu');
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal menyimpan tugas.', { id: toastId });
      console.error(err);
    }
  };

  // Edit Task
  const handleEditTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim() || !editingTask || !taskCourseId || !taskStartDate || !taskDueDate) return;

    const toastId = toast.loading('Memperbarui tugas...');
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          name: taskName.trim(),
          description: taskDesc.trim() || null,
          course_id: taskCourseId,
          start_date: taskStartDate,
          due_date: taskDueDate,
          due_time: taskDueTime || '23:59',
          task_type: taskType,
          task_method: taskMethod
        })
        .eq('id', editingTask.id)
        .eq('user_id', user.id);

      if (error) throw error;

      const courseInfo = courses.find(c => c.id === taskCourseId);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? {
        ...t,
        name: taskName.trim(),
        description: taskDesc.trim() || null,
        course_id: taskCourseId,
        start_date: taskStartDate,
        due_date: taskDueDate,
        due_time: taskDueTime || '23:59',
        task_type: taskType,
        task_method: taskMethod,
        course: {
          name: courseInfo.name,
          code: courseInfo.code,
          semester_id: selectedSemesterId
        }
      } : t));

      toast.success('Tugas berhasil diperbarui!', { id: toastId });
      fetchAllTasks(); // Sync calendar
      
      // Reset form
      setTaskName('');
      setTaskDesc('');
      setTaskCourseId('');
      setTaskStartDate('');
      setTaskDueDate('');
      setTaskDueTime('23:59');
      setTaskType('Tugas');
      setTaskMethod('Individu');
      setEditingTask(null);
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal memperbarui tugas.', { id: toastId });
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Tugas?',
      text: "Tugas ini akan terhapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-base font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('Menghapus tugas...');
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
      fetchAllTasks(); // Sync calendar
      toast.success('Tugas berhasil dihapus.', { id: toastId });
    } catch (err) {
      toast.error('Gagal menghapus tugas.', { id: toastId });
      console.error(err);
    }
  };

  // Add a new row to bulk add tasks form
  const addBulkRow = () => {
    setBulkRows(prev => [
      ...prev,
      { 
        name: '', 
        courseId: taskFilterCourseId !== 'All' ? taskFilterCourseId : '', 
        startDate: '', 
        dueDate: '', 
        dueTime: '23:59', 
        taskType: 'Tugas', 
        taskMethod: 'Individu', 
        description: '' 
      }
    ]);
  };

  // Remove a row from bulk add tasks form
  const removeBulkRow = (index) => {
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  // Update a specific field in a specific bulk task row
  const updateBulkRow = (index, field, value) => {
    setBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  // Bulk Add Tasks Submit (Supports Jam Pengumpulan)
  const handleBulkAddTask = async (e) => {
    e.preventDefault();
    
    // Validation
    const invalidRow = bulkRows.find(r => !r.name.trim() || !r.courseId || !r.startDate || !r.dueDate);
    if (invalidRow) {
      toast.error('Mohon lengkapi semua nama tugas, mata kuliah, tanggal pemberian, dan tenggat!');
      return;
    }

    const toastId = toast.loading('Menambahkan banyak tugas...');
    try {
      const insertData = bulkRows.map(r => ({
        name: r.name.trim(),
        description: r.description.trim() || null,
        course_id: r.courseId,
        start_date: r.startDate,
        due_date: r.dueDate,
        due_time: r.dueTime || '23:59',
        task_type: r.taskType,
        task_method: r.taskMethod,
        priority: 'Medium',
        status: 'Pending',
        user_id: user.id
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const addedTasksWithJoins = data.map(t => {
          const courseInfo = courses.find(c => c.id === t.course_id);
          return {
            ...t,
            course: {
              name: courseInfo.name,
              code: courseInfo.code,
              semester_id: selectedSemesterId
            }
          };
        });
        setTasks(prev => [...prev, ...addedTasksWithJoins]);
        fetchAllTasks(); // Sync calendar
        toast.success(`Berhasil menambahkan ${data.length} tugas sekaligus! 🚀`, { id: toastId });
      }

      setBulkRows([{ name: '', courseId: '', startDate: '', dueDate: '', dueTime: '23:59', taskType: 'Tugas', taskMethod: 'Individu', description: '' }]);
      setActiveModal(null);
    } catch (err) {
      toast.error('Gagal menambahkan banyak tugas.', { id: toastId });
      console.error(err);
    }
  };

  // Toggle Task Status (Mobile-friendly confirmation alert on phone)
  const toggleTaskStatus = async (id, currentStatus, tName) => {
    const nextStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';

    // Show SweetAlert confirmation when marking as completed
    if (currentStatus === 'Pending') {
      const confirm = await Swal.fire({
        title: 'Selesaikan Tugas?',
        text: `Apakah Anda yakin ingin menandai tugas "${tName}" sebagai selesai?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Selesai!',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
          title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
          htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
        },
        buttonsStyling: false
      });
      if (!confirm.isConfirmed) return;
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      fetchAllTasks(); // Sync calendar
      toast.success(nextStatus === 'Completed' ? 'Tugas diselesaikan! 🎉' : 'Status tugas dikembalikan.');
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t));
      toast.error('Gagal memperbarui status tugas.');
      console.error(err);
    }
  };

  // Check if a task is near its deadline (<= 2 days)
  const isNearDeadline = (dueDateStr, status) => {
    if (status === 'Completed') return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  };

  // Check if a task is overdue
  const isOverdue = (dueDateStr, status) => {
    if (status === 'Completed') return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    return due < today;
  };

  // Get remaining days text
  const getRemainingDaysText = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Terlambat ${Math.abs(diffDays)} hari`;
    if (diffDays === 0) return 'Hari ini!';
    if (diffDays === 1) return 'Besok!';
    return `${diffDays} hari lagi`;
  };

  // Format Date to indonesian readable
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Calendar Date Click handler
  const handleCalendarDateClick = (date, dayTasks) => {
    if (dayTasks.length === 0) return;
    const firstTask = dayTasks[0];
    const semesterId = firstTask.course?.semester_id;
    if (!semesterId) return;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    setSelectedSemesterId(semesterId);
    setTaskFilterDate(dateStr);
    setTaskFilterCourseId('All');
    setCurrentView('courses');
  };

  const openFilterModal = () => {
    setDraftCourseId(taskFilterCourseId);
    setDraftStatus(taskFilterStatus);
    setDraftStartDate(taskFilterStartDate || '');
    setDraftEndDate(taskFilterEndDate || '');
    setActiveModal('expertFilter');
  };

  const applyExpertFilters = (e) => {
    e.preventDefault();
    setTaskFilterCourseId(draftCourseId);
    setTaskFilterStatus(draftStatus);
    setTaskFilterStartDate(draftStartDate);
    setTaskFilterEndDate(draftEndDate);
    setActiveModal(null);
  };

  const resetExpertFilters = () => {
    setTaskFilterCourseId('All');
    setTaskFilterStatus('All');
    setTaskFilterStartDate('');
    setTaskFilterEndDate('');
    setTaskFilterDate(null);
    setActiveModal(null);
  };

  // Open Edit Semester Modal
  const openEditSemester = (sem, e) => {
    e.stopPropagation();
    setEditingSemester(sem);
    setSemesterName(sem.name);
    setSemesterStatus(sem.status || 'Berjalan');
    setActiveModal('editSemester');
  };

  // Open Edit Course Modal
  const openEditCourse = (course, e) => {
    e.stopPropagation();
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseCode('');
    setCourseSks(course.sks);
    setCourseRoom(course.room || '');
    
    if (course.schedule && course.schedule.includes(',')) {
      const parts = course.schedule.split(',');
      setCourseDay(parts[0].trim());
      if (parts[1] && parts[1].includes('-')) {
        setCourseTimeStart(parts[1].split('-')[0].trim());
      }
    } else {
      setCourseDay('Senin');
      setCourseTimeStart('08:00');
    }
    
    setLecturerName(course.lecturer_name || '');
    setLecturerContact(course.lecturer_contact || '');
    setActiveModal('editCourse');
  };

  // Open Edit Link Modal
  const openEditLink = (link, e) => {
    e.stopPropagation();
    setEditingLink(link);
    setLinkName(link.name);
    setLinkUrl(link.url);
    setActiveModal('editLink');
  };

  // Open Edit Task Modal
  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setTaskDesc(task.description || '');
    setTaskCourseId(task.course_id);
    setTaskStartDate(task.start_date);
    setTaskDueDate(task.due_date);
    setTaskDueTime(task.due_time || '23:59');
    setTaskType(task.task_type || 'Tugas');
    setTaskMethod(task.task_method || 'Individu');
    setActiveModal('editTask');
  };

  // Helper: check if a course in running semester calendar has scheduling conflicts
  const hasCalendarConflict = (course, list) => {
    if (!course.schedule || !course.schedule.includes(',')) return false;
    const [cDay, timeRange] = course.schedule.split(',').map(s => s.trim());
    if (!timeRange || !timeRange.includes('-')) return false;
    const [cStart, cEnd] = timeRange.split('-').map(t => t.trim());
    
    return list.some(other => {
      if (other.id === course.id) return false;
      if (!other.schedule || !other.schedule.includes(',')) return false;
      const [oDay, oTimeRange] = other.schedule.split(',').map(s => s.trim());
      if (oDay.toLowerCase() !== cDay.toLowerCase()) return false;
      if (!oTimeRange || !oTimeRange.includes('-')) return false;
      const [oStart, oEnd] = oTimeRange.split('-').map(t => t.trim());
      
      return isTimeOverlapping(cStart, cEnd, oStart, oEnd);
    });
  };

  // Copy SQL Query text helper
  const handleCopySql = () => {
    const sqlText = linksTableNeedsMigration
      ? `alter table public.academic_links drop column if exists semester_id;`
      : `-- 1. Hapus tabel lama jika sudah ada\ndrop table if exists public.academic_links;\n\n-- 2. Membuat tabel academic_links baru (tanpa semester_id)\ncreate table public.academic_links (\n  id uuid default gen_random_uuid() primary key,\n  user_id uuid references auth.users(id) on delete cascade not null,\n  name text not null,\n  url text not null,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 3. Aktifkan RLS\nalter table public.academic_links enable row level security;\n\n-- 4. Buat policy RLS\ncreate policy "Users can perform all actions on their own academic links"\n  on public.academic_links\n  for all\n  using (auth.uid() = user_id)\n  with check (auth.uid() = user_id);`;
    
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    toast.success('Query SQL berhasil disalin!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Active Semester object
  const activeSemester = semesters.find(s => s.id === selectedSemesterId);

  // Filter Tasks for active semester
  const filteredTasks = tasks.filter(t => {
    if (taskFilterCourseId !== 'All' && t.course_id !== taskFilterCourseId) {
      return false;
    }
    if (taskFilterStatus === 'Pending' && t.status !== 'Pending') return false;
    if (taskFilterStatus === 'Completed' && t.status !== 'Completed') return false;
    if (taskFilterDate && t.due_date !== taskFilterDate) return false;
    if (taskFilterStartDate && t.due_date < taskFilterStartDate) return false;
    if (taskFilterEndDate && t.due_date > taskFilterEndDate) return false;
    return true;
  });

  // Sort Tasks: Pending & closest due dates first, then Completed
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'Pending' ? -1 : 1;
    }
    return new Date(a.due_date) - new Date(b.due_date);
  });

  // Calendar grouping helper
  const getCoursesForCalendar = (day) => {
    return runningSemesterCourses
      .filter(c => {
        if (!c.schedule) return false;
        return c.schedule.toLowerCase().startsWith(day.toLowerCase());
      })
      .sort((a, b) => {
        const getStartTime = (sched) => {
          if (!sched || !sched.includes(',')) return '00:00';
          const parts = sched.split(',');
          if (parts[1] && parts[1].includes('-')) {
            return parts[1].split('-')[0].trim();
          }
          return '00:00';
        };
        return getStartTime(a.schedule).localeCompare(getStartTime(b.schedule));
      });
  };

  const activeRunningSemester = semesters.find(s => s.status === 'Berjalan');

  // Semester Evaluation Tracker GPA Calculations
  const calculateGPA = () => {
    if (evaluations.length === 0) return '0.00';
    const sum = evaluations.reduce((acc, curr) => acc + Number(curr.ips_score), 0);
    return (sum / evaluations.length).toFixed(2);
  };
  const gpa = calculateGPA();
  const getAcademicStatus = (gpaVal) => {
    const g = parseFloat(gpaVal);
    if (g >= 3.50) return { label: 'Dengan Pujian (Cum Laude)', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30' };
    if (g >= 3.00) return { label: 'Sangat Memuaskan', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30' };
    if (g >= 2.00) return { label: 'Memuaskan', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30' };
    return { label: 'Cukup', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30' };
  };
  const status = getAcademicStatus(gpa);

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* ========================================================================= */}
      {/* LEVEL 1: SEMESTERS VIEW */}
      {/* ========================================================================= */}
      {currentView === 'semesters' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                Academic <GraduationCap className="w-6 h-6 text-blue-500 animate-pulse" />
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pilih semester untuk mulai meninjau perkuliahan, link penting, dan daftar tugas akademik Anda.
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl flex items-center gap-1 shadow-sm">
                <button
                  onClick={() => changeSemesterViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${semesterViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeSemesterViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${semesterViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSemesterName('');
                  setSemesterStatus('Berjalan');
                  setActiveModal('addSemester');
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-white" />
                Tambah Semester
              </button>
            </div>
          </div>

          {/* Loading Semesters */}
          {loadingSemesters ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Semester List (Grid or List representation) */}
              <div className={`space-y-8 ${activeRunningSemester ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                {semesters.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Semester belum terdaftar</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                      Buat semester pertama Anda untuk mulai mencatat kelas perkuliahan.
                    </p>
                    <button
                      onClick={() => setActiveModal('addSemester')}
                      className="mt-4 bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Tambah Semester
                    </button>
                  </div>
                ) : (
                  <>
                    {semesterViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {semesters.map((sem, index) => {
                          const isSelesai = sem.status === 'Selesai';
                          const semColors = [
                            'from-blue-400 to-blue-600 shadow-blue-500/5',
                            'from-indigo-400 to-indigo-600 shadow-indigo-500/5',
                            'from-sky-400 to-sky-600 shadow-sky-500/5',
                            'from-violet-400 to-violet-600 shadow-violet-500/5',
                            'from-emerald-400 to-emerald-600 shadow-emerald-500/5'
                          ];
                          const gradientClass = semColors[index % semColors.length];

                          return (
                            <div
                              key={sem.id}
                              onClick={() => {
                                setSelectedSemesterId(sem.id);
                                setCurrentView('courses');
                              }}
                              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col justify-between h-48 relative animate-in fade-in slide-in-from-bottom-2 duration-200"
                            >
                              <div className={`h-1.5 w-full bg-gradient-to-r ${gradientClass}`} />
                              
                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-16 leading-tight">
                                    {sem.name}
                                  </h3>
                                  
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    isSelesai
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 animate-pulse'
                                  }`}>
                                    {sem.status || 'Berjalan'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                                    Lihat Detail &rarr;
                                  </span>

                                  {/* Edit / Delete Actions */}
                                  <div className="flex items-center gap-1.5 relative z-10" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => openEditSemester(sem, e)}
                                      className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                      title="Edit Semester"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSemester(sem.id)}
                                      className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 border border-slate-200 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                      title="Hapus Semester"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {semesters.map((sem) => {
                            const isSelesai = sem.status === 'Selesai';
                            return (
                              <div
                                key={sem.id}
                                onClick={() => {
                                  setSelectedSemesterId(sem.id);
                                  setCurrentView('courses');
                                }}
                                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center gap-4">
                                  {/* Semester List Icon styled in high contrast Dark Mode */}
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40 flex items-center justify-center font-bold text-xs">
                                    📚
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {sem.name}
                                    </h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    isSelesai
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {sem.status || 'Berjalan'}
                                  </span>

                                  {/* Edit / Delete Actions */}
                                  <div className="flex items-center gap-1.5 relative z-10" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => openEditSemester(sem, e)}
                                      className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                      title="Edit Semester"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSemester(sem.id)}
                                      className="p-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 border border-slate-200 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                      title="Hapus Semester"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ======================= SEKSI LINK PENTING UMUM (MOVED HERE) ======================= */}
                <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Link2 className="w-4.5 h-4.5 text-blue-500" />
                      Sumber Daya Umum
                    </h2>
                    <button
                      onClick={() => {
                        setLinkName('');
                        setLinkUrl('');
                        setEditingLink(null);
                        setActiveModal('addLink');
                      }}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Tambah Link
                    </button>
                  </div>

                  {!linksTableExists || linksTableNeedsMigration ? (
                    /* SQL setup helper prompt or migration warning */
                    <div className="p-5 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-4 text-left animate-in fade-in">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            {linksTableNeedsMigration ? 'Tabel Link Penting Perlu Migrasi' : 'Tabel Link Penting Belum Siap'}
                          </h4>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            {linksTableNeedsMigration 
                              ? 'Tabel `academic_links` Anda terdeteksi masih menggunakan struktur kolom lama (memiliki kolom `semester_id` yang wajib). Silakan salin query SQL di bawah ini dan jalankan di SQL Editor Supabase Anda untuk menghapus kolom tersebut agar sinkron dengan link umum tanpa kehilangan data tautan yang sudah ada.'
                              : 'Supabase Anda belum memiliki tabel `academic_links` yang disesuaikan untuk link umum. Silakan salin query SQL berikut, buka SQL Editor di dashboard Supabase Anda, jalankan query-nya, lalu muat ulang halaman ini.'}
                          </p>
                        </div>
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-slate-900 dark:bg-black border border-slate-800 p-4">
                        <pre className="text-[9px] font-mono text-slate-300 overflow-x-auto select-all max-h-[160px] whitespace-pre-wrap leading-relaxed pr-12">
                          {linksTableNeedsMigration 
                            ? 'alter table public.academic_links drop column if exists semester_id;'
                            : `drop table if exists public.academic_links;

create table public.academic_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.academic_links enable row level security;

create policy "Users can perform all actions on their own academic links"
  on public.academic_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`}
                        </pre>
                        <button
                          onClick={handleCopySql}
                          className="absolute top-3.5 right-3.5 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
                          title="Salin SQL Query"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ) : loadingLinks ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : links.length === 0 ? (
                    <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      <Link2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada link penting</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-0.5">
                        Simpan tautan umum seperti LMS kampus, portal nilai SIAKAD, email institusi, atau Google Drive umum di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {links.map((link) => (
                        <div
                          key={link.id}
                          onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                          className="group relative p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 text-left overflow-hidden"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 font-bold text-[10px] group-hover:scale-105 transition-transform">
                              🔗
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                {link.name}
                              </h4>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate pr-6 mt-0.5">
                                {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => openEditLink(link, e)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Edit Link"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Link"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Hover subtle External Link Icon */}
                          <ExternalLink className="absolute bottom-2 right-2 w-2.5 h-2.5 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ======================= SEKSI EVALUASI SEMESTER (ADDED HERE) ======================= */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <GraduationCap className="w-4.5 h-4.5 text-blue-500" />
                        Semester & Self-Evaluation Tracker
                      </h2>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Pantau perolehan IPS, akumulasi IPK kumulatif, serta catatan evaluasi belajar.
                      </p>
                    </div>

                    {/* Mini GPA stats badge */}
                    <div className="flex items-center gap-2.5">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">IPK:</span>
                        <span className="text-xs font-black text-slate-800 dark:text-white">{gpa}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {semesters.length === 0 ? (
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-center">
                      <AlertCircle className="w-8 h-8 text-slate-350 dark:text-slate-650 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Belum ada semester di Hub Akademik</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs mx-auto">
                        Silakan tambahkan semester terlebih dahulu di atas untuk mulai melakukan evaluasi.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: Input Form Card (1 Column) */}
                      <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
                        <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {editingEvaluation ? <Pencil className="w-3.5 h-3.5 text-blue-500" /> : <Plus className="w-3.5 h-3.5 text-blue-500" />}
                          {editingEvaluation ? 'Edit Evaluasi' : 'Tambah Evaluasi'}
                        </h3>
                        <form onSubmit={handleSubmitEvaluation} className="space-y-3.5">
                          {/* Semester select options from active semesters state */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Pilih Semester</label>
                            <select
                              value={evaluationSemesterId}
                              onChange={(e) => setEvaluationSemesterId(e.target.value)}
                              className="w-full text-[11px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                            >
                              <option value="">-- Pilih Semester --</option>
                              {semesters.map((sem) => (
                                <option key={sem.id} value={sem.id}>{sem.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* IPS score input */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Nilai IPS Semester</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              required
                              placeholder="Contoh: 3.84"
                              value={ipsScore}
                              onChange={handleIpsChange}
                              className="w-full text-[11px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-bold"
                            />
                          </div>

                          {/* Reflection textarea */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Refleksi Diri</label>
                            <textarea
                              rows={4}
                              required
                              placeholder="Tuliskan kendala, keberhasilan, atau rencana belajar Anda berikutnya..."
                              value={selfReflection}
                              onChange={(e) => setSelfReflection(e.target.value)}
                              className="w-full text-[11px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded-xl focus:outline-none focus:border-blue-500 font-semibold leading-normal"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              type="submit"
                              disabled={isSavingEvaluation}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {isSavingEvaluation ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {editingEvaluation ? 'Perbarui Evaluasi' : 'Simpan Evaluasi'}
                            </button>

                            {editingEvaluation && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEvaluation(null);
                                  setIpsScore('');
                                  setSelfReflection('');
                                }}
                                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Right: History & Timeline Cards (2 Columns) */}
                      <div className="md:col-span-2 space-y-3.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-hidden">
                        {loadingEvaluations ? (
                          <div className="flex justify-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          </div>
                        ) : evaluations.length === 0 ? (
                          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-center items-center h-full min-h-[220px]">
                            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-650 mb-1.5" />
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Belum ada evaluasi semester</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-0.5">
                              Lakukan evaluasi semester pertamamu untuk melacak riwayat IPK Anda di sini.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {evaluations.map((item) => {
                                const matchedSem = semesters.find((s, idx) => parseSemesterNumber(s.name, idx) === item.semester_number);
                                const displayName = matchedSem ? matchedSem.name : `Semester ${item.semester_number}`;
                                return (
                                  <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between relative group"
                                  >
                                    <div className="space-y-2.5">
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-2.5 py-0.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                                            {displayName}
                                          </span>
                                          <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-2.5 py-0.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                                            IPS: {Number(item.ips_score).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditEvaluation(item)}
                                            className="p-1 hover:bg-slate-105 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                                            title="Edit Evaluasi"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEvaluation(item.id, item.semester_number)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center"
                                            title="Hapus Evaluasi"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <blockquote className="border-l-4 border-slate-200 dark:border-slate-700 pl-3.5 italic text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                                        &ldquo;{item.self_reflection}&rdquo;
                                      </blockquote>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

              </div>

              {/* Weekly Calendar Widget & Monthly Tasks Calendar Section (under activeRunningSemester) */}
              {activeRunningSemester && (
                <div className="lg:col-span-1 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                  
                  {/* Weekly Calendar Widget */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 min-h-[380px]">
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Jadwal Kuliah Mingguan
                      </h2>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Mata kuliah pada semester aktif ({activeRunningSemester.name})</p>
                    </div>

                    <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => setSelectedCalendarDay(day)}
                          className={`px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer transition-colors ${
                            selectedCalendarDay === day 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 pt-1">
                      {getCoursesForCalendar(selectedCalendarDay).length === 0 ? (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-10">Tidak ada jadwal kuliah hari {selectedCalendarDay}.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                          {getCoursesForCalendar(selectedCalendarDay).map((c) => {
                            const isConflicted = hasCalendarConflict(c, runningSemesterCourses);
                            return (
                              <div 
                                key={c.id} 
                                onClick={() => {
                                  setSelectedSemesterId(c.semester_id);
                                  setTaskFilterCourseId(c.id);
                                  setCurrentView('courses');
                                }}
                                className={`p-3 border rounded-xl flex flex-col gap-1 cursor-pointer transition-all ${
                                  isConflicted 
                                    ? 'border-red-300 dark:border-red-900 bg-red-50/10 dark:bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.02)]' 
                                    : 'bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/15 dark:hover:bg-blue-950/15 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[9px] font-bold text-slate-850 dark:text-slate-200 leading-snug line-clamp-2 flex-1 hover:text-blue-600 dark:hover:text-blue-400">
                                    {c.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isConflicted && (
                                      <span className="text-[7px] font-extrabold uppercase tracking-widest bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 px-1 py-0.2 rounded border border-red-200/50 dark:border-red-900/40 flex items-center gap-0.5 animate-pulse">
                                        Bentrok
                                      </span>
                                    )}
                                    {getCourseTimeStatus(c.schedule) === 'Berlangsung' && (
                                      <span className="text-[7px] font-extrabold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/40 flex items-center gap-0.5 animate-pulse">
                                        Berlangsung
                                      </span>
                                    )}
                                    {getCourseTimeStatus(c.schedule) === 'Mendatang' && (
                                      <span className="text-[7px] font-extrabold uppercase tracking-widest bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/40 flex items-center gap-0.5">
                                        Mendatang
                                      </span>
                                    )}
                                    <span className="text-[8px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold border border-blue-100/50 dark:border-blue-900/30">
                                      {c.sks} SKS
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    {c.schedule ? c.schedule.split(',')[1]?.trim() : ''}
                                  </span>
                                  {c.room && <span>Ruang: {c.room}</span>}
                                </div>

                                {c.lecturer_name && (
                                  <div className="text-[8px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                                    {c.lecturer_contact ? (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(formatWhatsAppUrl(c.lecturer_contact), '_blank', 'noopener,noreferrer');
                                        }}
                                        className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold truncate"
                                        title="Hubungi via WhatsApp"
                                      >
                                        {c.lecturer_name}
                                      </span>
                                    ) : (
                                      <span className="truncate">{c.lecturer_name}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Tasks Calendar Section (Moved under Weekly Calendar Widget) */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Pemantau Tugas Akademik Bulanan
                      </h2>
                    </div>
                    <MonthlyTasksCalendar 
                      tasks={allTasks} 
                      onDateClick={handleCalendarDateClick} 
                    />
                  </div>

                </div>
              )}

            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: DETAILED SEMESTER VIEW (Courses + Tasks list, NO LINKS HERE) */}
      {/* ========================================================================= */}
      {currentView === 'courses' && activeSemester && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {/* Navigation Breadcrumb */}
          <button
            onClick={() => setCurrentView('semesters')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Daftar Semester
          </button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {activeSemester.name}
                </h1>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  activeSemester.status === 'Selesai'
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {activeSemester.status || 'Berjalan'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Kelola perkuliahan perkuliahan dan pantau daftar tugas akademik Anda di semester ini.
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl flex items-center gap-1 shadow-sm">
                <button
                  onClick={() => changeCourseViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${courseViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeCourseViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${courseViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setCourseName('');
                  setCourseCode('');
                  setCourseSks(2);
                  setCourseRoom('');
                  setCourseDay('Senin');
                  setCourseTimeStart('08:00');
                  setLecturerName('');
                  setLecturerContact('');
                  setActiveModal('addCourse');
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-white" />
                Tambah Mata Kuliah
              </button>
            </div>
          </div>

          {loadingCoursesAndTasks ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-12">
              {/* ======================= SEKSI MATA KULIAH ======================= */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h2 
                    onClick={() => setShowCoursesList(prev => !prev)}
                    className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none transition-colors"
                  >
                    <BookOpen className="w-4.5 h-4.5 text-blue-500" />
                    Mata Kuliah ({courses.length})
                    {showCoursesList ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </h2>
                </div>

                {showCoursesList && (
                  courses.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada mata kuliah</h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                        Tambahkan kelas perkuliahan Anda untuk semester ini.
                      </p>
                    </div>
                  ) : (
                    <>
                    {courseViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, index) => {
                          const borderColors = [
                            'border-l-blue-500',
                            'border-l-indigo-500',
                            'border-l-sky-500',
                            'border-l-violet-500',
                            'border-l-emerald-500',
                            'border-l-amber-500'
                          ];
                          const leftBorderClass = borderColors[index % borderColors.length];
                          const isFiltered = taskFilterCourseId === course.id;
                          const isConflicted = hasCalendarConflict(course, courses);

                          return (
                            <div
                              key={course.id}
                              onClick={() => {
                                setTaskFilterCourseId(prev => prev === course.id ? 'All' : course.id);
                              }}
                              className={`group relative p-5 pb-16 rounded-2xl border border-l-4 ${leftBorderClass} hover:border-blue-200 dark:hover:border-slate-700 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[190px] bg-gradient-to-br from-white to-slate-50/10 dark:from-slate-900 dark:to-slate-950/20 cursor-pointer ${
                                isFiltered ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 bg-blue-50/5 dark:bg-blue-950/5' : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100/50 dark:border-slate-800/60">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    {isConflicted && (
                                      <span className="text-[7px] font-extrabold uppercase tracking-widest bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 px-1 py-0.2 rounded border border-red-200/50 dark:border-red-900/40 flex items-center gap-0.5 animate-pulse">
                                        Bentrok
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100/50 dark:border-blue-900/30">
                                    {course.sks} SKS
                                  </span>
                                </div>
                                
                                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 pr-4 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {course.name}
                                </h3>
                              </div>

                              <div className="space-y-1.5 py-2.5">
                                {course.schedule && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    {course.schedule}
                                  </p>
                                )}
                                
                                {/* Room Class styled MapPin badge */}
                                {course.room && (
                                  <div className="pt-0.5 flex">
                                    <span className="flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg">
                                      <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                                      Ruang: {course.room}
                                    </span>
                                  </div>
                                )}
                                
                                {course.lecturer_name && (
                                  <div className="text-[9px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1.5 space-y-1">
                                    <p className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                                      <User className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                                      Dosen:{" "}
                                      {course.lecturer_contact ? (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(formatWhatsAppUrl(course.lecturer_contact), '_blank', 'noopener,noreferrer');
                                          }}
                                          className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold inline-flex items-center"
                                          title="Hubungi via WhatsApp"
                                        >
                                          {course.lecturer_name}
                                        </span>
                                      ) : (
                                        course.lecturer_name
                                      )}
                                    </p>
                                    {course.lecturer_contact && (
                                      <p className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                        <Phone className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                                        {course.lecturer_contact}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action buttons (Bottom Right, stop propagation correctly) */}
                              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openEditCourse(course, e);
                                  }}
                                  className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm transition-colors cursor-pointer"
                                  title="Edit Mata Kuliah"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteCourse(course.id);
                                  }}
                                  className="p-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 border border-slate-200 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-900/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-colors cursor-pointer"
                                  title="Hapus Mata Kuliah"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // List View
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hidden">
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 min-w-[720px] md:min-w-0">
                            {courses.map((course, index) => {
                              const borderColors = [
                                'border-l-blue-500',
                                'border-l-indigo-500',
                                'border-l-sky-500',
                                'border-l-violet-500',
                                'border-l-emerald-500',
                                'border-l-amber-500'
                              ];
                              const leftBorderClass = borderColors[index % borderColors.length];
                              const isFiltered = taskFilterCourseId === course.id;
                              const isConflicted = hasCalendarConflict(course, courses);
                              
                              return (
                                <div
                                  key={course.id}
                                  onClick={() => {
                                    setTaskFilterCourseId(prev => prev === course.id ? 'All' : course.id);
                                  }}
                                  className={`px-6 py-4 flex items-center justify-between border-l-4 ${leftBorderClass} hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group ${
                                    isFiltered ? 'bg-blue-50/10 dark:bg-blue-950/10' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Course Icon styled in high contrast Dark Mode */}
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      📖
                                    </div>
                                    <div className="min-w-0 flex-1 flex items-center gap-3">
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                          {course.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                          <span className="flex-shrink-0">{course.sks} SKS</span>
                                          {course.schedule && (
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-0">
                                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
                                              <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                              <span className="truncate">{course.schedule}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {isConflicted && (
                                        <span className="text-[7px] font-extrabold uppercase tracking-widest bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 px-1 py-0.2 rounded border border-red-200/50 dark:border-red-900/40 flex items-center gap-0.5 animate-pulse flex-shrink-0">
                                          Bentrok
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    
                                    {course.room && (
                                      <span className="text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/55 dark:border-slate-700 flex items-center gap-1 font-semibold">
                                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                        {course.room}
                                      </span>
                                    )}

                                    {course.lecturer_name && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold max-w-[120px] truncate">
                                        <User className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                                        {course.lecturer_contact ? (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(formatWhatsAppUrl(course.lecturer_contact), '_blank', 'noopener,noreferrer');
                                            }}
                                            className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                                            title="Hubungi via WhatsApp"
                                          >
                                            {course.lecturer_name}
                                          </span>
                                        ) : (
                                          course.lecturer_name
                                        )}
                                      </span>
                                    )}

                                    {/* Action buttons (with proper stop propagation) */}
                                    <div className="flex items-center gap-1.5 relative z-10">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          openEditCourse(course, e);
                                        }}
                                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                                        title="Edit Mata Kuliah"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleDeleteCourse(course.id);
                                        }}
                                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                        title="Hapus Mata Kuliah"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
                )}
              </div>

              {/* ======================= SEKSI DAFTAR TUGAS ======================= */}
              <div className="space-y-6 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-blue-500" />
                      Tugas Semester ({sortedTasks.length})
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {taskFilterDate && (
                        <span 
                          onClick={() => setTaskFilterDate(null)}
                          className="text-[9px] font-bold bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                          title="Hapus filter tanggal"
                        >
                          Tanggal: {taskFilterDate.split('-').reverse().join('-')} &times;
                        </span>
                      )}
                      {taskFilterCourseId !== 'All' && (
                        <span 
                          onClick={() => setTaskFilterCourseId('All')}
                          className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                          title="Hapus filter mata kuliah"
                        >
                          Matkul: {courses.find(c => c.id === taskFilterCourseId)?.name} &times;
                        </span>
                      )}
                      {taskFilterStatus !== 'All' && (
                        <span 
                          onClick={() => setTaskFilterStatus('All')}
                          className="text-[9px] font-bold bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/50 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                          title="Hapus filter status"
                        >
                          Status: {taskFilterStatus === 'Pending' ? 'Belum Selesai' : 'Selesai'} &times;
                        </span>
                      )}
                      {(taskFilterStartDate || taskFilterEndDate) && (
                        <span 
                          onClick={() => { setTaskFilterStartDate(''); setTaskFilterEndDate(''); }}
                          className="text-[9px] font-bold bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/50 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                          title="Hapus filter rentang tanggal"
                        >
                          Rentang: {taskFilterStartDate ? taskFilterStartDate.split('-').reverse().join('/') : 'Awal'} - {taskFilterEndDate ? taskFilterEndDate.split('-').reverse().join('/') : 'Akhir'} &times;
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Active Filter Indicators */}
                    {(taskFilterCourseId !== 'All' || taskFilterStatus !== 'All' || taskFilterStartDate || taskFilterEndDate || taskFilterDate) && (
                      <button 
                        onClick={resetExpertFilters}
                        className="h-8 flex items-center justify-center text-[9px] font-bold bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900 text-red-600 dark:text-red-300 px-2.5 rounded-lg border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors"
                      >
                        Reset Filter
                      </button>
                    )}
                    
                    <button
                      onClick={openFilterModal}
                      className="w-full sm:w-auto h-8 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      Filter Lanjutan
                    </button>

                    {/* View Switcher Tasks */}
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                      <button
                        onClick={() => changeTaskViewMode('grid')}
                        className={`h-full aspect-square flex items-center justify-center rounded-md transition-colors cursor-pointer ${taskViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => changeTaskViewMode('list')}
                        className={`h-full aspect-square flex items-center justify-center rounded-md transition-colors cursor-pointer ${taskViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bulk Add Tasks triggers */}
                    <button
                      onClick={() => {
                        setBulkRows([{ name: '', courseId: taskFilterCourseId !== 'All' ? taskFilterCourseId : '', startDate: '', dueDate: '', dueTime: '23:59', taskType: 'Tugas', taskMethod: 'Individu', description: '' }]);
                        setActiveModal('bulkAddTask');
                      }}
                      className="h-8 flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Bulk Add
                    </button>

                    <button
                      onClick={() => {
                        setTaskName('');
                        setTaskDesc('');
                        setTaskCourseId(taskFilterCourseId !== 'All' ? taskFilterCourseId : '');
                        setTaskStartDate('');
                        setTaskDueDate('');
                        setTaskDueTime('23:59');
                        setTaskType('Tugas');
                        setTaskMethod('Individu');
                        setActiveModal('addTask');
                      }}
                      className="flex-1 sm:flex-initial h-8 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-[10px] font-bold px-3 rounded-lg transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      Tambah Tugas
                    </button>
                  </div>
                </div>

                {sortedTasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada tugas ditemukan</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                      Semua tugas beres! Tidak ada tugas yang terdaftar atau mencocokkan filter Anda saat ini.
                    </p>
                  </div>
                ) : (
                  <>
                    {taskViewMode === 'grid' ? (
                      // Grid View for Tasks
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedTasks.map((task) => {
                          const nearDeadline = isNearDeadline(task.due_date, task.status);
                          const overdue = isOverdue(task.due_date, task.status);
                          const isCompleted = task.status === 'Completed';

                          // Color-coded border and bg styles (with dark compatibility)
                          let cardStyleClass = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
                          if (isCompleted) {
                            cardStyleClass = 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 opacity-70';
                          } else if (overdue) {
                            cardStyleClass = 'border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/20 text-red-900 dark:text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.02)]';
                          } else if (nearDeadline) {
                            cardStyleClass = 'border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.02)]';
                          }

                          return (
                            <div
                              key={task.id}
                              className={`p-5 rounded-2xl border flex flex-col justify-between h-54 transition-all duration-205 hover:shadow-md ${cardStyleClass}`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    onClick={() => toggleTaskStatus(task.id, task.status, task.name)}
                                    className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0 cursor-pointer"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-in zoom-in-50" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                    )}
                                  </button>
                                  
                                  <div className="min-w-0 flex-1">
                                    <h3 className={`text-xs font-bold leading-tight ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                      {task.name}
                                    </h3>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1 truncate">
                                      {task.course?.name || 'Mata Kuliah'}
                                    </p>
                                    
                                    {/* Task Type & Method Badges styled in dark mode for contrast */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                        task.task_type === 'Quiz'
                                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-300'
                                          : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                                      }`}>
                                        {task.task_type || 'Tugas'}
                                      </span>
                                      
                                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex items-center gap-0.5 ${
                                        task.task_method === 'Kelompok'
                                          ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/50 text-teal-600 dark:text-teal-300'
                                          : 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-300'
                                      }`}>
                                        {task.task_method === 'Kelompok' && <Users className="w-2.5 h-2.5 flex-shrink-0" />}
                                        {task.task_method || 'Individu'}
                                      </span>
                                    </div>

                                    {task.description && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between mt-auto">
                                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold space-y-0.5">
                                  <p>Pemberian: {formatDate(task.start_date)}</p>
                                  <p className={overdue ? 'text-red-600 font-bold' : nearDeadline ? 'text-amber-600 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                                    Tenggat: {formatDate(task.due_date)} {task.due_time ? `pukul ${task.due_time}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  {overdue && (
                                    <span className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full animate-pulse">
                                      Terlambat
                                    </span>
                                  )}
                                  {nearDeadline && (
                                    <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full animate-pulse">
                                      <AlertTriangle className="w-3 h-3" />
                                      {getRemainingDaysText(task.due_date)}
                                    </span>
                                  )}
                                  {!overdue && !nearDeadline && !isCompleted && (
                                    <span className="text-[7px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                                      {getRemainingDaysText(task.due_date)}
                                    </span>
                                  )}

                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Edit Tugas"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                    title="Hapus Tugas"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // List View for Tasks
                      <div className="space-y-3.5">
                        {sortedTasks.map((task) => {
                          const nearDeadline = isNearDeadline(task.due_date, task.status);
                          const overdue = isOverdue(task.due_date, task.status);
                          const isCompleted = task.status === 'Completed';

                          // Color-coded border and bg styles
                          let cardStyleClass = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
                          if (isCompleted) {
                            cardStyleClass = 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 opacity-70';
                          } else if (overdue) {
                            cardStyleClass = 'border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/20 text-red-900 dark:text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.02)]';
                          } else if (nearDeadline) {
                            cardStyleClass = 'border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.02)]';
                          }

                          return (
                            <div 
                              key={task.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:shadow-sm ${cardStyleClass}`}
                            >
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                <button
                                  onClick={() => toggleTaskStatus(task.id, task.status, task.name)}
                                  className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0 cursor-pointer"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-in zoom-in-50" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                  )}
                                </button>

                                <div className="space-y-1.5 flex-1 min-w-0 text-left">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className={`text-xs font-bold leading-snug truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                      {task.name}
                                    </h3>
                                    
                                    {/* Task type & method tags styled for high contrast in dark mode */}
                                    <span className={`text-[7px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-widest ${
                                      task.task_type === 'Quiz'
                                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-300'
                                        : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                                    }`}>
                                      {task.task_type || 'Tugas'}
                                    </span>
                                    
                                    <span className={`text-[7px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-widest ${
                                      task.task_method === 'Kelompok'
                                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/50 text-teal-600 dark:text-teal-300'
                                        : 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-300'
                                    }`}>
                                      {task.task_method || 'Individu'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2.5 items-center text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{task.course?.name || 'Mata Kuliah'}</span>
                                    <span>&bull;</span>
                                    <span>Pemberian: {formatDate(task.start_date)}</span>
                                    <span>&bull;</span>
                                    <span className={overdue ? 'text-red-600 dark:text-red-400 font-bold' : nearDeadline ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                                      Tenggat: {formatDate(task.due_date)} {task.due_time ? `pukul ${task.due_time}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="flex flex-col items-end gap-1.5">
                                  {overdue && (
                                    <span className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                                      Terlambat
                                    </span>
                                  )}
                                  {nearDeadline && (
                                    <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                                      <AlertTriangle className="w-3 h-3" />
                                      {getRemainingDaysText(task.due_date)}
                                    </span>
                                  )}
                                  {!overdue && !nearDeadline && !isCompleted && (
                                    <span className="text-[8px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-bold">
                                      {getRemainingDaysText(task.due_date)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Edit Tugas"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                    title="Hapus Tugas"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* MODALS POPUPS */}
      {/* ========================================================================= */}
      
      {/* 1. Add Semester Modal */}
      <AnimatePresence>
        <Modal
          isOpen={activeModal === 'addSemester'}
          onClose={() => setActiveModal(null)}
          title="Tambah Semester Baru"
        >
          <form onSubmit={handleAddSemester} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Nama Semester
              </label>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="Contoh: Semester 4, Semester Pendek 2026"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
              >
                Simpan Semester
              </button>
            </div>
          </form>
        </Modal>
      </AnimatePresence>

      {/* 2. Edit Semester Modal */}
      <AnimatePresence>
        <Modal
          isOpen={activeModal === 'editSemester'}
          onClose={() => {
            setActiveModal(null);
            setEditingSemester(null);
          }}
          title="Edit Detail Semester"
        >
          <form onSubmit={handleEditSemester} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Nama Semester
              </label>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="Contoh: Semester 4"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Status Semester
              </label>
              <select
                value={semesterStatus}
                onChange={(e) => setSemesterStatus(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="Berjalan" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Berjalan (Ongoing)</option>
                <option value="Selesai" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Selesai (Completed)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setEditingSemester(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </Modal>
      </AnimatePresence>

      {/* 3. Add/Edit Course Modal */}
      <AnimatePresence>
        <Modal
          isOpen={activeModal === 'addCourse' || activeModal === 'editCourse'}
          onClose={() => {
            setActiveModal(null);
            setEditingCourse(null);
          }}
          title={activeModal === 'addCourse' ? 'Tambah Mata Kuliah Baru' : 'Edit Detail Mata Kuliah'}
        >
          <form onSubmit={activeModal === 'addCourse' ? handleAddCourse : handleEditCourse} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Nama Mata Kuliah
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Contoh: Pemrograman Web, Kalkulus II"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Beban SKS
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={courseSks}
                onChange={(e) => setCourseSks(e.target.value)}
                placeholder="SKS"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                required
              />
            </div>

            {/* Structured schedule input */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block border-b border-slate-200 dark:border-slate-700 pb-1">
                Jadwal Perkuliahan
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Hari</label>
                  <select
                    value={courseDay}
                    onChange={(e) => setCourseDay(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer font-medium"
                  >
                    {DAYS.map(d => <option key={d} value={d} className="dark:bg-slate-900">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={courseTimeStart}
                    onChange={(e) => setCourseTimeStart(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer font-medium focus:outline-none"
                    required
                  />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                * Jam selesai perkuliahan dihitung otomatis berdasarkan Jam Mulai dan beban SKS (1 SKS = 60 menit).
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Ruangan / Ruang Kelas
              </label>
              <input
                type="text"
                value={courseRoom}
                onChange={(e) => setCourseRoom(e.target.value)}
                placeholder="Contoh: Lab Komputasi 3, Gedung C"
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
              />
            </div>

            {/* Lecturer details section */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block border-b border-slate-200 dark:border-slate-700 pb-1">Detail Dosen (Opsional)</span>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nama / Kode Dosen</label>
                  <input
                    type="text"
                    value={lecturerName}
                    onChange={(e) => setLecturerName(e.target.value)}
                    placeholder="Contoh: Dr. Budi, M.T."
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nomor Kontak</label>
                  <input
                    type="text"
                    value={lecturerContact}
                    onChange={(e) => setLecturerContact(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setEditingCourse(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
              >
                {activeModal === 'addCourse' ? 'Simpan Mata Kuliah' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      </AnimatePresence>

      {/* 3.1 Add/Edit Academic Link Modal */}
      <AnimatePresence>
        {(activeModal === 'addLink' || activeModal === 'editLink') && (
          <Modal
            isOpen={activeModal === 'addLink' || activeModal === 'editLink'}
            onClose={() => {
              setActiveModal(null);
              setEditingLink(null);
            }}
            title={activeModal === 'addLink' ? 'Tambah Link Penting Baru' : 'Edit Detail Link Penting'}
          >
            <form onSubmit={activeModal === 'addLink' ? handleAddLink : handleEditLink} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Nama Tautan / Sumber Daya
                </label>
                <input 
                  type="text" 
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Contoh: LMS Kampus, Portal Nilai SIAKAD, Drive"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  URL / Tautan Website
                </label>
                <input 
                  type="text" 
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Contoh: lms.universitas.ac.id"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                  required
                />
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic mt-1">
                  * Protokol https:// akan ditambahkan secara otomatis jika tidak ditulis.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingLink(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
                >
                  {activeModal === 'addLink' ? 'Simpan Link' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* 4. Single Add/Edit Task Modal */}
      <AnimatePresence>
        {(activeModal === 'addTask' || activeModal === 'editTask') && (
          <Modal
            isOpen={activeModal === 'addTask' || activeModal === 'editTask'}
            onClose={() => {
              setActiveModal(null);
              setEditingTask(null);
            }}
            title={activeModal === 'addTask' ? 'Tambah Tugas Kuliah Baru' : 'Edit Detail Tugas'}
          >
            <form onSubmit={activeModal === 'addTask' ? handleAddTask : handleEditTask} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Nama Tugas
                </label>
                <input 
                  type="text" 
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Contoh: Membuat Program JST dengan Python"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Mata Kuliah
                </label>
                <select
                  value={taskCourseId}
                  onChange={(e) => setTaskCourseId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
                  required
                >
                  <option value="" className="dark:bg-slate-900">-- Pilih Mata Kuliah --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">{c.name} {c.code ? `(${c.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Jenis Tugas
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
                  >
                    <option value="Tugas" className="dark:bg-slate-900">Tugas (Assignment)</option>
                    <option value="Quiz" className="dark:bg-slate-900">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Metode Pengerjaan
                  </label>
                  <select
                    value={taskMethod}
                    onChange={(e) => setTaskMethod(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
                  >
                    <option value="Individu" className="dark:bg-slate-900">Individu</option>
                    <option value="Kelompok" className="dark:bg-slate-900">Kelompok</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea 
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detail tugas atau catatan..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 min-h-[60px] font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Pemberian
                  </label>
                  <input 
                    type="date" 
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none font-medium"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Tenggat
                  </label>
                  <input 
                    type="date" 
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none font-medium"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Jam Kumpul
                  </label>
                  <input 
                    type="time" 
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none font-medium cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
                >
                  {activeModal === 'addTask' ? 'Simpan Tugas' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* 5. Bulk Add Tasks Modal */}
      <AnimatePresence>
        {activeModal === 'bulkAddTask' && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4.5 h-4.5 text-blue-500 animate-bounce" />
                  Tambah Banyak Tugas (Bulk Add)
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkAddTask} className="p-6 space-y-4">
                <div className="overflow-x-auto max-h-[50vh] pr-1">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 pr-3">Nama Tugas</th>
                        <th className="py-2.5 pr-3 w-40">Mata Kuliah</th>
                        <th className="py-2.5 pr-3 w-28">Pemberian</th>
                        <th className="py-2.5 pr-3 w-28">Tenggat</th>
                        <th className="py-2.5 pr-3 w-28">Jam Kumpul</th>
                        <th className="py-2.5 pr-3 w-24">Jenis</th>
                        <th className="py-2.5 pr-3 w-24">Metode</th>
                        <th className="py-2.5 w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                      {bulkRows.map((row, index) => (
                        <tr key={index} className="align-middle">
                          <td className="py-2.5 pr-3">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateBulkRow(index, 'name', e.target.value)}
                              placeholder="e.g. Laporan Bab I"
                              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                              required
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={row.courseId}
                              onChange={(e) => updateBulkRow(index, 'courseId', e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none cursor-pointer font-medium"
                              required
                            >
                              <option value="" className="dark:bg-slate-900">-- Pilih --</option>
                              {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">{c.name}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="date"
                              value={row.startDate}
                              onChange={(e) => updateBulkRow(index, 'startDate', e.target.value)}
                              className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none font-medium"
                              required
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="date"
                              value={row.dueDate}
                              onChange={(e) => updateBulkRow(index, 'dueDate', e.target.value)}
                              className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none font-medium"
                              required
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="time"
                              value={row.dueTime}
                              onChange={(e) => updateBulkRow(index, 'dueTime', e.target.value)}
                              className="w-full text-[10px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none font-medium cursor-pointer"
                              required
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={row.taskType}
                              onChange={(e) => updateBulkRow(index, 'taskType', e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer font-medium"
                            >
                              <option value="Tugas" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Tugas</option>
                              <option value="Quiz" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Quiz</option>
                            </select>
                          </td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={row.taskMethod}
                              onChange={(e) => updateBulkRow(index, 'taskMethod', e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer font-medium"
                            >
                              <option value="Individu" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Individu</option>
                              <option value="Kelompok" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Kelompok</option>
                            </select>
                          </td>
                          <td className="py-2.5 text-center">
                            {bulkRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBulkRow(index)}
                                className="p-1.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 hover:border-red-200 rounded-lg text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={addBulkRow}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    Tambah Baris Baru
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/10"
                    >
                      Simpan Semua Tugas ({bulkRows.length})
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expert Filter Modal */}
      <AnimatePresence>
        {activeModal === 'expertFilter' && (
          <Modal
            isOpen={activeModal === 'expertFilter'}
            onClose={() => setActiveModal(null)}
            title="Filter Lanjutan Tugas"
          >
            <form onSubmit={applyExpertFilters} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Mata Kuliah
                </label>
                <select
                  value={draftCourseId}
                  onChange={(e) => setDraftCourseId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="All" className="dark:bg-slate-900">Semua Mata Kuliah</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Status Tugas
                </label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="All" className="dark:bg-slate-900">Semua</option>
                  <option value="Pending" className="dark:bg-slate-900">Belum Selesai (Pending)</option>
                  <option value="Completed" className="dark:bg-slate-900">Selesai (Completed)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Hingga Tanggal
                  </label>
                  <input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetExpertFilters}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                >
                  Reset Filter
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-500/5"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}
