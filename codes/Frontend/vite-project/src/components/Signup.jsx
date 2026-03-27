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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">

      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border-2 border-gray-200 transition-all duration-300">
          <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-3xl shadow-lg mb-6">S</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Begin Your Journey</h2>
            <p className="mt-3 text-lg text-gray-600">Join thousands of learners worldwide</p>
            <p className="mt-4 text-sm text-gray-600">Already have an account? <Link to="/login" className="font-semibold text-blue-600 hover:text-indigo-600 hover:underline transition-colors">Sign in here</Link></p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="group">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">👤 Full Name</label>
                <input id="name" name="name" type="text" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="Your name" value={formData.name} onChange={handleChange} />
                {errors.name && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.name}</p>}
              </div>
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">📧 Email Address</label>
                <input id="email" name="email" type="email" autoComplete="email" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                {errors.email && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.email}</p>}
              </div>
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">🔐 Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                {errors.password && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.password}</p>}
              </div>
              <div className="group">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">✓ Confirm Password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} />
                {errors.confirmPassword && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.confirmPassword}</p>}
              </div>
              <div className="group">
                <label htmlFor="role" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">🎓 Account Type</label>
                <select id="role" name="role" className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white cursor-pointer" value={formData.role} onChange={handleChange}>
                  <option value="user">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'instructor' && (
                <>
                  <div className="group bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-200">
                    <label htmlFor="specialization" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">🎯 Specialization *</label>
                    <input id="specialization" name="specialization" type="text" required className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="e.g., Web Development, Data Science" value={formData.specialization} onChange={handleChange} />
                    {errors.specialization && <p className="mt-2 text-xs text-red-600 font-medium">✕ {errors.specialization}</p>}
                  </div>
                  <div className="group bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-200">
                    <label htmlFor="experience" className="block text-sm font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">📚 Years of Experience</label>
                    <input id="experience" name="experience" type="number" min="0" className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all bg-white" placeholder="0" value={formData.experience} onChange={handleChange} />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800 font-medium">⚠️ {error}</div>
            )}

            <button type="submit" disabled={isLoading} className="mt-8 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg">{isLoading ? '✓ Creating account…' : '→ Create account'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
