import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl border-4 border-white/30 backdrop-blur">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
              <p className="text-blue-100 text-lg">{user.email}</p>
              <div className="mt-3 inline-block bg-white/20 px-4 py-1 rounded-full border border-white/40 backdrop-blur">
                <span className="font-semibold text-sm">{user.role === 'instructor' ? '👨‍🏫 Instructor' : user.role === 'admin' ? '🛡️ Administrator' : '👨‍🎓 Student'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Name Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-blue-300 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">👤</span>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Full Name</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{user.name}</p>
          </div>

          {/* Email Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-blue-300 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📧</span>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email Address</h3>
            </div>
            <p className="text-lg font-semibold text-blue-600 break-all">{user.email}</p>
          </div>

          {/* Role Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-blue-300 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{user.role === 'instructor' ? '👨‍🏫' : user.role === 'admin' ? '🛡️' : '👨‍🎓'}</span>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">User Role</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">{user.role}</p>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-blue-300 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✓</span>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account Status</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
          </div>
        </div>

        {/* Instructor/Admin Additional Info */}
        {(user.role === 'instructor' || user.role === 'admin') && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span>💼</span>
              Professional Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Specialization */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">🎓 Specialization</div>
                <p className="text-xl font-bold text-gray-900">{user.specialization || 'Not specified'}</p>
              </div>

              {/* Experience */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <div className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">📊 Experience</div>
                <p className="text-xl font-bold text-gray-900">{user.experience || 0} years</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 