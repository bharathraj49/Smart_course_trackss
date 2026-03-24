import React from "react";

const ConsoleOutput = ({ output, error, isRunning, activeTab, setActiveTab }) => {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#3e3e42]">

            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                {isRunning && (
                    <div className="text-gray-500 italic mb-2">Executing...</div>
                )}

                {/* Output */}
                {!isRunning && output && !error && (
                    <pre className="text-gray-300 whitespace-pre-wrap break-words">
                        {output}
                    </pre>
                )}

                {/* Error */}
                {!isRunning && error && (
                    <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-500/30 whitespace-pre-wrap break-words">
                        Error:\\n{error}
                    </div>
                )}

                {!isRunning && !output && !error && (
                    <div className="text-gray-600 italic">No output. Run code to see results.</div>
                )}
            </div>
        </div >
    );
};

export default ConsoleOutput;
