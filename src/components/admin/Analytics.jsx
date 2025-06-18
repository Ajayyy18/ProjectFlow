import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  blue: '#0088FE',
  green: '#00C49F',
  yellow: '#FFBB28',
  orange: '#FF8042',
  purple: '#8884D8'
};

const Analytics = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [summary, setSummary] = useState({
    totalTeams: 0,
    totalCompleted: 0,
    totalOverdue: 0,
    totalTasks: 0,
    completionRate: 0,
    onTimeRate: 0
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('Current user:', user);
        
        if (authError) {
          console.error('Auth error:', authError);
          return;
        }

        if (!user) {
          console.error('No authenticated user');
          return;
        }

        await fetchTeamPerformance();
        await fetchActivityFeed();
      } catch (error) {
        console.error('Auth check error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const fetchActivityFeed = async () => {
    try {
      console.log('Fetching activity feed...');
      const { data: activities, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          team_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Activity feed response:', { activities, error });

      if (error) {
        console.error('Activity feed error:', error);
        throw error;
      }

      if (!activities) {
        console.log('No activities found');
        setActivityFeed([]);
        return;
      }

      console.log('Setting activity feed:', activities);
      setActivityFeed(activities);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      setError(error.message);
    }
  };

  const fetchTeamPerformance = async () => {
    try {
      // Check auth status first
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('Auth session:', { session, error: authError });
      
      if (authError) throw authError;
      if (!session) {
        console.error('No auth session');
        return;
      }

      // Get teams with a simpler query first
      console.log('Fetching teams...');
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, leader_id, created_at')
        .order('created_at', { ascending: false });  // This will help us see any RLS or permission errors
      
      // Handle empty response
      if (!teamsData || teamsData.length === 0) {
        console.log('No teams found');
        setTeams([]);
        setSummary({
          totalTeams: 0,
          totalCompleted: 0,
          totalOverdue: 0,
          totalTasks: 0,
          completionRate: 0,
          onTimeRate: 0
        });
        setLoading(false);
        return;
      }

      console.log('Teams response:', { teamsData, teamsError });

      if (teamsError) {
        console.error('Teams error:', teamsError);
        throw teamsError;
      }

      // Then get leader profiles
      const leaderIds = teamsData.map(team => team.leader_id);
      console.log('Leader IDs:', leaderIds);

      const { data: leadersData, error: leadersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', leaderIds);

      console.log('Leaders response:', { leadersData, leadersError });

      if (leadersError) {
        console.error('Leaders error:', leadersError);
        throw leadersError;
      }

      // Create a map of leader profiles
      const leaderMap = new Map(leadersData?.map(leader => [leader.id, leader]) || []);
      console.log('Leader map:', Object.fromEntries(leaderMap));
      
      // Get tasks for all teams
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*');
      
      console.log('Tasks query result:', { tasksData, tasksError });
      
      if (tasksError) {
        console.error('Tasks error:', tasksError);
        throw tasksError;
      }

      let totalCompleted = 0;
      let totalOverdue = 0;
      let totalTasks = 0;

      const processedTeams = teamsData.map(team => {
        const leader = leaderMap.get(team.leader_id);
        console.log('Processing team:', team);
        
        const teamTasks = tasksData ? tasksData.filter(task => task.team_id === team.id) : [];
        console.log('Team tasks:', teamTasks);
        
        const teamTotalTasks = teamTasks.length;
        const teamCompletedTasks = teamTasks.filter(task => task.status === 'completed').length;
        const teamCompletedOnTime = teamTasks.filter(task =>
          task.status === 'completed' &&
          new Date(task.completed_at) <= new Date(task.deadline)
        ).length;

        const teamOverdueTasks = teamTasks.filter(task =>
          task.status !== 'completed' &&
          new Date(task.deadline) < new Date()
        ).length;

        console.log('Team stats:', {
          teamTotalTasks,
          teamCompletedTasks,
          teamCompletedOnTime,
          teamOverdueTasks
        });

        totalTasks += teamTotalTasks;
        totalCompleted += teamCompletedTasks;
        totalOverdue += teamOverdueTasks;

        return {
          ...team,
          leader: leader || { full_name: 'Unknown' },
          stats: {
            totalTasks: teamTotalTasks,
            completedTasks: teamCompletedTasks,
            completedOnTime: teamCompletedOnTime,
            overdueTasks: teamOverdueTasks,
            completionRate: teamTotalTasks > 0 ? (teamCompletedTasks / teamTotalTasks) * 100 : 0,
            onTimeRate: teamCompletedTasks > 0 ? (teamCompletedOnTime / teamCompletedTasks) * 100 : 0
          }
        };
      });

      const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
      const onTimeRate = totalCompleted > 0 ? (totalCompleted - totalOverdue) / totalCompleted * 100 : 0;

      setTeams(processedTeams);
      setSummary({
        totalTeams: teamsData.length,
        totalCompleted,
        totalOverdue,
        totalTasks,
        completionRate,
        onTimeRate
      });
    } catch (error) {
      console.error('Error fetching team performance:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Analytics Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Analytics Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Analytics Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white shadow-md rounded-xl p-6 text-center transform transition-transform hover:scale-105">
          <h2 className="text-2xl font-bold text-blue-600">{summary.totalTeams}</h2>
          <p className="text-gray-600">Total Teams</p>
          <p className="text-sm text-gray-500 mt-2">{summary.totalTasks} Total Tasks</p>
        </div>
        <div className="bg-white shadow-md rounded-xl p-6 text-center transform transition-transform hover:scale-105">
          <h2 className="text-2xl font-bold text-green-600">{summary.totalCompleted}</h2>
          <p className="text-gray-600">Tasks Completed</p>
          <p className="text-sm text-gray-500 mt-2">{summary.completionRate.toFixed(1)}% Completion Rate</p>
        </div>
        <div className="bg-white shadow-md rounded-xl p-6 text-center transform transition-transform hover:scale-105">
          <h2 className="text-2xl font-bold text-red-600">{summary.totalOverdue}</h2>
          <p className="text-gray-600">Overdue Tasks</p>
          <p className="text-sm text-gray-500 mt-2">{summary.onTimeRate.toFixed(1)}% On-Time Rate</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Team Performance */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">Team Performance</h3>
          <div className="space-y-4 mt-4">
            {teams.map(team => (
              <div key={team.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{team.name}</h4>
                    <p className="text-sm text-gray-600">Led by {team.leader?.full_name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{team.stats.completedTasks} / {team.stats.totalTasks} tasks</p>
                    <p className="text-xs text-gray-500">{Math.round(team.stats.completionRate)}% complete</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${team.stats.completionRate >= 66 ? 'bg-green-500' : team.stats.completionRate >= 33 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${team.stats.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-gray-500 text-sm">No teams found</p>
            )}
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">Task Status Overview</h3>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium">{Math.round(summary.completionRate)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-gray-600">On-time Rate</span>
              <span className="font-medium">{Math.round(summary.onTimeRate)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${summary.onTimeRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-10">
        <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {activityFeed && activityFeed.map(activity => {
            const team = teams.find(t => t.id === activity.team_id);
            return (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${activity.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
                <div className="flex-grow">
                  <p className="text-sm">
                    <span className="font-medium">{team?.name || 'Unknown Team'}</span>
                    <span className="text-gray-500"> - {activity.title}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
          {(!activityFeed || activityFeed.length === 0) && (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Team Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white shadow-lg rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Team {team.id}</h2>
              <p className="text-gray-500">Led by {team.leader?.full_name || 'Unknown'}</p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Task Completion</span>
                <span>{team.stats.completedTasks}/{team.stats.totalTasks}</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${team.stats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>On-Time Completion</span>
                <span>{team.stats.completedOnTime}/{team.stats.completedTasks}</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${team.stats.onTimeRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center mt-4">
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-xl font-bold text-blue-600">
                  {team.stats.completionRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">On-Time Rate</p>
                <p className="text-xl font-bold text-green-600">
                  {team.stats.onTimeRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
