import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTeamData = async (userId) => {
    try {
      let teamData = null;
      // Check if user has a team (either as leader or member)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          leader_id,
          members,
          tasks (id, title, description, status, due_date)
        `)
        .or(`leader_id.eq.${userId},members.cs.{${userId}}`)
        .maybeSingle();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        setError('Failed to fetch team data: ' + teamError.message);
        return;
      }

      if (team) {
        teamData = {
          ...team,
          team_members: (team.members || []).map(id => ({ user_id: id }))
        };
      }

      // No team found
      if (!teamData) {
        setTeam(null);
        setLoading(false);
        return;
      }

      if (teamData) {
        // Get unique member IDs
        const memberIds = [
          teamData.leader_id,
          ...(teamData.members || [])
        ].filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and nulls

        if (memberIds.length > 0) {
          const { data: memberProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', memberIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            setError('Failed to fetch member profiles');
            return;
          }

          // Combine all data
          const teamWithDetails = {
            ...teamData,
            leader: memberProfiles.find(p => p.id === teamData.leader_id),
            memberDetails: memberProfiles.filter(p => teamData.members?.includes(p.id))
          };

          const withTasks = {
            ...teamWithDetails,
            tasks: teamData.tasks || []
          };
          setTeam(withTasks);
          setTasks(teamData.tasks || []);
        } else {
          setTeam(teamData);
          setTasks(teamData.tasks || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        navigate('/login');
        return;
      }
      setCurrentUser(session.user);
      await fetchUserProfile(session.user.id);
      await fetchTeamData(session.user.id);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while fetching data');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please log in to view your dashboard.
        </div>
      </div>
    );
  }

  const isTeamLeader = currentUser?.id === team?.leader_id;

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      console.log('Updating task:', taskId, 'to status:', newStatus);
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId)
        .select();

      if (error) throw error;
      
      console.log('Task updated successfully:', data);
      
      // Refresh team data
      if (currentUser) {
        await fetchTeamData(currentUser.id);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      setError('Failed to update task status: ' + error.message);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compact Dashboard Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            {getGreeting()}, {userProfile?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-slate-600 mt-1">
            {team ? `Team: ${team.name}` : 'Manage your tasks and collaborate with your team'}
          </p>
        </div>

        {team ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600">Total Tasks</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{taskStats.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-semibold text-indigo-600 mt-1">{taskStats.inProgress}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{taskStats.completed}</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tasks Section - Left Column (wider) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
                  </div>
                  <div className="p-6">
                    {tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-lg border ${
                              task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
                                ? 'border-red-200 bg-red-50'
                                : 'border-slate-200 hover:border-slate-300'
                            } transition-colors`}
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex-1">
                                <h3 className="font-medium text-slate-900">{task.title}</h3>
                                <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
                                  {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                                    <span className="text-red-600 font-medium">Overdue</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  task.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : task.status === 'in_progress'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                {task.status !== 'completed' && (
                                  <select
                                    value={task.status}
                                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-slate-500">No tasks assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Section - Right Column */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Team</h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-6">
                      <p className="text-sm text-slate-600 mb-1">Team Name</p>
                      <p className="font-medium text-slate-900">{team.name}</p>
                    </div>
                    
                    {team.leader && (
                      <div className="mb-6">
                        <p className="text-sm text-slate-600 mb-2">Team Leader</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {team.leader.full_name?.charAt(0).toUpperCase() || 'L'}
                            </span>
                          </div>
                          <span className="text-sm text-slate-900">{team.leader.full_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {team.memberDetails && team.memberDetails.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-600 mb-3">Team Members</p>
                        <div className="space-y-2">
                          {team.memberDetails.map((member) => (
                            <div key={member.id} className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-slate-600">
                                  {member.full_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-slate-900">{member.full_name}</p>
                                {member.id === team.leader_id && (
                                  <span className="text-xs text-indigo-600">Leader</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Team Empty State */
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Team Assigned</h3>
            <p className="text-slate-600">You are not currently assigned to any team. Please contact your administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
