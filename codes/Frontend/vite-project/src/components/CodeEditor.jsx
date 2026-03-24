import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { transform } from "sucrase";
import { createRoot } from "react-dom/client";

const CodeEditor = ({
  initialCode = "",
  language = "javascript",
  onCodeChange,
  readOnly = false,
}) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  // eslint-disable-next-line
  const handleEditorDidMount = (editor, _monaco) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    setCode(value);
    if (onCodeChange) onCodeChange(value);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");

    // Cleanup previous render if exists
    if (rootRef.current) {
      rootRef.current.unmount();
      rootRef.current = null;
    }
    // Clear preview div content manually just in case
    if (previewRef.current) {
      previewRef.current.innerHTML = "";
    }

    try {
      if (language === "javascript" || language === "jsx") {
        const logs = [];
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;

        // Hijack console
        console.log = (...args) => {
          logs.push(
            args
              .map((arg) =>
                typeof arg === "object"
                  ? JSON.stringify(arg, null, 2)
                  : String(arg),
              )
              .join(" "),
          );
        };
        console.error = (...args) => {
          logs.push("ERROR: " + args.map((a) => String(a)).join(" "));
        };

        try {
          // 1. Transpile Code (JSX -> JS)
          const compiledCode = transform(code, {
            transforms: ["jsx", "imports"],
            production: true,
          }).code;

          // 2. Execute safely
          // Provide React in scope for JSX
          const exports = {};
          const require = (moduleName) => {
            if (moduleName === "react") return React;
            if (moduleName === "react-dom/client") return { createRoot };
            if (moduleName === "react-dom")
              return {
                createRoot,
                render: () => console.warn("Use createRoot"),
              };
            throw new Error(`Module '${moduleName}' not found in playground`);
          };

          // Create a function that executes the code with specific scope
          // We use a simple trick: 'with' statement is deprecated/strict mode issues,
          // so we pass variables as arguments to a Function
          const f = new Function(
            "React",
            "useState",
            "useEffect",
            "exports",
            "require",
            `return (async () => {
               try {
                 ${compiledCode}
               } catch(err) {
                 console.error(err.message);
               }
             })();`,
          );

          await f(React, useState, useEffect, exports, require);

          // 3. Render if component exported
          if (
            exports.default &&
            typeof exports.default === "function" &&
            previewRef.current
          ) {
            try {
              const Element = exports.default;
              const root = createRoot(previewRef.current);
              root.render(<Element />);
              rootRef.current = root;
              logs.push("✓ Rendered exported component to UI Preview");
            } catch (err) {
              console.error("Render Error: " + err.message);
            }
          }
        } catch (e) {
          logs.push(`Compilation/Runtime Error: ${e.message}`);
        } finally {
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
        }

        setOutput(
          logs.length > 0
            ? logs.join("\n")
            : "✓ Executed successfully (No output)",
        );
      } else {
        setOutput(
          `Execution for ${language} is not supported in this environment.`,
        );
      }
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    alert("Code copied!");
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#333] shadow-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-sm tracking-widest">
            {language.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">Monaco Editor</span>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <button
              onClick={runCode}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
            >
              {isRunning ? "Running..." : "▶ Run"}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Editor & Output Split */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 min-h-[300px] border-r border-[#333] relative">
          <Editor
            height="100%"
            defaultLanguage={language === "jsx" ? "javascript" : language}
            language={language === "jsx" ? "javascript" : language}
            value={code}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
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

        {/* Output Area */}
        <div className="w-full lg:w-1/3 bg-[#1e1e1e] flex flex-col min-h-[200px] lg:h-auto border-t lg:border-t-0 lg:border-l border-[#333]">
          <div className="px-4 py-2 bg-[#252526] text-xs font-bold text-gray-400 border-b border-[#333] uppercase">
            Output / Console
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto flex flex-col gap-4">
            {/* UI Application Preview */}
            <div className="border border-[#444] rounded bg-white min-h-[150px] relative">
              <div className="absolute top-0 left-0 right-0 bg-gray-100 text-[#333] px-2 py-1 text-xs border-b border-gray-300 font-sans">
                UI Preview
              </div>
              <div
                ref={previewRef}
                className="p-4 pt-8 text-black h-full"
              ></div>
            </div>

            {/* Console Output */}
            <div className="border-t border-[#333] pt-4">
              <div className="text-xs text-gray-500 mb-2">Console Output:</div>
              {output ? (
                <pre className="text-gray-300 whitespace-pre-wrap break-words">
                  {output}
                </pre>
              ) : (
                <div className="text-gray-600 italic">
                  Run code to see output...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
