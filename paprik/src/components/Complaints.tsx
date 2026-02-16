import { useState, useEffect, FormEvent } from 'react';
import { AlertCircle, CheckCircle, Clock, Wrench, Package, Monitor, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Complaint } from '../types/database';

interface ComplaintWithProfile extends Complaint {
  submitted_by_name?: string;
}

const categoryIcons = {
  equipment: Wrench,
  supplies: Package,
  pos: Monitor,
  other: AlertCircle,
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-red-100 text-red-700',
};

export default function Complaints() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'equipment' as const,
    urgency: 'medium' as const,
  });

  useEffect(() => {
    loadComplaints();
  }, [profile]);

  const loadComplaints = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile.role === 'employee') {
        query = query.eq('submitted_by', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (profile.role === 'manager' && data) {
        const profilesResponse = await supabase
          .from('profiles')
          .select('id, full_name');

        if (profilesResponse.data) {
          const profileMap = new Map(
            profilesResponse.data.map(p => [p.id, p.full_name])
          );

          const complaintsWithNames = data.map(complaint => ({
            ...complaint,
            submitted_by_name: profileMap.get(complaint.submitted_by),
          }));

          setComplaints(complaintsWithNames);
        } else {
          setComplaints(data);
        }
      } else {
        setComplaints(data || []);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase.from('complaints').insert({
        ...formData,
        submitted_by: profile.id,
      });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        category: 'equipment',
        urgency: 'medium',
      });

      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);

      loadComplaints();
    } catch (error) {
      console.error('Error submitting complaint:', error);
    }
  };

  const updateComplaintStatus = async (id: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      loadComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
    }
  };

  const deleteComplaint = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze klacht wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadComplaints();
    } catch (error) {
      console.error('Error deleting complaint:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Klachten laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Klachten & Meldingen</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Meld problemen en volg hun oplossing</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-red-700 active:bg-red-800 transition whitespace-nowrap"
          >
            {showForm ? 'Annuleren' : 'Nieuwe Klacht'}
          </button>
        </div>

        {showForm && (
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Dien een Klacht In</h3>

            {success && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm sm:text-base text-red-700 font-medium">Klacht succesvol ingediend!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Titel
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Korte beschrijving van het probleem"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Categorie
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="equipment">Kapotte Apparatuur</option>
                  <option value="supplies">Ontbrekende Benodigdheden</option>
                  <option value="pos">Kassasysteem Problemen</option>
                  <option value="other">Overig</option>
                </select>
              </div>

              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
                  Urgentieniveau
                </label>
                <select
                  id="urgency"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="low">Laag</option>
                  <option value="medium">Gemiddeld</option>
                  <option value="high">Hoog</option>
                  <option value="critical">Kritiek</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Geef details over het probleem..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Klacht Indienen
              </button>
            </form>
          </div>
        )}

        {complaints.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-500">Nog geen klachten ingediend</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {complaints.map((complaint) => {
              const Icon = categoryIcons[complaint.category];
              return (
                <div
                  key={complaint.id}
                  className={`border-l-4 rounded-lg p-3 sm:p-5 ${urgencyColors[complaint.urgency]}`}
                >
                  <div className="flex items-start gap-2 sm:gap-4">
                    <div className="flex-shrink-0 p-1.5 sm:p-2 bg-white rounded-lg">
                      <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                        <h3 className="text-sm sm:text-lg font-bold leading-tight">{complaint.title}</h3>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 ${statusColors[complaint.status]}`}>
                          {complaint.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {profile?.role === 'manager' && complaint.submitted_by_name && (
                        <p className="text-xs sm:text-sm font-medium mb-2">
                          Ingediend door: {complaint.submitted_by_name}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm mb-2 sm:mb-3 whitespace-pre-wrap leading-relaxed">
                        {complaint.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs mb-2 sm:mb-3">
                        <span className="px-2 py-0.5 sm:py-1 bg-white rounded capitalize text-[10px] sm:text-xs">
                          {complaint.category}
                        </span>
                        <span className="px-2 py-0.5 sm:py-1 bg-white rounded capitalize text-[10px] sm:text-xs">
                          {complaint.urgency} urgentie
                        </span>
                        <span className="flex items-center gap-1 opacity-75 text-[10px] sm:text-xs">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:inline">{formatDate(complaint.created_at)}</span>
                          <span className="sm:hidden">{new Date(complaint.created_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}</span>
                        </span>
                      </div>

                      {profile?.role === 'manager' && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={() => updateComplaintStatus(complaint.id, 'open')}
                            className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition active:scale-95 ${
                              complaint.status === 'open'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            disabled={complaint.status === 'open'}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                            className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition active:scale-95 ${
                              complaint.status === 'in_progress'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            disabled={complaint.status === 'in_progress'}
                          >
                            In Behandeling
                          </button>
                          <button
                            onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                            className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold transition active:scale-95 ${
                              complaint.status === 'resolved'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            disabled={complaint.status === 'resolved'}
                          >
                            Markeren als Opgelost
                          </button>
                          <button
                            onClick={() => deleteComplaint(complaint.id)}
                            className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Verwijderen
                          </button>
                        </div>
                      )}

                      {profile?.role === 'employee' && complaint.submitted_by === profile.id && (
                        <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={() => deleteComplaint(complaint.id)}
                            className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Verwijderen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
