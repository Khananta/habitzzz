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
  BookOpen, 
  Calendar, 
  X, 
  LayoutGrid, 
  List, 
  Search, 
  ArrowRight, 
  Loader2,
  BookOpenCheck,
  Clipboard,
  Clock
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

export default function QuranLogPage() {
  const { user } = useAuth();
  const [surahs, setSurahs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNeedsMigration, setTableNeedsMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Filter & Layout States
  const [layoutMode, setLayoutMode] = useState('grid'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All', 'Tilawah', 'Hafalan', 'Muraja'ah'

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  // Form Fields
  const [selectedSurahId, setSelectedSurahId] = useState('');
  const [startAyah, setStartAyah] = useState('');
  const [endAyah, setEndAyah] = useState('');
  const [recitationType, setRecitationType] = useState('Tilawah');
  const [notes, setNotes] = useState('');
  const [recitationDate, setRecitationDate] = useState(formatLocalDate(new Date()));
  const [recitationTime, setRecitationTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Load layout mode preference from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('quran_layout_mode');
    if (savedMode === 'list' || savedMode === 'grid') {
      setLayoutMode(savedMode);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setTableNeedsMigration(false);
    try {
      // 1. Fetch Surahs Master
      const { data: surahData, error: surahError } = await supabase
        .from('quran_surahs')
        .select('*')
        .order('id', { ascending: true });

      if (surahError) {
        if (surahError.code === 'PGRST116' || surahError.message.includes('relation "quran_surahs" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw surahError;
      }
      setSurahs(surahData || []);

      // 2. Fetch User Logs
      const { data: logData, error: logError } = await supabase
        .from('quran_logs')
        .select(`
          *,
          quran_surahs (
            id,
            name,
            total_ayahs
          )
        `)
        .eq('user_id', user.id)
        .order('recitation_date', { ascending: false })
        .order('recitation_time', { ascending: false });

      if (logError) {
        if (logError.code === 'PGRST116' || logError.message.includes('relation "quran_logs" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw logError;
      }

      setLogs(logData || []);
    } catch (err) {
      console.error('Error fetching Quran tracker data:', err.message);
      toast.error('Gagal memuat data tilawah Al-Qur\'an.');
    } finally {
      setLoading(false);
    }
  };

  // SQL Script for helper
  const handleCopySql = () => {
    const sqlQuery = `-- 1. Membuat Tabel Master Surah
CREATE TABLE IF NOT EXISTS public.quran_surahs (
  id integer PRIMARY KEY,
  name text NOT NULL,
  total_ayahs integer NOT NULL
);

-- Aktifkan RLS untuk quran_surahs
ALTER TABLE public.quran_surahs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to quran_surahs" ON public.quran_surahs FOR SELECT USING (true);

-- 2. Memasukkan Data 114 Surah (Seeding)
INSERT INTO public.quran_surahs (id, name, total_ayahs) VALUES
(1, 'Al-Fatihah', 7),
(2, 'Al-Baqarah', 286),
(3, 'Ali ''Imran', 200),
(4, 'An-Nisa''', 176),
(5, 'Al-Ma''idah', 120),
(6, 'Al-An''am', 165),
(7, 'Al-A''raf', 206),
(8, 'Al-Anfal', 75),
(9, 'At-Tawbah', 129),
(10, 'Yunus', 109),
(11, 'Hud', 123),
(12, 'Yusuf', 111),
(13, 'Ar-Ra''d', 43),
(14, 'Ibrahim', 52),
(15, 'Al-Hijr', 99),
(16, 'An-Nahl', 128),
(17, 'Al-Isra''', 111),
(18, 'Al-Kahf', 110),
(19, 'Maryam', 98),
(20, 'Taha', 135),
(21, 'Al-Anbiya''', 112),
(22, 'Al-Hajj', 78),
(23, 'Al-Mu''minun', 118),
(24, 'An-Nur', 64),
(25, 'Al-Furqan', 77),
(26, 'Ash-Shu''ara''', 227),
(27, 'An-Naml', 93),
(28, 'Al-Qasas', 88),
(29, 'Al-Ankabut', 69),
(30, 'Ar-Rum', 60),
(31, 'Luqman', 34),
(32, 'As-Sajdah', 30),
(33, 'Al-Ahzab', 73),
(34, 'Saba''', 54),
(35, 'Fatir', 45),
(36, 'Yasin', 83),
(37, 'As-Saffat', 182),
(38, 'Sad', 88),
(39, 'Az-Zumar', 75),
(40, 'Ghafir', 85),
(41, 'Fussilat', 54),
(42, 'Ash-Shura', 53),
(43, 'Az-Zukhruf', 89),
(44, 'Ad-Dukhan', 59),
(45, 'Al-Jathiyah', 37),
(46, 'Al-Ahqaf', 35),
(47, 'Muhammad', 38),
(48, 'Al-Fath', 29),
(49, 'Al-Hujurat', 18),
(50, 'Qaf', 45),
(51, 'Adh-Dhariyat', 60),
(52, 'At-Tur', 49),
(53, 'An-Najm', 62),
(54, 'Al-Qamar', 55),
(55, 'Ar-Rahman', 78),
(56, 'Al-Waqi''ah', 96),
(57, 'Al-Hadid', 29),
(58, 'Al-Mujadilah', 22),
(59, 'Al-Hashr', 24),
(60, 'Al-Mumtahanah', 13),
(61, 'As-Saff', 14),
(62, 'Al-Jumu''ah', 11),
(63, 'Al-Munafiqun', 11),
(64, 'At-Taghabun', 18),
(65, 'At-Talaq', 12),
(66, 'At-Tahrim', 12),
(67, 'Al-Mulk', 30),
(68, 'Al-Qalam', 52),
(69, 'Al-Haqqah', 52),
(70, 'Al-Ma''arij', 44),
(71, 'Nuh', 28),
(72, 'Al-Jinn', 28),
(73, 'Al-Muzzammil', 20),
(74, 'Al-Muddaththir', 56),
(75, 'Al-Qiyamah', 40),
(76, 'Al-Insan', 31),
(77, 'Al-Mursalat', 50),
(78, 'An-Naba''', 40),
(79, 'An-Nazi''at', 46),
(80, 'Abasa', 42),
(81, 'At-Takwir', 29),
(82, 'Al-Infitar', 19),
(83, 'Al-Mutaffifin', 36),
(84, 'Al-Inshiqaq', 25),
(85, 'Al-Buruj', 22),
(86, 'At-Tariq', 17),
(87, 'Al-A''la', 19),
(88, 'Al-Ghashiyah', 26),
(89, 'Al-Fajr', 30),
(90, 'Al-Balad', 20),
(91, 'Ash-Shams', 15),
(92, 'Al-Lail', 21),
(93, 'Ad-Duha', 11),
(94, 'Ash-Sharh', 8),
(95, 'At-Tin', 8),
(96, 'Al-Alaq', 19),
(97, 'Al-Qadr', 5),
(98, 'Al-Bayyinah', 8),
(99, 'Az-Zalzalah', 8),
(100, 'Al-Adiyat', 11),
(101, 'Al-Qari''ah', 11),
(102, 'At-Takathur', 8),
(103, 'Al-Asr', 3),
(104, 'Al-Humazah', 9),
(105, 'Al-Fil', 5),
(106, 'Quraysh', 4),
(107, 'Al-Ma''un', 7),
(108, 'Al-Kauthar', 3),
(109, 'Al-Kafirun', 6),
(110, 'An-Nasr', 3),
(111, 'Al-Lahab', 5),
(112, 'Al-Ikhlas', 4),
(113, 'Al-Falaq', 5),
(114, 'An-Nas', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, total_ayahs = EXCLUDED.total_ayahs;

-- 3. Membuat Tabel Catatan Ngaji (quran_logs)
CREATE TABLE IF NOT EXISTS public.quran_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recitation_date date DEFAULT CURRENT_DATE NOT NULL,
  recitation_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
  surah_id integer REFERENCES public.quran_surahs(id) ON DELETE RESTRICT NOT NULL,
  start_ayah integer NOT NULL,
  end_ayah integer NOT NULL,
  recitation_type text NOT NULL,
  duration_minutes integer,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_ayah_range CHECK (end_ayah >= start_ayah)
);

-- Permisi RLS
ALTER TABLE public.quran_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own quran logs" ON public.quran_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    toast.success('Skrip SQL berhasil disalin!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Find the selected surah details
  const selectedSurah = surahs.find(s => s.id === parseInt(selectedSurahId));

  // Handle open modal for new log
  const handleOpenAddModal = () => {
    setEditingLog(null);
    setSelectedSurahId(surahs[0]?.id || '');
    setStartAyah('1');
    setEndAyah('');
    setRecitationType('Tilawah');
    setNotes('');
    setRecitationDate(formatLocalDate(new Date()));
    setRecitationTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setModalOpen(true);
  };

  // Handle open modal for edit log
  const handleOpenEditModal = (log, e) => {
    e.stopPropagation();
    setEditingLog(log);
    setSelectedSurahId(log.surah_id);
    setStartAyah(log.start_ayah.toString());
    setEndAyah(log.end_ayah.toString());
    setRecitationType(log.recitation_type);
    setNotes(log.notes || '');
    setRecitationDate(log.recitation_date);
    setRecitationTime(log.recitation_time.substring(0, 5));
    setModalOpen(true);
  };

  // Handle auto-resume clicking from the widget
  const handleAutoResume = (surahId, nextAyah) => {
    setEditingLog(null);
    setSelectedSurahId(surahId);
    setStartAyah(nextAyah.toString());
    
    // Suggest end ayah based on average (e.g. start + 9 for 10 ayahs)
    const surahObj = surahs.find(s => s.id === surahId);
    if (surahObj) {
      const maxPossible = surahObj.total_ayahs;
      const suggestedEnd = Math.min(maxPossible, nextAyah + 9);
      setEndAyah(suggestedEnd.toString());
    } else {
      setEndAyah('');
    }
    
    setRecitationType('Tilawah');
    setNotes('');
    setRecitationDate(formatLocalDate(new Date()));
    setRecitationTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setModalOpen(true);
  };

  // Form Submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedSurahId) {
      toast.error('Silakan pilih Surah!');
      return;
    }

    const startVal = parseInt(startAyah);
    const endVal = parseInt(endAyah);

    if (isNaN(startVal) || startVal < 1) {
      toast.error('Ayat mulai harus bernilai minimal 1!');
      return;
    }
    if (isNaN(endVal) || endVal < startVal) {
      toast.error('Ayat selesai harus bernilai sama dengan atau lebih besar dari ayat mulai!');
      return;
    }

    if (selectedSurah && endVal > selectedSurah.total_ayahs) {
      toast.error(`Jumlah ayat Surah ${selectedSurah.name} hanya ${selectedSurah.total_ayahs} ayat! Input Anda (${endVal}) melebihi batas.`);
      return;
    }

    const payload = {
      user_id: user.id,
      surah_id: parseInt(selectedSurahId),
      start_ayah: startVal,
      end_ayah: endVal,
      recitation_type: recitationType,
      duration_minutes: null, // Removed duration
      notes: notes.trim() || null,
      recitation_date: recitationDate,
      recitation_time: `${recitationTime}:00`
    };

    const toastId = toast.loading(editingLog ? 'Memperbarui log ngaji...' : 'Menambahkan log ngaji baru...');

    try {
      if (editingLog) {
        const { error } = await supabase
          .from('quran_logs')
          .update(payload)
          .eq('id', editingLog.id);
        if (error) throw error;
        toast.success('Log ngaji berhasil diperbarui!', { id: toastId });
      } else {
        const { error } = await supabase
          .from('quran_logs')
          .insert([payload]);
        if (error) throw error;
        toast.success('Log ngaji baru berhasil disimpan!', { id: toastId });
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(editingLog ? 'Gagal mengedit log ngaji.' : 'Gagal menyimpan log ngaji.', { id: toastId });
    }
  };

  // Delete log handler
  const handleDeleteLog = async (logId, e) => {
    e.stopPropagation();
    if (!user) return;

    const confirm = await Swal.fire({
      title: 'Hapus Log Ngaji?',
      text: 'Apakah Anda yakin ingin menghapus catatan mengaji ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl font-sans bg-white dark:bg-slate-900',
        title: 'text-sm font-bold text-slate-900 dark:text-slate-100 pt-4',
        htmlContainer: 'text-xs text-slate-500 mt-2 px-3',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer mr-2 shadow-sm',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer ml-2'
      },
      buttonsStyling: false
    });

    if (!confirm.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('quran_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
      toast.success('Catatan ngaji berhasil dihapus.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus log ngaji.');
    }
  };

  // Resume Widget calculations
  const latestLog = logs[0]; 

  const getActiveThreads = () => {
    const map = new Map();
    for (const l of logs) {
      if (!map.has(l.surah_id)) {
        map.set(l.surah_id, l);
      }
    }
    return Array.from(map.values()).slice(0, 3);
  };
  const activeThreads = getActiveThreads();

  // Filter logs for displaying in list/grid
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.quran_surahs?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || l.recitation_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Catatan Ngaji</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simpan, pantau, dan lanjutkan bacaan tilawah, hafalan, serta muraja'ah Al-Qur'an harian Anda.
          </p>
        </div>

        {!tableNeedsMigration && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Tambah riwayat
          </button>
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
                Fitur Catatan Ngaji memerlukan tabel database `quran_surahs` (114 Surah master) dan tabel pencatatan `quran_logs`. Jalankan query SQL di bawah ini pada editor SQL Supabase Anda.
              </p>
            </div>
          </div>
          
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">create_quran_tracker_tables.sql</span>
              <button 
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {copiedSql ? 'Disalin!' : 'Salin SQL'}
              </button>
            </div>
            <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 scrollbar-hidden">
              <code>{`CREATE TABLE public.quran_surahs (...)\nCREATE TABLE public.quran_logs (...)`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!tableNeedsMigration && (
        <>
          {/* Widget Resume Bacaan Cerdas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Absolute Last Read Card */}
            <div className="lg:col-span-2 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-500/20">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-200">Bacaan Terakhir Anda</span>
                </div>

                {latestLog ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-2xl font-black tracking-tight">{latestLog.quran_surahs?.name}</h2>
                      <span className="text-sm font-semibold text-emerald-200">Ayat {latestLog.start_ayah} - {latestLog.end_ayah}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-medium text-emerald-100">
                      <span className="bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(latestLog.recitation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {latestLog.recitation_time.substring(0, 5)}
                      </span>
                      <span className="bg-emerald-500/30 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-bold">
                        {latestLog.recitation_type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-xs text-emerald-100 italic">Belum ada aktivitas tilawah tercatat. Mulailah mengaji untuk memantau progres spiritual Anda!</p>
                  </div>
                )}
              </div>

              {latestLog && latestLog.end_ayah < latestLog.quran_surahs?.total_ayahs && (
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                  <span className="text-[10px] text-emerald-200">Selanjutnya: <strong className="text-white">Ayat {latestLog.end_ayah + 1}</strong></span>
                  <button
                    onClick={() => handleAutoResume(latestLog.surah_id, latestLog.end_ayah + 1)}
                    className="flex items-center gap-1 text-[10px] font-extrabold bg-white text-emerald-700 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.97]"
                  >
                    Lanjutkan Membaca
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>

            {/* Active Grouped Threads (Multi-Surah Tracker) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Benang Progres Surah</span>
                  <span className="text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    {activeThreads.length} Aktif
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeThreads.length > 0 ? (
                    activeThreads.map((t) => {
                      const isFinished = t.end_ayah >= t.quran_surahs?.total_ayahs;
                      return (
                        <div key={t.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors group">
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.quran_surahs?.name}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {isFinished ? 'Tamat 100%' : `Ayat terakhir: ${t.end_ayah}`}
                            </p>
                          </div>

                          {!isFinished && (
                            <button
                              onClick={() => handleAutoResume(t.surah_id, t.end_ayah + 1)}
                              className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer"
                            >
                              Lanjut <ArrowRight className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-[11px] text-slate-400 italic">Tidak ada surah aktif</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic mt-4 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                Membaca paralel? Sesi terakhir per Surah akan terpisah di atas untuk kemudahan akses.
              </p>
            </div>
          </div>

          {/* Filters & Navigation Control Row */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1 items-stretch sm:items-center">
              {/* Search input */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Surah atau catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Type Category Filter */}
              <div className="flex gap-1 overflow-x-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 rounded-xl">
                {['All', 'Tilawah', 'Hafalan', 'Muraja\'ah'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      filterType === t
                        ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {t === 'All' ? 'Semua' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Toggle buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 rounded-xl self-end sm:self-auto">
              <button
                onClick={() => { setLayoutMode('list'); localStorage.setItem('quran_layout_mode', 'list'); }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setLayoutMode('grid'); localStorage.setItem('quran_layout_mode', 'grid'); }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List or Grid Logs Display */}
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Memuat catatan tilawah...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            layoutMode === 'list' ? (
              /* List Table View */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                        <th className="px-6 py-4">Waktu</th>
                        <th className="px-6 py-4">Surah</th>
                        <th className="px-6 py-4">Rentang Ayat</th>
                        <th className="px-6 py-4">Tipe</th>
                        <th className="px-6 py-4">Catatan</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/60 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-350">
                      {filteredLogs.map((log) => {
                        const dateFormatted = new Date(log.recitation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        const timeFormatted = log.recitation_time.substring(0, 5);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{dateFormatted}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 block">{timeFormatted} WIB</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-200">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                {log.quran_surahs?.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-300">
                              Ayat {log.start_ayah} - {log.end_ayah}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                log.recitation_type === 'Tilawah'
                                  ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                                  : log.recitation_type === 'Hafalan'
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                                  : 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                              }`}>
                                {log.recitation_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate italic text-slate-400 dark:text-slate-500" title={log.notes}>
                              {log.notes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={(e) => handleOpenEditModal(log, e)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Log"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteLog(log.id, e)}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Log"
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
              /* Grid Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLogs.map((log) => {
                  const dateFormatted = new Date(log.recitation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  return (
                    <motion.div
                      layout
                      key={log.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
                              {log.quran_surahs?.name}
                            </h3>
                          </div>

                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide border flex-shrink-0 ${
                            log.recitation_type === 'Tilawah'
                              ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                              : log.recitation_type === 'Hafalan'
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                              : 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                          }`}>
                            {log.recitation_type}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                            Ayat {log.start_ayah} - {log.end_ayah}
                          </div>
                          
                          <div className="flex items-center gap-2.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {dateFormatted}, {log.recitation_time.substring(0, 5)}
                            </span>
                          </div>
                        </div>

                        {log.notes && (
                          <div className="text-[10px] italic text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full">
                            "{log.notes}"
                          </div>
                        )}
                      </div>

                      {/* Action buttons footer */}
                      <div className="flex items-center justify-end gap-1.5 pt-3.5 border-t border-slate-50 dark:border-slate-800/80">
                        <button
                          onClick={(e) => handleOpenEditModal(log, e)}
                          className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Edit Log"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLog(log.id, e)}
                          className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          ) : (
            /* Empty state - expanded to full width */
            <div className="py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] text-center p-8 shadow-xs">
              <BookOpen className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto stroke-[1.5]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">Belum Ada Catatan Ngaji</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                Silakan tambahkan catatan mengaji pertama Anda dengan mengklik tombol di atas.
              </p>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Log Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4 text-emerald-500" />
                  {editingLog ? 'Edit Catatan Ngaji' : 'Tambah Catatan Ngaji'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-left">
                {/* Surah Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Pilih Surah</label>
                  <select
                    value={selectedSurahId}
                    onChange={(e) => setSelectedSurahId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" disabled>-- Pilih Surah --</option>
                    {surahs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}. {s.name} ({s.total_ayahs} ayat)
                      </option>
                    ))}
                  </select>
                  {selectedSurah && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-450 block font-semibold italic">
                      * Surah {selectedSurah.name} memiliki {selectedSurah.total_ayahs} ayat.
                    </span>
                  )}
                </div>

                {/* Ayat Range inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Ayat Mulai</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedSurah ? selectedSurah.total_ayahs : undefined}
                      required
                      value={startAyah}
                      onChange={(e) => setStartAyah(e.target.value)}
                      placeholder="Contoh: 1"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Ayat Selesai</label>
                    <input
                      type="number"
                      min={startAyah || "1"}
                      max={selectedSurah ? selectedSurah.total_ayahs : undefined}
                      required
                      value={endAyah}
                      onChange={(e) => setEndAyah(e.target.value)}
                      placeholder="Contoh: 10"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Recitation Type Option */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Tipe Aktivitas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Tilawah', 'Hafalan', 'Muraja\'ah'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRecitationType(t)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          recitationType === t
                            ? 'bg-emerald-50 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date input (full width, duration removed) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Tanggal Mengaji</label>
                  <input
                    type="date"
                    required
                    value={recitationDate}
                    onChange={(e) => setRecitationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Time & Notes */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Waktu</label>
                    <input
                      type="time"
                      required
                      value={recitationTime}
                      onChange={(e) => setRecitationTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Catatan Tambahan</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Cth: Ayat tadabbur tentang surga..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    {editingLog ? 'Simpan Pembaruan' : 'Simpan Catatan'}
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
