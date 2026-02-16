import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, CalendarRange, Edit2, Trash2, Save, AlertTriangle, DollarSign, UserX, Calendar, Clock, Search, CheckSquare, Square, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, Announcement, StoreSettings } from '../types/database';
import BulkShiftCreation from './BulkShiftCreation';

export default function ManagerDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedules' | 'announcements' | 'employees' | 'payroll'>('schedules');
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showOpenShiftForm, setShowOpenShiftForm] = useState(false);
  const [showBulkShiftForm, setShowBulkShiftForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [editEmployeePassword, setEditEmployeePassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [payrollDate, setPayrollDate] = useState(() => new Date().toISOString().split('T')[0]);
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
  const [viewingEmployeeSchedule, setViewingEmployeeSchedule] = useState<Profile | null>(null);
  const [employeeSchedules, setEmployeeSchedules] = useState<Array<{
    id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    shift_role: 'kitchen' | 'delivery' | 'cashier' | 'manager';
    notes: string | null;
  }>>([]);
  const [editingEmployeeShift, setEditingEmployeeShift] = useState<any>(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [bulkEditData, setBulkEditData] = useState<Map<string, Partial<Profile>>>(new Map());
  const [bulkShiftEditMode, setBulkShiftEditMode] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [bulkShiftEditData, setBulkShiftEditData] = useState({
    employee_id: '',
    start_time: '',
    end_time: '',
    shift_role: '' as '' | 'kitchen' | 'delivery' | 'cashier' | 'manager',
  });

  const [scheduleFormData, setScheduleFormData] = useState({
    employee_id: '',
    date: '',
    start_time: '',
    end_time: '',
    shift_role: 'kitchen' as const,
    notes: '',
  });

  const [openShiftFormData, setOpenShiftFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    shift_role: 'kitchen' as const,
    notes: '',
  });

  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    content: '',
    category: 'general' as const,
    priority: 'normal' as const,
  });

  const [employeeFormData, setEmployeeFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee' as const,
    password: '',
    hourly_wage: '15.00',
  });

  useEffect(() => {
    loadEmployees();
    loadStoreSettings();
    if (activeTab === 'announcements') {
      loadAnnouncements();
    }
    if (activeTab === 'payroll' && employees.length > 0) {
      loadPayroll(payrollDate);
    }
  }, [activeTab, payrollDate, employees.length]);

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

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const loadPayroll = async (date: string) => {
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

  const handleScheduleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase.from('schedules').insert({
        ...scheduleFormData,
        created_by: profile.id,
      });

      if (error) throw error;

      setScheduleFormData({
        employee_id: '',
        date: '',
        start_time: '',
        end_time: '',
        shift_role: 'kitchen',
        notes: '',
      });
      setShowScheduleForm(false);
      setSubmitSuccess('Shift created successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating schedule:', error);
      setSubmitError('Failed to create shift');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const handleOpenShiftSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase.from('schedules').insert({
        ...openShiftFormData,
        employee_id: null,
        created_by: profile.id,
      });

      if (error) throw error;

      setOpenShiftFormData({
        date: '',
        start_time: '',
        end_time: '',
        shift_role: 'kitchen',
        notes: '',
      });
      setShowOpenShiftForm(false);
      setSubmitSuccess('Open shift created successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating open shift:', error);
      setSubmitError('Failed to create open shift');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const handleAnnouncementSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase.from('announcements').insert({
        ...announcementFormData,
        created_by: profile.id,
      });

      if (error) throw error;

      setAnnouncementFormData({
        title: '',
        content: '',
        category: 'general',
        priority: 'normal',
      });
      setShowAnnouncementForm(false);
      await loadAnnouncements();
      setSubmitSuccess('Announcement created successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating announcement:', error);
      setSubmitError('Failed to create announcement');
      setTimeout(() => setSubmitError(null), 3000);
    }
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
      setSubmitSuccess('Announcement updated successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating announcement:', error);
      setSubmitError('Failed to update announcement');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadAnnouncements();
      setSubmitSuccess('Announcement deleted successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setSubmitError('Failed to delete announcement');
      setTimeout(() => setSubmitError(null), 3000);
    }
  };

  const handleEmployeeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (employeeFormData.password.length < 6) {
      setSubmitError('Password must be at least 6 characters');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitError('Not authenticated - please log in again');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`;

      console.log('Calling edge function:', apiUrl);
      console.log('Request data:', {
        email: employeeFormData.email,
        full_name: employeeFormData.full_name,
        role: employeeFormData.role
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(employeeFormData),
      });

      const result = await response.json();
      console.log('Edge function response:', { status: response.status, result });

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to create employee';
        console.error('Employee creation failed:', {
          status: response.status,
          error: errorMsg,
          details: result
        });
        throw new Error(errorMsg);
      }

      setSubmitSuccess(`Employee ${employeeFormData.full_name} created successfully!`);
      setEmployeeFormData({
        email: '',
        full_name: '',
        role: 'employee',
        password: '',
        hourly_wage: '15.00',
      });
      setShowEmployeeForm(false);

      await loadEmployees();

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error creating employee:', error);
      setSubmitError(error.message || 'Failed to create employee. Please try again.');
    }
  };

  const handleEmployeeUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!editingEmployee) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitError('Not authenticated - please log in again');
        return;
      }

      const updates: any = {
        full_name: editingEmployee.full_name,
        role: editingEmployee.role,
        hourly_wage: editingEmployee.hourly_wage,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingEmployee.id);

      if (profileError) throw profileError;

      if (editEmployeePassword && editEmployeePassword.length >= 6) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-employee`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: editingEmployee.id,
            email: editingEmployee.email,
            password: editEmployeePassword,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMsg = result.error || 'Failed to update employee credentials';
          throw new Error(errorMsg);
        }
      }

      setSubmitSuccess(`Employee ${editingEmployee.full_name} updated successfully!`);
      setEditingEmployee(null);
      setEditEmployeePassword('');

      await loadEmployees();

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      setSubmitError(error.message || 'Failed to update employee. Please try again.');
    }
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to remove ${employeeName}? This will:\n\n• Deactivate their account\n• Remove them from all future shifts\n\nThis action cannot be undone.`)) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitError('Not authenticated - please log in again');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-employee`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ employee_id: employeeId }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to remove employee';
        throw new Error(errorMsg);
      }

      setSubmitSuccess(`Employee ${employeeName} has been removed successfully`);
      await loadEmployees();

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error removing employee:', error);
      setSubmitError(error.message || 'Failed to remove employee. Please try again.');
    }
  };

  const loadEmployeeSchedule = async (employee: Profile) => {
    setViewingEmployeeSchedule(employee);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', employee.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEmployeeSchedules(data || []);
    } catch (error) {
      console.error('Error loading employee schedule:', error);
      setSubmitError('Failed to load employee schedule');
    }
  };

  const handleEmployeeShiftUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeShift) return;

    setSubmitError(null);
    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          date: editingEmployeeShift.date,
          start_time: editingEmployeeShift.start_time,
          end_time: editingEmployeeShift.end_time,
          shift_role: editingEmployeeShift.shift_role,
          notes: editingEmployeeShift.notes,
        })
        .eq('id', editingEmployeeShift.id);

      if (error) throw error;

      setSubmitSuccess('Shift updated successfully');
      setEditingEmployeeShift(null);

      if (viewingEmployeeSchedule) {
        await loadEmployeeSchedule(viewingEmployeeSchedule);
      }

      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating shift:', error);
      setSubmitError(error.message || 'Failed to update shift');
    }
  };

  const handleEmployeeShiftDelete = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    setSubmitError(null);
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;

      setSubmitSuccess('Shift deleted successfully');

      if (viewingEmployeeSchedule) {
        await loadEmployeeSchedule(viewingEmployeeSchedule);
      }

      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      setSubmitError(error.message || 'Failed to delete shift');
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelection = new Set(selectedEmployeeIds);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
      const newEditData = new Map(bulkEditData);
      newEditData.delete(employeeId);
      setBulkEditData(newEditData);
    } else {
      newSelection.add(employeeId);
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        const newEditData = new Map(bulkEditData);
        newEditData.set(employeeId, {
          role: employee.role,
          hourly_wage: employee.hourly_wage,
        });
        setBulkEditData(newEditData);
      }
    }
    setSelectedEmployeeIds(newSelection);
  };

  const toggleSelectAll = () => {
    const activeEmployees = filteredEmployees.filter(e => e.is_active);
    if (selectedEmployeeIds.size === activeEmployees.length) {
      setSelectedEmployeeIds(new Set());
      setBulkEditData(new Map());
    } else {
      const newSelection = new Set(activeEmployees.map(e => e.id));
      const newEditData = new Map();
      activeEmployees.forEach(emp => {
        newEditData.set(emp.id, {
          role: emp.role,
          hourly_wage: emp.hourly_wage,
        });
      });
      setSelectedEmployeeIds(newSelection);
      setBulkEditData(newEditData);
    }
  };

  const updateBulkEditField = (employeeId: string, field: keyof Profile, value: any) => {
    const newEditData = new Map(bulkEditData);
    const currentData = newEditData.get(employeeId) || {};
    newEditData.set(employeeId, { ...currentData, [field]: value });
    setBulkEditData(newEditData);
  };

  const handleBulkSave = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (selectedEmployeeIds.size === 0) {
      setSubmitError('No employees selected');
      return;
    }

    try {
      const updates = Array.from(selectedEmployeeIds).map(employeeId => {
        const editData = bulkEditData.get(employeeId);
        if (!editData) return null;

        return supabase
          .from('profiles')
          .update({
            role: editData.role,
            hourly_wage: editData.hourly_wage,
          })
          .eq('id', employeeId);
      }).filter(Boolean);

      const results = await Promise.all(updates);
      const failedUpdates = results.filter(result => result?.error);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} employee(s)`);
      }

      setSubmitSuccess(`Successfully updated ${selectedEmployeeIds.size} employee(s)`);
      await loadEmployees();

      setBulkEditMode(false);
      setSelectedEmployeeIds(new Set());
      setBulkEditData(new Map());

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error in bulk save:', error);
      setSubmitError(error.message || 'Failed to save bulk changes');
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const cancelBulkEdit = () => {
    setBulkEditMode(false);
    setSelectedEmployeeIds(new Set());
    setBulkEditData(new Map());
  };

  const toggleShiftSelection = (shiftId: string) => {
    const newSelection = new Set(selectedShiftIds);
    if (newSelection.has(shiftId)) {
      newSelection.delete(shiftId);
    } else {
      newSelection.add(shiftId);
    }
    setSelectedShiftIds(newSelection);
  };

  const toggleSelectAllShifts = () => {
    if (selectedShiftIds.size === employeeSchedules.length) {
      setSelectedShiftIds(new Set());
    } else {
      const newSelection = new Set(employeeSchedules.map(s => s.id));
      setSelectedShiftIds(newSelection);
    }
  };

  const handleBulkShiftUpdate = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (selectedShiftIds.size === 0) {
      setSubmitError('No shifts selected');
      return;
    }

    if (!bulkShiftEditData.employee_id && !bulkShiftEditData.start_time && !bulkShiftEditData.end_time && !bulkShiftEditData.shift_role) {
      setSubmitError('Please specify at least one field to update');
      return;
    }

    try {
      const updateData: any = {};
      if (bulkShiftEditData.employee_id) updateData.employee_id = bulkShiftEditData.employee_id;
      if (bulkShiftEditData.start_time) updateData.start_time = bulkShiftEditData.start_time;
      if (bulkShiftEditData.end_time) updateData.end_time = bulkShiftEditData.end_time;
      if (bulkShiftEditData.shift_role) updateData.shift_role = bulkShiftEditData.shift_role;

      const updates = Array.from(selectedShiftIds).map(shiftId => {
        return supabase
          .from('schedules')
          .update(updateData)
          .eq('id', shiftId);
      });

      const results = await Promise.all(updates);
      const failedUpdates = results.filter(result => result?.error);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} shift(s)`);
      }

      setSubmitSuccess(`Successfully updated ${selectedShiftIds.size} shift(s)`);

      if (viewingEmployeeSchedule) {
        await loadEmployeeSchedule(viewingEmployeeSchedule);
      }

      setBulkShiftEditMode(false);
      setSelectedShiftIds(new Set());
      setBulkShiftEditData({ employee_id: '', start_time: '', end_time: '', shift_role: '' });

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error in bulk shift update:', error);
      setSubmitError(error.message || 'Failed to update shifts');
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const handleBulkShiftDelete = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (selectedShiftIds.size === 0) {
      setSubmitError('No shifts selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedShiftIds.size} shift(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const deletes = Array.from(selectedShiftIds).map(shiftId => {
        return supabase
          .from('schedules')
          .delete()
          .eq('id', shiftId);
      });

      const results = await Promise.all(deletes);
      const failedDeletes = results.filter(result => result?.error);

      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} shift(s)`);
      }

      setSubmitSuccess(`Successfully deleted ${selectedShiftIds.size} shift(s)`);

      if (viewingEmployeeSchedule) {
        await loadEmployeeSchedule(viewingEmployeeSchedule);
      }

      setBulkShiftEditMode(false);
      setSelectedShiftIds(new Set());
      setBulkShiftEditData({ employee_id: '', start_time: '', end_time: '', shift_role: '' });

      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error in bulk shift delete:', error);
      setSubmitError(error.message || 'Failed to delete shifts');
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const cancelBulkShiftEdit = () => {
    setBulkShiftEditMode(false);
    setSelectedShiftIds(new Set());
    setBulkShiftEditData({ employee_id: '', start_time: '', end_time: '', shift_role: '' });
  };

  const calculateEmployeeTotals = () => {
    if (!viewingEmployeeSchedule || employeeSchedules.length === 0) {
      return { hours: 0, earnings: 0 };
    }

    const totalHours = employeeSchedules.reduce((sum, schedule) => {
      const start = new Date(`2000-01-01T${schedule.start_time}`);
      const end = new Date(`2000-01-01T${schedule.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    const earnings = totalHours * viewingEmployeeSchedule.hourly_wage;
    return { hours: totalHours, earnings };
  };

  const filteredEmployees = employees.filter((employee) => {
    if (!employeeSearchTerm) return true;

    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      employee.full_name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.username && employee.username.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 bg-white rounded-t-xl px-6">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'schedules'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'announcements'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'employees'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'payroll'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Payroll
        </button>
      </div>

      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {submitSuccess && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Manage Schedules</h3>
              <p className="text-gray-600 mt-1">Create and edit employee work schedules</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkShiftForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                <CalendarRange className="w-5 h-5" />
                Bulk Create
              </button>

              <button
                onClick={() => {
                  setShowOpenShiftForm(!showOpenShiftForm);
                  setShowScheduleForm(false);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
              >
                {showOpenShiftForm ? (
                  <>
                    <X className="w-5 h-5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Open Shift
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowScheduleForm(!showScheduleForm);
                  setShowOpenShiftForm(false);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                {showScheduleForm ? (
                  <>
                    <X className="w-5 h-5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Shift
                  </>
                )}
              </button>
            </div>
          </div>

          {showOpenShiftForm && (
            <form onSubmit={handleOpenShiftSubmit} className="p-6 bg-amber-50 rounded-xl border-2 border-amber-300 space-y-4 mb-6">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-amber-900">Create Open Shift</h4>
                <p className="text-sm text-amber-700 mt-1">Create a shift that any employee can claim</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="open_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    id="open_date"
                    type="date"
                    value={openShiftFormData.date}
                    onChange={(e) => setOpenShiftFormData({ ...openShiftFormData, date: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="open_shift_role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="open_shift_role"
                    value={openShiftFormData.shift_role}
                    onChange={(e) => setOpenShiftFormData({ ...openShiftFormData, shift_role: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="kitchen">Kitchen</option>
                    <option value="delivery">Delivery</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="open_start_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    id="open_start_time"
                    type="time"
                    value={openShiftFormData.start_time}
                    onChange={(e) => setOpenShiftFormData({ ...openShiftFormData, start_time: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="open_end_time" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    id="open_end_time"
                    type="time"
                    value={openShiftFormData.end_time}
                    onChange={(e) => setOpenShiftFormData({ ...openShiftFormData, end_time: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="open_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    id="open_notes"
                    type="text"
                    value={openShiftFormData.notes}
                    onChange={(e) => setOpenShiftFormData({ ...openShiftFormData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any additional notes"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition"
              >
                Create Open Shift
              </button>
            </form>
          )}

          {showScheduleForm && (
            <form onSubmit={handleScheduleSubmit} className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    id="employee"
                    value={scheduleFormData.employee_id}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, employee_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select an employee</option>
                    {employees.filter(emp => emp.is_active).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={scheduleFormData.date}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, date: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    id="start_time"
                    type="time"
                    value={scheduleFormData.start_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    id="end_time"
                    type="time"
                    value={scheduleFormData.end_time}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="shift_role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="shift_role"
                    value={scheduleFormData.shift_role}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, shift_role: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="kitchen">Kitchen</option>
                    <option value="delivery">Delivery</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    id="notes"
                    type="text"
                    value={scheduleFormData.notes}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Any additional notes"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Create Shift
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {submitSuccess && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Manage Announcements</h3>
              <p className="text-gray-600 mt-1">Post important updates for all employees</p>
            </div>

            <button
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {showAnnouncementForm ? (
                <>
                  <X className="w-5 h-5" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  New Announcement
                </>
              )}
            </button>
          </div>

          {showAnnouncementForm && (
            <form onSubmit={handleAnnouncementSubmit} className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4 mb-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={announcementFormData.title}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Announcement title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={announcementFormData.category}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, category: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="hours">Hours</option>
                    <option value="emergency">Emergency</option>
                    <option value="rules">Rules</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={announcementFormData.priority}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="content"
                  value={announcementFormData.content}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, content: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Write your announcement here..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Post Announcement
              </button>
            </form>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">All Announcements ({announcements.length})</h4>
            <div className="grid gap-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold text-gray-900">{announcement.title}</h5>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {announcement.priority}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700 capitalize">
                          {announcement.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAnnouncement(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-gray-500 text-center py-8">No announcements found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {submitSuccess && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Manage Employees</h3>
              <p className="text-gray-600 mt-1">Add new employees and view all staff</p>
            </div>

            <button
              onClick={() => setShowEmployeeForm(!showEmployeeForm)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {showEmployeeForm ? (
                <>
                  <X className="w-5 h-5" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Employee
                </>
              )}
            </button>
          </div>

          {showEmployeeForm && (
            <form onSubmit={handleEmployeeSubmit} className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="employee_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="employee_email"
                    type="email"
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="employee@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="employee_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="employee_name"
                    type="text"
                    value={employeeFormData.full_name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="employee_role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="employee_role"
                    value={employeeFormData.role}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="employee_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="employee_password"
                    type="password"
                    value={employeeFormData.password}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="employee_wage" className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Wage (€)
                  </label>
                  <input
                    id="employee_wage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeFormData.hourly_wage}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, hourly_wage: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Create Employee
              </button>
            </form>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-gray-900">All Employees ({filteredEmployees.length})</h4>
                {!bulkEditMode && (
                  <button
                    onClick={() => setBulkEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <Users className="w-4 h-4" />
                    Bulk Edit
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-80"
                />
                {employeeSearchTerm && (
                  <button
                    onClick={() => setEmployeeSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {bulkEditMode && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800 transition"
                    >
                      {selectedEmployeeIds.size === filteredEmployees.filter(e => e.is_active).length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                      Select All Active
                    </button>
                    <span className="text-blue-700 font-medium">
                      {selectedEmployeeIds.size} employee{selectedEmployeeIds.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkSave}
                      disabled={selectedEmployeeIds.size === 0}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      Save All Changes
                    </button>
                    <button
                      onClick={cancelBulkEdit}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-3">
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployeeIds.has(employee.id);
                const editData = bulkEditData.get(employee.id);

                if (bulkEditMode && isSelected && employee.is_active) {
                  return (
                    <div
                      key={employee.id}
                      className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleEmployeeSelection(employee.id)}
                          className="mt-1 text-blue-600 hover:text-blue-700"
                        >
                          <CheckSquare className="w-6 h-6" />
                        </button>

                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="font-bold text-gray-900 text-lg mb-1">{employee.full_name}</p>
                            <p className="text-sm text-gray-600">{employee.email}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                              </label>
                              <select
                                value={editData?.role || employee.role}
                                onChange={(e) => updateBulkEditField(employee.id, 'role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hourly Wage (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editData?.hourly_wage ?? employee.hourly_wage}
                                onChange={(e) => updateBulkEditField(employee.id, 'hourly_wage', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                onClick={() => loadEmployeeSchedule(employee)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition w-full justify-center"
                              >
                                <Calendar className="w-4 h-4" />
                                View Schedule
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (bulkEditMode && employee.is_active) {
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleEmployeeSelection(employee.id)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Square className="w-6 h-6" />
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{employee.full_name}</p>
                          </div>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <p className="text-sm text-gray-500 mt-1">€{employee.hourly_wage.toFixed(2)}/hour</p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            employee.role === 'manager'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{employee.full_name}</p>
                        {!employee.is_active && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                      <p className="text-sm text-gray-500 mt-1">€{employee.hourly_wage.toFixed(2)}/hour</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          employee.role === 'manager'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </span>
                      {employee.is_active && (
                        <>
                          <button
                            onClick={() => loadEmployeeSchedule(employee)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="View Schedule"
                          >
                            <Calendar className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(employee);
                              setEditEmployeePassword('');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveEmployee(employee.id, employee.full_name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove Employee"
                          >
                            <UserX className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredEmployees.length === 0 && employees.length === 0 && (
                <p className="text-gray-500 text-center py-8">No employees found</p>
              )}
              {filteredEmployees.length === 0 && employees.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No employees match your search</p>
                  <button
                    onClick={() => setEmployeeSearchTerm('')}
                    className="mt-2 text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Daily Payroll Calculator</h3>
            <p className="text-gray-600">Calculate payroll costs for a specific day</p>
          </div>

          <div className="mb-6 space-y-4">
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

          {payrollData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No scheduled shifts for this date</p>
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

                    <div className={`rounded-xl p-6 ${isOverLimit ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white`}>
                      <h4 className="text-lg font-semibold mb-2">Total Daily Payroll</h4>
                      <p className="text-4xl font-bold">
                        €{totalPayroll.toFixed(2)}
                      </p>
                      <p className={isOverLimit ? 'text-red-100 mt-2' : 'text-red-100 mt-2'}>
                        {payrollData.reduce((sum, item) => sum + item.hours_worked, 0).toFixed(1)} total hours worked
                      </p>
                      {!isOverLimit && limit > 0 && (
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
      )}

      {showBulkShiftForm && (
        <BulkShiftCreation
          employees={employees}
          onClose={() => setShowBulkShiftForm(false)}
          onSuccess={() => {
            setSubmitSuccess('Bulk shifts created successfully!');
            setTimeout(() => setSubmitSuccess(null), 5000);
          }}
        />
      )}

      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Edit Announcement</h3>
                  <p className="text-red-100 mt-1">Update announcement details</p>
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
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingAnnouncement.title}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editingAnnouncement.category}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="general">General</option>
                      <option value="hours">Hours</option>
                      <option value="emergency">Emergency</option>
                      <option value="rules">Rules</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={editingAnnouncement.priority}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, priority: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={editingAnnouncement.content}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Edit Employee</h3>
                  <p className="text-red-100 mt-1">Update employee information</p>
                </div>
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setEditEmployeePassword('');
                  }}
                  className="p-2 hover:bg-red-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEmployeeUpdate} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.full_name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={editingEmployee.role}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Wage (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingEmployee.hourly_wage}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, hourly_wage: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={editEmployeePassword}
                      onChange={(e) => setEditEmployeePassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Leave blank to keep current password"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 6 characters. Leave empty if you don't want to change the password.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setEditEmployeePassword('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingEmployeeSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{viewingEmployeeSchedule.full_name}'s Schedule</h3>
                  <p className="text-red-100 mt-1">
                    {viewingEmployeeSchedule.email} • €{viewingEmployeeSchedule.hourly_wage.toFixed(2)}/hour
                  </p>
                </div>
                <button
                  onClick={() => {
                    setViewingEmployeeSchedule(null);
                    setEmployeeSchedules([]);
                    setBulkShiftEditMode(false);
                    setSelectedShiftIds(new Set());
                    setBulkShiftEditData({ employee_id: '', start_time: '', end_time: '', shift_role: '' });
                  }}
                  className="p-2 hover:bg-red-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {submitSuccess && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                {submitSuccess}
              </div>
            )}
            {submitError && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                {submitError}
              </div>
            )}

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {employeeSchedules.length > 0 ? (
                <>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">Total Hours</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {calculateEmployeeTotals().hours.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">Total Earnings</p>
                        <p className="text-2xl font-bold text-blue-900">
                          €{calculateEmployeeTotals().earnings.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Shifts ({employeeSchedules.length})</h4>
                    {!bulkShiftEditMode && (
                      <button
                        onClick={() => setBulkShiftEditMode(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                      >
                        <Users className="w-4 h-4" />
                        Bulk Edit Shifts
                      </button>
                    )}
                  </div>

                  {bulkShiftEditMode && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={toggleSelectAllShifts}
                            className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800 transition"
                          >
                            {selectedShiftIds.size === employeeSchedules.length ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                            Select All
                          </button>
                          <span className="text-blue-700 font-medium">
                            {selectedShiftIds.size} shift{selectedShiftIds.size !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                      </div>

                      {selectedShiftIds.size > 0 && (
                        <div className="bg-white border border-blue-300 rounded-lg p-4 space-y-4">
                          <h5 className="font-semibold text-gray-900">Edit Selected Shifts</h5>
                          <p className="text-sm text-gray-600">Leave fields empty to keep existing values</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reassign to Employee
                              </label>
                              <select
                                value={bulkShiftEditData.employee_id}
                                onChange={(e) => setBulkShiftEditData({ ...bulkShiftEditData, employee_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Keep existing employee</option>
                                {employees
                                  .filter(emp => emp.is_active)
                                  .map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.full_name} - €{emp.hourly_wage.toFixed(2)}/hour
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                              </label>
                              <select
                                value={bulkShiftEditData.shift_role}
                                onChange={(e) => setBulkShiftEditData({ ...bulkShiftEditData, shift_role: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Keep existing</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="delivery">Delivery</option>
                                <option value="cashier">Cashier</option>
                                <option value="manager">Manager</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={bulkShiftEditData.start_time}
                                onChange={(e) => setBulkShiftEditData({ ...bulkShiftEditData, start_time: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={bulkShiftEditData.end_time}
                                onChange={(e) => setBulkShiftEditData({ ...bulkShiftEditData, end_time: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleBulkShiftUpdate}
                              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                            >
                              <Save className="w-4 h-4" />
                              Update Selected Shifts
                            </button>
                            <button
                              onClick={handleBulkShiftDelete}
                              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Selected Shifts
                            </button>
                            <button
                              onClick={cancelBulkShiftEdit}
                              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    {employeeSchedules.map((schedule) => {
                      const isSelected = selectedShiftIds.has(schedule.id);

                      return (
                        <div
                          key={schedule.id}
                          className={`p-4 rounded-lg border hover:shadow-md transition ${
                            bulkShiftEditMode && isSelected
                              ? 'bg-blue-50 border-2 border-blue-300'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {bulkShiftEditMode && (
                              <button
                                onClick={() => toggleShiftSelection(schedule.id)}
                                className="mt-1 flex-shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <Square className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                                )}
                              </button>
                            )}

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-5 h-5 text-gray-600" />
                                <p className="font-bold text-gray-900">
                                  {new Date(schedule.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-gray-600" />
                                <p className="text-gray-700">
                                  {schedule.start_time} - {schedule.end_time}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-semibold capitalize">
                                  {schedule.shift_role}
                                </span>
                                {schedule.notes && (
                                  <p className="text-sm text-gray-600 italic">"{schedule.notes}"</p>
                                )}
                              </div>
                            </div>

                            {!bulkShiftEditMode && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingEmployeeShift(schedule)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit Shift"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleEmployeeShiftDelete(schedule.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Shift"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No shifts scheduled</p>
                  <p className="text-gray-400 text-sm mt-2">This employee has no scheduled shifts</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setViewingEmployeeSchedule(null);
                  setEmployeeSchedules([]);
                  setBulkShiftEditMode(false);
                  setSelectedShiftIds(new Set());
                  setBulkShiftEditData({ employee_id: '', start_time: '', end_time: '', shift_role: '' });
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEmployeeShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Edit Shift</h3>
                  <p className="text-blue-100 mt-1">Update shift details</p>
                </div>
                <button
                  onClick={() => setEditingEmployeeShift(null)}
                  className="p-2 hover:bg-blue-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEmployeeShiftUpdate} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={editingEmployeeShift.employee_id}
                    onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {employees
                      .filter(emp => emp.is_active)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} - €{emp.hourly_wage.toFixed(2)}/hour
                        </option>
                      ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">Change which employee is assigned to this shift</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingEmployeeShift.date}
                    onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={editingEmployeeShift.start_time}
                      onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={editingEmployeeShift.end_time}
                      onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={editingEmployeeShift.shift_role}
                    onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, shift_role: e.target.value as 'kitchen' | 'delivery' | 'cashier' | 'manager' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="kitchen">Kitchen</option>
                    <option value="delivery">Delivery</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingEmployeeShift.notes || ''}
                    onChange={(e) => setEditingEmployeeShift({ ...editingEmployeeShift, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployeeShift(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
