import { useState, FormEvent } from 'react';
import { Calendar, Users, Clock, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../types/database';

interface BulkShiftCreationProps {
  employees: Profile[];
  onClose: () => void;
  onSuccess: () => void;
}

interface EmployeeShiftData {
  employee_id: string;
  shift_role: 'kitchen' | 'delivery' | 'cashier' | 'manager';
  start_time: string;
  end_time: string;
}

export default function BulkShiftCreation({ employees, onClose, onSuccess }: BulkShiftCreationProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    notes: '',
    days_of_week: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
    },
  });

  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShiftData[]>([]);

  const toggleEmployee = (employeeId: string) => {
    setEmployeeShifts(prev => {
      const exists = prev.find(es => es.employee_id === employeeId);
      if (exists) {
        return prev.filter(es => es.employee_id !== employeeId);
      } else {
        return [...prev, {
          employee_id: employeeId,
          shift_role: 'kitchen',
          start_time: '16:00',
          end_time: '22:00',
        }];
      }
    });
  };

  const toggleAllEmployees = () => {
    const activeEmployees = employees.filter(emp => emp.is_active);
    if (employeeShifts.length === activeEmployees.length) {
      setEmployeeShifts([]);
    } else {
      setEmployeeShifts(activeEmployees.map(emp => ({
        employee_id: emp.id,
        shift_role: 'kitchen' as const,
        start_time: '16:00',
        end_time: '22:00',
      })));
    }
  };

  const updateEmployeeShift = (employeeId: string, field: keyof Omit<EmployeeShiftData, 'employee_id'>, value: string) => {
    setEmployeeShifts(prev => prev.map(es =>
      es.employee_id === employeeId
        ? { ...es, [field]: value }
        : es
    ));
  };

  const toggleDayOfWeek = (day: keyof typeof formData.days_of_week) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: {
        ...prev.days_of_week,
        [day]: !prev.days_of_week[day],
      },
    }));
  };

  const generateShifts = () => {
    const shifts = [];
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayName = dayNames[date.getDay()] as keyof typeof formData.days_of_week;

      if (formData.days_of_week[dayName]) {
        for (const employeeShift of employeeShifts) {
          shifts.push({
            employee_id: employeeShift.employee_id,
            date: date.toISOString().split('T')[0],
            start_time: employeeShift.start_time,
            end_time: employeeShift.end_time,
            shift_role: employeeShift.shift_role,
            notes: formData.notes,
            created_by: profile?.id,
          });
        }
      }
    }

    return shifts;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (employeeShifts.length === 0) {
      setError('Please select at least one employee');
      return;
    }

    const selectedDays = Object.values(formData.days_of_week).some(v => v);
    if (!selectedDays) {
      setError('Please select at least one day of the week');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate < startDate) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const shifts = generateShifts();

      if (shifts.length === 0) {
        setError('No shifts to create based on your selection');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('schedules')
        .insert(shifts);

      if (insertError) throw insertError;

      setSuccess(`Successfully created ${shifts.length} shifts!`);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating bulk shifts:', err);
      setError(err.message || 'Failed to create shifts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Bulk Shift Creation</h3>
            <p className="text-sm text-gray-600 mt-1">Create multiple shifts at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Calendar className="w-5 h-5 text-red-600" />
              <span>Date Range</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Users className="w-5 h-5 text-red-600" />
                <span>Select Employees</span>
              </div>
              <button
                type="button"
                onClick={toggleAllEmployees}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                {employeeShifts.length === employees.filter(emp => emp.is_active).length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {employees.filter(emp => emp.is_active).map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                >
                  <input
                    type="checkbox"
                    checked={employeeShifts.some(es => es.employee_id === employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-xs text-gray-600">{employee.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {employeeShifts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Clock className="w-5 h-5 text-red-600" />
                <span>Individual Shift Details</span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {employeeShifts.map((employeeShift) => {
                  const employee = employees.find(e => e.id === employeeShift.employee_id);
                  if (!employee) return null;

                  return (
                    <div key={employeeShift.employee_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-gray-600" />
                        <p className="font-semibold text-gray-900">{employee.full_name}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <select
                            value={employeeShift.shift_role}
                            onChange={(e) => updateEmployeeShift(employeeShift.employee_id, 'shift_role', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          >
                            <option value="kitchen">Kitchen</option>
                            <option value="delivery">Delivery</option>
                            <option value="cashier">Cashier</option>
                            <option value="manager">Manager</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={employeeShift.start_time}
                            onChange={(e) => updateEmployeeShift(employeeShift.employee_id, 'start_time', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={employeeShift.end_time}
                            onChange={(e) => updateEmployeeShift(employeeShift.employee_id, 'end_time', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional - applies to all shifts)
            </label>
            <input
              id="notes"
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Any additional notes for these shifts"
            />
          </div>

          <div className="space-y-4">
            <div className="text-gray-900 font-semibold">Days of Week</div>

            <div className="grid grid-cols-7 gap-2">
              {[
                { key: 'sunday', label: 'Sun' },
                { key: 'monday', label: 'Mon' },
                { key: 'tuesday', label: 'Tue' },
                { key: 'wednesday', label: 'Wed' },
                { key: 'thursday', label: 'Thu' },
                { key: 'friday', label: 'Fri' },
                { key: 'saturday', label: 'Sat' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDayOfWeek(key as keyof typeof formData.days_of_week)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                    formData.days_of_week[key as keyof typeof formData.days_of_week]
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Shifts...' : 'Create Shifts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
