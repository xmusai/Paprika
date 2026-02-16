import { useState, useEffect } from 'react';
import { AlertTriangle, DollarSign, Edit2, Save, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, StoreSettings } from '../types/database';

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function Payroll() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [payrollDate, setPayrollDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay());
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + 6);
    return date.toISOString().split('T')[0];
  });
  const [payrollData, setPayrollData] = useState<Array<{
    employee_id: string;
    employee_name: string;
    hourly_wage: number;
    hours_worked: number;
    total_pay: number;
  }>>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitValue, setLimitValue] = useState('500.00');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadStoreSettings();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      if (viewMode === 'daily') {
        loadPayroll(payrollDate);
      } else {
        loadBulkPayroll(startDate, endDate);
      }
    }
  }, [payrollDate, startDate, endDate, viewMode, employees.length]);

  useEffect(() => {
    if (viewMode === 'weekly') {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (viewMode === 'monthly') {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [viewMode]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadPayroll = async (date: string) => {
    setLoading(true);
    try {
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('employee_id, start_time, end_time')
        .eq('date', date);

      if (schedulesError) throw schedulesError;

      const employeeHours = new Map<string, number>();

      schedules?.forEach(schedule => {
        const start = new Date(`2000-01-01T${schedule.start_time}`);
        const end = new Date(`2000-01-01T${schedule.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        const currentHours = employeeHours.get(schedule.employee_id) || 0;
        employeeHours.set(schedule.employee_id, currentHours + hours);
      });

      const payrollItems = await Promise.all(
        Array.from(employeeHours.entries()).map(async ([employeeId, hours]) => {
          const employee = employees.find(emp => emp.id === employeeId);
          if (!employee) return null;

          return {
            employee_id: employeeId,
            employee_name: employee.full_name,
            hourly_wage: employee.hourly_wage,
            hours_worked: hours,
            total_pay: hours * employee.hourly_wage,
          };
        })
      );

      setPayrollData(payrollItems.filter(item => item !== null) as typeof payrollData);
    } catch (error) {
      console.error('Error loading payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBulkPayroll = async (start: string, end: string) => {
    setLoading(true);
    try {
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('employee_id, start_time, end_time, date')
        .gte('date', start)
        .lte('date', end);

      if (schedulesError) throw schedulesError;

      const employeeHours = new Map<string, number>();

      schedules?.forEach(schedule => {
        const startTime = new Date(`2000-01-01T${schedule.start_time}`);
        const endTime = new Date(`2000-01-01T${schedule.end_time}`);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const currentHours = employeeHours.get(schedule.employee_id) || 0;
        employeeHours.set(schedule.employee_id, currentHours + hours);
      });

      const payrollItems = await Promise.all(
        Array.from(employeeHours.entries()).map(async ([employeeId, hours]) => {
          const employee = employees.find(emp => emp.id === employeeId);
          if (!employee) return null;

          return {
            employee_id: employeeId,
            employee_name: employee.full_name,
            hourly_wage: employee.hourly_wage,
            hours_worked: hours,
            total_pay: hours * employee.hourly_wage,
          };
        })
      );

      setPayrollData(payrollItems.filter(item => item !== null) as typeof payrollData);
    } catch (error) {
      console.error('Error loading bulk payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStoreSettings(data);
        setLimitValue(data.daily_payroll_limit.toString());
      }
    } catch (error) {
      console.error('Error loading store settings:', error);
    }
  };

  const updatePayrollLimit = async () => {
    if (!profile) return;

    try {
      const limitNum = parseFloat(limitValue);
      if (isNaN(limitNum) || limitNum < 0) {
        setSubmitError('Please enter a valid positive number');
        return;
      }

      if (storeSettings) {
        const { error } = await supabase
          .from('store_settings')
          .update({
            daily_payroll_limit: limitNum,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', storeSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_settings')
          .insert({
            daily_payroll_limit: limitNum,
            updated_by: profile.id,
          });

        if (error) throw error;
      }

      await loadStoreSettings();
      setEditingLimit(false);
      setSubmitSuccess('Payroll limit updated successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating payroll limit:', error);
      setSubmitError('Failed to update payroll limit');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {submitSuccess && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{submitSuccess}</p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{submitError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Payroll Calculator</h3>
          <p className="text-gray-600">Calculate payroll costs for employees</p>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Mode
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-6 py-2 text-sm font-medium transition flex items-center gap-2 ${
                  viewMode === 'daily'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-6 py-2 text-sm font-medium transition flex items-center gap-2 ${
                  viewMode === 'weekly'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Weekly
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-6 py-2 text-sm font-medium transition flex items-center gap-2 ${
                  viewMode === 'monthly'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Monthly
              </button>
            </div>
          </div>

          {viewMode === 'daily' ? (
            <div>
              <label htmlFor="payroll_date" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                id="payroll_date"
                type="date"
                value={payrollDate}
                onChange={(e) => setPayrollDate(e.target.value)}
                className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Daily Payroll Limit</h4>
              </div>
              {!editingLimit && (
                <button
                  onClick={() => setEditingLimit(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {editingLimit ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-900">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={limitValue}
                    onChange={(e) => setLimitValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500.00"
                  />
                </div>
                <button
                  onClick={updatePayrollLimit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingLimit(false);
                    setLimitValue(storeSettings?.daily_payroll_limit.toString() || '500.00');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-blue-900">
                €{storeSettings?.daily_payroll_limit.toFixed(2) || '500.00'}
              </p>
            )}
            <p className="text-sm text-blue-700 mt-2">
              Maximum daily payroll budget
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading payroll data...</p>
          </div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">
              {viewMode === 'daily'
                ? 'No scheduled shifts for this date'
                : 'No scheduled shifts for this period'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const totalPayroll = payrollData.reduce((sum, item) => sum + item.total_pay, 0);
              const limit = storeSettings?.daily_payroll_limit || 0;
              const isOverLimit = limit > 0 && totalPayroll > limit;
              const overageAmount = totalPayroll - limit;
              const percentageOver = ((totalPayroll / limit) - 1) * 100;

              return (
                <>
                  {isOverLimit && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-red-900 mb-1">
                            Payroll Limit Exceeded!
                          </h4>
                          <p className="text-sm text-red-700 mb-3">
                            Daily payroll cost has exceeded the set limit by <span className="font-bold">€{overageAmount.toFixed(2)}</span> ({percentageOver.toFixed(1)}% over budget)
                          </p>
                          <div className="bg-white rounded-lg p-3 border border-red-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-red-800">Budget Status:</span>
                              <span className="text-sm font-bold text-red-900">{percentageOver.toFixed(1)}% Over</span>
                            </div>
                            <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((totalPayroll / limit) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-red-700">
                              <span>Limit: €{limit.toFixed(2)}</span>
                              <span>Current: €{totalPayroll.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`rounded-xl p-6 ${isOverLimit && viewMode === 'daily' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white`}>
                    <h4 className="text-lg font-semibold mb-2">
                      Total {viewMode === 'daily' ? 'Daily' : viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Payroll
                    </h4>
                    <p className="text-4xl font-bold">
                      €{totalPayroll.toFixed(2)}
                    </p>
                    <p className={isOverLimit && viewMode === 'daily' ? 'text-red-100 mt-2' : 'text-red-100 mt-2'}>
                      {payrollData.reduce((sum, item) => sum + item.hours_worked, 0).toFixed(1)} total hours worked
                    </p>
                    {viewMode !== 'daily' && (
                      <div className="mt-3 pt-3 border-t border-red-500">
                        <p className="text-sm text-red-100">
                          Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {!isOverLimit && limit > 0 && viewMode === 'daily' && (
                      <div className="mt-3 pt-3 border-t border-red-500">
                        <p className="text-sm text-red-100">
                          Within budget: €{(limit - totalPayroll).toFixed(2)} remaining
                        </p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Employee Breakdown</h4>
              <div className="grid gap-3">
                {payrollData.map((item) => (
                  <div
                    key={item.employee_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.employee_name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.hours_worked.toFixed(1)} hours × €{item.hourly_wage.toFixed(2)}/hour
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        €{item.total_pay.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
