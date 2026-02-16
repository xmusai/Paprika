import { useState, useEffect } from 'react';
import { Wallet, Calendar, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Schedule } from '../types/database';

type ViewMode = 'week' | 'month';

export default function EmployeeEarnings() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollStats, setPayrollStats] = useState({ hours: 0, earnings: 0, hourlyWage: 0 });

  useEffect(() => {
    loadSchedules();
  }, [currentDate, viewMode, profile]);

  useEffect(() => {
    if (schedules.length >= 0) {
      calculatePayroll();
    }
  }, [schedules, profile]);

  const getDateRange = () => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { startDate: startOfWeek, endDate: endOfWeek };
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return { startDate: startOfMonth, endDate: endOfMonth };
    }
  };

  const loadSchedules = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', profile.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = async () => {
    if (!profile || !profile.hourly_wage) return;

    let totalHours = 0;

    schedules.forEach(schedule => {
      const [startHour, startMin] = schedule.start_time.split(':').map(Number);
      const [endHour, endMin] = schedule.end_time.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      const hoursWorked = (endMinutes - startMinutes) / 60;
      totalHours += hoursWorked;
    });

    const earnings = totalHours * profile.hourly_wage;

    setPayrollStats({
      hours: totalHours,
      earnings: earnings,
      hourlyWage: profile.hourly_wage
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }

    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Verdiensten laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Mijn Verdiensten</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium transition ${
                viewMode === 'week'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium transition ${
                viewMode === 'month'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Maand
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Clock className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-sm font-semibold text-gray-900">
                {currentDate.toLocaleDateString('nl-NL', {
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Clock className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 sm:p-6 border-2 border-red-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-red-700">Uurloon</p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-red-900">€{payrollStats.hourlyWage.toFixed(2)}</p>
            <p className="text-xs text-red-600 mt-2">Per uur</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 sm:p-6 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-blue-700">
                {viewMode === 'week' ? 'Wekelijkse' : 'Maandelijkse'} Uren
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-blue-900">{payrollStats.hours.toFixed(1)}u</p>
            <p className="text-xs text-blue-600 mt-2">Gewerkte uren</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 sm:p-6 border-2 border-yellow-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-yellow-700">
                {viewMode === 'week' ? 'Wekelijkse' : 'Maandelijkse'} Verdiensten
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-yellow-900">€{payrollStats.earnings.toFixed(2)}</p>
            <p className="text-xs text-yellow-600 mt-2">Totaal verdiend</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-red-600" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Gewerkte Diensten</h3>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Geen diensten gevonden voor deze periode</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const [startHour, startMin] = schedule.start_time.split(':').map(Number);
              const [endHour, endMin] = schedule.end_time.split(':').map(Number);
              const hoursWorked = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
              const earned = hoursWorked * payrollStats.hourlyWage;

              return (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-semibold capitalize">
                          {schedule.shift_role}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(schedule.date).toLocaleDateString('nl-NL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-700">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </span>
                        <span className="font-medium">{hoursWorked.toFixed(1)}u</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">€{earned.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Verdiend</p>
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
