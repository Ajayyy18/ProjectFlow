import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Home from './pages/Home';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import CreateProject from './components/admin/CreateProject';
import StudentList from './components/admin/StudentList';
import TaskAssignment from './components/admin/TaskAssignment';
import Analytics from './components/admin/Analytics';

// Student Components
import StudentDashboard from './components/student/StudentDashboard';
import StudentTasks from './components/student/StudentTasks';
import TeamChat from './components/student/TeamChat';

// Navbar Component
const NavBar = ({ onLogout, userRole }) => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full bg-white shadow-md z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <span
          onClick={() =>
            navigate(userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard')
          }
          className="text-2xl font-bold text-blue-600 cursor-pointer"
        >
          ProjectFlow
        </span>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600 capitalize">Role: {userRole}</span>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const App = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', initialSession.user.id)
            .single();

          if (!mounted) return;

          if (!profileError && profile) {
            setUserRole(profile.role);
          } else {
            console.error('Profile fetch error:', profileError);
            setUserRole(null);
          }
        } else {
          setSession(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Setup auth error:', error);
        if (mounted) {
          setSession(null);
          setUserRole(null);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear session and role after successful signout
      setSession(null);
      setUserRole(null);
      
      // Force a page reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, force a reload
      window.location.href = '/';
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600 mb-4">Setting up your account</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Redirect to appropriate dashboard if on login/signup pages
  if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
    return <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }

  return (
    <div className="pt-16">
      <NavBar onLogout={handleLogout} userRole={userRole} />
      <div className="container mx-auto px-4">
        <Routes>
          <Route
            path="/"
            element={
              userRole === 'admin' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/student/dashboard" replace />
              )
            }
          />

          {/* Student Routes */}
          {userRole === 'student' && (
            <>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/tasks" element={<StudentTasks />} />
              <Route path="/student/chat" element={<TeamChat />} />
            </>
          )}

          {/* Admin Routes */}
          {userRole === 'admin' && (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/projects" element={<CreateProject />} />
              <Route path="/admin/students" element={<StudentList />} />
              <Route path="/admin/tasks" element={<TaskAssignment />} />
              <Route path="/admin/analytics" element={<Analytics />} />
            </>
          )}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
