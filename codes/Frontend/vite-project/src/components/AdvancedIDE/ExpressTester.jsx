import React, { useState } from "react";

/**
 * Provides a UI to setup Mock HTTP testing when the selected language is Express.
 * Uses the simulated instance returned by the executor to send events natively.
 */
const ExpressTester = ({ expressInstance }) => {
    const [method, setMethod] = useState("GET");
    const [route, setRoute] = useState("/api");
    const [body, setBody] = useState("");
    const [response, setResponse] = useState(null);

    const handleSendRequest = async () => {
        if (!expressInstance) return;

        try {
            const res = await expressInstance.simulateRequest(method, route, body);
            setResponse(res);
        } catch (e) {
            setResponse({ status: 'Exception', data: e.message });
        }
    };

    if (!expressInstance) {
        return (
            <div className="p-4 text-gray-500 italic text-sm">
                Run your Express server from the Code panel first to start accepting mock requests.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-sm overflow-auto">
            <div className="p-4 space-y-4">
                <div className="font-bold text-gray-300 border-b border-[#3e3e42] pb-2">
                    Mock HTTP Request
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-24 shrink-0 bg-[#2d2d2d] text-white rounded px-3 py-2 border border-[#3e3e42] focus:border-blue-500 focus:outline-none"
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                    <input
                        type="text"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                        placeholder="/api/users"
                        className="flex-1 min-w-[120px] bg-[#2d2d2d] text-white rounded px-3 py-2 border border-[#3e3e42] focus:border-blue-500 focus:outline-none placeholder-gray-600"
                    />
                    <button
                        onClick={handleSendRequest}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Send
                    </button>
                </div>

                {(method === "POST" || method === "PUT") && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Request Body (JSON)</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder='{"name": "test"}'
                            className="w-full bg-[#2d2d2d] text-white rounded px-3 py-2 border border-[#3e3e42] focus:border-blue-500 focus:outline-none font-mono text-xs h-24 whitespace-pre"
                        />
                    </div>
                )}

                {response && (
                    <div className="mt-4 border-t border-[#3e3e42] pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-300">Response</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${response.status >= 200 && response.status < 300
                                ? 'bg-green-900/40 text-green-400'
                                : 'bg-red-900/40 text-red-400'
                                }`}>
                                {response.status}
                            </span>
                        </div>
                        <pre className="bg-[#181818] p-3 rounded font-mono text-xs text-blue-300 whitespace-pre-wrap border border-[#2d2d2d]">
                            {typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data)}
                        </pre>
                    </div>
                )}
            </div>
        </div >
    );
};

export default ExpressTester;
