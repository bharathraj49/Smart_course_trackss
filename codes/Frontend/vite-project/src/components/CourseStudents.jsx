import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const fmtTime = (secs) => {
    if (!secs || secs <= 0) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.join(' ');
};

const CourseStudents = () => {
    const { id: courseId } = useParams();
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    const toggleExpand = (studentId) => {
        setExpandedStudentId(prev => (prev === studentId ? null : studentId));
    };

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
        if (!confirm(`Are you sure you want to issue a course certificate for ${studentName}?`)) return;

        try {
            const res = await axios.post(`/courses/${courseId}/students/${userId}/certificate`);
            alert(res.data.message || "Certificate issued successfully!");
            // Refresh list
            loadData();
        } catch (e) {
            alert(e.response?.data?.message || "Failed to issue course certificate");
        }
    };

    const handleIssueModuleCertificate = async (userId, moduleIndex, moduleTitle, studentName) => {
        if (!confirm(`Are you sure you want to issue a certificate for module "${moduleTitle}" to ${studentName}?`)) return;

        try {
            const res = await axios.post(`/courses/${courseId}/students/${userId}/modules/${moduleIndex}/certificate`);
            alert(res.data.message || "Module Certificate issued successfully!");
            // Refresh list
            loadData();
        } catch (e) {
            alert(e.response?.data?.message || "Failed to issue module certificate");
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
                                            <React.Fragment key={enrollment._id}>
                                                <tr
                                                    onClick={() => toggleExpand(enrollment._id)}
                                                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedStudentId === enrollment._id ? 'bg-indigo-50/50' : ''}`}
                                                >
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
                                                                onClick={(e) => { e.stopPropagation(); handleIssueCertificate(enrollment.user._id, enrollment.user?.name); }}
                                                                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded shadow hover:shadow-lg hover:scale-105 transition-all text-sm mb-2"
                                                            >
                                                                Issue Certificate
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm italic block mb-2">Not Eligible</span>
                                                        )}

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleExpand(enrollment._id); }}
                                                            className="mt-2 flex items-center justify-center gap-1 mx-auto px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg text-xs font-bold transition-all border border-indigo-200 shadow-sm"
                                                        >
                                                            {expandedStudentId === enrollment._id ? (
                                                                <>Hide Details <span className="text-[10px]">▲</span></>
                                                            ) : (
                                                                <>View Details <span className="text-[10px]">▼</span></>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {/* Expanded Details Row */}
                                                {expandedStudentId === enrollment._id && (
                                                    <tr className="bg-gray-50/50 border-b border-gray-200">
                                                        <td colSpan="5" className="p-0">
                                                            <div className="p-6 border-l-4 border-indigo-500 rounded-br-lg rounded-bl-lg">
                                                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                                    <span className="text-xl">📊</span> Detailed Progress
                                                                </h3>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {course?.contents?.map((module, idx) => {
                                                                        const isModCompleted = enrollment.progress?.completedIndices?.includes(idx);
                                                                        const moduleTimeDoc = enrollment.moduleTimes?.find(mt => mt.moduleIndex === idx);
                                                                        const timeSpent = moduleTimeDoc ? moduleTimeDoc.totalSeconds : 0;

                                                                        // Depending on mongoose lean output, map keys might be stored directly
                                                                        const quizData = enrollment.progress?.quizResults?.[idx.toString()];

                                                                        const showQuiz = module.type === 'section' || module.type === 'quiz';

                                                                        return (
                                                                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isModCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                                                <div className="font-bold text-gray-800 text-sm truncate pl-2" title={module.title}>
                                                                                    {idx + 1}. {module.title || `Module ${idx + 1}`}
                                                                                </div>

                                                                                <div className="flex items-center justify-between text-xs mt-2 pl-2">
                                                                                    <span className="text-gray-500 font-semibold uppercase">Status</span>
                                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${isModCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                        {isModCompleted ? 'COMPLETED' : 'INCOMPLETE'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center justify-between text-xs pl-2">
                                                                                    <span className="text-gray-500 font-semibold uppercase">Time Spent</span>
                                                                                    <span className="font-bold text-indigo-700">{fmtTime(timeSpent)}</span>
                                                                                </div>

                                                                                {showQuiz && (
                                                                                    <div className="flex items-center justify-between text-xs pl-2 pt-2 border-t border-gray-100 mt-1">
                                                                                        <span className="text-gray-500 font-semibold uppercase">Quiz Attended</span>
                                                                                        {quizData ? (
                                                                                            <span className="font-bold">
                                                                                                {quizData.scorePercent}%
                                                                                                <span className={`ml-1 text-[10px] ${quizData.passed ? 'text-green-600' : 'text-red-600'}`}>
                                                                                                    ({quizData.passed ? 'Pass' : 'Fail'})
                                                                                                </span>
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-gray-400 italic">No</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {isModCompleted && (
                                                                                    <div className="flex items-center justify-between text-xs pl-2 pt-2 border-t border-gray-100 mt-1">
                                                                                        <span className="text-gray-500 font-semibold uppercase">Certificate</span>
                                                                                        {enrollment.progress?.moduleCertificates?.[idx.toString()]?.issued ? (
                                                                                            <div className="flex flex-col items-end">
                                                                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-bold border border-green-300">
                                                                                                    🏆 Certified
                                                                                                </span>
                                                                                                <span className="text-[9px] text-gray-400 mt-0.5">{enrollment.progress.moduleCertificates[idx.toString()].certificateId}</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); handleIssueModuleCertificate(enrollment.user._id, idx, module.title || `Module ${idx + 1}`, enrollment.user?.name); }}
                                                                                                className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded shadow hover:shadow-lg transition-all text-[10px]"
                                                                                            >
                                                                                                Issue Certificate
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
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
