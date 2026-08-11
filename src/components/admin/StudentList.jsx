import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [teams, setTeams] = useState([]);

  // Tab state
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'all'

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  // Batch number edit state
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchValue, setBatchValue] = useState('');

  // Team creation state
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [batchRestriction, setBatchRestriction] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, searchQuery, branchFilter, batchFilter, activeTab]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

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

      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (studentsError) {
        setError('Failed to fetch student data.');
        setLoading(false);
        return;
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, leader_id, members, branch, batch_number');

      if (teamsError) {
        setError('Failed to fetch team data.');
        setLoading(false);
        return;
      }

      setTeams(teamsData || []);

      const studentsWithTeamInfo = (studentsData || []).map(student => {
        const team = teamsData?.find(t =>
          t.leader_id === student.id || (t.members && t.members.includes(student.id))
        );
        return {
          ...student,
          teamStatus: team ? 'Assigned' : 'Not Assigned',
          teamName: team?.name || null,
          teamBranch: team?.branch || null,
          teamBatch: team?.batch_number || null
        };
      });

      setStudents(studentsWithTeamInfo);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('An error occurred while fetching data.');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    // Tab filter
    if (activeTab === 'available') {
      filtered = filtered.filter(s => s.teamStatus === 'Not Assigned');
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.roll_number?.toLowerCase().includes(query)
      );
    }

    // Branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter(student => student.branch === branchFilter);
    }

    // Batch filter
    if (batchFilter !== 'all') {
      filtered = filtered.filter(student => student.batch_number === parseInt(batchFilter));
    }

    setFilteredStudents(filtered);
  };

  const handleBatchEdit = (student) => {
    setEditingBatch(student.id);
    setBatchValue(student.batch_number?.toString() || '');
  };

  const handleBatchSave = async (studentId) => {
    try {
      const batchNum = parseInt(batchValue);
      if (isNaN(batchNum) || batchNum <= 0) {
        setError('Batch number must be a positive integer.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ batch_number: batchNum })
        .eq('id', studentId);

      if (error) throw error;

      setSuccess('Batch number updated successfully.');
      setEditingBatch(null);
      await fetchStudents();
    } catch (error) {
      console.error('Error updating batch:', error);
      setError('Failed to update batch number.');
    }
  };

  const handleBatchCancel = () => {
    setEditingBatch(null);
    setBatchValue('');
  };

  const getBranchBatchDisplay = (student) => {
    if (!student.branch && !student.batch_number) return 'Not set';
    const branch = student.branch || '';
    const batch = student.batch_number || '';
    return `${branch}${batch}`;
  };

  const getUniqueBranches = () => {
    const branches = [...new Set(students.map(s => s.branch).filter(Boolean))];
    return branches.sort();
  };

  const getUniqueBatches = () => {
    const batches = [...new Set(students.map(s => s.batch_number).filter(Boolean))];
    return batches.sort((a, b) => a - b);
  };

  // Team creation handlers
  const handleStudentSelect = (student) => {
    if (selectedStudents.includes(student.id)) {
      setSelectedStudents(selectedStudents.filter(id => id !== student.id));
      if (selectedStudents.length === 1) {
        setBatchRestriction(null);
      }
    } else {
      if (selectedStudents.length >= 4) {
        setError('Maximum 4 students can be selected for a team.');
        return;
      }

      // Check batch restriction
      if (selectedStudents.length > 0) {
        const firstStudent = students.find(s => s.id === selectedStudents[0]);
        if (student.branch !== firstStudent.branch || student.batch_number !== firstStudent.batch_number) {
          setError(`Students must be from the same batch (${getBranchBatchDisplay(firstStudent)}). This student is from ${getBranchBatchDisplay(student)}.`);
          return;
        }
      } else {
        setBatchRestriction({ branch: student.branch, batch_number: student.batch_number });
      }

      setSelectedStudents([...selectedStudents, student.id]);
    }
  };

  const handleCreateTeam = () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student to create a team.');
      return;
    }
    setShowCreateTeamModal(true);
    setCreateStep(1);
    setSelectedLeader(null);
    setTeamName('');
  };

  const handleStepNext = () => {
    if (createStep === 1 && selectedStudents.length > 0) {
      setCreateStep(2);
      // Suggest team name
      const firstStudent = students.find(s => s.id === selectedStudents[0]);
      const batchCode = getBranchBatchDisplay(firstStudent);
      const teamCount = teams.filter(t => t.branch === firstStudent.branch && t.batch_number === firstStudent.batch_number).length + 1;
      setTeamName(`${batchCode} Team ${teamCount}`);
    } else if (createStep === 2 && teamName.trim()) {
      setCreateStep(3);
    } else if (createStep === 3 && selectedLeader) {
      setCreateStep(4);
    } else if (createStep === 4) {
      setCreateStep(5);
      handleCreateTeamSubmit();
    }
  };

  const handleCreateTeamSubmit = async () => {
    try {
      const firstStudent = students.find(s => s.id === selectedStudents[0]);

      // Ensure leader is included in members array
      const membersWithLeader = selectedStudents.includes(selectedLeader)
        ? selectedStudents
        : [...selectedStudents, selectedLeader];

      const { error } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          leader_id: selectedLeader,
          members: membersWithLeader,
          branch: firstStudent.branch,
          batch_number: firstStudent.batch_number
        });

      if (error) throw error;

      setSuccess('Team created successfully!');
      setShowCreateTeamModal(false);
      setSelectedStudents([]);
      setBatchRestriction(null);
      await fetchStudents();
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team.');
    }
  };

  const getSelectedStudentDetails = () => {
    return selectedStudents.map(id => students.find(s => s.id === id)).filter(Boolean);
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
              <h1 className="text-2xl font-semibold text-slate-900">Manage Students</h1>
              <p className="text-slate-600 mt-1">View students, assign batch numbers, and create teams</p>
            </div>
            <div className="text-sm text-slate-500">
              {students.length} total students
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

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => {
                  setActiveTab('available');
                  setSelectedStudents([]);
                  setBatchRestriction(null);
                }}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'available'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Available Students
              </button>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedStudents([]);
                  setBatchRestriction(null);
                }}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                All Students
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Name, email, or roll number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Branches</option>
                  {getUniqueBranches().map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
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
                  onClick={fetchStudents}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Available Students Tab */}
          {activeTab === 'available' && (
            <>
              {/* Selection Action Area */}
              {selectedStudents.length > 0 && (
                <div className="sticky top-0 bg-indigo-50 border-b border-indigo-200 px-6 py-4 z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-indigo-900">
                        {selectedStudents.length} / 4 students selected
                      </p>
                      {batchRestriction && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Batch: {getBranchBatchDisplay(batchRestriction)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleCreateTeam}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                      Create Team
                    </button>
                  </div>
                </div>
              )}

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Get first visible student's branch and batch
                              const firstStudent = filteredStudents[0];
                              if (!firstStudent) return;

                              // Filter to only students with same branch and batch
                              const sameBatchStudents = filteredStudents.filter(
                                s => s.branch === firstStudent.branch && s.batch_number === firstStudent.batch_number
                              );

                              // Select up to 4 from that batch
                              const toSelect = sameBatchStudents.slice(0, 4);
                              setSelectedStudents(toSelect.map(s => s.id));
                              setBatchRestriction({ branch: firstStudent.branch, batch_number: firstStudent.batch_number });
                            } else {
                              setSelectedStudents([]);
                              setBatchRestriction(null);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Roll Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleStudentSelect(student)}
                            disabled={
                              selectedStudents.length >= 4 && !selectedStudents.includes(student.id) ||
                              (batchRestriction && (student.branch !== batchRestriction.branch || student.batch_number !== batchRestriction.batch_number))
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{student.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{student.roll_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{student.branch || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{student.batch_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Available
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* All Students Tab */}
          {activeTab === 'all' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Branch + Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Team Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{student.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingBatch === student.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={batchValue}
                              onChange={(e) => setBatchValue(e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => handleBatchSave(student.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleBatchCancel}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600">{getBranchBatchDisplay(student)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.teamStatus === 'Assigned'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {student.teamStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">{student.teamName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleBatchEdit(student)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          Edit Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-slate-500">
                {activeTab === 'available' ? 'No available students found.' : 'No students found.'}
              </p>
            </div>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreateTeamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900">Create Team</h3>
                  <div className="flex gap-2">
                    <div className={`w-2 h-2 rounded-full ${createStep >= 1 ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${createStep >= 2 ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${createStep >= 3 ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${createStep >= 4 ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                  </div>
                </div>
              </div>

              {/* Step 1: Review Selected Students */}
              {createStep === 1 && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-900">Selected Students</p>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {selectedStudents.length} / 4 members
                    </span>
                  </div>
                  <div className="space-y-3">
                    {getSelectedStudentDetails().map(student => {
                      const batchCode = getBranchBatchDisplay(student);
                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {student.full_name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{student.full_name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {batchCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Team Details */}
              {createStep === 2 && (
                <div className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900 mb-4">Team Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Batch</label>
                      <span className="text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {batchRestriction ? getBranchBatchDisplay(batchRestriction) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Choose Team Leader */}
              {createStep === 3 && (
                <div className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900 mb-4">Choose Team Leader</p>
                  <div className="space-y-2">
                    {getSelectedStudentDetails().map(student => (
                      <label key={student.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLeader === student.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="leader"
                          value={student.id}
                          checked={selectedLeader === student.id}
                          onChange={(e) => setSelectedLeader(e.target.value)}
                          className="mr-3 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {student.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{student.full_name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                        {selectedLeader === student.id && (
                          <span className="ml-auto text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            Leader
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Review & Create */}
              {createStep === 4 && (
                <div className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900 mb-4">Review & Create Team</p>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Team Name</span>
                      <span className="text-sm font-medium text-slate-900">{teamName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Batch</span>
                      <span className="text-sm font-medium text-indigo-600">{batchRestriction ? getBranchBatchDisplay(batchRestriction) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Team Leader</span>
                      <span className="text-sm font-medium text-slate-900">
                        {students.find(s => s.id === selectedLeader)?.full_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Members</span>
                      <span className="text-sm font-medium text-slate-900">{selectedStudents.length} / 4</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Creating */}
              {createStep === 5 && (
                <div className="px-6 py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-sm text-slate-600">Creating team...</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
                <button
                  onClick={() => {
                    if (createStep === 1) {
                      setShowCreateTeamModal(false);
                      setSelectedStudents([]);
                      setBatchRestriction(null);
                    } else {
                      setCreateStep(createStep - 1);
                    }
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {createStep === 1 ? 'Cancel' : 'Back'}
                </button>
                {createStep < 4 && (
                  <button
                    onClick={handleStepNext}
                    disabled={createStep === 2 && !teamName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                )}
                {createStep === 4 && (
                  <button
                    onClick={handleStepNext}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Create Team
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentList;
