// Manager Dashboard - Overview and Compliance Tracking

class ManagerDashboard {
    constructor() {
        this.checklists = [];
    }

    init() {
        this.loadData();
        this.render();
    }

    loadData() {
        this.checklists = window.PAPRIKA_DATA.todayChecklists;
    }

    calculateStats() {
        const total = this.checklists.length;
        const completed = this.checklists.filter(c => c.status === 'complete').length;
        const pending = this.checklists.filter(c => c.status === 'pending').length;
        const incomplete = total - completed - pending;

        return { total, completed, pending, incomplete };
    }

    render() {
        this.renderStats();
        this.renderTable();
    }

    renderStats() {
        const stats = this.calculateStats();

        document.getElementById('totalChecklists').textContent = stats.total;
        document.getElementById('completedChecklists').textContent = stats.completed;
        document.getElementById('pendingChecklists').textContent = stats.pending;
        document.getElementById('incompleteChecklists').textContent = stats.incomplete;
    }

    renderTable() {
        const tableBody = document.querySelector('#managerTable tbody');

        // Group checklists by location for better organization
        const sortedChecklists = [...this.checklists].sort((a, b) => {
            if (a.locationId !== b.locationId) {
                return a.locationId.localeCompare(b.locationId);
            }
            return a.employeeName.localeCompare(b.employeeName);
        });

        tableBody.innerHTML = sortedChecklists.map(checklist => {
            const statusClass = this.getStatusClass(checklist);
            const statusText = this.getStatusText(checklist);

            return `
        <tr style="cursor: pointer;" onclick="managerDashboard.viewChecklistDetails('${checklist.id}')">
          <td><strong>${checklist.locationName}</strong></td>
          <td>${checklist.employeeName}</td>
          <td>${checklist.template.title}</td>
          <td>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <div style="flex: 1; height: 8px; background: var(--gray-200); border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${checklist.progress}%; background: linear-gradient(90deg, var(--paprika-red), var(--paprika-red-light)); transition: width 0.3s;"></div>
              </div>
              <span style="font-weight: 600; min-width: 45px;">${checklist.progress}%</span>
            </div>
          </td>
          <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </td>
          <td style="color: var(--gray-600); font-size: var(--font-size-sm);">
            ${this.formatTime(checklist.lastUpdated)}
          </td>
        </tr>
      `;
        }).join('');
    }

    getStatusClass(checklist) {
        if (checklist.status === 'complete') return 'status-complete';
        if (checklist.progress > 0) return 'status-pending';
        return 'status-incomplete';
    }

    getStatusText(checklist) {
        if (checklist.status === 'complete') return 'Complete';
        if (checklist.progress > 0) return 'In Progress';
        return 'Not Started';
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    viewChecklistDetails(checklistId) {
        const checklist = this.checklists.find(c => c.id === checklistId);
        if (!checklist) return;

        // Create modal content
        const completedTasks = checklist.tasks.filter(t => t.completed).length;
        const taskDetails = checklist.tasks.map(task => `
      <div style="padding: var(--space-md); background: ${task.completed ? 'var(--status-green-light)' : 'var(--gray-50)'}; border-radius: var(--radius-md); margin-bottom: var(--space-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">${task.completed ? '✓' : '○'} ${task.title}</span>
          ${task.timestamp ? `<span style="font-size: var(--font-size-xs); color: var(--gray-600);">${this.formatTime(task.timestamp)}</span>` : ''}
        </div>
        ${task.value ? `<div style="margin-top: var(--space-sm); color: var(--gray-700); font-size: var(--font-size-sm);">Value: ${task.value} ${task.unit || ''}</div>` : ''}
      </div>
    `).join('');

        const modalHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="this.remove()">
        <div class="card glass-card" style="max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
          <div class="card-header">
            <div>
              <h3 class="card-title">${checklist.template.title}</h3>
              <p style="color: var(--gray-600); margin: 0;">${checklist.employeeName} • ${checklist.locationName}</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="this.closest('[style*=fixed]').remove()">✕ Close</button>
          </div>
          <div class="card-body">
            <div style="margin-bottom: var(--space-lg);">
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                <span style="font-weight: 600;">Progress</span>
                <span style="font-weight: 700; color: var(--paprika-red);">${completedTasks}/${checklist.tasks.length} tasks</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${checklist.progress}%"></div>
              </div>
            </div>
            <h4 style="margin-bottom: var(--space-md);">Task Details</h4>
            ${taskDetails}
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    refresh() {
        this.loadData();
        this.render();
    }
}

// Initialize manager dashboard
window.managerDashboard = new ManagerDashboard();
