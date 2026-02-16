// Event Scheduler - Manage Cleaning Days, Meetings, and Inspections

class EventScheduler {
    constructor() {
        this.events = [];
    }

    init() {
        this.loadData();
        this.render();
        this.attachEventListeners();
    }

    loadData() {
        this.events = window.PAPRIKA_DATA.events;
    }

    render() {
        this.renderUpcomingEvents();
    }

    renderUpcomingEvents() {
        const container = document.getElementById('upcomingEvents');

        // Sort events by date
        const sortedEvents = [...this.events].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        if (sortedEvents.length === 0) {
            container.innerHTML = `
        <div style="padding: var(--space-xl); text-align: center; color: var(--gray-500);">
          <div style="font-size: var(--font-size-3xl); margin-bottom: var(--space-md);">📅</div>
          <p>No upcoming events scheduled</p>
        </div>
      `;
            return;
        }

        container.innerHTML = sortedEvents.map(event => {
            const daysUntil = this.getDaysUntil(event.date);
            const eventIcon = this.getEventIcon(event.type);

            return `
        <div style="padding: var(--space-lg); background: var(--gray-50); border-radius: var(--radius-lg); margin-bottom: var(--space-md); border-left: 4px solid var(--paprika-red);">
          <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md);">
            <div style="font-size: var(--font-size-2xl);">${eventIcon}</div>
            <div style="flex: 1;">
              <h4 style="margin-bottom: var(--space-xs);">${event.title}</h4>
              <div style="font-size: var(--font-size-sm); color: var(--gray-600);">
                ${this.formatDate(event.date)} at ${event.time} • ${event.locationName}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: var(--font-size-xl); font-weight: 700; color: var(--paprika-red);">${daysUntil}</div>
              <div style="font-size: var(--font-size-xs); color: var(--gray-600);">days</div>
            </div>
          </div>
          
          <p style="color: var(--gray-700); font-size: var(--font-size-sm); margin-bottom: var(--space-md);">
            ${event.description}
          </p>
          
          <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
            <span style="padding: var(--space-xs) var(--space-sm); background: var(--paprika-white); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--gray-600);">
              🔔 Reminders: ${event.reminders.length}
            </span>
            <span style="padding: var(--space-xs) var(--space-sm); background: var(--paprika-white); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--gray-600);">
              ${this.getEventTypeLabel(event.type)}
            </span>
          </div>
        </div>
      `;
        }).join('');
    }

    getEventIcon(type) {
        const icons = {
            'cleaning': '🧹',
            'meeting': '👥',
            'inspection': '📋',
            'custom': '📌'
        };
        return icons[type] || '📅';
    }

    getEventTypeLabel(type) {
        const labels = {
            'cleaning': 'General Cleaning',
            'meeting': 'Staff Meeting',
            'inspection': 'Inspection',
            'custom': 'Custom Event'
        };
        return labels[type] || type;
    }

    getDaysUntil(dateString) {
        const eventDate = new Date(dateString);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    attachEventListeners() {
        const form = document.getElementById('newEventForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createEvent();
            });
        }
    }

    createEvent() {
        const type = document.getElementById('eventType').value;
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value;
        const description = document.getElementById('eventDescription').value;

        if (!title || !date || !time) {
            alert('Please fill in all required fields');
            return;
        }

        // Calculate reminder dates (7, 3, 1 days before)
        const eventDate = new Date(date);
        const reminders = [7, 3, 1].map(days => {
            const reminderDate = new Date(eventDate);
            reminderDate.setDate(reminderDate.getDate() - days);
            return reminderDate.toISOString().split('T')[0];
        });

        const newEvent = {
            id: `event-${Date.now()}`,
            type,
            title,
            date,
            time,
            location,
            locationName: location === 'all' ? 'All Locations' : window.PAPRIKA_DATA.locations[location].name,
            description,
            reminders
        };

        this.events.push(newEvent);
        window.PAPRIKA_DATA.events.push(newEvent);

        // Show success message
        this.showSuccessMessage('Event created successfully! Reminders will be sent 7, 3, and 1 day before.');

        // Reset form
        document.getElementById('newEventForm').reset();

        // Re-render
        this.render();
    }

    showSuccessMessage(message) {
        const successHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: var(--status-green); color: white; padding: var(--space-lg); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); z-index: 1000; animation: slideIn 0.3s ease-out;">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <span style="font-size: var(--font-size-2xl);">✓</span>
          <span style="font-weight: 600;">${message}</span>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', successHTML);

        setTimeout(() => {
            const notification = document.body.lastElementChild;
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    refresh() {
        this.loadData();
        this.render();
    }
}

// Initialize event scheduler
window.eventScheduler = new EventScheduler();
