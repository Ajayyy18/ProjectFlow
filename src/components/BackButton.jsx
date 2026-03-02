import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Show button on all pages except home and when user is logged in
      setShowButton(location.pathname !== '/' && session);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setShowButton(location.pathname !== '/' && session);
    });

    return () => subscription?.unsubscribe();
  }, [location]);

  if (!showButton) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-20 left-4 z-40 bg-white/80 backdrop-blur-sm hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 flex items-center space-x-2 group"
    >
      <svg
        className="w-5 h-5 transform transition-transform group-hover:-translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>Back</span>
    </button>
  );
};

export default BackButton;
