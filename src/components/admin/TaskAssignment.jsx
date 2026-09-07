import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const TaskAssignment = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    teamId: ''
  });

  useEffect(() => {
    checkAuthAndFetchTeams();
  }, [navigate]);

  useEffect(() => {
    if (!loading && !error) {
      fetchTeams();
    }
  }, [loading, error]);

  const checkAuthAndFetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Authentication error:', sessionError);
        setError('Please sign in again.');
        navigate('/login');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || userProfile?.role !== 'admin') {
        console.error('Authorization error:', profileError);
        setError('You do not have permission to view this page.');
        navigate('/');
        return;
      }

      await fetchTeams();
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // First get all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          leader_id,
          members,
          tasks (id, title, description, status, due_date)
        `);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        setError('Failed to fetch teams: ' + teamsError.message);
        return;
      }

      if (!teamsData || teamsData.length === 0) {
        console.log('No teams found');
        setTeams([]);
        return;
      }

      // Get leader details for each team
      const leaderIds = teamsData.map(team => team.leader_id);
      const { data: leaderData, error: leaderError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', leaderIds);

      if (leaderError) {
        console.error('Error fetching leaders:', leaderError);
        setError('Failed to fetch team leaders');
        return;
      }

      // Combine team data with leader data
      const teamsWithLeaders = teamsData.map(team => {
        const leader = leaderData.find(l => l.id === team.leader_id);
        return {
          ...team,
          leader_name: leader ? leader.full_name : 'Unknown'
        };
      });

      setTeams(teamsWithLeaders);
      console.log('Teams loaded:', teamsWithLeaders);
    } catch (error) {
      console.error('Error in fetchTeams:', error);
      setError('Failed to fetch teams');
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!taskForm.teamId || !taskForm.title || !taskForm.description || !taskForm.dueDate) {
        setError('Please fill in all required fields');
        return;
      }

      const taskData = {
        title: taskForm.title,
        description: taskForm.description,
        due_date: new Date(taskForm.dueDate).toISOString(),
        status: 'pending'
      };

      if (taskForm.teamId === 'all') {
        // Assign task to all teams
        const teamIds = teams.map(team => team.id);
        const tasksToInsert = teamIds.map(teamId => ({
          ...taskData,
          team_id: teamId
        }));

        const { error: createError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (createError) {
          console.error('Error creating tasks:', createError);
          setError('Failed to create tasks: ' + createError.message);
          return;
        }

        alert(`Task assigned to ${teamIds.length} teams successfully!`);
      } else {
        // Assign task to single team
        const { error: createError } = await supabase
          .from('tasks')
          .insert({
            ...taskData,
            team_id: taskForm.teamId
          });

        if (createError) {
          console.error('Error creating task:', createError);
          setError('Failed to create task: ' + createError.message);
          return;
        }

        alert('Task assigned successfully!');
      }

      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        teamId: ''
      });
      await fetchTeams();
    } catch (error) {
      console.error('Error in task creation:', error);
      setError('Failed to create task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        <p>Error: {error}</p>
        <button 
          onClick={() => {
            setError(null);
            checkAuthAndFetchTeams();
          }}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Task Assignment</h1>
              <p className="mt-2 text-slate-600">Create and manage tasks for your teams</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                <span className="text-sm text-slate-600">Total Teams: </span>
                <span className="text-sm font-semibold text-slate-900">{teams.length}</span>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                <span className="text-sm text-slate-600">Total Tasks: </span>
                <span className="text-sm font-semibold text-slate-900">
                  {teams.reduce((acc, team) => acc + (team.tasks?.length || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Task Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-8">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
                <p className="mt-1 text-sm text-slate-500">Fill in the details below</p>
              </div>

              <div className="px-6 py-5">
                <form onSubmit={handleTaskSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Team</label>
                    <select
                      value={taskForm.teamId}
                      onChange={(e) => setTaskForm({ ...taskForm, teamId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Choose a team</option>
                      <option value="all">🌟 All Teams</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} — {team.leader_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Task Title</label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Enter task title..."
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={4}
                      placeholder="Describe the task..."
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                    <input
                      type="datetime-local"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
                  >
                    Assign Task
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Tasks Display */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">All Tasks</h2>
                <p className="mt-1 text-sm text-slate-500">Overview of assigned tasks by team</p>
              </div>

              <div className="px-6 py-5">
                {teams.some(team => team.tasks?.length > 0) ? (
                  <div className="space-y-6">
                    {teams.map(team => (
                      team.tasks?.length > 0 && (
                        <div key={team.id} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <span className="text-lg font-semibold text-blue-600">
                                    {team.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900">{team.name}</h3>
                                  <p className="text-xs text-slate-500">{team.leader_name}</p>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                {team.tasks.length} task{team.tasks.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {team.tasks.map(task => (
                              <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                      <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                                      </div>
                                      {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                                        <span className="text-red-600 font-medium">Overdue</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-shrink-0">
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        task.status === 'completed'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : task.status === 'in_progress'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {task.status === 'completed' && '✓ '}
                                      {task.status === 'in_progress' && '◷ '}
                                      {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks assigned yet</h3>
                    <p className="text-slate-500">Create your first task using the form on the left</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignment;
