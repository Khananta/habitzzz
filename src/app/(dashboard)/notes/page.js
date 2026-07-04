'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  StickyNote, 
  Loader2, 
  FileText,
  Save,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Available Pastel Colors mapping for light/dark mode
const PASTEL_COLORS = [
  { id: 'bg-amber-50', dot: 'bg-amber-400', cardClass: 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-900 dark:text-amber-100' },
  { id: 'bg-blue-50', dot: 'bg-blue-400', cardClass: 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 text-blue-900 dark:text-blue-100' },
  { id: 'bg-emerald-50', dot: 'bg-emerald-400', cardClass: 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-100' },
  { id: 'bg-purple-50', dot: 'bg-purple-400', cardClass: 'bg-purple-50/70 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40 text-purple-900 dark:text-purple-100' },
  { id: 'bg-rose-50', dot: 'bg-rose-400', cardClass: 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-900 dark:text-rose-100' }
];

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch Notes
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user?.id]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err.message);
      toast.error('Gagal memuat catatan.');
    } finally {
      setLoading(true); // Wait, loading should set to false
      setLoading(false);
    }
  };

  // Add Note
  const handleAddNote = async () => {
    if (!user) return;
    try {
      const newNote = {
        user_id: user.id,
        title: '',
        content: '',
        color: 'bg-amber-50'
      };

      const { data, error } = await supabase
        .from('quick_notes')
        .insert([newNote])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setNotes(prev => [data[0], ...prev]);
        toast.success('Catatan baru dibuat.', { duration: 1500 });
      }
    } catch (err) {
      console.error('Error creating note:', err.message);
      toast.error('Gagal membuat catatan.');
    }
  };

  // Update Note in local state
  const handleLocalUpdate = (id, fields) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, ...fields } : note));
  };

  // Delete Note
  const handleDeleteNote = async (id) => {
    try {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Catatan dihapus.');
    } catch (err) {
      console.error('Error deleting note:', err.message);
      toast.error('Gagal menghapus catatan.');
    }
  };

  return (
    <div className="space-y-8 pb-12 text-slate-800 dark:text-slate-200 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Quick Notes <StickyNote className="w-6 h-6 text-blue-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tulis ide spontan, coretan, atau tugas jangka pendek dalam bentuk sticky notes estetik.
          </p>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddNote}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98] h-9.5"
          >
            <Plus className="w-4 h-4 text-white" />
            Tambah Catatan Baru
          </button>
        </div>
      </div>

      {/* Main Grid/List View */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-650 mx-auto mb-3 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Belum ada catatan</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
            Gunakan tombol tambah catatan untuk mulai mencatat apa saja secara cepat dan mudah.
          </p>
        </div>
      ) : (
        <motion.div 
          layout
          className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "flex flex-col gap-4 w-full"}
        >
          <AnimatePresence mode="popLayout">
            {notes.map(note => (
              <NoteCard 
                key={note.id}
                note={note}
                viewMode={viewMode}
                onLocalUpdate={handleLocalUpdate}
                onDelete={handleDeleteNote}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// Subcomponent for each Note Card to isolate state and manual save
function NoteCard({ note, viewMode, onLocalUpdate, onDelete }) {
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [localColor, setLocalColor] = useState(note.color);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  
  const colorObj = PASTEL_COLORS.find(c => c.id === localColor) || PASTEL_COLORS[0];

  // Sync state if backend changes it externally
  useEffect(() => {
    setLocalTitle(note.title);
  }, [note.title]);

  useEffect(() => {
    setLocalContent(note.content);
  }, [note.content]);

  useEffect(() => {
    setLocalColor(note.color);
  }, [note.color]);

  // Track changes to enable/disable manual save button
  useEffect(() => {
    if (localTitle !== note.title || localContent !== note.content || localColor !== note.color) {
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
    }
  }, [localTitle, localContent, localColor, note.title, note.content, note.color]);

  // Save changes to Supabase manually
  const saveNote = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('quick_notes')
        .update({
          title: localTitle,
          content: localContent,
          color: localColor
        })
        .eq('id', note.id);

      if (error) throw error;
      onLocalUpdate(note.id, {
        title: localTitle,
        content: localContent,
        color: localColor
      });
      setSaveStatus('saved');
      toast.success('Catatan berhasil disimpan! 💾', { duration: 1000 });
    } catch (err) {
      console.error('Error saving note:', err.message);
      setSaveStatus('unsaved');
      toast.error('Gagal menyimpan catatan.');
    }
  };

  const handleColorChange = (colorId) => {
    setLocalColor(colorId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 15 }}
      transition={{ duration: 0.25 }}
      className={`p-5 rounded-[24px] border transition-all flex flex-col justify-between shadow-xs hover:shadow-sm relative ${colorObj.cardClass} ${
        viewMode === 'list' ? 'w-full min-h-[140px]' : 'min-h-[220px]'
      }`}
    >
      <div className="space-y-1.5 flex-grow flex flex-col">
        {/* Title Input */}
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          placeholder="Judul Catatan..."
          className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400/80"
        />

        {/* Content Textarea */}
        <textarea
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          placeholder="Tulis catatan di sini..."
          className={`w-full bg-transparent border-none focus:outline-none text-xs text-slate-650 dark:text-slate-300 resize-none flex-grow placeholder-slate-400/80 mt-2 ${
            viewMode === 'list' ? 'min-h-[60px]' : 'min-h-[90px]'
          }`}
        />
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/40 pt-3.5 mt-3 flex-shrink-0">
        
        {/* Color Palette Selector */}
        <div className="flex items-center gap-1.5">
          {PASTEL_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => handleColorChange(color.id)}
              className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all border hover:scale-115 ${color.dot} ${
                localColor === color.id
                  ? 'ring-1 ring-slate-400 dark:ring-slate-500 scale-110 border-white dark:border-slate-900'
                  : 'border-transparent'
              }`}
              title={`Warna ${color.id.replace('bg-', '')}`}
            />
          ))}
        </div>

        {/* Action Buttons (Save & Delete) */}
        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={saveNote}
            disabled={saveStatus === 'saved' || saveStatus === 'saving'}
            className={`flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              saveStatus === 'unsaved'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 active:scale-95'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-450 dark:text-slate-500 cursor-default'
            }`}
            title="Simpan Catatan"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Simpan...
              </>
            ) : saveStatus === 'unsaved' ? (
              <>
                <Save className="w-3 h-3" />
                Simpan
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3.5]" />
                Tersimpan
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
            title="Hapus Catatan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
