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

// Helper for category emoji icons
const getCategoryIcon = (category) => {
  switch (category) {
    case 'Cleanser': return '🧼';
    case 'Toner': return '💧';
    case 'Serum': return '🧪';
    case 'Moisturizer': return '🧴';
    case 'Sunscreen': return '☀️';
    case 'Exfoliator': return '✨';
    case 'Mask': return '🎭';
    case 'Oil': return '💧';
    default: return '🌸';
  }
};

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
  const [scheduleEditModalOpen, setScheduleEditModalOpen] = useState(false);
  const [editingScheduleStep, setEditingScheduleStep] = useState(null);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Form - Product Fields
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] = useState('Cleanser');
  const [prodExpiry, setProdExpiry] = useState('');
  const [prodNotes, setProdNotes] = useState('');

  // Form - Schedule Fields (supports multi-select)
  const [schedProdIds, setSchedProdIds] = useState([]); // Selected product IDs for bulk add
  const [schedDays, setSchedDays] = useState([false, false, false, false, false, false, false]); // Mon-Sun
  const [schedTime, setSchedTime] = useState('AM'); // 'AM' or 'PM'

  // Form - Schedule Edit Fields
  const [editSchedProdId, setEditSchedProdId] = useState('');
  const [editSchedTime, setEditSchedTime] = useState('AM');
  const [editSchedDay, setEditSchedDay] = useState(0);

  // Form - Log Fields
  const [logRoutineTime, setLogRoutineTime] = useState('AM');
  const [logSkinCondition, setLogSkinCondition] = useState('Bagus');
  const [logNotes, setLogNotes] = useState('');

  // Drag state
  const [draggedStepId, setDraggedStepId] = useState(null);

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

  // Schedule CRUD (supports bulk selection)
  const handleOpenScheduleModal = () => {
    if (products.length === 0) {
      toast.error('Silakan tambahkan produk ke Rak Kosmetik terlebih dahulu!');
      return;
    }
    setSchedProdIds([]);
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

    if (schedProdIds.length === 0) {
      toast.error('Silakan pilih minimal 1 produk!');
      return;
    }

    // Validation checks
    for (const day of selectedDays) {
      const dayName = DAYS_INDONESIAN[day];
      
      for (const prodId of schedProdIds) {
        const prodObj = products.find(p => p.id === prodId);
        if (!prodObj) continue;

        // Check if exact same product already exists on that day and time
        const isAlreadyAdded = schedule.some(s => 
          s.day_of_week === day && 
          s.routine_time === schedTime && 
          s.product_id === prodId
        );
        if (isAlreadyAdded) {
          toast.error(`Produk "${prodObj.name}" sudah ada di jadwal ${dayName} ${schedTime === 'AM' ? 'Pagi' : 'Malam'}!`);
          return;
        }

        // Check if there is already a sunscreen in the AM for this day
        if (schedTime === 'AM' && prodObj.category === 'Sunscreen') {
          const hasSunscreenInAM = schedule.some(s => 
            s.day_of_week === day && 
            s.routine_time === 'AM' && 
            s.skincare_products?.category === 'Sunscreen'
          );
          if (hasSunscreenInAM) {
            toast.error(`Jadwal Pagi ${dayName} sudah memiliki Sunscreen! Anda tidak bisa menambahkan Sunscreen ganda.`);
            return;
          }
        }
      }
    }

    const tid = toast.loading('Menyusun jadwal...');
    try {
      const inserts = [];
      selectedDays.forEach(day => {
        const currentCount = schedule.filter(s => s.day_of_week === day && s.routine_time === schedTime).length;
        
        schedProdIds.forEach((prodId, index) => {
          inserts.push({
            user_id: user.id,
            day_of_week: day,
            routine_time: schedTime,
            product_id: prodId,
            order_index: currentCount + index + 1
          });
        });
      });

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

  // Open Edit Schedule Modal
  const handleOpenEditScheduleModal = (step) => {
    setEditingScheduleStep(step);
    setEditSchedProdId(step.product_id);
    setEditSchedTime(step.routine_time);
    setEditSchedDay(step.day_of_week);
    setScheduleEditModalOpen(true);
  };

  const handleEditScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !editingScheduleStep) return;

    const prodObj = products.find(p => p.id === editSchedProdId);
    if (!prodObj) return;

    // 1. Same product check
    const isAlreadyAdded = schedule.some(s => 
      s.id !== editingScheduleStep.id &&
      s.day_of_week === editSchedDay && 
      s.routine_time === editSchedTime && 
      s.product_id === editSchedProdId
    );
    if (isAlreadyAdded) {
      toast.error(`Produk "${prodObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[editSchedDay]} ${editSchedTime === 'AM' ? 'Pagi' : 'Malam'}!`);
      return;
    }

    // 2. Double Sunscreen check
    if (editSchedTime === 'AM' && prodObj.category === 'Sunscreen') {
      const hasSunscreenInAM = schedule.some(s => 
        s.id !== editingScheduleStep.id &&
        s.day_of_week === editSchedDay && 
        s.routine_time === 'AM' && 
        s.skincare_products?.category === 'Sunscreen'
      );
      if (hasSunscreenInAM) {
        toast.error(`Jadwal Pagi ${DAYS_INDONESIAN[editSchedDay]} sudah memiliki Sunscreen! Anda tidak bisa menambahkan Sunscreen ganda.`);
        return;
      }
    }

    const tid = toast.loading('Mengupdate langkah rutin...');
    try {
      const { error } = await supabase
        .from('skincare_schedule')
        .update({
          product_id: editSchedProdId,
          routine_time: editSchedTime,
          day_of_week: editSchedDay
        })
        .eq('id', editingScheduleStep.id);

      if (error) throw error;
      toast.success('Langkah rutin berhasil diperbarui!', { id: tid });
      setScheduleEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui langkah rutin.', { id: tid });
    }
  };

  const handleDeleteSchedule = async (schedId) => {
    const oldSchedule = [...schedule];
    // Optimistic UI delete
    setSchedule(schedule.filter(s => s.id !== schedId));

    try {
      const { error } = await supabase
        .from('skincare_schedule')
        .delete()
        .eq('id', schedId);
      if (error) throw error;
      toast.success('Langkah rutin dilepas.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal melepas langkah rutin.');
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
          .from('skincare_schedule')
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

  // HTML5 Drag and Drop handlers (Optimistic UI)
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
      const prodObj = products.find(p => p.id === sourceStep.product_id);
      if (!prodObj) return;

      // 1. Same product check
      const isAlreadyAdded = schedule.some(s => 
        s.id !== sourceStepId &&
        s.day_of_week === targetStep.day_of_week && 
        s.routine_time === targetStep.routine_time && 
        s.product_id === sourceStep.product_id
      );
      if (isAlreadyAdded) {
        toast.error(`Produk "${prodObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[targetStep.day_of_week]} ${targetStep.routine_time === 'AM' ? 'Pagi' : 'Malam'}!`);
        return;
      }

      // 2. Double Sunscreen check
      if (targetStep.routine_time === 'AM' && prodObj.category === 'Sunscreen') {
        const hasSunscreenInAM = schedule.some(s => 
          s.id !== sourceStepId &&
          s.day_of_week === targetStep.day_of_week && 
          s.routine_time === 'AM' && 
          s.skincare_products?.category === 'Sunscreen'
        );
        if (hasSunscreenInAM) {
          toast.error(`Jadwal Pagi ${DAYS_INDONESIAN[targetStep.day_of_week]} sudah memiliki Sunscreen! Anda tidak bisa menambahkan Sunscreen ganda.`);
          return;
        }
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
          .from('skincare_schedule')
          .update({
            day_of_week: targetStep.day_of_week,
            routine_time: targetStep.routine_time,
            order_index: newOrderIndex
          })
          .eq('id', sourceStepId);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        toast.error('Gagal memindahkan langkah.');
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
          .from('skincare_schedule')
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

    const prodObj = products.find(p => p.id === sourceStep.product_id);
    if (!prodObj) return;

    // 1. Same product check
    const isAlreadyAdded = schedule.some(s => 
      s.id !== sourceStepId &&
      s.day_of_week === dayIdx && 
      s.routine_time === routineTime && 
      s.product_id === sourceStep.product_id
    );
    if (isAlreadyAdded) {
      toast.error(`Produk "${prodObj.name}" sudah ada di jadwal ${DAYS_INDONESIAN[dayIdx]} ${routineTime === 'AM' ? 'Pagi' : 'Malam'}!`);
      return;
    }

    // 2. Double Sunscreen check
    if (routineTime === 'AM' && prodObj.category === 'Sunscreen') {
      const hasSunscreenInAM = schedule.some(s => 
        s.id !== sourceStepId &&
        s.day_of_week === dayIdx && 
        s.routine_time === 'AM' && 
        s.skincare_products?.category === 'Sunscreen'
      );
      if (hasSunscreenInAM) {
        toast.error(`Jadwal Pagi ${DAYS_INDONESIAN[dayIdx]} sudah memiliki Sunscreen! Anda tidak bisa menambahkan Sunscreen ganda.`);
        return;
      }
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
        .from('skincare_schedule')
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

  // Routine Checklist Logger (Direct Logging)
  const handleLogDirect = async (routineTime) => {
    if (!user) return;

    // Optimistically update local logs state so the UI updates instantly
    const todayDateStr = formatLocalDate(new Date());
    const tempLogId = `temp-${Date.now()}`;
    const newLogItem = {
      id: tempLogId,
      user_id: user.id,
      logged_date: todayDateStr,
      routine_time: routineTime,
      skin_condition: 'Selesai',
      notes: null,
      created_at: new Date().toISOString()
    };
    
    const oldLogs = [...logs];
    setLogs([newLogItem, ...logs]);

    const tid = toast.loading('Mencatat rutinitas skincare...');
    try {
      const { error } = await supabase
        .from('skincare_logs')
        .insert([{
          user_id: user.id,
          logged_date: todayDateStr,
          routine_time: routineTime,
          skin_condition: 'Selesai',
          notes: null
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Rutinitas ini sudah Anda centang hari ini!', { id: tid });
          setLogs(oldLogs);
          return;
        }
        throw error;
      }
      toast.success('Rutinitas selesai! +5 XP ditambahkan ke Level Dasbor 🎯', { id: tid });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat rutinitas skincare.', { id: tid });
      setLogs(oldLogs); // Rollback
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
  const todayAmSchedule = schedule
    .filter(s => s.day_of_week === todayDay && s.routine_time === 'AM')
    .sort((a, b) => a.order_index - b.order_index);
  const todayPmSchedule = schedule
    .filter(s => s.day_of_week === todayDay && s.routine_time === 'PM')
    .sort((a, b) => a.order_index - b.order_index);

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
                      : 'text-slate-400 hover:text-slate-755 dark:text-slate-500 dark:hover:text-slate-355'
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
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
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
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.skincare_products?.category} ({step.skincare_products?.brand})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Tidak ada produk dijadwalkan untuk Pagi hari ini.</p>
                        )}
                      </div>
                    </div>

                    {todayAmSchedule.length > 0 && !todayAmLog && (
                      <button
                        onClick={() => handleLogDirect('AM')}
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
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
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
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{step.skincare_products?.category} ({step.skincare_products?.brand})</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Tidak ada produk dijadwalkan untuk Malam hari ini.</p>
                        )}
                      </div>
                    </div>

                    {todayPmSchedule.length > 0 && !todayPmLog && (
                      <button
                        onClick={() => handleLogDirect('PM')}
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
                    <p className="text-[10px] text-slate-405 dark:text-slate-500 mb-4 italic">
                      💡 Info: Anda dapat menarik & melepas (Drag & Drop) produk di bawah untuk memindahkan jadwal hari/waktu atau menyusun urutan skincare. Gunakan tombol panah pada mobile.
                    </p>
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
                          const amSteps = schedule
                            .filter(s => s.day_of_week === dayIdx && s.routine_time === 'AM')
                            .sort((a, b) => a.order_index - b.order_index);
                          const pmSteps = schedule
                            .filter(s => s.day_of_week === dayIdx && s.routine_time === 'PM')
                            .sort((a, b) => a.order_index - b.order_index);
                          const isToday = todayDay === dayIdx;

                          return (
                            <tr key={dayName} className={isToday ? 'bg-pink-50/10 dark:bg-pink-950/10 font-medium' : ''}>
                              <td className="py-4 pr-4 align-top">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isToday
                                    ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
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
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.skincare_products?.brand}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {idx > 0 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'up')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke atas"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {idx < amSteps.length - 1 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'down')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke bawah"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditScheduleModal(step)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                          title="Edit langkah"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSchedule(step.id)}
                                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-650 rounded-lg cursor-pointer"
                                          title="Hapus langkah ini"
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
                                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{step.skincare_products?.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{step.skincare_products?.brand}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {idx > 0 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'up')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke atas"
                                          >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {idx < pmSteps.length - 1 && (
                                          <button
                                            onClick={() => handleMoveStep(step, 'down')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-300 rounded-lg cursor-pointer"
                                            title="Pindahkan ke bawah"
                                          >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditScheduleModal(step)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                          title="Edit langkah"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSchedule(step.id)}
                                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-655 rounded-lg cursor-pointer"
                                          title="Hapus langkah ini"
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
                                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-slate-50 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border-slate-200 dark:border-slate-800">
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
                                    <p className="text-[10px] text-slate-455 dark:text-slate-550 font-semibold">{prod.brand}</p>
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
                  className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
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
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Tambah Langkah Rutinitas
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
                    Pilih Produk Skincare
                  </label>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (schedProdIds.length === products.length) {
                          setSchedProdIds([]);
                        } else {
                          setSchedProdIds(products.map(p => p.id));
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-750 dark:text-blue-450 dark:hover:text-blue-400 cursor-pointer"
                    >
                      {schedProdIds.length === products.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                    <span className="text-[10px] text-slate-400 font-semibold">{schedProdIds.length} terpilih</span>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                    {products.map(p => {
                      const isChecked = schedProdIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isChecked) {
                              setSchedProdIds(schedProdIds.filter(id => id !== p.id));
                            } else {
                              setSchedProdIds([...schedProdIds, p.id]);
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
                              {getCategoryIcon(p.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-850 dark:text-slate-200 truncate">{p.name}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">{p.brand} • {p.category}</p>
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
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-slate-355'
                        }`}
                      >
                        {time === 'AM' ? '🌅 Pagi (AM)' : '🌃 Malam (PM)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 block mb-1">Pilih Hari Rutin</label>
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
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
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
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Edit Langkah Rutinitas
                </h3>
                <button
                  onClick={() => setScheduleEditModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditScheduleSubmit} className="p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 dark:text-slate-400 block mb-1">Pilih Produk</label>
                  <select
                    value={editSchedProdId}
                    onChange={(e) => setEditSchedProdId(e.target.value)}
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
                        onClick={() => setEditSchedTime(time)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          editSchedTime === time
                            ? 'bg-pink-50 border-pink-300 dark:bg-pink-950/20 dark:border-pink-900 text-pink-600 dark:text-pink-400 shadow-xs font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'
                        }`}
                      >
                        {time === 'AM' ? '🌅 Pagi (AM)' : '🌃 Malam (PM)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-455 block mb-1">Hari Rutin</label>
                  <select
                    value={editSchedDay}
                    onChange={(e) => setEditSchedDay(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-center"
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
