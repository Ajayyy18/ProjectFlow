import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          to="/admin/projects" 
          className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-blue-500"
        >
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Projects</h2>
            <p className="text-gray-600">Group students into teams and assign leaders</p>
          </div>
        </Link>
        
        <Link 
          to="/admin/tasks" 
          className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-blue-500"
        >
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Assignment</h2>
            <p className="text-gray-600">Create and assign tasks to teams</p>
          </div>
        </Link>
        
        <Link 
          to="/admin/analytics" 
          className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-blue-500"
        >
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h2>
            <p className="text-gray-600">View team performance metrics</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
