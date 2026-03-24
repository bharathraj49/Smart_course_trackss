import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const CourseStudents = () => {
    const { id: courseId } = useParams();
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const [courseRes, studentsRes] = await Promise.all([
                axios.get(`/courses/${courseId}`),
                axios.get(`/courses/${courseId}/students`)
            ]);
            setCourse(courseRes.data);
            setStudents(studentsRes.data || []);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [courseId]);

    const handleIssueCertificate = async (userId, studentName) => {
        if (!confirm(`Are you sure you want to issue a certificate for ${studentName}?`)) return;

        try {
            const res = await axios.post(`/courses/${courseId}/students/${userId}/certificate`);
            alert(res.data.message || "Certificate issued successfully!");
            // Refresh list
            loadData();
        } catch (e) {
            alert(e.response?.data?.message || "Failed to issue certificate");
        }
    };

    if (user?.role !== "instructor" && user?.role !== "admin") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
                <div className="text-xl text-gray-900">You do not have access.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center pt-24">
                <h2 className="text-2xl text-red-600 mb-4">Error loading data</h2>
                <p className="text-gray-700">{error}</p>
                <Link to="/instructor/courses" className="text-blue-600 hover:underline mt-4 inline-block">Return to My Courses</Link>
            </div>
        );
    }

    const totalModules = course?.contents?.length || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Link to="/instructor/courses" className="text-blue-600 hover:underline mb-4 inline-block font-semibold">
                        &larr; Back to My Courses
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        👥 Students Enrolled
                    </h1>
                    <p className="text-gray-600 text-lg">
                        {course?.title}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 font-bold text-gray-700 uppercase tracking-wider text-sm">Student</th>
                                    <th className="p-4 font-bold text-gray-700 uppercase tracking-wider text-sm">Enrollment Date</th>
                                    <th className="p-4 font-bold text-gray-700 uppercase tracking-wider text-sm">Progress</th>
                                    <th className="p-4 font-bold text-gray-700 uppercase tracking-wider text-sm text-center">Status</th>
                                    <th className="p-4 font-bold text-gray-700 uppercase tracking-wider text-sm text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500 text-lg">
                                            No students enrolled in this course yet.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((enrollment) => {
                                        const completedCount = enrollment.progress?.completedIndices?.length || 0;
                                        const isCompleted = totalModules > 0 && completedCount >= totalModules;
                                        const hasCertificate = enrollment.certificate?.issued;

                                        return (
                                            <tr key={enrollment._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900">{enrollment.user?.name || "Unknown"}</div>
                                                    <div className="text-sm text-gray-500">{enrollment.user?.email}</div>
                                                </td>
                                                <td className="p-4 text-gray-600">
                                                    {new Date(enrollment.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[150px]">
                                                            <div
                                                                className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-600' : 'bg-blue-600'}`}
                                                                style={{ width: `${totalModules === 0 ? 0 : (completedCount / totalModules) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {completedCount} / {totalModules} modules
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {hasCertificate ? (
                                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-300">
                                                            🏆 Certified
                                                        </span>
                                                    ) : isCompleted ? (
                                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold border border-yellow-300">
                                                            ⭐ Eligible
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-300">
                                                            📖 In Progress
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {hasCertificate ? (
                                                        <div className="text-xs font-mono text-gray-500 flex flex-col items-center">
                                                            <span>ID: {enrollment.certificate.certificateId}</span>
                                                            <span className="text-[10px] mt-1">
                                                                {new Date(enrollment.certificate.issuedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ) : isCompleted ? (
                                                        <button
                                                            onClick={() => handleIssueCertificate(enrollment.user._id, enrollment.user?.name)}
                                                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded shadow hover:shadow-lg hover:scale-105 transition-all text-sm"
                                                        >
                                                            Issue Certificate
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm italic">Not Eligible</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseStudents;
