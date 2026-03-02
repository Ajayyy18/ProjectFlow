import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const StudentTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // First get the user's team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .contains('members', [user.id])
        .single();

      if (teamData) {
        // Then get the team's tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('team_id', teamData.id)
          .order('deadline', { ascending: true });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task status');
    }
  };

  const getStatusClass = (status, deadline) => {
    if (status === 'completed') return 'status-success';
    if (new Date(deadline) < new Date()) return 'status-danger';
    return 'status-warning';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1 className="card-title mb-4">Tasks</h1>
      
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="card task-card">
            <div className="card-header">
              <h2 className="card-title">{task.title}</h2>
              {task.status !== 'completed' && (
                <button
                  onClick={() => handleTaskComplete(task.id)}
                  className="btn btn-success"
                >
                  Mark Complete
                </button>
              )}
            </div>
            <div className="card-body">
              <p className="mb-4">{task.description}</p>
              
              <div className="task-meta">
                <span className={`status-badge ${getStatusClass(task.status, task.deadline)}`}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
                
                <span className="text-muted">
                  Due: {new Date(task.deadline).toLocaleString()}
                </span>
                
                {task.completed_at && (
                  <span className="text-muted">
                    Completed: {new Date(task.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="card text-center">
            <div className="card-body">
              <p className="text-muted">No tasks assigned yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTasks;
