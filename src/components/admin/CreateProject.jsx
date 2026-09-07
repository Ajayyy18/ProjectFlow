import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const CreateProject = () => {
  const navigate = useNavigate();
  const [studentCount, setStudentCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'student');

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id', { count: 'exact' });

      setStudentCount(studentsData?.length || 0);
      setTeamCount(teamsData?.length || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching counts:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <span className="text-sm font-medium text-slate-500">Admin</span>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm font-medium text-slate-500 md:ml-2">Create Projects</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Project Setup</h1>
          <p className="text-slate-600 mt-1">Organize students into project teams and prepare them for task assignment.</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manage Students Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Manage Students</h2>
                <p className="text-slate-600 text-sm mb-4">View students, assign batches, and build new project teams.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {loading ? 'Loading...' : `${studentCount} students`}
                  </span>
                  <button
                    onClick={() => navigate('/admin/students')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Manage Students
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Manage Teams Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Manage Teams</h2>
                <p className="text-slate-600 text-sm mb-4">Review active teams, update members and leaders, or remove teams.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {loading ? 'Loading...' : `${teamCount} teams`}
                  </span>
                  <button
                    onClick={() => navigate('/admin/teams')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Manage Teams
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
