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

      const { data: task, error: createError } = await supabase
        .from('tasks')
        .insert({
          team_id: taskForm.teamId,
          title: taskForm.title,
          description: taskForm.description,
          due_date: new Date(taskForm.dueDate).toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating task:', createError);
        setError('Failed to create task: ' + createError.message);
        return;
      }

      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        teamId: ''
      });
      await fetchTeams();
      alert('Task assigned successfully!');
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
    <div className="container mx-auto px-4 py-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Task Assignment</h1>
      
      <div className="bg-white shadow overflow-hidden rounded-lg mb-4">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Assign New Task</h3>
          <p className="mt-1 text-sm text-gray-500">Create and assign tasks to teams</p>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleTaskSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Team</label>
              <select
                value={taskForm.teamId}
                onChange={(e) => setTaskForm({ ...taskForm, teamId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Choose a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} (Leader: {team.leader_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Task Title</label>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Assign Task
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Display Existing Tasks */}
      <div className="mt-8 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Existing Tasks</h3>
          <p className="mt-1 text-sm text-gray-500">View and manage team tasks</p>
        </div>

        <div className="px-4 py-5 sm:p-6">
          {teams.some(team => team.tasks?.length > 0) ? (
            <div className="space-y-4 mt-4">
              {teams.map(team => (
                team.tasks?.length > 0 && (
                  <div key={team.id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">{team.name}</h4>
                    <div className="space-y-2">
                      {team.tasks.map(task => (
                        <div key={task.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-base font-medium">{task.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                Due: {new Date(task.due_date).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${task.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No tasks have been assigned yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskAssignment;
