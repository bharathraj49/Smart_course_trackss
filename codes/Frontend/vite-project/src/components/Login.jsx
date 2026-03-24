import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) navigate('/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-white/40 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xl shadow-lg">S</div>
            <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome Back</h2>
            <p className="mt-3 text-sm text-gray-600 font-medium">Continue your learning journey</p>
            <p className="mt-4 text-xs text-gray-500">New here? <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Create an account</Link></p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">📧 Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white/50" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
              </div>
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">🔐 Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white/50" placeholder="••••••••" value={formData.password} onChange={handleChange} />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium">⚠️ {error}</div>
            )}

            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">{isLoading ? '✓ Signing in…' : '→ Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
