import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock, User, Bell, AlertCircle, Info, Edit2, Save, Wallet, Download, Trash2, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Schedule, Announcement, Profile } from '../types/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ViewMode = 'week' | 'month';

interface ScheduleWithProfile extends Schedule {
  employee_name?: string;
}

interface DayModalData {
  date: Date;
  schedules: ScheduleWithProfile[];
}

const shiftRoleColors = {
  kitchen: 'bg-purple-100 text-purple-800 border-purple-300',
  delivery: 'bg-blue-100 text-blue-800 border-blue-300',
  cashier: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  manager: 'bg-red-100 text-red-800 border-red-300',
};

const openShiftColor = 'bg-amber-100 text-amber-800 border-amber-400';

export default function Schedule() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayModal, setSelectedDayModal] = useState<DayModalData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithProfile | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [payrollStats, setPayrollStats] = useState({ hours: 0, earnings: 0, hourlyWage: 0 });
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
    if (profile?.role === 'employee') {
      loadAnnouncements();
    }
    if (profile?.role === 'manager') {
      loadEmployees();
    }
  }, [currentDate, viewMode, profile]);

  useEffect(() => {
    if (profile?.role === 'employee' && schedules.length >= 0) {
      calculatePayroll();
    }
  }, [schedules, profile]);

  const loadSchedules = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      let query = supabase
        .from('schedules')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (profile.role === 'employee') {
        query = query.or(`employee_id.eq.${profile.id},employee_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const profilesResponse = await supabase
          .from('profiles')
          .select('id, full_name');

        if (profilesResponse.data) {
          const profileMap = new Map(
            profilesResponse.data.map(p => [p.id, p.full_name])
          );

          const schedulesWithNames = data.map(schedule => ({
            ...schedule,
            employee_name: profileMap.get(schedule.employee_id),
          }));

          setSchedules(schedulesWithNames);
        } else {
          setSchedules(data);
        }
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

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

  const calculatePayroll = async () => {
    if (!profile || profile.role !== 'employee') return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('hourly_wage')
        .eq('id', profile.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const hourlyWage = profileData?.hourly_wage || 0;

      const totalHours = schedules
        .filter(schedule => schedule.employee_id === profile.id)
        .reduce((sum, schedule) => {
          const start = new Date(`2000-01-01T${schedule.start_time}`);
          const end = new Date(`2000-01-01T${schedule.end_time}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);

      const earnings = totalHours * hourlyWage;

      setPayrollStats({ hours: totalHours, earnings, hourlyWage });
    } catch (error) {
      console.error('Error calculating payroll:', error);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'week') {
      start.setDate(currentDate.getDate() - currentDate.getDay());
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return { startDate: start, endDate: end };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getWeekDates = () => {
    const { startDate, endDate } = getDateRange();
    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getMonthCalendarDates = () => {
    const { startDate, endDate } = getDateRange();
    const dates = [];

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      dates.push(null);
    }

    // Add all days of the month
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Add empty cells to complete the last week
    while (dates.length % 7 !== 0) {
      dates.push(null);
    }

    return dates;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
  };

  const handleDayClick = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    try {
      const { data: daySchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('date', dateStr)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (daySchedules) {
        const profilesResponse = await supabase
          .from('profiles')
          .select('id, full_name');

        if (profilesResponse.data) {
          const profileMap = new Map(
            profilesResponse.data.map(p => [p.id, p.full_name])
          );

          const schedulesWithNames = daySchedules.map(schedule => ({
            ...schedule,
            employee_name: profileMap.get(schedule.employee_id),
          }));

          setSelectedDayModal({ date, schedules: schedulesWithNames });
        } else {
          setSelectedDayModal({ date, schedules: daySchedules });
        }
      }
    } catch (error) {
      console.error('Error loading day schedules:', error);
    }
  };

  const handleEditSchedule = (schedule: ScheduleWithProfile) => {
    setEditingSchedule(schedule);
    setSelectedDayModal(null);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          employee_id: editingSchedule.employee_id,
          date: editingSchedule.date,
          start_time: editingSchedule.start_time,
          end_time: editingSchedule.end_time,
          shift_role: editingSchedule.shift_role,
          notes: editingSchedule.notes,
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      setEditingSchedule(null);
      await loadSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Rooster bijwerken mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!editingSchedule || !confirm('Weet je zeker dat je deze dienst wilt verwijderen?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', editingSchedule.id);

      if (error) throw error;

      setEditingSchedule(null);
      await loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Rooster verwijderen mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleClaimShift = async (scheduleId: string) => {
    if (!profile || profile.role !== 'employee') return;

    if (!confirm('Weet je zeker dat je deze open dienst wilt claimen?')) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .update({ employee_id: profile.id })
        .eq('id', scheduleId)
        .is('employee_id', null);

      if (error) throw error;

      await loadSchedules();
      setSelectedDayModal(null);
    } catch (error) {
      console.error('Error claiming shift:', error);
      alert('Dienst claimen mislukt. Mogelijk is deze al door een andere medewerker geclaimd.');
    }
  };

  const toggleShiftSelection = (shiftId: string) => {
    const newSelected = new Set(selectedShifts);
    if (newSelected.has(shiftId)) {
      newSelected.delete(shiftId);
    } else {
      newSelected.add(shiftId);
    }
    setSelectedShifts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedShifts.size === 0) return;

    if (!confirm(`Weet je zeker dat je ${selectedShifts.size} dienst(en) wilt verwijderen?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .in('id', Array.from(selectedShifts));

      if (error) throw error;

      setSelectedShifts(new Set());
      setBulkDeleteMode(false);
      await loadSchedules();
    } catch (error) {
      console.error('Error bulk deleting shifts:', error);
      alert('Diensten verwijderen mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const exportToCalendar = async () => {
    if (!profile) return;

    try {
      const { data: allSchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', profile.id)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!allSchedules || allSchedules.length === 0) {
        alert('Geen diensten gevonden om te exporteren');
        return;
      }

      const icsContent = generateICS(allSchedules);

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Paprika-Werkrooster-${profile.full_name.replace(/\s+/g, '-')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting calendar:', error);
      alert('Fout bij het exporteren van rooster');
    }
  };

  const generateICS = (shifts: Schedule[]): string => {
    const formatICSDate = (date: string, time: string): string => {
      const [year, month, day] = date.split('-');
      const [hours, minutes] = time.split(':');
      return `${year}${month}${day}T${hours}${minutes}00`;
    };

    const escapeICSText = (text: string): string => {
      return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    };

    const shiftRoleNames: { [key: string]: string } = {
      kitchen: 'Keuken',
      delivery: 'Bezorging',
      cashier: 'Kassa',
      manager: 'Manager',
    };

    let ics = 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//Paprika//Werkrooster//NL\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += 'X-WR-CALNAME:Paprika Werkrooster\r\n';
    ics += 'X-WR-TIMEZONE:Europe/Amsterdam\r\n';

    shifts.forEach((shift) => {
      const uid = `${shift.id}@paprika.nl`;
      const dtstart = formatICSDate(shift.date, shift.start_time);
      const dtend = formatICSDate(shift.date, shift.end_time);
      const summary = `Werk: ${shiftRoleNames[shift.shift_role] || shift.shift_role}`;
      const description = shift.notes
        ? `Rol: ${shiftRoleNames[shift.shift_role]}\\nNotities: ${escapeICSText(shift.notes)}`
        : `Rol: ${shiftRoleNames[shift.shift_role]}`;

      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${uid}\r\n`;
      ics += `DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0], '00:00')}\r\n`;
      ics += `DTSTART:${dtstart}\r\n`;
      ics += `DTEND:${dtend}\r\n`;
      ics += `SUMMARY:${summary}\r\n`;
      ics += `DESCRIPTION:${description}\r\n`;
      ics += `LOCATION:Paprika\r\n`;
      ics += `STATUS:CONFIRMED\r\n`;
      ics += 'END:VEVENT\r\n';
    });

    ics += 'END:VCALENDAR\r\n';
    return ics;
  };

  const downloadCalendarPDF = async () => {
    if (!profile || profile.role !== 'manager') return;

    try {
      const { startDate, endDate } = getDateRange();

      const { data: monthSchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const profilesResponse = await supabase
        .from('profiles')
        .select('id, full_name');

      if (!profilesResponse.data) throw new Error('Could not load employee names');

      const profileMap = new Map(
        profilesResponse.data.map(p => [p.id, p.full_name])
      );

      const schedulesWithNames: ScheduleWithProfile[] = (monthSchedules || []).map(schedule => ({
        ...schedule,
        employee_name: profileMap.get(schedule.employee_id),
      }));

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, 0, pageWidth, 25, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Paprika', pageWidth / 2, 11, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const monthYear = currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      pdf.text('Werkrooster - ' + monthYear.charAt(0).toUpperCase() + monthYear.slice(1), pageWidth / 2, 19, { align: 'center' });

      const calendarDates = getMonthCalendarDates();
      const weeks: (Date | null)[][] = [];
      for (let i = 0; i < calendarDates.length; i += 7) {
        weeks.push(calendarDates.slice(i, i + 7));
      }

      const tableData: any[][] = [];

      weeks.forEach((week, weekIndex) => {
        const rowData: any[] = [];

        week.forEach(date => {
          if (!date) {
            rowData.push('');
          } else {
            const dateStr = date.toISOString().split('T')[0];
            const daySchedules = schedulesWithNames.filter(s => s.date === dateStr);

            const dayNum = date.getDate();
            const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            let cellContent = '';

            if (daySchedules.length === 0) {
              cellContent = `${dayName} ${dayNum}\n\nGeen diensten`;
            } else {
              const shifts = daySchedules.map(s => {
                const name = s.employee_id ? s.employee_name : 'OPEN';
                const startTime = s.start_time ? s.start_time.substring(0, 5) : '';
                const endTime = s.end_time ? s.end_time.substring(0, 5) : '';
                const timeStr = startTime && endTime ? `${startTime}-${endTime}` : '';
                return timeStr ? `${name}\n${timeStr}` : name;
              });

              cellContent = `${dayName} ${dayNum}\n\n${shifts.join('\n\n')}`;
            }

            rowData.push({
              content: cellContent,
              styles: {
                fillColor: isToday ? [254, 226, 226] : (weekIndex % 2 === 0 ? [255, 255, 255] : [248, 250, 252]),
                textColor: [17, 24, 39],
              }
            });
          }
        });

        tableData.push(rowData);
      });

      autoTable(pdf, {
        startY: 30,
        head: [['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: 'top',
          halign: 'left',
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
          overflow: 'linebreak',
          minCellHeight: 30,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: (pageWidth - 24) / 7 },
          1: { cellWidth: (pageWidth - 24) / 7 },
          2: { cellWidth: (pageWidth - 24) / 7 },
          3: { cellWidth: (pageWidth - 24) / 7 },
          4: { cellWidth: (pageWidth - 24) / 7 },
          5: { cellWidth: (pageWidth - 24) / 7 },
          6: { cellWidth: (pageWidth - 24) / 7 },
        },
        margin: { left: 12, right: 12, top: 30, bottom: 15 },
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.5,
        showHead: 'everyPage',
        didParseCell: (data) => {
          if (data.section === 'body' && data.cell.raw === '') {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.textColor = [150, 150, 150];
          }

          if (data.section === 'body' && typeof data.cell.raw === 'object' && data.cell.raw !== null) {
            const cellStyles = data.cell.raw.styles || {};
            data.cell.styles.fillColor = cellStyles.fillColor || [255, 255, 255];

            const content = data.cell.text.join('\n') || '';
            const lines = content.split('\n');

            if (lines.length > 0 && lines[0].trim()) {
              const firstLine = lines[0].trim();
              const parts = firstLine.split(' ');
              if (parts.length > 1) {
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        didDrawPage: (data) => {
          pdf.setFillColor(220, 38, 38);
          pdf.rect(0, 0, pageWidth, 25, 'F');

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(20);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Paprika', pageWidth / 2, 11, { align: 'center' });

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          const monthYear = currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
          pdf.text('Werkrooster - ' + monthYear.charAt(0).toUpperCase() + monthYear.slice(1), pageWidth / 2, 19, { align: 'center' });

          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const pageCount = pdf.internal.pages.length - 1;
          pdf.text(`Pagina ${data.pageNumber} van ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        },
      });

      const fileName = `Paprika-Werkrooster-${currentDate.toLocaleDateString('nl-NL', {
        month: 'long',
        year: 'numeric'
      }).replace(/\s+/g, '-')}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fout bij het genereren van PDF. Probeer het opnieuw.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Rooster laden...</div>
      </div>
    );
  }

  const getAnnouncementStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 border-red-300',
          text: 'text-red-800',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 border-orange-300',
          text: 'text-orange-800',
          icon: Bell,
          iconColor: 'text-orange-600'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-300',
          text: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600'
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {profile?.role === 'employee' && announcements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mededelingen</h2>
          </div>
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const style = getAnnouncementStyle(announcement.priority || 'normal');
              const Icon = style.icon;

              return (
                <div
                  key={announcement.id}
                  className={`border-2 rounded-lg p-3 sm:p-4 ${style.bg}`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={`font-bold text-sm sm:text-base ${style.text}`}>
                          {announcement.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.bg.replace('bg-', 'border-')}`}>
                          {announcement.category}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm ${style.text} leading-relaxed`}>
                        {announcement.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Werkrooster</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {viewMode === 'week' ? 'Weekweergave' : 'Maandweergave'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

            <div className="flex items-center justify-center gap-2 sm:gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <div className="text-center min-w-[140px] sm:min-w-[140px]">
                <p className="text-sm sm:text-sm font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => navigateDate('next')}
                className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>

            {profile?.role === 'employee' && (
              <button
                onClick={exportToCalendar}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition active:scale-98 sm:ml-auto"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm">Exporteer naar Agenda</span>
              </button>
            )}

            {profile?.role === 'manager' && (
              <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                {viewMode === 'month' && (
                  <button
                    onClick={downloadCalendarPDF}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition active:scale-98"
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm">Download PDF</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setBulkDeleteMode(!bulkDeleteMode);
                    setSelectedShifts(new Set());
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition ${
                    bulkDeleteMode
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm">{bulkDeleteMode ? 'Annuleer' : 'Bulk Verwijderen'}</span>
                </button>

                {bulkDeleteMode && selectedShifts.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm">Verwijder ({selectedShifts.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {profile?.role === 'manager' && (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek werknemer om hun diensten te markeren..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) {
                      setSelectedEmployeeId(null);
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedEmployeeId(null);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {employees
                    .filter(emp =>
                      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                      emp.is_active
                    )
                    .map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setSearchQuery(emp.full_name);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-red-50 transition flex items-center gap-2 ${
                          selectedEmployeeId === emp.id ? 'bg-red-100' : ''
                        }`}
                      >
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{emp.full_name}</span>
                      </button>
                    ))}
                  {employees.filter(emp =>
                    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    emp.is_active
                  ).length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      Geen werknemers gevonden
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {viewMode === 'week' ? (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[800px]">
              {getWeekDates().map((date) => {
                const daySchedules = getSchedulesForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                const hasSelectedEmployee = selectedEmployeeId && daySchedules.some(s => s.employee_id === selectedEmployeeId);

                return (
                  <div
                    key={date.toISOString()}
                    className={`border rounded-lg overflow-hidden ${
                      isToday
                        ? 'border-red-500 ring-2 ring-red-200'
                        : hasSelectedEmployee
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200'
                    }`}
                  >
                    <div
                      onClick={() => handleDayClick(date)}
                      className={`p-3 cursor-pointer hover:bg-opacity-90 transition ${
                        isToday
                          ? 'bg-red-600 text-white'
                          : hasSelectedEmployee
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          {dayName}
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {dayNumber}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 bg-white min-h-[300px] max-h-[500px] overflow-y-auto">
                      {daySchedules.length > 0 ? (
                        <div className="space-y-2">
                          {daySchedules.map((schedule) => {
                            const isOpenShift = !schedule.employee_id;
                            const isSelected = selectedShifts.has(schedule.id);
                            const isHighlightedEmployee = selectedEmployeeId && schedule.employee_id === selectedEmployeeId;
                            return (
                              <div
                                key={schedule.id}
                                onClick={(e) => {
                                  if (bulkDeleteMode && profile?.role === 'manager') {
                                    toggleShiftSelection(schedule.id);
                                  } else if (profile?.role === 'manager' && !bulkDeleteMode) {
                                    handleEditSchedule(schedule);
                                  } else if (profile?.role === 'employee' && isOpenShift) {
                                    handleClaimShift(schedule.id);
                                  }
                                }}
                                className={`p-2 rounded-lg border-l-4 ${
                                  isHighlightedEmployee
                                    ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-400'
                                    : isOpenShift
                                      ? openShiftColor
                                      : shiftRoleColors[schedule.shift_role]
                                } ${
                                  isSelected ? 'ring-2 ring-red-500' : ''
                                } ${
                                  profile?.role === 'manager' || (profile?.role === 'employee' && isOpenShift)
                                    ? 'hover:ring-2 hover:ring-red-500 cursor-pointer'
                                    : ''
                                }`}
                                title={isOpenShift ? 'Open Shift' : schedule.shift_role.charAt(0).toUpperCase() + schedule.shift_role.slice(1)}
                              >
                                <div className="space-y-1">
                                  {bulkDeleteMode && profile?.role === 'manager' && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleShiftSelection(schedule.id)}
                                        className="w-3 h-3 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="text-xs text-gray-600">Select</span>
                                    </div>
                                  )}
                                  {isOpenShift ? (
                                    <>
                                      <p className="font-bold text-xs text-amber-900 leading-tight">
                                        OPEN
                                      </p>
                                      <p className="text-[10px] text-amber-700 capitalize leading-tight">{schedule.shift_role}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className={`font-semibold text-xs truncate leading-tight ${
                                        isHighlightedEmployee ? 'text-blue-900' : ''
                                      }`}>
                                        {schedule.employee_name || 'Unknown'}
                                      </p>
                                      <p className={`text-[10px] capitalize leading-tight ${
                                        isHighlightedEmployee ? 'text-blue-700' : 'text-gray-600'
                                      }`}>
                                        {schedule.shift_role}
                                      </p>
                                    </>
                                  )}
                                  <p className={`text-[10px] font-medium leading-tight ${
                                    isHighlightedEmployee ? 'text-blue-800' : 'text-gray-700'
                                  }`}>
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </p>
                                  {schedule.notes && (
                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                      {schedule.notes}
                                    </p>
                                  )}
                                  {profile?.role === 'manager' && !bulkDeleteMode && (
                                    <div className="flex justify-end">
                                      <Edit2 className="w-3 h-3 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-center">
                          <p className="text-gray-400 text-xs italic">
                            Geen diensten
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Zon', 'Maa', 'Din', 'Woe', 'Don', 'Vri', 'Zat'].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-700 py-1.5 sm:py-2 text-xs sm:text-sm">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}

            {getMonthCalendarDates().map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[90px] sm:min-h-[130px] border border-transparent p-1 sm:p-2"
                  />
                );
              }

              const daySchedules = getSchedulesForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const hasSelectedEmployee = selectedEmployeeId && daySchedules.some(s => s.employee_id === selectedEmployeeId);
              const employeeNames = daySchedules
                .map(s => s.employee_id ? s.employee_name : 'OPEN')
                .filter((name, index, self) => self.indexOf(name) === index);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[90px] sm:min-h-[130px] border rounded-lg p-1 sm:p-2 cursor-pointer hover:shadow-md active:shadow-lg transition ${
                    isToday
                      ? 'border-red-500 bg-red-50'
                      : hasSelectedEmployee
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className={`text-xs sm:text-sm font-semibold ${
                      isToday
                        ? 'text-red-700'
                        : hasSelectedEmployee
                          ? 'text-blue-700'
                          : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </p>
                    {daySchedules.length > 0 && (
                      <span className={`text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        hasSelectedEmployee
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    {profile?.role === 'manager' ? (
                      <>
                        {daySchedules.slice(0, 5).map((schedule) => {
                          const isHighlightedEmployee = selectedEmployeeId && schedule.employee_id === selectedEmployeeId;
                          const isOpenShift = !schedule.employee_id;
                          return (
                            <div
                              key={schedule.id}
                              className={`text-[9px] sm:text-xs px-1 py-0.5 rounded truncate font-medium ${
                                isHighlightedEmployee
                                  ? 'bg-blue-200 text-blue-900 ring-1 ring-blue-400'
                                  : isOpenShift
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                              title={schedule.employee_name || 'OPEN'}
                            >
                              {isOpenShift ? 'OPEN' : (schedule.employee_name || 'Unknown')}
                            </div>
                          );
                        })}
                        {daySchedules.length > 5 && (
                          <p className="text-[9px] sm:text-xs text-gray-500 font-medium px-1">
                            +{daySchedules.length - 5} meer
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {daySchedules.slice(0, 4).map((schedule) => {
                          const isOpenShift = !schedule.employee_id;
                          const isSelected = selectedShifts.has(schedule.id);
                          const isHighlightedEmployee = selectedEmployeeId && schedule.employee_id === selectedEmployeeId;
                          return (
                            <div
                              key={schedule.id}
                              onClick={(e) => {
                                if (bulkDeleteMode && profile?.role === 'manager') {
                                  e.stopPropagation();
                                  toggleShiftSelection(schedule.id);
                                } else if (profile?.role === 'employee' && isOpenShift) {
                                  e.stopPropagation();
                                  handleClaimShift(schedule.id);
                                }
                              }}
                              className={`text-xs p-0.5 sm:p-1 rounded ${
                                isHighlightedEmployee
                                  ? 'bg-blue-200 text-blue-900 border-l-4 border-blue-500 ring-1 ring-blue-400'
                                  : isOpenShift
                                    ? openShiftColor
                                    : shiftRoleColors[schedule.shift_role]
                              } ${
                                isSelected ? 'ring-2 ring-red-500' : ''
                              } ${
                                (profile?.role === 'employee' && isOpenShift) || (bulkDeleteMode && profile?.role === 'manager')
                                  ? 'hover:ring-1 hover:ring-red-500 active:ring-1 active:ring-red-600 cursor-pointer'
                                  : ''
                              }`}
                              title={isOpenShift ? 'Open Shift' : schedule.shift_role.charAt(0).toUpperCase() + schedule.shift_role.slice(1)}
                            >
                              <p className="font-medium truncate text-[10px] sm:text-xs">
                                {isOpenShift ? 'OPEN' : (schedule.employee_name || 'Unknown')}
                              </p>
                              <p className="truncate text-[9px] sm:text-xs hidden sm:block">
                                {formatTime(schedule.start_time)}
                              </p>
                            </div>
                          );
                        })}
                        {daySchedules.length > 4 && (
                          <p className="text-[9px] sm:text-xs text-gray-500 font-medium">+{daySchedules.length - 4} meer</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-purple-100 border-2 border-purple-300"></div>
            <span className="text-xs sm:text-sm text-gray-700">Keuken</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
            <span className="text-xs sm:text-sm text-gray-700">Bezorging</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-cyan-100 border-2 border-cyan-300"></div>
            <span className="text-xs sm:text-sm text-gray-700">Kassa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-100 border-2 border-red-300"></div>
            <span className="text-xs sm:text-sm text-gray-700">Manager</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-100 border-2 border-amber-400"></div>
            <span className="text-xs sm:text-sm text-gray-700 font-semibold">Open Dienst</span>
          </div>
        </div>
      </div>

      {selectedDayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedDayModal.date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </h3>
                  <p className="text-red-100 mt-1">
                    {selectedDayModal.date.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayModal(null)}
                  className="p-2 hover:bg-red-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedDayModal.schedules.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedDayModal.schedules.length} {selectedDayModal.schedules.length === 1 ? 'Medewerker' : 'Medewerkers'} Ingepland
                    </p>
                  </div>

                  {selectedDayModal.schedules.map((schedule) => {
                    const isOpenShift = !schedule.employee_id;
                    return (
                      <div
                        key={schedule.id}
                        className={`p-4 rounded-xl border-l-4 ${
                          isOpenShift ? openShiftColor : shiftRoleColors[schedule.shift_role]
                        } shadow-sm`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {isOpenShift ? (
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4" />
                                <p className="font-bold text-base text-amber-900">OPEN DIENST</p>
                              </div>
                            ) : (
                              schedule.employee_name && (
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4" />
                                  <p className="font-bold text-base">{schedule.employee_name}</p>
                                </div>
                              )
                            )}

                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-white rounded-lg text-sm font-semibold capitalize shadow-sm">
                                {schedule.shift_role}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </span>
                            </div>

                            {schedule.notes && (
                              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold">Notities:</span> {schedule.notes}
                                </p>
                              </div>
                            )}

                            {isOpenShift && profile?.role === 'employee' && (
                              <button
                                onClick={() => handleClaimShift(schedule.id)}
                                className="mt-3 w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
                              >
                                Claim Deze Dienst
                              </button>
                            )}

                            {profile?.role === 'manager' && (
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                              >
                                Dienst Wijzigen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Geen medewerkers ingepland</p>
                  <p className="text-gray-400 text-sm mt-2">Er zijn nog geen diensten toegewezen voor deze dag</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedDayModal(null)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Rooster Wijzigen</h3>
                  <p className="text-red-100 mt-1">Dienstgegevens bijwerken</p>
                </div>
                <button
                  onClick={() => setEditingSchedule(null)}
                  className="p-2 hover:bg-red-600 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSchedule} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medewerker
                  </label>
                  <select
                    value={editingSchedule.employee_id || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, employee_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Open Dienst (Geen medewerker toegewezen)</option>
                    {employees.filter(emp => emp.is_active).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={editingSchedule.date}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starttijd
                    </label>
                    <input
                      type="time"
                      value={editingSchedule.start_time}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Eindtijd
                    </label>
                    <input
                      type="time"
                      value={editingSchedule.end_time}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol
                  </label>
                  <select
                    value={editingSchedule.shift_role}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, shift_role: e.target.value as 'kitchen' | 'delivery' | 'cashier' | 'manager' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="kitchen">Keuken</option>
                    <option value="delivery">Bezorging</option>
                    <option value="cashier">Kassa</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notities
                  </label>
                  <textarea
                    value={editingSchedule.notes || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Eventuele extra notities..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  disabled={saving}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verwijderen
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
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
