// Oil Change Tracker - Rotation and History Management

class OilTracker {
    constructor() {
        this.oilChanges = [];
        this.locations = {};
    }

    init() {
        this.loadData();
        this.render();
    }

    loadData() {
        this.oilChanges = window.PAPRIKA_DATA.oilChanges;
        this.locations = window.PAPRIKA_DATA.locations;
    }

    render() {
        this.renderFryerList();
    }

    renderFryerList() {
        const fryerList = document.getElementById('fryerList');

        // Group by location
        const locationGroups = {};
        Object.values(this.locations).forEach(location => {
            locationGroups[location.id] = {
                location,
                fryers: []
            };

            // Generate fryers for this location
            for (let i = 1; i <= location.fryers; i++) {
                const fryerId = `fryer-${i}`;
                const lastChange = this.oilChanges.find(
                    oc => oc.locationId === location.id && oc.fryerId === fryerId
                );

                locationGroups[location.id].fryers.push({
                    id: fryerId,
                    number: i,
                    lastChange: lastChange || null
                });
            }
        });

        fryerList.innerHTML = Object.values(locationGroups).map(group => `
      <div style="margin-bottom: var(--space-xl);">
        <h4 style="color: var(--paprika-red); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 2px solid var(--gray-200);">
          ${group.location.name}
        </h4>
        <div class="grid grid-2">
          ${group.fryers.map(fryer => this.renderFryerCard(fryer, group.location)).join('')}
        </div>
      </div>
    `).join('');
    }

    renderFryerCard(fryer, location) {
        const lastChange = fryer.lastChange;
        const daysAgo = lastChange ? this.getDaysAgo(lastChange.date) : null;
        const isOverdue = daysAgo && daysAgo > 7;
        const isDueSoon = daysAgo && daysAgo >= 6 && daysAgo <= 7;

        let statusColor = 'var(--status-green)';
        let statusBg = 'var(--status-green-light)';
        let statusText = 'Good';

        if (isOverdue) {
            statusColor = 'var(--status-red)';
            statusBg = 'var(--status-red-light)';
            statusText = 'Overdue';
        } else if (isDueSoon) {
            statusColor = 'var(--status-yellow)';
            statusBg = 'var(--status-yellow-light)';
            statusText = 'Due Soon';
        }

        return `
      <div style="padding: var(--space-lg); background: var(--gray-50); border-radius: var(--radius-lg); border-left: 4px solid ${statusColor};">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
          <div>
            <h5 style="font-size: var(--font-size-lg); margin-bottom: var(--space-xs);">Fryer ${fryer.number}</h5>
            <span style="font-size: var(--font-size-xs); color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.05em;">${location.name}</span>
          </div>
          <span style="padding: var(--space-xs) var(--space-sm); background: ${statusBg}; color: ${statusColor}; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 700;">${statusText}</span>
        </div>
        
        ${lastChange ? `
          <div style="margin-bottom: var(--space-sm);">
            <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Last Changed</div>
            <div style="font-weight: 600; color: var(--gray-900);">${this.formatDate(lastChange.date)} (${daysAgo} days ago)</div>
          </div>
          <div style="margin-bottom: var(--space-sm);">
            <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Changed By</div>
            <div style="font-weight: 600; color: var(--gray-900);">${lastChange.employeeName}</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Next Due</div>
            <div style="font-weight: 600; color: ${statusColor};">${this.formatDate(lastChange.nextDue)}</div>
          </div>
        ` : `
          <div style="padding: var(--space-md); background: var(--status-yellow-light); color: var(--status-yellow); border-radius: var(--radius-md); font-size: var(--font-size-sm); text-align: center;">
            No change history available
          </div>
        `}
      </div>
    `;
    }

    getDaysAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    getNextScheduledChange() {
        // Find the earliest next due date
        const nextChanges = this.oilChanges
            .map(oc => ({
                ...oc,
                nextDueDate: new Date(oc.nextDue)
            }))
            .sort((a, b) => a.nextDueDate - b.nextDueDate);

        return nextChanges[0] || null;
    }

    getAssignedWorker(locationId, date) {
        // In production, this would check the schedule
        // For demo, return first worker at that location
        const employees = window.PAPRIKA_DATA.employees.filter(
            emp => emp.location === locationId && emp.shift.startsWith('08:00')
        );
        return employees[0] || null;
    }

    refresh() {
        this.loadData();
        this.render();
    }
}

// Initialize oil tracker
window.oilTracker = new OilTracker();
