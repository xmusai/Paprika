// Demo Data for Paprikafood Checklist Engine

// Locations
const LOCATIONS = {
  'location-1': {
    id: 'location-1',
    name: 'Knez Mihailova',
    type: 'restaurant',
    fryers: 4
  },
  'location-2': {
    id: 'location-2',
    name: 'Skadarlija',
    type: 'restaurant',
    fryers: 3
  },
  'location-3': {
    id: 'location-3',
    name: 'Zemun',
    type: 'restaurant',
    fryers: 3
  },
  'production': {
    id: 'production',
    name: 'Production Facility',
    type: 'production',
    fryers: 2
  }
};

// Employees
const EMPLOYEES = [
  { id: 'emp-1', name: 'Marko Petrović', role: 'worker', location: 'location-1', shift: '08:00-16:00' },
  { id: 'emp-2', name: 'Ana Jovanović', role: 'team-leader', location: 'location-1', shift: '08:00-16:00' },
  { id: 'emp-3', name: 'Stefan Nikolić', role: 'worker', location: 'location-1', shift: '16:00-00:00' },
  { id: 'emp-4', name: 'Jelena Đorđević', role: 'worker', location: 'location-2', shift: '08:00-16:00' },
  { id: 'emp-5', name: 'Milan Stojanović', role: 'team-leader', location: 'location-2', shift: '08:00-16:00' },
  { id: 'emp-6', name: 'Ivana Popović', role: 'worker', location: 'location-2', shift: '16:00-00:00' },
  { id: 'emp-7', name: 'Nikola Ilić', role: 'worker', location: 'location-3', shift: '08:00-16:00' },
  { id: 'emp-8', name: 'Maja Pavlović', role: 'team-leader', location: 'location-3', shift: '08:00-16:00' },
  { id: 'emp-9', name: 'Aleksandar Stanković', role: 'worker', location: 'location-3', shift: '16:00-00:00' },
  { id: 'emp-10', name: 'Teodora Milošević', role: 'worker', location: 'production', shift: '06:00-14:00' }
];

// Checklist Templates
const CHECKLIST_TEMPLATES = {
  'oil-change': {
    id: 'oil-change',
    title: 'Oil Change',
    frequency: 'weekly',
    tasks: [
      { id: 'task-1', title: 'Drain old oil completely', type: 'checkbox' },
      { id: 'task-2', title: 'Clean fryer basket and interior', type: 'checkbox' },
      { id: 'task-3', title: 'Add fresh oil (liters)', type: 'number', unit: 'L' },
      { id: 'task-4', title: 'Record oil temperature', type: 'number', unit: '°C' },
      { id: 'task-5', title: 'Photo of clean fryer', type: 'photo' },
      { id: 'task-6', title: 'Notes or issues', type: 'text' }
    ]
  },
  'cleaning': {
    id: 'cleaning',
    title: 'Daily Cleaning',
    frequency: 'daily',
    tasks: [
      { id: 'task-1', title: 'Sweep and mop floors', type: 'checkbox' },
      { id: 'task-2', title: 'Clean all surfaces', type: 'checkbox' },
      { id: 'task-3', title: 'Empty trash bins', type: 'checkbox' },
      { id: 'task-4', title: 'Clean restrooms', type: 'checkbox' },
      { id: 'task-5', title: 'Photo of cleaned area', type: 'photo' }
    ]
  },
  'fridge-temps': {
    id: 'fridge-temps',
    title: 'Fridge Temperature Check',
    frequency: 'daily',
    tasks: [
      { id: 'task-1', title: 'Walk-in cooler temp (°C)', type: 'number', unit: '°C' },
      { id: 'task-2', title: 'Prep fridge temp (°C)', type: 'number', unit: '°C' },
      { id: 'task-3', title: 'Freezer temp (°C)', type: 'number', unit: '°C' },
      { id: 'task-4', title: 'All temps within range (2-4°C)', type: 'checkbox' },
      { id: 'task-5', title: 'Issues or anomalies', type: 'text' }
    ]
  },
  'drink-count': {
    id: 'drink-count',
    title: 'Drink Inventory Count',
    frequency: 'daily',
    tasks: [
      { id: 'task-1', title: 'Coca-Cola cans remaining', type: 'number', unit: 'cans' },
      { id: 'task-2', title: 'Water bottles remaining', type: 'number', unit: 'bottles' },
      { id: 'task-3', title: 'Juice boxes remaining', type: 'number', unit: 'boxes' },
      { id: 'task-4', title: 'Restock needed?', type: 'checkbox' },
      { id: 'task-5', title: 'Notes', type: 'text' }
    ]
  }
};

// Generate today's checklists for all employees
function generateTodayChecklists() {
  const checklists = [];
  const today = new Date().toISOString().split('T')[0];
  
  EMPLOYEES.forEach(employee => {
    // Each worker gets cleaning, fridge temps, and drink count daily
    ['cleaning', 'fridge-temps', 'drink-count'].forEach(templateId => {
      checklists.push({
        id: `checklist-${employee.id}-${templateId}`,
        employeeId: employee.id,
        employeeName: employee.name,
        locationId: employee.location,
        locationName: LOCATIONS[employee.location].name,
        templateId: templateId,
        template: CHECKLIST_TEMPLATES[templateId],
        date: today,
        status: Math.random() > 0.3 ? 'pending' : 'complete',
        progress: Math.random() > 0.3 ? Math.floor(Math.random() * 80) : 100,
        lastUpdated: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        tasks: CHECKLIST_TEMPLATES[templateId].tasks.map(task => ({
          ...task,
          completed: Math.random() > 0.4,
          value: task.type === 'number' ? Math.floor(Math.random() * 50) : null,
          timestamp: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null
        }))
      });
    });
  });
  
  return checklists;
}

// Oil change history
const OIL_CHANGES = [
  {
    id: 'oil-1',
    locationId: 'location-1',
    fryerId: 'fryer-1',
    date: '2026-02-08',
    employeeId: 'emp-1',
    employeeName: 'Marko Petrović',
    nextDue: '2026-02-15'
  },
  {
    id: 'oil-2',
    locationId: 'location-1',
    fryerId: 'fryer-2',
    date: '2026-02-09',
    employeeId: 'emp-3',
    employeeName: 'Stefan Nikolić',
    nextDue: '2026-02-16'
  },
  {
    id: 'oil-3',
    locationId: 'location-2',
    fryerId: 'fryer-1',
    date: '2026-02-07',
    employeeId: 'emp-4',
    employeeName: 'Jelena Đorđević',
    nextDue: '2026-02-14'
  },
  {
    id: 'oil-4',
    locationId: 'location-3',
    fryerId: 'fryer-1',
    date: '2026-02-10',
    employeeId: 'emp-7',
    employeeName: 'Nikola Ilić',
    nextDue: '2026-02-17'
  }
];

// Upcoming events
const EVENTS = [
  {
    id: 'event-1',
    type: 'cleaning',
    title: 'Deep Kitchen Cleaning',
    date: '2026-02-22',
    time: '08:00',
    location: 'location-1',
    locationName: 'Knez Mihailova',
    description: 'Complete deep clean of kitchen area including walls, ceiling, and equipment',
    reminders: ['2026-02-15', '2026-02-19', '2026-02-21']
  },
  {
    id: 'event-2',
    type: 'meeting',
    title: 'Monthly Staff Meeting',
    date: '2026-02-28',
    time: '10:00',
    location: 'all',
    locationName: 'All Locations',
    description: 'Review performance metrics and discuss upcoming promotions',
    reminders: ['2026-02-21', '2026-02-25', '2026-02-27']
  },
  {
    id: 'event-3',
    type: 'inspection',
    title: 'Health & Safety Inspection',
    date: '2026-03-05',
    time: '14:00',
    location: 'location-2',
    locationName: 'Skadarlija',
    description: 'Annual health inspection by city authorities',
    reminders: ['2026-02-26', '2026-03-02', '2026-03-04']
  }
];

// Notifications
const NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'shift-reminder',
    title: '⏰ Shift Ending Soon',
    message: 'You have 1 hour left in your shift. Please complete remaining checklists.',
    recipient: 'emp-1',
    recipientName: 'Marko Petrović',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    type: 'oil-change',
    title: '🔥 Oil Change Due Tomorrow',
    message: 'You are scheduled for oil change at Location 1, Fryer 1 tomorrow at 08:00.',
    recipient: 'emp-1',
    recipientName: 'Marko Petrović',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true
  },
  {
    id: 'notif-3',
    type: 'event-reminder',
    title: '📅 Event in 7 Days',
    message: 'Deep Kitchen Cleaning scheduled for Feb 22 at Location 1.',
    recipient: 'all-location-1',
    recipientName: 'All Staff - Knez Mihailova',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: true
  },
  {
    id: 'notif-4',
    type: 'daily-summary',
    title: '📊 End of Day Summary',
    message: 'Location 1: 5/5 complete. Location 2: 4/5 complete (missing: Ivana Popović - Drink Count). Location 3: 5/5 complete.',
    recipient: 'manager',
    recipientName: 'General Manager',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    read: false
  }
];

// Export data
window.PAPRIKA_DATA = {
  locations: LOCATIONS,
  employees: EMPLOYEES,
  checklistTemplates: CHECKLIST_TEMPLATES,
  todayChecklists: generateTodayChecklists(),
  oilChanges: OIL_CHANGES,
  events: EVENTS,
  notifications: NOTIFICATIONS
};
