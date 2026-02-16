import { ReactNode, useState } from 'react';
import { Calendar, Info, AlertCircle, LogOut, Menu, X, DollarSign, Wallet } from 'lucide-react';
import PaprikaIcon from './PaprikaIcon';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../types/database';
import EmployeeHeaderWidget from './EmployeeHeaderWidget';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  profile?: Profile | null;
}

export default function Layout({ children, currentPage, onNavigate, profile: profileProp }: LayoutProps) {
  const { profile: authProfile, signOut } = useAuth();
  const profile = profileProp || authProfile;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseNavItems = [
    { id: 'schedule', label: 'Mijn Rooster', icon: Calendar },
    { id: 'earnings', label: 'Mijn Verdiensten', icon: Wallet },
    { id: 'info', label: 'Winkel Info', icon: Info },
    { id: 'complaints', label: 'Klachten', icon: AlertCircle },
  ];

  const managerNavItems = [
    { id: 'schedule', label: 'Mijn Rooster', icon: Calendar },
    { id: 'payroll', label: 'Salarisadministratie', icon: DollarSign },
    { id: 'info', label: 'Winkel Info', icon: Info },
    { id: 'complaints', label: 'Klachten', icon: AlertCircle },
  ];

  const navItems = profile?.role === 'manager' ? managerNavItems : baseNavItems;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-red-600 p-1.5 sm:p-2 rounded-lg">
                <PaprikaIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Paprika</h1>
                <p className="text-[10px] sm:text-xs text-gray-500">Dashboard</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      currentPage === item.id
                        ? 'bg-red-50 text-red-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Uitloggen</span>
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition active:bg-gray-200"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-3 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition active:scale-98 ${
                      currentPage === item.id
                        ? 'bg-red-50 text-red-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-2 border-t border-gray-200">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Uitloggen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {profile && <EmployeeHeaderWidget profile={profile} />}
        {children}
      </main>
    </div>
  );
}
