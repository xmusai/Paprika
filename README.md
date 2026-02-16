# 🌶️ Paprika Checklist Engine

A modern, interactive demo application for managing daily checklists across Paprikafood's restaurant locations and production facility.

## 🚀 Quick Start

Simply open `index.html` in any modern web browser. No build process or dependencies required!

```bash
open index.html
```

## 📋 Features

### For Workers
- **Daily Checklists**: Interactive task lists with checkboxes, number inputs, and photo uploads
- **Real-time Progress**: Live progress bar showing completion percentage
- **Auto-timestamps**: Automatic recording of completion times
- **GPS Location**: Simulated location capture for accountability

### For Team Leaders & Managers
- **Compliance Dashboard**: Real-time overview of all locations and employees
- **Status Indicators**: Color-coded badges (green/yellow/red) for quick assessment
- **Drill-down Details**: Click any checklist to view individual task completion
- **Export Reports**: Generate compliance reports (UI mockup)

### Oil Change Management
- **Automated Rotation**: 7-day interval tracking per fryer
- **Smart Assignment**: Automatically assigns to first-shift workers
- **Change History**: Complete audit trail with employee names and dates
- **Overdue Alerts**: Visual warnings for late oil changes

### Event Scheduling
- **Event Creation**: Plan cleaning days, meetings, and inspections
- **Automated Reminders**: Notifications sent at 7, 3, and 1 day before
- **Location Targeting**: Send to specific locations or all staff
- **Calendar View**: Upcoming events with countdown display

### Smart Notifications
- **Shift Reminders**: Alert workers 1 hour before shift end
- **Daily Summaries**: End-of-day reports to managers
- **Oil Change Alerts**: 24-hour advance notice to assigned workers
- **Event Reminders**: Multi-stage notification schedule

## 🎨 Design

Built with Paprika's signature brand colors:
- **Primary Red**: #E31E24
- **Secondary Red**: #C41E3A
- **Modern Typography**: Inter font family
- **Glassmorphism**: Premium card effects
- **Smooth Animations**: Polished user experience

## 📁 Project Structure

```
Paprika/
├── index.html              # Main application
├── styles.css              # Design system
├── data.js                 # Demo data
├── app.js                  # Main controller
├── worker-view.js          # Worker interface
├── manager-dashboard.js    # Manager tools
├── oil-tracker.js          # Oil change system
├── event-scheduler.js      # Event management
└── notifications.js        # Notification system
```

## 🎯 Demo Data

- **4 Locations**: Knez Mihailova, Skadarlija, Zemun, Production Facility
- **10 Employees**: Workers, Team Leaders, and Managers
- **30 Daily Checklists**: Cleaning, fridge temps, drink counts, oil changes
- **12 Fryers**: Tracked across all locations
- **3 Upcoming Events**: With automated reminders

## 🔄 Role Switching

Use the sidebar selectors to demo different perspectives:
- **Worker**: Marko Petrović (Location 1)
- **Team Leader**: Ana Jovanović (Location 1)
- **General Manager**: Full system access

## 🌐 Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## 📝 Notes

This is a **frontend demo** with simulated data. No backend integration - all data is stored in JavaScript for demonstration purposes.

## 🎬 See It In Action

Check out the [walkthrough documentation](file:///Users/andres/.gemini/antigravity/brain/8904c8d4-0b51-41f8-9449-85b315fcaf53/walkthrough.md) for screenshots and detailed feature explanations.

---

Built with ❤️ for Paprikafood Belgrade
