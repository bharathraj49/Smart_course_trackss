import React from "react";
import Editor from "@monaco-editor/react";

const CodeEditorPane = ({ language, code, setCode, readOnly = false }) => {
    return (
        <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
            <div className="flex bg-[#2d2d2d] text-gray-400 text-xs px-4 py-2 uppercase font-bold tracking-wider rounded-tl-xl border-b border-[#3e3e42]">
                Source Code ({language})
            </div>
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    language={language === "node" || language === "react" || language === "express" ? "javascript" : language}
                    value={code}
                    theme="vs-dark"
                    onChange={(val) => setCode(val)}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        readOnly: readOnly,
                    }}
                />
            </div>
        </div>
    );
};

export default CodeEditorPane;
