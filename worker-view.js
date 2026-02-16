// Worker View - Daily Checklist Interface

class WorkerView {
    constructor() {
        this.currentEmployee = 'emp-1'; // Default to Marko Petrović
        this.checklists = [];
    }

    init() {
        this.loadChecklists();
        this.render();
        this.attachEventListeners();
    }

    loadChecklists() {
        // Get checklists for current employee
        this.checklists = window.PAPRIKA_DATA.todayChecklists.filter(
            checklist => checklist.employeeId === this.currentEmployee
        );
    }

    calculateProgress() {
        if (this.checklists.length === 0) return 0;

        let totalTasks = 0;
        let completedTasks = 0;

        this.checklists.forEach(checklist => {
            checklist.tasks.forEach(task => {
                totalTasks++;
                if (task.completed) completedTasks++;
            });
        });

        return Math.round((completedTasks / totalTasks) * 100);
    }

    render() {
        const checklistContainer = document.getElementById('workerChecklist');
        const progress = this.calculateProgress();

        // Update progress bar
        document.getElementById('workerProgress').textContent = `${progress}%`;
        document.getElementById('workerProgressBar').style.width = `${progress}%`;

        // Render checklists
        checklistContainer.innerHTML = this.checklists.map(checklist => `
      <li class="checklist-item ${checklist.status === 'complete' ? 'completed' : ''}" data-checklist-id="${checklist.id}">
        <div class="checklist-item-header">
          <h3 class="checklist-item-title">${checklist.template.title}</h3>
          <span class="status-badge status-${checklist.status === 'complete' ? 'complete' : 'pending'}">
            ${checklist.status === 'complete' ? 'Complete' : 'In Progress'}
          </span>
        </div>
        <div class="checklist-item-body">
          ${this.renderTasks(checklist)}
        </div>
        <div class="checklist-item-meta">
          <span>📍 ${checklist.locationName}</span>
          <span>🕐 Last updated: ${this.formatTime(checklist.lastUpdated)}</span>
          <span>✓ ${this.getCompletedTaskCount(checklist)}/${checklist.tasks.length} tasks</span>
        </div>
      </li>
    `).join('');
    }

    renderTasks(checklist) {
        return checklist.tasks.map(task => {
            switch (task.type) {
                case 'checkbox':
                    return `
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: var(--space-md); cursor: pointer;">
                <input 
                  type="checkbox" 
                  class="form-checkbox task-input" 
                  data-checklist-id="${checklist.id}"
                  data-task-id="${task.id}"
                  ${task.completed ? 'checked' : ''}
                >
                <span style="flex: 1; ${task.completed ? 'text-decoration: line-through; color: var(--gray-500);' : ''}">${task.title}</span>
                ${task.timestamp ? `<span style="font-size: var(--font-size-xs); color: var(--gray-500);">${this.formatTime(task.timestamp)}</span>` : ''}
              </label>
            </div>
          `;

                case 'number':
                    return `
            <div class="form-group">
              <label class="form-label">${task.title}</label>
              <div style="display: flex; gap: var(--space-sm);">
                <input 
                  type="number" 
                  class="form-input task-input" 
                  data-checklist-id="${checklist.id}"
                  data-task-id="${task.id}"
                  value="${task.value || ''}"
                  placeholder="Enter ${task.unit || 'value'}"
                  style="flex: 1;"
                >
                ${task.unit ? `<span style="padding: var(--space-md); background: var(--gray-100); border-radius: var(--radius-md); font-weight: 600;">${task.unit}</span>` : ''}
              </div>
              ${task.timestamp ? `<small style="color: var(--gray-500);">Recorded at ${this.formatTime(task.timestamp)}</small>` : ''}
            </div>
          `;

                case 'text':
                    return `
            <div class="form-group">
              <label class="form-label">${task.title}</label>
              <textarea 
                class="form-textarea task-input" 
                data-checklist-id="${checklist.id}"
                data-task-id="${task.id}"
                rows="2"
                placeholder="Enter notes..."
              >${task.value || ''}</textarea>
              ${task.timestamp ? `<small style="color: var(--gray-500);">Updated at ${this.formatTime(task.timestamp)}</small>` : ''}
            </div>
          `;

                case 'photo':
                    return `
            <div class="form-group">
              <label class="form-label">${task.title}</label>
              <div style="display: flex; gap: var(--space-md); align-items: center;">
                <input 
                  type="file" 
                  accept="image/*" 
                  class="form-input task-input" 
                  data-checklist-id="${checklist.id}"
                  data-task-id="${task.id}"
                  style="flex: 1;"
                >
                <button class="btn btn-secondary btn-sm" onclick="alert('📸 Camera feature would open here in production')">
                  📷 Take Photo
                </button>
              </div>
              ${task.completed ? `<div style="margin-top: var(--space-sm); padding: var(--space-md); background: var(--status-green-light); border-radius: var(--radius-md); color: var(--status-green); font-size: var(--font-size-sm);">✓ Photo uploaded at ${this.formatTime(task.timestamp)}</div>` : ''}
            </div>
          `;

                default:
                    return '';
            }
        }).join('');
    }

    getCompletedTaskCount(checklist) {
        return checklist.tasks.filter(task => task.completed).length;
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    attachEventListeners() {
        // Listen for task input changes
        document.getElementById('workerChecklist').addEventListener('change', (e) => {
            if (e.target.classList.contains('task-input')) {
                this.handleTaskUpdate(e.target);
            }
        });

        // Listen for text input changes (debounced)
        let textInputTimeout;
        document.getElementById('workerChecklist').addEventListener('input', (e) => {
            if (e.target.classList.contains('task-input') && e.target.tagName === 'TEXTAREA') {
                clearTimeout(textInputTimeout);
                textInputTimeout = setTimeout(() => {
                    this.handleTaskUpdate(e.target);
                }, 500);
            }
        });
    }

    handleTaskUpdate(input) {
        const checklistId = input.dataset.checklistId;
        const taskId = input.dataset.taskId;

        // Find the checklist and task
        const checklist = this.checklists.find(c => c.id === checklistId);
        if (!checklist) return;

        const task = checklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Update task based on input type
        if (input.type === 'checkbox') {
            task.completed = input.checked;
            task.timestamp = new Date().toISOString();
        } else if (input.type === 'number') {
            task.value = input.value;
            task.completed = input.value !== '';
            task.timestamp = new Date().toISOString();
        } else if (input.type === 'file') {
            if (input.files.length > 0) {
                task.completed = true;
                task.timestamp = new Date().toISOString();
            }
        } else if (input.tagName === 'TEXTAREA') {
            task.value = input.value;
            task.completed = input.value.trim() !== '';
            task.timestamp = new Date().toISOString();
        }

        // Update checklist last updated time
        checklist.lastUpdated = new Date().toISOString();

        // Recalculate checklist status
        const completedTasks = checklist.tasks.filter(t => t.completed).length;
        checklist.status = completedTasks === checklist.tasks.length ? 'complete' : 'pending';
        checklist.progress = Math.round((completedTasks / checklist.tasks.length) * 100);

        // Re-render
        this.render();

        // Show success feedback
        this.showSuccessFeedback(input);
    }

    showSuccessFeedback(element) {
        const checklistItem = element.closest('.checklist-item');
        if (checklistItem) {
            checklistItem.style.transform = 'scale(1.02)';
            setTimeout(() => {
                checklistItem.style.transform = 'scale(1)';
            }, 200);
        }
    }

    updateEmployee(employeeId) {
        this.currentEmployee = employeeId;
        this.loadChecklists();
        this.render();
    }
}

// Initialize worker view
window.workerView = new WorkerView();
