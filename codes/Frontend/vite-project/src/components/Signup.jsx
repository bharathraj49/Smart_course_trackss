import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    specialization: '',
    experience: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register, error, clearError, isAuthenticated } = useAuth();
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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (formData.role === 'instructor' && !formData.specialization.trim()) newErrors.specialization = 'Specialization is required for instructors';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role
    };
    if (formData.role === 'instructor') {
      userData.specialization = formData.specialization;
      userData.experience = parseInt(formData.experience) || 0;
    }

    const result = await register(userData);
    if (result.success) navigate('/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      
      <div className="max-w-lg w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-white/40 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
          <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 via-teal-600 to-blue-600 text-white font-bold text-xl shadow-lg">✨</div>
            <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Begin Your Journey</h2>
            <p className="mt-3 text-sm text-gray-600 font-medium">Join thousands of learners worldwide</p>
            <p className="mt-4 text-xs text-gray-500">Already have an account? <Link to="/login" className="font-semibold text-green-600 hover:text-green-700 transition-colors">Sign in here</Link></p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-green-600 transition-colors">👤 Full Name</label>
                <input id="name" name="name" type="text" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white/50" placeholder="Your name" value={formData.name} onChange={handleChange} />
                {errors.name && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.name}</p>}
              </div>
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-green-600 transition-colors">📧 Email Address</label>
                <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white/50" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                {errors.email && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.email}</p>}
              </div>
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-green-600 transition-colors">🔐 Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white/50" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.password}</p>}
              </div>
              <div className="group">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-green-600 transition-colors">✓ Confirm Password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white/50" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} />
                {errors.confirmPassword && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.confirmPassword}</p>}
              </div>
              <div className="group">
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-green-600 transition-colors">🎓 Account Type</label>
                <select id="role" name="role" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white/50 cursor-pointer" value={formData.role} onChange={handleChange}>
                  <option value="user">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'instructor' && (
                <>
                  <div className="group bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-200">
                    <label htmlFor="specialization" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-amber-700 transition-colors">🎯 Specialization *</label>
                    <input id="specialization" name="specialization" type="text" required className="w-full px-4 py-3 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all duration-200 bg-white/70" placeholder="e.g., Web Development, Data Science" value={formData.specialization} onChange={handleChange} />
                    {errors.specialization && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.specialization}</p>}
                  </div>
                  <div className="group bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-200">
                    <label htmlFor="experience" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-amber-700 transition-colors">📚 Years of Experience</label>
                    <input id="experience" name="experience" type="number" min="0" className="w-full px-4 py-3 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all duration-200 bg-white/70" placeholder="0" value={formData.experience} onChange={handleChange} />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium">⚠️ {error}</div>
            )}

            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">{isLoading ? '✓ Creating account…' : '→ Create account'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
