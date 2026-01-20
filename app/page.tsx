'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SideMenu from './components/SideMenu';
import Users from './components/Users';
import UserHeader from './components/UserHeader';
import Profile from './components/Profile';
import ProfileFormWrapper from './components/ProfileFormWrapper';
import Notifications from './components/Notifications';
import CombinedLatexEditor from './components/CombinedLatexEditor';
import toast from 'react-hot-toast';
import { User } from './types';
import { HiOutlineSparkles, HiOutlineCube } from 'react-icons/hi';
import { RoleBasedUi, ROLES } from './utils/permissions';
import dynamic from 'next/dynamic';
import AdminFileManagement from './components/AdminFileManagement';
import AIProcessGenerator from './components/AIProcessGenerator';
import SettingsView from './components/SettingsView';
import KPIDashboard from './components/KPIDashboard';
import Records from './components/Records';
import ReportDownloadButton from './components/ReportDownloadButton';
import DashboardCharts from './components/DashboardCharts';

// Import the BpmnEditor component dynamically to prevent SSR issues with browser APIs
const BpmnEditor = dynamic(() => import('./components/BpmnEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading BPMN Editor...</span>
    </div>
  ),
});

// Import the BpmnDashboard component
const BpmnDashboard = dynamic(() => import('./components/BpmnDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading BPMN Dashboard...</span>
    </div>
  ),
});

// Import the LaTeX Dashboard component
const LatexDashboard = dynamic(() => import('./components/LatexDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading LaTeX Dashboard...</span>
    </div>
  ),
});

// Dashboard Stats Component

const DashboardStats = ({ user }: { user: User | null }) => {
  const [stats, setStats] = useState({
    bpmnDiagrams: 0,
    latexDocuments: 0,
    kpiTracked: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">BPMN Diagrams</p>
            <p className="text-lg font-bold text-gray-900">{stats.bpmnDiagrams}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">LaTeX Documents</p>
            <p className="text-lg font-bold text-gray-900">{stats.latexDocuments}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">KPI Tracked</p>
            <p className="text-lg font-bold text-gray-900">{stats.kpiTracked}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Recent Activity</p>
            <p className="text-lg font-bold text-gray-900">{stats.recentActivity}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Only access browser APIs after component has mounted
  useEffect(() => {
    // Check if this is the first time loading the page after sign-in
    const isFirstLogin = sessionStorage.getItem('isFirstLogin');

    if (isFirstLogin === 'true') {
      // If it's first login, set view to dashboard and clear the flag
      setCurrentView('dashboard');
      sessionStorage.setItem('currentView', 'dashboard');
      sessionStorage.removeItem('isFirstLogin');
    } else {
      // Otherwise, get the stored view from sessionStorage
      const savedView = sessionStorage.getItem('currentView');
      if (savedView) {
        setCurrentView(savedView);
      } else {
        // Default to dashboard if no view is saved
        setCurrentView('dashboard');
        sessionStorage.setItem('currentView', 'dashboard');
      }
    }

    setMounted(true);
    setIsLoading(false);
  }, []);

  // Save current view to sessionStorage
  useEffect(() => {
    if (mounted) {
      sessionStorage.setItem('currentView', currentView);
    }
  }, [currentView, mounted]);

  useEffect(() => {
    // Check if user is authenticated and get user data
    if (mounted) {
      fetch('/api/auth/check', {
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) {
          router.push('/signin');
        } else {
          return res.json();
        }
      })
            .then((data) => {
           if (data && data.authenticated && data.user) {
             setUser(data.user);
            // If a regular user tries to access the users page, redirect to dashboard
            if (data.user.role === 'user' && currentView === 'users') {
              setCurrentView('latex');
              toast.error('You do not have permission to access the Users page');
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
        });
    }
  }, [router, mounted, currentView]);

  const handleNavigation = (view: string) => {
    // Check if user has permission to access this view
    if (view === 'users' && user?.role === 'user') {
      toast.error('You do not have permission to access the Users page');
      return;
    }

    if (view === 'admin-file-management' && user?.role !== 'admin') {
      toast.error('You do not have permission to access this page');
      return;
    }

    // Redirect admin users trying to access notifications
    if (view === 'notifications' && user?.role === 'admin') {
      toast.error('Notifications are only available for users and supervisors');
      // We still allow the view to be set so the message is shown
    }

    // Navigate to dedicated pages
    if (view === 'decision-engine') {
      router.push('/decision-engine');
      return;
    }

    // Collapse side menu when navigating to BPMN editor or LaTeX editor
    if (view === 'bpmn' || view === 'latex') {
      setIsCollapsed(true);
    }

    setCurrentView(view);

    // Reset editing mode when switching views
    if (view === 'profile') {
      setIsEditingProfile(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="w-64 bg-white border-r shrink-0"></div>
        <div className="flex-1 flex flex-col h-full">
          <div className="p-4 h-14"></div>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SideMenu
        isCollapsed={isCollapsed}
        onNavigate={handleNavigation}
        currentView={currentView}
        userRole={user?.role || 'user'}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
      />

      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between bg-white">
          <div className="p-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <UserHeader />
        </div>

        {currentView === 'latex' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <CombinedLatexEditor user={user} />
          </main>
        )}

        {currentView === 'dashboard' && (
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-5xl mx-auto w-full px-2 sm:px-3 lg:px-4 py-4">
              {/* Welcome Section */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div className="mb-2 sm:mb-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      Welcome back, {user?.name || 'User'}! 👋
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Ready to create amazing BPMN diagrams and LaTeX documents?
                    </p>
                    <div className="mt-2 flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                        <span className="mr-2 text-xs text-gray-500">Role:</span>
                        <span className="text-xs">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    {user?.profilePicture ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200">
                        <img
                          src={user.profilePicture}
                          alt={`${user.name || 'User'}'s profile`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <DashboardStats user={user} />
                
                {/* Report Download Button */}
                <div className="mt-4 flex justify-end">
                  <ReportDownloadButton />
                </div>
              </div>

              {/* Charts Section */}
              <div className="mb-4">
                <DashboardCharts user={user} />
              </div>

              {/* Quick Actions Section */}
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleNavigation('ai-process-generator')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                        <HiOutlineSparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">AI Process Generator</h3>
                        <p className="text-xs opacity-90">Generate BPMN from text</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation('decision-engine')}
                    className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                        <HiOutlineCube className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">Decision Engine</h3>
                        <p className="text-xs opacity-90">Rule-based automation</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation('kpi-dashboard')}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">KPI Dashboard</h3>
                        <p className="text-xs opacity-90">Track performance metrics</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation('records')}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">Records</h3>
                        <p className="text-xs opacity-90">Manage your records</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* BPMN and LaTeX Editors Section */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <BpmnDashboard user={user} onNavigate={handleNavigation} />
                </div>
                <div>
                  <LatexDashboard user={user} onNavigate={handleNavigation} />
                </div>
              </div>
            </div>
          </main>
        )}

        {currentView === 'ai-process-generator' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <AIProcessGenerator user={user} />
          </main>
        )}

        {currentView === 'kpi-dashboard' && (
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
              <KPIDashboard />
            </div>
          </main>
        )}
        {currentView === 'records' && (
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
              <Records />
            </div>
          </main>
        )}

        {currentView === 'bpmn' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <BpmnEditor user={user} />
          </main>
        )}

        {currentView === 'admin-file-management' && (
          <div className="flex-1 overflow-hidden">
            <AdminFileManagement userRole={user?.role} />
          </div>
        )}

        {currentView === 'users' && (
          <div className="flex-1 overflow-hidden">
            <RoleBasedUi
              userRole={user?.role || 'user'}
              requiredRole={ROLES.SUPERVISOR}
              fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                    <p className="text-xl font-semibold text-red-600 mb-2">
                      Access Denied
                    </p>
                    <p className="text-gray-600">
                      You don&apos;t have permission to view this page.
                    </p>
                  </div>
                </div>
              }
            >
              <Users />
            </RoleBasedUi>
          </div>
        )}

        {currentView === 'notifications' && user?.role !== 'admin' && (
          <div className="flex-1 overflow-auto">
            <Notifications userRole={user?.role || 'user'} />
          </div>
        )}

        {currentView === 'notifications' && user?.role === 'admin' && (
          <div className="h-full flex items-center justify-center">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 max-w-md text-center">
              <p className="text-xl font-semibold text-red-600 mb-2">
                Feature Not Available
              </p>
              <p className="text-gray-600">
                Notifications are only available for users and supervisors.
              </p>
            </div>
          </div>
        )}

        {currentView === 'profile' && !isEditingProfile && (
          <div className="flex-1 overflow-auto">
            <Profile
              showEditButton={true}
              onEditClick={handleEditProfile}
            />
          </div>
        )}

        {currentView === 'profile' && isEditingProfile && (
          <div className="flex-1 overflow-auto">
            <ProfileFormWrapper
              initialData={user || undefined}
              onCancel={handleCancelEditProfile}
              onSuccess={(updatedUser) => {
                setIsEditingProfile(false);
                // Update user data with the returned user
                setUser(updatedUser);
              }}
              showToast={true}
            />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="flex-1 overflow-auto">
            <SettingsView onNavigate={handleNavigation} />
          </div>
        )}
      </div>
    </div>
  );
} 