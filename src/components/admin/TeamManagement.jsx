import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  
  // Manage panel state
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [newLeaderId, setNewLeaderId] = useState('');
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teams, searchQuery, batchFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Please sign in again.');
        setLoading(false);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || userProfile?.role !== 'admin') {
        setError('You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          leader_id,
          members,
          branch,
          batch_number,
          created_at,
          leader:profiles!teams_leader_id_fkey (full_name, email, branch, batch_number),
          tasks (id)
        `);

      if (teamsError) {
        setError('Failed to fetch team data.');
        setLoading(false);
        return;
      }

      const normalizedTeams = (teamsData || []).map(team => {
        const allMembers = team.members || [];
        return {
          ...team,
          allMembers: [...new Set(allMembers)],
          memberCount: allMembers.length,
          taskCount: team.tasks?.length || 0,
          batchCode: team.branch && team.batch_number ? `${team.branch}${team.batch_number}` : 'Not set'
        };
      });

      setTeams(normalizedTeams);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('An error occurred while fetching data.');
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return;
      }

      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...teams];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(team =>
        team.name?.toLowerCase().includes(query) ||
        team.leader?.full_name?.toLowerCase().includes(query)
      );
    }

    if (batchFilter !== 'all') {
      filtered = filtered.filter(team => team.batchCode === batchFilter);
    }

    setFilteredTeams(filtered);
  };

  const getAvailableStudents = () => {
    if (!selectedTeam) return [];
    const allTeamMemberIds = selectedTeam.allMembers || [];
    return students.filter(s => 
      !allTeamMemberIds.includes(s.id) &&
      s.branch === selectedTeam.branch &&
      s.batch_number === selectedTeam.batch_number
    );
  };

  const handleManageTeam = (team) => {
    setSelectedTeam(team);
    setNewMemberId('');
    setNewLeaderId('');
    setShowManagePanel(true);
  };

  const handleAddMember = async () => {
    try {
      if (!newMemberId) {
        setError('Please select a student to add.');
        return;
      }

      const currentMemberCount = selectedTeam.allMembers?.length || 0;
      if (currentMemberCount >= 4) {
        setError('Team already has maximum 4 members.');
        return;
      }

      // Check if student is in another team
      const otherTeams = teams.filter(t => t.id !== selectedTeam.id);
      for (const otherTeam of otherTeams) {
        if (otherTeam.allMembers?.includes(newMemberId)) {
          const student = students.find(s => s.id === newMemberId);
          setError(`${student?.full_name || 'This student'} is already in team ${otherTeam.name}.`);
          return;
        }
      }

      const newMembers = [...(selectedTeam.members || []), newMemberId];
      
      const { error } = await supabase
        .from('teams')
        .update({ members: newMembers })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      setSuccess('Member added successfully.');
      setNewMemberId('');
      await fetchTeams();
      await fetchStudents();
      // Update selected team with refreshed data
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error adding member:', error);
      setError('Failed to add member.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      if (memberId === selectedTeam.leader_id) {
        setError('Cannot remove team leader. Please change the leader first.');
        return;
      }

      const newMembers = selectedTeam.members.filter(m => m !== memberId);
      
      const { error } = await supabase
        .from('teams')
        .update({ members: newMembers })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      setSuccess('Member removed successfully.');
      await fetchTeams();
      await fetchStudents();
      // Update selected team with refreshed data
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member.');
    }
  };

  const handleChangeLeader = async () => {
    try {
      if (!newLeaderId || newLeaderId === selectedTeam.leader_id) {
        setError('Please select a different leader.');
        return;
      }

      const newMembers = selectedTeam.members || [];
      
      // Ensure new leader is in members array
      if (!newMembers.includes(newLeaderId)) {
        newMembers.push(newLeaderId);
      }

      const { error } = await supabase
        .from('teams')
        .update({
          leader_id: newLeaderId,
          members: newMembers
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      setSuccess('Team leader changed successfully.');
      setNewLeaderId('');
      await fetchTeams();
      // Update selected team with refreshed data
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error changing leader:', error);
      setError('Failed to change team leader.');
    }
  };

  const handleUpdateTeamName = async (newName) => {
    try {
      if (!newName.trim()) {
        setError('Team name is required.');
        return;
      }

      const { error } = await supabase
        .from('teams')
        .update({ name: newName.trim() })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      setSuccess('Team name updated successfully.');
      await fetchTeams();
      // Update selected team with refreshed data
      const updatedTeam = teams.find(t => t.id === selectedTeam.id);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error updating team name:', error);
      setError('Failed to update team name.');
    }
  };

  const handleDeleteTeam = (team) => {
    setSelectedTeam(team);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', selectedTeam.id);

      if (error) throw error;

      setSuccess(`Team "${selectedTeam.name}" deleted successfully. Related tasks and messages have been removed.`);
      setShowDeleteModal(false);
      setShowManagePanel(false);
      setSelectedTeam(null);
      await fetchTeams();
      await fetchStudents();
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team.');
    }
  };

  const getUniqueBatches = () => {
    const batches = [...new Set(teams.map(t => t.batchCode).filter(Boolean))];
    return batches.sort();
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || 'Unknown';
  };

  const getStudentBranchBatch = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return 'N/A';
    const branch = student.branch || '';
    const batch = student.batch_number || '';
    return `${branch}${batch}`;
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Manage Teams</h1>
              <p className="text-slate-600 mt-1">View, edit, and manage student teams</p>
            </div>
            <div className="text-sm text-slate-500">
              {teams.length} total teams
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Team name or leader"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Batches</option>
                {getUniqueBatches().map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTeams}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map(team => (
            <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {team.memberCount} / 4 members • {team.taskCount} tasks
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
                    {team.batchCode}
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Team Leader</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {team.leader?.full_name?.charAt(0).toUpperCase() || 'L'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{team.leader?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{getStudentBranchBatch(team.leader_id)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Members</p>
                  <div className="flex flex-wrap gap-2">
                    {team.allMembers?.slice(0, 4).map(memberId => {
                      const member = students.find(s => s.id === memberId);
                      return (
                        <div key={memberId} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center" title={member?.full_name}>
                          <span className="text-xs font-medium text-slate-600">
                            {member?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    {new Date(team.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleManageTeam(team)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-500">No teams found. Create teams from the Manage Students page.</p>
          </div>
        )}

        {/* Manage Team Panel */}
        {showManagePanel && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Manage Team</h3>
                <button
                  onClick={() => setShowManagePanel(false)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Team Details */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">Team Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Team Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={selectedTeam.name}
                          onBlur={(e) => handleUpdateTeamName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Batch</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
                        {selectedTeam.batchCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">Members</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {selectedTeam.leader?.full_name?.charAt(0).toUpperCase() || 'L'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{selectedTeam.leader?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-indigo-600">Team Leader</p>
                      </div>
                    </div>
                    {selectedTeam.allMembers?.filter(m => m !== selectedTeam.leader_id).map(memberId => {
                      const member = students.find(s => s.id === memberId);
                      return (
                        <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-slate-600">
                                {member?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{member?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{getStudentBranchBatch(memberId)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="text-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Member */}
                  {selectedTeam.memberCount < 4 && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Add Member</label>
                      <div className="flex gap-2">
                        <select
                          value={newMemberId}
                          onChange={(e) => setNewMemberId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select available student</option>
                          {getAvailableStudents().map(student => (
                            <option key={student.id} value={student.id}>
                              {student.full_name} ({getStudentBranchBatch(student.id)})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMember}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Leadership */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">Leadership</h4>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Change Team Leader</label>
                    <div className="flex gap-2">
                      <select
                        value={newLeaderId}
                        onChange={(e) => setNewLeaderId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select new leader</option>
                        {selectedTeam.allMembers?.map(memberId => {
                          const member = students.find(s => s.id === memberId);
                          return (
                            <option key={memberId} value={memberId}>
                              {member?.full_name || 'Unknown'}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={handleChangeLeader}
                        disabled={!newLeaderId}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-red-600 mb-3 pb-2 border-b border-red-100">Danger Zone</h4>
                  <button
                    onClick={() => {
                      setShowManagePanel(false);
                      handleDeleteTeam(selectedTeam);
                    }}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Delete Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Delete Team</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-slate-700 mb-4">
                  Delete <strong>{selectedTeam.name}</strong>?
                </p>
                <p className="text-sm text-red-600 mb-4">
                  This permanently removes the team and its related tasks and messages.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Delete Team
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
