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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">

      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border-2 border-gray-200 transition-all duration-300">
          <div className="mb-8 text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-3 text-lg text-gray-600">Continue your learning journey</p>
            <p className="mt-4 text-sm text-gray-600">New here? <Link to="/signup" className="font-semibold text-blue-600 hover:text-indigo-600 hover:underline transition-colors">Create an account</Link></p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">📧 Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
              </div>
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">🔐 Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="••••••••" value={formData.password} onChange={handleChange} />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800 font-medium">⚠️ {error}</div>
            )}

            <button type="submit" disabled={isLoading} className="mt-8 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg">{isLoading ? '✓ Signing in…' : '→ Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
