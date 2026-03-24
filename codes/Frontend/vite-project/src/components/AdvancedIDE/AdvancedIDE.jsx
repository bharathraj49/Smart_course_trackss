import React, { useState, useRef, useEffect } from "react";
import CodeEditorPane from "./CodeEditorPane";
import ConsoleOutput from "./ConsoleOutput";
import ExpressTester from "./ExpressTester";
import { executeJS, executeReactPreview, executeExpressMock } from "./utils/sandboxExecutor";

const AdvancedIDE = ({
    initialCode = "",
    initialLanguage = "javascript",
    onCodeChange,
    readOnly = false,
    height = "100%",
}) => {
    const [code, setCode] = useState(initialCode);
    const [language, setLanguage] = useState(initialLanguage);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        if (onCodeChange) {
            onCodeChange(newCode);
        }
    };

    // Execution state
    const [output, setOutput] = useState("");
    const [error, setError] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState("console"); // console, preview, express

    // Input state (for custom test cases / quick testing JS)
    const [customInput, setCustomInput] = useState("");

    // React state
    const previewRef = useRef(null);
    const rootRef = useRef(null);

    // Express state
    const [expressInstance, setExpressInstance] = useState(null);

    useEffect(() => {
        setCode(initialCode);
        if (onCodeChange) onCodeChange(initialCode);
    }, [initialCode]);

    useEffect(() => {
        setLanguage(initialLanguage);
        switch (initialLanguage) {
            case "react":
                setActiveRightTab("preview");
                break;
            case "express":
                setActiveRightTab("express");
                break;
            default:
                setActiveRightTab("console");
        }
    }, [initialLanguage]);

    const cleanupReactPreview = () => {
        if (rootRef.current) {
            rootRef.current.unmount();
            rootRef.current = null;
        }
        if (previewRef.current) {
            previewRef.current.innerHTML = "";
        }
    };

    const runCode = async () => {
        setIsRunning(true);
        setError(null);
        setOutput("");
        setExpressInstance(null);
        cleanupReactPreview();

        try {
            if (language === "javascript" || language === "node") {
                setActiveRightTab("console");
                const { logs, error: execError } = await executeJS(code, customInput);
                setOutput(logs.join("\\n"));
                setError(execError);

            } else if (language === "react") {
                setActiveRightTab("preview");
                const { logs, error: execError, result } = await executeReactPreview(code, previewRef.current);
                setOutput(logs.join("\\n"));
                setError(execError);
                if (result?.root) {
                    rootRef.current = result.root;
                }

            } else if (language === "express") {
                setActiveRightTab("express");
                const { logs, error: execError, expressInstance: instance } = await executeExpressMock(code);
                setOutput(logs.join("\n"));
                setError(execError);
                setExpressInstance(instance);
            } else {
                setError(`Execution for '${language}' is not supported yet.`);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div
            className="flex flex-col bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-[#3e3e42]"
            style={{ height }}
        >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e42]">
                <div className="flex items-center gap-4">
                    <select
                        value={language}
                        onChange={(e) => {
                            setLanguage(e.target.value);
                            if (e.target.value === 'react') setActiveRightTab('preview');
                            else if (e.target.value === 'express') setActiveRightTab('express');
                            else setActiveRightTab('console');
                        }}
                        className="bg-[#1e1e1e] text-white border border-[#3e3e42] rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
                    >
                        <option value="javascript">JavaScript (Browser)</option>
                        <option value="node">Node.js (Sandboxed)</option>
                        <option value="react">React.js (Preview)</option>
                        <option value="express">Express.js (Mock Server)</option>
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded shadow transition-colors disabled:opacity-50"
                    >
                        {isRunning ? "Running..." : "▶ Run"}
                    </button>
                </div>
            </div>

            {/* Main Split Interface */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                {/* Left Side: Editor + Input */}
                <div className="flex flex-col flex-1 border-r border-[#3e3e42] min-h-[300px]">
                    {/* Editor */}
                    <div className="flex-[2] overflow-hidden">
                        <CodeEditorPane
                            language={language}
                            code={code}
                            setCode={handleCodeChange}
                            readOnly={readOnly}
                        />
                    </div>

                    {/* Stdin / Custom Test Case Input */}
                    <div className="flex-1 border-t border-[#3e3e42] bg-[#1e1e1e] flex flex-col min-h-[120px]">
                        <div className="bg-[#2d2d2d] text-gray-400 text-xs px-4 py-1.5 uppercase font-bold tracking-wider border-b border-[#3e3e42]">
                            Custom Test Case / Input (All formats supported)
                        </div>
                        <textarea
                            className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Type any test values here (string, JSON, CSV, multi-line). Available in your JS code as the `input` variable!"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right Side: Output / Preview / Express Tester */}
                <div className="w-full lg:w-[40%] bg-[#1e1e1e] flex flex-col border-t lg:border-t-0 min-h-[300px]">
                    {/* Right Tabs */}
                    <div className="flex bg-[#2d2d2d] border-b border-[#3e3e42]">
                        <button
                            onClick={() => setActiveRightTab('console')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${activeRightTab === 'console' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Console
                        </button>
                        {language === 'react' && (
                            <button
                                onClick={() => setActiveRightTab('preview')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${activeRightTab === 'preview' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                React Preview
                            </button>
                        )}
                        {language === 'express' && (
                            <button
                                onClick={() => setActiveRightTab('express')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${activeRightTab === 'express' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                HTTP Tester
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-auto relative">

                        <div className={`absolute inset-0 ${activeRightTab === 'console' ? 'block' : 'hidden'}`}>
                            <ConsoleOutput output={output} error={error} isRunning={isRunning} activeTab="console" setActiveTab={() => { }} />
                        </div>

                        <div className={`absolute inset-0 bg-white ${activeRightTab === 'preview' ? 'block' : 'hidden'}`}>
                            <div ref={previewRef} className="w-full h-full p-4 overflow-auto text-black relative">
                            </div>
                        </div>

                        <div className={`absolute inset-0 ${activeRightTab === 'express' ? 'block' : 'hidden'}`}>
                            <ExpressTester expressInstance={expressInstance} />
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdvancedIDE;
