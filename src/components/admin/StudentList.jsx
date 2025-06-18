import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [teamLeader, setTeamLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Authentication error:', sessionError);
        setError('Please sign in again.');
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || userProfile?.role !== 'admin') {
        console.error('Authorization error:', profileError);
        setError('You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      // Get student profiles
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');
      
      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        setError('Failed to fetch student data.');
        setLoading(false);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch teams with proper join
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
        if (teamsError.code === '42501') { // Permission denied
          setError('You do not have permission to view teams. Please contact your administrator.');
        } else {
          setError('Failed to fetch team data. ' + teamsError.message);
        }
        setLoading(false);
        return;
      }

      setTeams(teamsData || []);
      const teams = teamsData || [];

      // Map students with their team status
      const studentsWithTeamStatus = studentsData.map(student => ({
        ...student,
        teamStatus: teams.some(team =>
          team.leader_id === student.id || 
          (team.members && team.members.includes(student.id))
        ) ? 'Assigned' : 'Not Assigned'
      }));

      setStudents(studentsWithTeamStatus);
      setError(null);

    } catch (error) {
      console.error('Error in fetchStudents:', error);
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    if (selectedStudents.length < 4 && !selectedStudents.includes(student)) {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
    if (teamLeader?.id === studentId) {
      setTeamLeader(null);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamLeader || selectedStudents.length === 0) {
      setError('Please select a team leader and at least one team member.');
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Please log in to create a team.');
        return;
      }

      // Verify team leader is not already in a team
      const { data: existingTeam, error: checkError } = await supabase
        .from('teams')
        .select('id')
        .or(`leader_id.eq.${teamLeader.id},members.cs.{${teamLeader.id}}`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
        setError('Failed to check team membership.');
        return;
      }

      if (existingTeam) {
        setError('The selected team leader is already in another team.');
        return;
      }

      // Create the team
      const { data: team, error: createError } = await supabase
        .from('teams')
        .insert({
          name: `Team ${teamLeader.full_name}`,
          leader_id: teamLeader.id,
          members: selectedStudents.map(student => student.id)
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating team:', createError);
        if (createError.code === '42501') { // Permission denied
          setError('You do not have permission to create teams. Please contact your administrator.');
        } else {
          setError('Failed to create team: ' + createError.message);
        }
        return;
      }

      alert('Team created successfully!');
      setSelectedStudents([]);
      setTeamLeader(null);
      fetchStudents(); // Refresh the list to update team status
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team. Please try again.');
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
        <p>Error loading students: {error}</p>
        <button 
          onClick={fetchStudents}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }



  return (
    <div className="container mx-auto px-4 py-8">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Available Students</h1>
        <div className="space-x-4">

          <span className="text-gray-600">
            {students.length} student{students.length !== 1 ? 's' : ''} found
          </span>
          <button
            onClick={fetchStudents}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Refresh List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">All Students</h3>
              <p className="mt-1 text-sm text-gray-500">Select students to create or modify teams</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {students.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No students found in the database.</p>
                </div>
              ) : (
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.roll_number || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.full_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.branch || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.teamStatus === 'Assigned' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'}`}
                              >
                                {student.teamStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.teamStatus === 'Not Assigned' ? (
                                <button
                                  onClick={() => handleStudentSelect(student)}
                                  disabled={selectedStudents.includes(student)}
                                  className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white ${selectedStudents.includes(student) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                                >
                                  <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Add
                                </button>
                              ) : (
                                <span className="text-gray-500 text-sm">Already in team</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Selected Team</h3>
              <p className="mt-1 text-sm text-gray-500">{selectedStudents.length} of 4 members selected</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {selectedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No students selected</p>
                  <p className="text-xs text-gray-400">Select students from the list to create a team</p>
                </div>
              ) : (
              <>
                {selectedStudents.map(student => (
                  <div key={student.id} 
                    className="flex justify-between items-start mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{student.full_name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      {teamLeader?.id === student.id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-2">
                          <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          Team Leader
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {teamLeader?.id !== student.id && (
                        <button
                          onClick={() => setTeamLeader(student)}
                          className="inline-flex items-center p-1 border border-yellow-300 rounded-full text-yellow-600 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          title="Make Team Leader"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="inline-flex items-center p-1 border border-red-300 rounded-full text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Remove from Team"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Team Size</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedStudents.length}/4
                    </span>
                  </div>
                  {teamLeader && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Team Leader</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {teamLeader.full_name}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleCreateTeam}
                    disabled={selectedStudents.length !== 4 || !teamLeader}
                    className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      selectedStudents.length === 4 && teamLeader
                        ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Create Team
                  </button>
                </div>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
