import React, { useState, useEffect } from "react";
import { transform } from "sucrase";
import { createRoot } from "react-dom/client";
import createMockExpress from "./expressMock";

/**
 * Captures console.log and console.error output during execution.
 * @param {Function} executionBlock Async function containing the untrusted code
 * @returns {Promise<{logs: string[], error: string|null, result: any}>}
 */
export const executeWithConsoleCapture = async (executionBlock) => {
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  let executionError = null;
  let result = null;

  console.log = (...args) => {
    logs.push(
      args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")
    );
  };
  console.error = (...args) => {
    logs.push("ERROR: " + args.map((a) => String(a)).join(" "));
  };

  try {
    result = await executionBlock();
  } catch (err) {
    executionError = err.message;
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  return { logs, error: executionError, result };
};

/**
 * Executes standard JS or Node.js code in a sandboxed Function scope.
 * Mocks basic Node.js dependencies if required.
 */
export const executeJS = async (code, customInput = null) => {
  let codeToRun = code;

  // Provide stdin via a constant if customInput is present
  if (customInput !== null && customInput !== "") {
    let parsedInput;
    try {
      parsedInput = JSON.parse(customInput);
    } catch {
      parsedInput = customInput; // fallback to raw string
    }
    // Prepend 'input' variable declaration
    codeToRun = `const input = ${JSON.stringify(parsedInput)};\n` + codeToRun;
  }

  return executeWithConsoleCapture(async () => {
    // Basic mock modules for require
    const mockRequire = (moduleName) => {
      // Stub node modules just in case (e.g., path, fs stub, etc)
      if (moduleName === 'path') return { join: (...args) => args.join('/') };
      if (moduleName === 'fs') throw new Error("fs module is not supported in the browser sandbox.");
      if (moduleName === 'http' || moduleName === 'https') {
        return {
          createServer: () => ({
            listen: (port, cb) => {
              console.log(`[Mock Server] Simulated server successfully started on port ${port}`);
              if (cb) cb();
            }
          })
        };
      }
      return {};
    };

    const fn = new Function(
      "require",
      "exports",
      "module",
      `return (async () => {
         try {
           ${codeToRun}
         } catch (e) {
           console.error(e.message);
         }
       })();`
    );

    const exports = {};
    const module = { exports };
    await fn(mockRequire, exports, module);
    return module.exports;
  });
};

/**
 * Transpiles React JSX code securely to vanilla JavaScript and attempts to 
 * mount any exported default component to a DOM ref.
 */
export const executeReactPreview = async (code, previewRefDOMNode) => {
  if (!previewRefDOMNode) throw new Error("Preview DOM Node is required.");

  return executeWithConsoleCapture(async () => {
    // 1. Transpile Code (JSX -> Vanilla JS) using Sucrase
    const compiledCode = transform(code, {
      transforms: ["jsx", "imports"],
      production: true,
    }).code;

    // 2. Mock 'require' scoped for React rendering
    const mockRequire = (moduleName) => {
      if (moduleName === "react") return React;
      if (moduleName === "react-dom/client") return { createRoot };
      if (moduleName === "react-dom")
        return {
          createRoot,
          render: () => console.warn("Legacy render is disabled. Use createRoot."),
        };
      throw new Error(`Module '${moduleName}' not found in React playground`);
    };

    const exports = {};
    const module = { exports };

    const fn = new Function(
      "React",
      "useState",
      "useEffect",
      "require",
      "exports",
      "module",
      `return (async () => {
         try {
           ${compiledCode}
         } catch(err) {
           console.error(err.message);
         }
       })();`
    );

    await fn(React, useState, useEffect, mockRequire, exports, module);

    // 3. Mount 'export default Component' exactly as provided
    const RenderableComponent = module.exports.default || exports.default;
    if (RenderableComponent && typeof RenderableComponent === "function") {
      try {
        const root = createRoot(previewRefDOMNode);
        root.render(React.createElement(RenderableComponent));
        console.log("✓ Rendered exported UI component successfully");
        return { root };
      } catch (err) {
        console.error("Render Error: " + err.message);
      }
    } else {
      console.warn("No default export found. Please `export default YourComponent;`.");
    }
  });
};

/**
 * Instantiates the mock Express server locally in memory and executes the routes definitions against it.
 */
export const executeExpressMock = async (code) => {
  const { expressApp, instance } = createMockExpress();

  const executionPayload = await executeWithConsoleCapture(async () => {
    const mockRequire = (moduleName) => {
      if (moduleName === "express") return expressApp;
      throw new Error(`Mock Express sandbox does not support require('${moduleName}')`);
    };

    const exports = {};
    const module = { exports };

    const fn = new Function(
      "require",
      "exports",
      "module",
      `return (async () => {
         try {
           ${code}
         } catch(err) {
           console.error(err.message);
         }
       })();`
    );

    await fn(mockRequire, exports, module);
  });

  return { ...executionPayload, expressInstance: instance };
};
