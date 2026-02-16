import { useState, useEffect, FormEvent } from 'react';
import { AlertCircle, Clock, Megaphone, BookOpen, AlertTriangle, Edit2, Save, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Announcement } from '../types/database';

const categoryIcons = {
  general: Megaphone,
  hours: Clock,
  emergency: AlertTriangle,
  rules: BookOpen,
};

const priorityColors = {
  normal: 'bg-blue-50 border-blue-200 text-blue-900',
  high: 'bg-orange-50 border-orange-200 text-orange-900',
  urgent: 'bg-red-50 border-red-200 text-red-900',
};

const priorityBadges = {
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function StoreInfo() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = filter === 'all'
    ? announcements
    : announcements.filter(a => a.category === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleUpdateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          category: editingAnnouncement.category,
          priority: editingAnnouncement.priority,
        })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;

      setEditingAnnouncement(null);
      await loadAnnouncements();
      setSubmitSuccess('Mededeling succesvol bijgewerkt!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating announcement:', error);
      setSubmitError('Mededeling bijwerken mislukt');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze mededeling wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadAnnouncements();
      setSubmitSuccess('Mededeling succesvol verwijderd!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setSubmitError('Mededeling verwijderen mislukt');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const isManager = profile?.role === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Winkelinformatie laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        {submitSuccess && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm sm:text-base">
            {submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm sm:text-base">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Winkelinformatie</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Belangrijke mededelingen en updates</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          {[
            { id: 'all', label: 'Alles' },
            { id: 'general', label: 'Algemeen' },
            { id: 'hours', label: 'Openingstijden' },
            { id: 'emergency', label: 'Noodgeval' },
            { id: 'rules', label: 'Regels' }
          ].map((category) => (
            <button
              key={category.id}
              onClick={() => setFilter(category.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition active:scale-95 ${
                filter === category.id
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-500">Geen mededelingen gevonden</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const Icon = categoryIcons[announcement.category];
              return (
                <div
                  key={announcement.id}
                  className={`border-l-4 rounded-lg p-3 sm:p-5 ${priorityColors[announcement.priority]}`}
                >
                  <div className="flex items-start gap-2 sm:gap-4">
                    <div className="flex-shrink-0 p-1.5 sm:p-2 bg-white rounded-lg">
                      <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                        <h3 className="text-sm sm:text-lg font-bold leading-tight">{announcement.title}</h3>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${priorityBadges[announcement.priority]}`}>
                            {announcement.priority.toUpperCase()}
                          </span>
                          {isManager && (
                            <>
                              <button
                                onClick={() => setEditingAnnouncement(announcement)}
                                className="p-1.5 sm:p-2 text-blue-600 hover:bg-white active:bg-blue-50 rounded-lg transition"
                                title="Mededeling Wijzigen"
                              >
                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-white active:bg-red-50 rounded-lg transition"
                                title="Mededeling Verwijderen"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm mb-2 sm:mb-3 whitespace-pre-wrap leading-relaxed">
                        {announcement.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                        <span className="px-2 py-0.5 sm:py-1 bg-white rounded capitalize text-[10px] sm:text-xs">
                          {announcement.category}
                        </span>
                        <span className="opacity-75 text-[10px] sm:text-xs">
                          <span className="hidden sm:inline">{formatDate(announcement.created_at)}</span>
                          <span className="sm:hidden">{new Date(announcement.created_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Mededeling Wijzigen</h3>
                  <p className="text-red-100 mt-1">Mededelingdetails bijwerken</p>
                </div>
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="p-2 hover:bg-red-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateAnnouncement} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={editingAnnouncement.title}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie
                    </label>
                    <select
                      value={editingAnnouncement.category}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, category: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="general">Algemeen</option>
                      <option value="hours">Openingstijden</option>
                      <option value="emergency">Noodgeval</option>
                      <option value="rules">Regels</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioriteit
                    </label>
                    <select
                      value={editingAnnouncement.priority}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, priority: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="normal">Normaal</option>
                      <option value="high">Hoog</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inhoud
                  </label>
                  <textarea
                    value={editingAnnouncement.content}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={5}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  <Save className="w-5 h-5" />
                  Wijzigingen Opslaan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
