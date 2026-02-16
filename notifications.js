// Notifications - Smart Reminders and Summaries

class NotificationSystem {
    constructor() {
        this.notifications = [];
    }

    init() {
        this.loadData();
        this.render();
    }

    loadData() {
        this.notifications = window.PAPRIKA_DATA.notifications;
    }

    render() {
        this.renderNotificationsList();
    }

    renderNotificationsList() {
        const container = document.getElementById('notificationsList');

        // Sort by timestamp (newest first)
        const sortedNotifications = [...this.notifications].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        if (sortedNotifications.length === 0) {
            container.innerHTML = `
        <div style="padding: var(--space-xl); text-align: center; color: var(--gray-500);">
          <div style="font-size: var(--font-size-3xl); margin-bottom: var(--space-md);">🔔</div>
          <p>No notifications yet</p>
        </div>
      `;
            return;
        }

        container.innerHTML = sortedNotifications.map(notification => {
            const icon = this.getNotificationIcon(notification.type);
            const bgColor = notification.read ? 'var(--gray-50)' : 'var(--paprika-white)';
            const borderColor = notification.read ? 'var(--gray-300)' : 'var(--paprika-red)';

            return `
        <div style="padding: var(--space-lg); background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: var(--radius-lg); margin-bottom: var(--space-md); cursor: pointer; transition: all 0.2s;" onclick="notificationSystem.markAsRead('${notification.id}')">
          <div style="display: flex; gap: var(--space-md); align-items: start;">
            <div style="font-size: var(--font-size-2xl);">${icon}</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-sm);">
                <h4 style="margin: 0; font-size: var(--font-size-base);">${notification.title}</h4>
                ${!notification.read ? '<span style="width: 8px; height: 8px; background: var(--paprika-red); border-radius: 50%;"></span>' : ''}
              </div>
              <p style="color: var(--gray-700); font-size: var(--font-size-sm); margin-bottom: var(--space-sm);">
                ${notification.message}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: var(--font-size-xs); color: var(--gray-500);">
                  To: ${notification.recipientName}
                </span>
                <span style="font-size: var(--font-size-xs); color: var(--gray-500);">
                  ${this.formatTimestamp(notification.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
        }).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            'shift-reminder': '⏰',
            'oil-change': '🔥',
            'event-reminder': '📅',
            'daily-summary': '📊',
            'alert': '⚠️'
        };
        return icons[type] || '🔔';
    }

    formatTimestamp(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.render();
        }
    }

    // Simulate sending a notification
    sendNotification(type, title, message, recipient, recipientName) {
        const newNotification = {
            id: `notif-${Date.now()}`,
            type,
            title,
            message,
            recipient,
            recipientName,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(newNotification);
        window.PAPRIKA_DATA.notifications.unshift(newNotification);

        this.render();
        this.showToast(title);
    }

    showToast(message) {
        const toastHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; background: var(--paprika-red); color: white; padding: var(--space-lg); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); z-index: 1000; animation: slideIn 0.3s ease-out; max-width: 300px;">
        <div style="display: flex; align-items: center; gap: var(--space-md);">
          <span style="font-size: var(--font-size-xl);">🔔</span>
          <span style="font-weight: 600;">${message}</span>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', toastHTML);

        setTimeout(() => {
            const toast = document.body.lastElementChild;
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Simulate cron jobs
    simulateShiftEndReminder() {
        const now = new Date();
        const currentHour = now.getHours();

        // Check if it's 1 hour before common shift ends (15:00 for 16:00 shift)
        if (currentHour === 15) {
            const incompleteWorkers = window.PAPRIKA_DATA.todayChecklists
                .filter(c => c.status !== 'complete')
                .map(c => c.employeeName)
                .filter((name, index, self) => self.indexOf(name) === index);

            incompleteWorkers.forEach(workerName => {
                this.sendNotification(
                    'shift-reminder',
                    '⏰ Shift Ending Soon',
                    `You have 1 hour left in your shift. Please complete remaining checklists.`,
                    'worker',
                    workerName
                );
            });
        }
    }

    generateEndOfDaySummary() {
        const locations = window.PAPRIKA_DATA.locations;
        const checklists = window.PAPRIKA_DATA.todayChecklists;

        const summary = Object.values(locations).map(location => {
            const locationChecklists = checklists.filter(c => c.locationId === location.id);
            const completed = locationChecklists.filter(c => c.status === 'complete').length;
            const total = locationChecklists.length;

            const missing = locationChecklists
                .filter(c => c.status !== 'complete')
                .map(c => `${c.employeeName} - ${c.template.title}`)
                .join(', ');

            return `${location.name}: ${completed}/${total} complete${missing ? ` (missing: ${missing})` : ''}`;
        }).join('. ');

        return summary;
    }

    refresh() {
        this.loadData();
        this.render();
    }
}

// Initialize notification system
window.notificationSystem = new NotificationSystem();
