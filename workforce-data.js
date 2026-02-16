// Workforce Management Demo Data
// Mock data for employee time tracking and manager approval system

// Employee Database
const EMPLOYEES = [
    { id: 1, name: 'Marko Petrović', role: 'Line Cook', pin: '1234', location: 'Knez Mihailova' },
    { id: 2, name: 'Ana Jovanović', role: 'Server', pin: '2345', location: 'Knez Mihailova' },
    { id: 3, name: 'Stefan Nikolić', role: 'Dishwasher', pin: '3456', location: 'Skadarlija' },
    { id: 4, name: 'Jelena Đorđević', role: 'Cashier', pin: '4567', location: 'Skadarlija' },
    { id: 5, name: 'Nikola Stojanović', role: 'Kitchen Manager', pin: '5678', location: 'Zemun' },
    { id: 6, name: 'Milica Pavlović', role: 'Server', pin: '6789', location: 'Zemun' },
    { id: 7, name: 'Dušan Ilić', role: 'Line Cook', pin: '7890', location: 'Production' }
];

// Generate shift history for last 3 months
function generateShiftHistory() {
    const shifts = [];
    const today = new Date('2026-02-12');

    // Generate 3 months of historical data
    for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);

        // Skip some days randomly (employees don't work every day)
        if (Math.random() > 0.7) continue;

        EMPLOYEES.forEach(employee => {
            // Each employee works ~5 days per week
            if (Math.random() > 0.7) return;

            const clockIn = new Date(date);
            clockIn.setHours(8 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));

            const clockOut = new Date(clockIn);
            const hoursWorked = 6 + Math.random() * 4; // 6-10 hours
            clockOut.setHours(clockIn.getHours() + Math.floor(hoursWorked), clockIn.getMinutes() + Math.floor((hoursWorked % 1) * 60));

            shifts.push({
                id: `shift-${shifts.length + 1}`,
                employeeId: employee.id,
                employeeName: employee.name,
                date: date.toISOString().split('T')[0],
                clockIn: clockIn.toTimeString().slice(0, 5),
                clockOut: clockOut.toTimeString().slice(0, 5),
                totalHours: parseFloat(hoursWorked.toFixed(2)),
                approved: daysAgo > 1, // All past shifts are approved
                approvedBy: daysAgo > 1 ? 'System' : null,
                approvedAt: daysAgo > 1 ? date.toISOString() : null
            });
        });
    }

    return shifts;
}

// Today's shifts with edge cases
const TODAY_SHIFTS = [
    {
        id: 'shift-today-1',
        employeeId: 1,
        employeeName: 'Marko Petrović',
        date: '2026-02-12',
        clockIn: '08:00',
        clockOut: '17:30', // 9.5 hours - OVERTIME
        totalHours: 9.5,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        flags: ['overtime']
    },
    {
        id: 'shift-today-2',
        employeeId: 2,
        employeeName: 'Ana Jovanović',
        date: '2026-02-12',
        clockIn: '09:00',
        clockOut: null, // MISSING CLOCK-OUT
        totalHours: null,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        flags: ['missing-clockout']
    },
    {
        id: 'shift-today-3',
        employeeId: 3,
        employeeName: 'Stefan Nikolić',
        date: '2026-02-12',
        clockIn: '10:00',
        clockOut: '13:00', // 3 hours - SHORT SHIFT
        totalHours: 3.0,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        flags: ['short-shift']
    },
    {
        id: 'shift-today-4',
        employeeId: 4,
        employeeName: 'Jelena Đorđević',
        date: '2026-02-12',
        clockIn: '08:30',
        clockOut: '16:30',
        totalHours: 8.0,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        flags: []
    },
    {
        id: 'shift-today-5',
        employeeId: 5,
        employeeName: 'Nikola Stojanović',
        date: '2026-02-12',
        clockIn: '07:00',
        clockOut: '15:00',
        totalHours: 8.0,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        flags: []
    }
];

// Current clock-in status (for time clock screen)
const CLOCK_STATUS = {
    1: { clockedIn: false, lastAction: null },
    2: { clockedIn: true, lastAction: '09:00' },
    3: { clockedIn: false, lastAction: '13:00' },
    4: { clockedIn: false, lastAction: '16:30' },
    5: { clockedIn: false, lastAction: '15:00' },
    6: { clockedIn: false, lastAction: null },
    7: { clockedIn: false, lastAction: null }
};

// Calculate hours worked this week
function getWeeklyHours(employeeId) {
    const today = new Date('2026-02-12');
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const weekShifts = SHIFT_HISTORY.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shift.employeeId === employeeId && shiftDate >= weekStart && shiftDate <= today;
    });

    return weekShifts.reduce((total, shift) => total + (shift.totalHours || 0), 0);
}

// Calculate total hours last 3 months
function getThreeMonthHours(employeeId) {
    return SHIFT_HISTORY
        .filter(shift => shift.employeeId === employeeId)
        .reduce((total, shift) => total + (shift.totalHours || 0), 0);
}

// Get recent shifts for employee profile
function getRecentShifts(employeeId, limit = 10) {
    return SHIFT_HISTORY
        .filter(shift => shift.employeeId === employeeId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

// Initialize shift history
const SHIFT_HISTORY = generateShiftHistory();

// Export data
window.WORKFORCE_DATA = {
    employees: EMPLOYEES,
    shiftHistory: SHIFT_HISTORY,
    todayShifts: TODAY_SHIFTS,
    clockStatus: CLOCK_STATUS,
    getWeeklyHours,
    getThreeMonthHours,
    getRecentShifts
};
