import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const updateMemberRole = async (memberId, newRole) => {
    try {
      if (!team) {
        setError('No team found');
        return;
      }

      // For now, just update the profile role since we don't have team_members table
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      // Refresh team data
      if (currentUser) {
        await fetchTeamData(currentUser.id);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Failed to update member role: ' + error.message);
    }
  };

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

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        navigate('/login');
        return;
      }
      setCurrentUser(session.user);
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

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {currentUser.email}</h1>
      
      {team ? (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Team</h2>
          <p className="mb-2">
            <span className="font-semibold">Team Name:</span> {team.name}
          </p>
          {team.leader && (
            <p className="mb-4">
              <span className="font-semibold">Team Leader:</span> {team.leader.full_name}
            </p>
          )}
          {team.memberDetails && team.memberDetails.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Team Members:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {team.memberDetails.map((member) => (
                  <li key={member.id} className="text-gray-700">
                    {member.full_name}
                    {member.id !== currentUser.id && (
                      <select
                        value={member.role || ''}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        className="form-select rounded border-gray-300 text-sm"
                      >
                        <option value="">Assign Role</option>
                        <option value="frontend">Frontend Developer</option>
                        <option value="backend">Backend Developer</option>
                        <option value="designer">UI/UX Designer</option>
                        <option value="tester">QA Tester</option>
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Team Tasks</h2>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{task.title}</h3>
                      <p className="text-gray-600 mt-1">{task.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Due: {new Date(task.due_date).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-sm rounded-full ${task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.status !== 'completed' && (
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          className="ml-2 text-sm border rounded p-1"
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
            <p className="text-gray-600">No tasks assigned yet.</p>
          )}
        </div>
        </div>
      ) : (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          You are not currently assigned to any team.
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
