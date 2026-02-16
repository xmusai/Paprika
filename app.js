// Main Application Controller

class PaprikaApp {
    constructor() {
        this.currentView = 'worker';
        this.currentRole = 'worker';
        this.currentLocation = 'location-1';
    }

    init() {
        if (window.PAPRIKA_APP_INITIALIZED) {
            console.warn('⚠️ Paprika App already initialized, skipping...');
            return;
        }
        window.PAPRIKA_APP_INITIALIZED = true;

        console.log('🌶️ Paprika Checklist Engine initializing...');

        // Initialize all modules
        window.workerView.init();
        window.managerDashboard.init();
        window.oilTracker.init();
        window.eventScheduler.init();
        window.notificationSystem.init();

        // Setup navigation
        this.setupNavigation();

        // Setup mobile menu
        this.setupMobileMenu();

        // Setup role and location selectors
        this.setupSelectors();

        // Show initial view
        this.showView('worker');

        console.log('✅ Application ready!');
    }

    setupNavigation() {
        // Use a more inclusive selector to find nav items
        const navItems = document.querySelectorAll('.nav-item, [data-view]');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default if it's a link
                e.stopPropagation(); // Stop bubbling

                const view = item.dataset.view;
                if (view) {
                    this.showView(view);

                    // Update active state
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');

                    // Close mobile menu on selection
                    this.toggleMobileMenu(false);
                } else {
                    // Handle Home link or others
                    if (item.getAttribute('href') && item.getAttribute('href') !== '#') {
                        window.location.href = item.getAttribute('href');
                    }
                }
            });
        });
    }

    setupMobileMenu() {
        const menuBtn = document.getElementById('mobileMenuBtn');
        const overlay = document.getElementById('sidebarOverlay');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.toggleMobileMenu(true);
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                this.toggleMobileMenu(false);
            });
        }
    }

    toggleMobileMenu(show) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    setupSelectors() {
        const roleSelector = document.getElementById('roleSelector');
        const locationSelector = document.getElementById('locationSelector');

        roleSelector.addEventListener('change', (e) => {
            this.currentRole = e.target.value;
            this.handleRoleChange();
        });

        locationSelector.addEventListener('change', (e) => {
            this.currentLocation = e.target.value;
            this.handleLocationChange();
        });
    }

    handleRoleChange() {
        // Update employee based on role
        let employeeId = 'emp-1'; // Default worker

        if (this.currentRole === 'team-leader') {
            employeeId = 'emp-2'; // Ana Jovanović
        } else if (this.currentRole === 'manager') {
            employeeId = 'manager';
        }

        // Update worker view with new employee
        if (employeeId !== 'manager') {
            window.workerView.updateEmployee(employeeId);
        }

        // Refresh all views
        this.refreshAllViews();
    }

    handleLocationChange() {
        // In a real app, this would filter data by location
        // For demo, we just refresh the views
        this.refreshAllViews();
    }

    showView(viewName) {
        this.currentView = viewName;

        // Hide all views
        const views = document.querySelectorAll('.view-container');
        views.forEach(view => view.classList.add('hidden'));

        // Show selected view
        const viewMap = {
            'worker': 'workerView',
            'manager': 'managerView',
            'oil-tracker': 'oilTrackerView',
            'events': 'eventsView',
            'notifications': 'notificationsView'
        };

        const targetView = document.getElementById(viewMap[viewName]);
        if (targetView) {
            targetView.classList.remove('hidden');

            // Trigger fade-in animation
            const fadeElements = targetView.querySelectorAll('.fade-in');
            fadeElements.forEach(el => {
                el.style.animation = 'none';
                setTimeout(() => {
                    el.style.animation = 'fadeIn 0.3s ease-out';
                }, 10);
            });
        }
    }

    refreshAllViews() {
        window.workerView.render();
        window.managerDashboard.refresh();
        window.oilTracker.refresh();
        window.eventScheduler.refresh();
        window.notificationSystem.refresh();
    }

    // Simulate real-time updates (for demo purposes)
    startSimulation() {
        // Simulate checklist updates every 10 seconds
        setInterval(() => {
            const randomChecklist = window.PAPRIKA_DATA.todayChecklists[
                Math.floor(Math.random() * window.PAPRIKA_DATA.todayChecklists.length)
            ];

            if (randomChecklist && Math.random() > 0.7) {
                const incompleteTasks = randomChecklist.tasks.filter(t => !t.completed);
                if (incompleteTasks.length > 0) {
                    const randomTask = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
                    randomTask.completed = true;
                    randomTask.timestamp = new Date().toISOString();

                    this.refreshAllViews();
                }
            }
        }, 10000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new PaprikaApp();
    app.init();

    // Optional: Start simulation for demo
    // app.startSimulation();
});
