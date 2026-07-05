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
  Heart, 
  Calendar, 
  Check, 
  X, 
  Loader2,
  Clipboard,
  Sparkles,
  ShoppingBag,
  Clock,
  List,
  LayoutGrid
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

export default function SkincareRoutinePage() {
  const { user } = useAuth();
  
  // Data States
  const [products, setProducts] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNeedsMigration, setTableNeedsMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Active Tab & Layout Modes
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'schedule', 'shelf'
  const [shelfLayoutMode, setShelfLayoutMode] = useState('grid'); // 'list' or 'grid'

  // Modal States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Form - Product Fields
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] = useState('Cleanser');
  const [prodExpiry, setProdExpiry] = useState('');
  const [prodNotes, setProdNotes] = useState('');

  // Form - Schedule Fields
  const [schedProdId, setSchedProdId] = useState('');
  const [schedDays, setSchedDays] = useState([false, false, false, false, false, false, false]); // Mon-Sun
  const [schedTime, setSchedTime] = useState('AM'); // 'AM' or 'PM'

  // Form - Log Fields
  const [logRoutineTime, setLogRoutineTime] = useState('AM');
  const [logSkinCondition, setLogSkinCondition] = useState('Bagus');
  const [logNotes, setLogNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Load skincare shelf layout mode preference from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('skincare_shelf_layout_mode');
    if (savedMode === 'list' || savedMode === 'grid') {
      setShelfLayoutMode(savedMode);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setTableNeedsMigration(false);
    try {
      // 1. Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from('skincare_products')
        .select('*')
        .order('name', { ascending: true });

      if (prodError) {
        if (prodError.code === 'PGRST116' || prodError.message.includes('relation "skincare_products" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw prodError;
      }
      setProducts(prodData || []);

      // 2. Fetch schedules
      const { data: schedData, error: schedError } = await supabase
        .from('skincare_schedule')
        .select(`
          *,
          skincare_products (
            id,
            name,
            brand,
            category
          )
        `)
        .order('order_index', { ascending: true });

      if (schedError) {
        if (schedError.code === 'PGRST116' || schedError.message.includes('relation "skincare_schedule" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw schedError;
      }
      setSchedule(schedData || []);

      // 3. Fetch logs
      const { data: logData, error: logError } = await supabase
        .from('skincare_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_date', { ascending: false });

      if (logError) {
        if (logError.code === 'PGRST116' || logError.message.includes('relation "skincare_logs" does not exist')) {
          setTableNeedsMigration(true);
          setLoading(false);
          return;
        }
        throw logError;
      }
      setLogs(logData || []);

    } catch (err) {
      console.error('Error fetching skincare tracker data:', err.message);
      toast.error('Gagal memuat data rutinitas skincare.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = () => {
    const sqlQuery = `-- 1. Tabel Inventaris Produk Skincare
CREATE TABLE IF NOT EXISTS public.skincare_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  expiry_date date,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.skincare_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own skincare products" ON public.skincare_products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Tabel Jadwal Langkah Rutinitas Mingguan
CREATE TABLE IF NOT EXISTS public.skincare_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL,
  routine_time text NOT NULL,
  product_id uuid REFERENCES public.skincare_products(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.skincare_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own skincare schedule" ON public.skincare_schedule FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Tabel Log Harian Rutinitas & Jurnal Kulit
CREATE TABLE IF NOT EXISTS public.skincare_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date date DEFAULT CURRENT_DATE NOT NULL,
  routine_time text NOT NULL,
  skin_condition text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_date_routine UNIQUE (user_id, logged_date, routine_time)
);

ALTER TABLE public.skincare_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own skincare logs" ON public.skincare_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    toast.success('Skrip SQL berhasil disalin!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Product CRUD
  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProdName(prod.name);
      setProdBrand(prod.brand);
      setProdCategory(prod.category);
      setProdExpiry(prod.expiry_date || '');
      setProdNotes(prod.notes || '');
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdBrand('');
      setProdCategory('Cleanser');
      setProdExpiry('');
      setProdNotes('');
    }
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: prodName.trim(),
      brand: prodBrand.trim(),
      category: prodCategory,
      expiry_date: prodExpiry || null,
      notes: prodNotes.trim() || null
    };

    const tid = toast.loading(editingProduct ? 'Memperbarui produk...' : 'Menambahkan produk...');
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('skincare_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Produk berhasil diperbarui!', { id: tid });
      } else {
        const { error } = await supabase
          .from('skincare_products')
          .insert([payload]);
        if (error) throw error;
        toast.success('Produk baru berhasil ditambahkan!', { id: tid });
      }
      setProductModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses produk.', { id: tid });
    }
  };

  const handleDeleteProduct = async (id, name) => {
    const confirm = await Swal.fire({
      title: 'Hapus Produk Skincare?',
      text: `Apakah Anda yakin ingin menghapus "${name}"? Tindakan ini juga akan menghapus produk ini dari seluruh jadwal rutin Anda.`,
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
        .from('skincare_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Produk berhasil dihapus.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus produk.');
    }
  };

  // Schedule CRUD
  const handleOpenScheduleModal = () => {
    if (products.length === 0) {
      toast.error('Silakan tambahkan produk ke Rak Kosmetik terlebih dahulu!');
      return;
    }
    setSchedProdId(products[0]?.id || '');
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

    const tid = toast.loading('Menyusun jadwal...');
    try {
      const inserts = selectedDays.map(day => ({
        user_id: user.id,
        day_of_week: day,
        routine_time: schedTime,
        product_id: schedProdId,
        order_index: schedule.filter(s => s.day_of_week === day && s.routine_time === schedTime).length + 1
      }));

      const { error } = await supabase
        .from('skincare_schedule')
        .insert(inserts);

      if (error) throw error;
      toast.success('Jadwal rutin berhasil diperbarui!', { id: tid });
      setScheduleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan jadwal.', { id: tid });
    }
  };

  const handleDeleteSchedule = async (schedId) => {
    try {
      const { error } = await supabase
        .from('skincare_schedule')
        .delete()
        .eq('id', schedId);
      if (error) throw error;
      toast.success('Langkah rutin dilepas.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal melepas langkah rutin.');
    }
  };

  // Routine Checklist Logger
  const handleOpenLogModal = (routineTime) => {
    setLogRoutineTime(routineTime);
    setLogSkinCondition('Bagus');
    setLogNotes('');
    setLogModalOpen(true);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      logged_date: formatLocalDate(new Date()),
      routine_time: logRoutineTime,
      skin_condition: logSkinCondition,
      notes: logNotes.trim() || null
    };

    const tid = toast.loading('Mencatat riwayat skincare...');
    try {
      const { error } = await supabase
        .from('skincare_logs')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Rutinitas ini sudah Anda centang hari ini!', { id: tid });
          return;
        }
        throw error;
      }
      toast.success('Rutinitas selesai! +5 XP ditambahkan ke Level Dasbor 🎯', { id: tid });
      setLogModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat rutinitas skincare.', { id: tid });
    }
  };

  const handleDeleteLog = async (logId) => {
    const confirm = await Swal.fire({
      title: 'Hapus Riwayat Skincare?',
      text: 'Apakah Anda yakin ingin menghapus log centangan ini? Pengurangan XP akan disesuaikan pada kalkulasi dasbor Anda.',
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
        .from('skincare_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
      toast.success('Centangan rutinitas skincare dibatalkan.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus log.');
    }
  };

  // Helper calculations
  const todayDay = new Date().getDay(); // 0-6
  const todayDateStr = formatLocalDate(new Date());

  // Filter schedules for today
  const todayAmSchedule = schedule.filter(s => s.day_of_week === todayDay && s.routine_time === 'AM');
  const todayPmSchedule = schedule.filter(s => s.day_of_week === todayDay && s.routine_time === 'PM');

  // Check logs for today
  const todayAmLog = logs.find(l => l.logged_date === todayDateStr && l.routine_time === 'AM');
  const todayPmLog = logs.find(l => l.logged_date === todayDateStr && l.routine_time === 'PM');

  // Expiring soon alerts
  const checkExpiryStatus = (expiryDateStr) => {
    if (!expiryDateStr) return 'safe';
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    expiry.setHours(0,0,0,0);

    if (expiry < today) return 'expired';

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'warning';
    return 'safe';
  };

  // Emoji skin condition helper
  const getSkinEmoji = (cond) => {
    switch (cond) {
      case 'Bagus': return '🌟';
      case 'Kering': return '🍂';
      case 'Jerawatan': return '🌋';
      case 'Berminyak': return '💧';
      case 'Kemerahan': return '🎈';
      default: return '✨';
    }
  };

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Heart className="w-5 h-5 fill-pink-500/10" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Skincare Routine</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola rak produk skincare Anda, jadwalkan rutinitas pagi & malam harian, serta catat jurnal kesehatan kulit wajah.
          </p>
        </div>

        {!tableNeedsMigration && (
          <div className="flex gap-2.5 w-full sm:w-auto">
            {activeTab === 'shelf' ? (
              <button
                onClick={() => handleOpenProductModal(null)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-pink-500/10 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk
              </button>
            ) : activeTab === 'schedule' ? (
              <button
                onClick={handleOpenScheduleModal}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-pink-500/10 active:scale-[0.98]"
              >
                <Calendar className="w-4 h-4" />
                Tambah Langkah Rutin
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
                Fitur Skincare Routine memerlukan tiga tabel di Supabase (`skincare_products`, `skincare_schedule`, dan `skincare_logs`). Jalankan query SQL di bawah ini pada editor SQL Supabase Anda.
              </p>
            </div>
          </div>
          
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">create_skincare_tables.sql</span>
              <button 
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {copiedSql ? 'Disalin!' : 'Salin SQL'}
              </button>
            </div>
            <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 scrollbar-hidden">
              <code>{`CREATE TABLE public.skincare_products (...)\nCREATE TABLE public.skincare_schedule (...)`}</code>
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
                { id: 'shelf', label: 'Rak Kosmetik', icon: ShoppingBag }
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

            {/* Layout Toggler (Only for Shelf tab, matching the height of tab switcher) */}
            {activeTab === 'shelf' && products.length > 0 && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs self-start sm:self-auto">
                <button
                  onClick={() => { setShelfLayoutMode('list'); localStorage.setItem('skincare_shelf_layout_mode', 'list'); }}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    shelfLayoutMode === 'list'
                      ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                      : 'text-slate-400 hover:text-slate-755 dark:text-slate-500 dark:hover:text-slate-350'
                  }`}
                  title="Tampilan Tabel"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShelfLayoutMode('grid'); localStorage.setItem('skincare_shelf_layout_mode', 'grid'); }}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    shelfLayoutMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                      : 'text-slate-400 hover:text-slate-755 dark:text-slate-500 dark:hover:text-slate-350'
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
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Memuat data rutinitas skincare...</p>
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
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌅</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AM Routine</h3>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500">Pagi hari - Perlindungan & Hidrasi</p>
                          </div>
                        </div>

                        {todayAmLog ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-0.5">
                              Selesai {getSkinEmoji(todayAmLog.skin_condition)}
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
                              <span className="text-[10px] font-extrabold w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-650 dark:text-slate-400">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.skincare_products?.category} ({step.skincare_products?.brand})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-455 dark:text-slate-550 italic py-4 text-center">Tidak ada produk dijadwalkan untuk Pagi hari ini.</p>
                        )}
                      </div>
                    </div>

                    {todayAmSchedule.length > 0 && !todayAmLog && (
                      <button
                        onClick={() => handleOpenLogModal('AM')}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Tandai Selesai AM Routine
                      </button>
                    )}
                  </div>

                  {/* PM Routine Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5 relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌃</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">PM Routine</h3>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500">Malam hari - Pembersihan & Nutrisi</p>
                          </div>
                        </div>

                        {todayPmLog ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-0.5">
                              Selesai {getSkinEmoji(todayPmLog.skin_condition)}
                            </span>
                            <button
                              onClick={() => handleDeleteLog(todayPmLog.id)}
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
                        {todayPmSchedule.length > 0 ? (
                          todayPmSchedule.map((step, idx) => (
                            <div key={step.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                              <span className="text-[10px] font-extrabold w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-655 dark:text-slate-400">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.skincare_products?.category} ({step.skincare_products?.brand})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-455 dark:text-slate-550 italic py-4 text-center">Tidak ada produk dijadwalkan untuk Malam hari ini.</p>
                        )}
                      </div>
                    </div>

                    {todayPmSchedule.length > 0 && !todayPmLog && (
                      <button
                        onClick={() => handleOpenLogModal('PM')}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Tandai Selesai PM Routine
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
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          <th className="py-3 pr-4 w-28">Hari</th>
                          <th className="py-3 px-4">🌅 AM Routine (Pagi)</th>
                          <th className="py-3 px-4">🌃 PM Routine (Malam)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {DAYS_INDONESIAN.map((dayName, dayIdx) => {
                          const amSteps = schedule.filter(s => s.day_of_week === dayIdx && s.routine_time === 'AM');
                          const pmSteps = schedule.filter(s => s.day_of_week === dayIdx && s.routine_time === 'PM');
                          const isToday = todayDay === dayIdx;

                          return (
                            <tr key={dayName} className={isToday ? 'bg-pink-50/10 dark:bg-pink-950/10 font-medium' : ''}>
                              <td className="py-4 pr-4 align-top">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isToday
                                    ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                                    : 'text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {dayName}
                                </span>
                              </td>
                              
                              <td className="py-3 px-4 align-top space-y-2">
                                {amSteps.length > 0 ? (
                                  amSteps.map((step) => (
                                    <div key={step.id} className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all max-w-sm">
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.skincare_products?.brand}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteSchedule(step.id)}
                                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-650 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                        title="Hapus langkah ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Kosong</span>
                                )}
                              </td>

                              <td className="py-3 px-4 align-top space-y-2">
                                {pmSteps.length > 0 ? (
                                  pmSteps.map((step) => (
                                    <div key={step.id} className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all max-w-sm">
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.skincare_products?.brand}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteSchedule(step.id)}
                                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-655 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                        title="Hapus langkah ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Kosong</span>
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


                  {products.length > 0 ? (
                    shelfLayoutMode === 'list' ? (
                      /* List Table Layout for Shelf */
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                <th className="px-6 py-4">Nama Produk</th>
                                <th className="px-6 py-4">Merek</th>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4">Tanggal Kedaluwarsa</th>
                                <th className="px-6 py-4">Catatan</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                              {products.map((prod) => {
                                const expStatus = checkExpiryStatus(prod.expiry_date);
                                return (
                                  <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                      {prod.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                      {prod.brand}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-slate-50 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                                        {prod.category}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {prod.expiry_date ? (
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                          expStatus === 'expired'
                                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
                                            : expStatus === 'warning'
                                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/50'
                                        }`}>
                                          {new Date(prod.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate italic text-slate-400 dark:text-slate-500" title={prod.notes}>
                                      {prod.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleOpenProductModal(prod)}
                                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                          title="Edit Produk"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus Produk"
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
                        {products.map((prod) => {
                          const expStatus = checkExpiryStatus(prod.expiry_date);
                          return (
                            <div
                              key={prod.id}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 group relative overflow-hidden"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{prod.name}</h3>
                                    <p className="text-[10px] text-slate-455 dark:text-slate-500 font-semibold">{prod.brand}</p>
                                  </div>

                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                                    {prod.category}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  {prod.expiry_date ? (
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                      expStatus === 'expired'
                                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
                                        : expStatus === 'warning'
                                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                                        : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/50'
                                    }`}>
                                      {expStatus === 'expired' ? 'Expired!' : expStatus === 'warning' ? 'Hampir Expired!' : 'Aman'}
                                      <span className="opacity-90">({new Date(prod.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-semibold">Tanpa Tgl Exp</span>
                                  )}
                                </div>

                                {prod.notes && (
                                  <p className="text-[10px] italic text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full">
                                    "{prod.notes}"
                                  </p>
                                )}
                              </div>

                              {/* Actions footer */}
                              <div className="flex items-center justify-end gap-1.5 pt-3.5 border-t border-slate-50 dark:border-slate-800/80">
                                <button
                                  onClick={() => handleOpenProductModal(prod)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-455 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Produk"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Produk"
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
                      <ShoppingBag className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto stroke-[1.5]" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">Rak Kosmetik Kosong</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                        Silakan tambahkan produk skincare Anda terlebih dahulu dengan mengklik tombol di atas.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {productModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-pink-500" />
                  {editingProduct ? 'Edit Produk Skincare' : 'Tambah Produk Skincare'}
                </h3>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Nama Produk</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Contoh: Hyaluronic Acid Serum"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Merek / Brand</label>
                    <input
                      type="text"
                      required
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      placeholder="Contoh: The Ordinary"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Kategori</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    >
                      {['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Exfoliator', 'Mask', 'Oil', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Tanggal Kedaluwarsa (Expiry Date)</label>
                  <input
                    type="date"
                    value={prodExpiry}
                    onChange={(e) => setProdExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Catatan Pembelian / Pemakaian</label>
                  <input
                    type="text"
                    value={prodNotes}
                    onChange={(e) => setProdNotes(e.target.value)}
                    placeholder="Opsional, cth: Beli di Watson"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {scheduleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Tambah Langkah Rutinitas
                </h3>
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Pilih Produk</label>
                  <select
                    value={schedProdId}
                    onChange={(e) => setSchedProdId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Waktu Rutinitas</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['AM', 'PM'].map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSchedTime(time)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          schedTime === time
                            ? 'bg-pink-50 border-pink-300 dark:bg-pink-950/20 dark:border-pink-900 text-pink-600 dark:text-pink-400 shadow-xs font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                        }`}
                      >
                        {time === 'AM' ? '🌅 Pagi (AM)' : '🌃 Malam (PM)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 block mb-1">Pilih Hari Rutin</label>
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
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Simpan Langkah
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Routine Log Completion Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Selesaikan Skincare ({logRoutineTime})
                </h3>
                <button
                  onClick={() => setLogModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="p-6 space-y-5 text-left">
                {/* Skin Condition Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 dark:text-slate-400">Bagaimana kondisi kulit wajah Anda?</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { cond: 'Bagus', emoji: '🌟', label: 'Bagus' },
                      { cond: 'Kering', emoji: '🍂', label: 'Kering' },
                      { cond: 'Jerawatan', emoji: '🌋', label: 'Jerawat' },
                      { cond: 'Berminyak', emoji: '💧', label: 'Berminyak' },
                      { cond: 'Kemerahan', emoji: '🎈', label: 'Merah' }
                    ].map(item => {
                      const isSelected = logSkinCondition === item.cond;
                      return (
                        <button
                          key={item.cond}
                          type="button"
                          onClick={() => setLogSkinCondition(item.cond)}
                          className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold scale-[1.03]'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                          }`}
                        >
                          <span className="text-lg mb-0.5">{item.emoji}</span>
                          <span className="text-[8px] truncate max-w-full text-center">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">Catatan Jurnal (Kulit/Produk)</label>
                  <input
                    type="text"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Opsional, cth: Kulit kerasa lebih terhidrasi"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
                  >
                    Klaim XP & Simpan
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
