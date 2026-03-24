import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CertificateModal = ({ isOpen, onClose, certificate, course, studentName }) => {
    const certificateRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    if (!isOpen || !certificate || !course) return null;

    const handleDownloadPDF = async () => {
        if (!certificateRef.current) return;
        try {
            setDownloading(true);

            // To ensure high quality, we scale the canvas
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2, // 2 is usually stable across all browsers without crashing
                useCORS: true,
                logging: false,
                backgroundColor: "#fbfcfa"
            });

            const imgData = canvas.toDataURL("image/png");

            // PDF configuration (Landscape A4 size is roughly 842 x 595 px)
            // We use the canvas aspect ratio but fit it to a standard page size safely
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_certificate.pdf`);

        } catch (err) {
            console.error("Failed to generate PDF", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const formattedDate = new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden relative animate-fade-in-up">

                {/* Header Controls */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80">
                    <h3 className="text-xl font-bold text-gray-800">Your Certificate</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Certificate Preview Area (Scrollable if needed on small screens) */}
                <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-gray-200/50">

                    {/* ACCURATE TEMPLATE CONTAINER */}
                    {/* Width and aspect ratio tuned to roughly match a standard landscape certificate */}
                    <div
                        ref={certificateRef}
                        className="bg-[#fbfcfa] relative overflow-hidden flex flex-col items-center justify-between"
                        style={{
                            width: "800px",
                            height: "600px",
                            minWidth: "800px", // Force rendering size for html2canvas
                            minHeight: "600px",
                            padding: "0"
                        }}
                    >
                        {/* Top Yellow Ribbon */}
                        <div className="w-full h-8 bg-[#ffd700] mt-8" />

                        {/* Main Content Body */}
                        <div className="flex-1 flex flex-col items-center w-full px-16 text-center pt-8">

                            <h1 className="text-4xl font-extrabold text-[#004f8b] tracking-wide mb-2" style={{ fontFamily: "Arial, sans-serif" }}>
                                SMART COURSE TRACK
                            </h1>
                            <h2 className="text-2xl font-medium text-[#cc0000] mb-8" style={{ fontFamily: "Arial, sans-serif" }}>
                                Certificate of Completion
                            </h2>

                            <p className="text-lg text-[#1f2937] mb-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                This is to proudly certify that
                            </p>

                            <h3 className="text-4xl font-semibold text-[#008033] mb-6">
                                {studentName}
                            </h3>

                            <p className="text-lg text-[#1f2937] leading-relaxed max-w-[90%]" style={{ fontFamily: "Arial, sans-serif" }}>
                                has successfully completed the course <span className="font-bold text-[#111827]">{course.title}</span> with dedication, commitment, and excellence.
                            </p>

                            {/* Details Grid */}
                            <div className="mt-12 flex flex-col items-center space-y-3" style={{ fontFamily: "Arial, sans-serif" }}>
                                <p className="text-lg text-[#1f2937]">
                                    <strong className="text-[#111827]">Date:</strong> {formattedDate}
                                </p>
                                <p className="text-lg text-[#1f2937]">
                                    <strong className="text-[#111827]">Certificate ID:</strong> {certificate.certificateId}
                                </p>
                            </div>

                            {/* Signature Area */}
                            <div className="mt-auto mb-16 flex flex-col items-center">
                                <div className="w-72 border-b border-[#1f2937] mb-2" />
                                <p className="text-[#1f2937] text-lg" style={{ fontFamily: "Arial, sans-serif" }}>Authorized Signature</p>
                            </div>

                        </div>

                        {/* Bottom Blue Ribbon */}
                        <div className="w-full h-12 bg-[#004f8b] mb-12" />

                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-4 items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {downloading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating PDF...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download as PDF
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CertificateModal;
