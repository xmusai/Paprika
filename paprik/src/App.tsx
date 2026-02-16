import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Schedule from './components/Schedule';
import StoreInfo from './components/StoreInfo';
import Complaints from './components/Complaints';
import ManagerDashboard from './components/ManagerDashboard';
import Payroll from './components/Payroll';
import EmployeeEarnings from './components/EmployeeEarnings';

function DashboardContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('schedule');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading profile...</div>
      </div>
    );
  }

  const renderPage = () => {
    if (profile.role === 'manager' && currentPage === 'schedule') {
      return (
        <>
          <ManagerDashboard />
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">All Schedules</h3>
            <Schedule />
          </div>
        </>
      );
    }

    switch (currentPage) {
      case 'schedule':
        return <Schedule />;
      case 'earnings':
        return profile.role === 'employee' ? <EmployeeEarnings /> : <Schedule />;
      case 'payroll':
        return profile.role === 'manager' ? <Payroll /> : <Schedule />;
      case 'info':
        return <StoreInfo />;
      case 'complaints':
        return <Complaints />;
      default:
        return <Schedule />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage} profile={profile}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
