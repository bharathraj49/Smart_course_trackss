import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAI } from "../contexts/AIContext";
import { useAuth } from "../contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const ChatBot = () => {
  const {
    isOpen,
    toggleChat,
    messages,
    addMessage,
    clearChat,
    context,
    getDynamicContext,
  } = useAI();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    addMessage("user", text);
    setInput("");
    setIsLoading(true);

    try {
      // Format history for Gemini
      const history = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Inject user details into context if available
      const dynamicContext = getDynamicContext ? getDynamicContext() : {};
      const enrichedContext = {
        ...context,
        ...dynamicContext,
        user: user ? { name: user.name, role: user.role } : null,
      };

      const response = await axios.post("http://localhost:5667/api/ai/chat", {
        message: text,
        context: enrichedContext,
        history: history,
      });

      addMessage("assistant", response.data.reply);
    } catch (error) {
      console.error("AI Chat Error:", error);
      addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-[#E5DDD5] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 border border-gray-300">
          {/* Header - WhatsApp Green */}
          <div className="bg-[#008069] p-3 flex justify-between items-center text-white shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <span className="text-2xl pt-1">🤖</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold text-base leading-tight">
                  AI Assistant
                </h3>
                <div className="text-xs text-green-100 opacity-90 truncate max-w-[150px]">
                  {isLoading ? "typing..." : "Online"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                title="Clear History"
                className="text-white hover:bg-white/10 rounded-full p-2 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                onClick={toggleChat}
                className="text-white hover:bg-white/10 rounded-full p-2 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#E5DDD5]"
            style={{
              backgroundImage:
                "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
              backgroundBlendMode: "overlay",
              backgroundSize: "400px",
            }}
          >
            {/* Context info bubble */}
            {context?.title && (
              <div className="flex justify-center mb-4">
                <div className="bg-[#FFF5C4] text-gray-800 text-xs px-3 py-1 rounded shadow-sm text-center max-w-[90%]">
                  Viewing: {context.title}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[85%] rounded-lg px-3 py-1.5 text-sm shadow-sm break-words ${msg.role === "user"
                    ? "bg-[#E7FFDB] text-gray-900 rounded-tr-none"
                    : "bg-white text-gray-900 rounded-tl-none"
                    }`}
                >
                  {/* Tail SVG */}
                  {msg.role === "user" ? (
                    <svg
                      viewBox="0 0 8 13"
                      height="13"
                      width="8"
                      className="absolute top-0 -right-[8px] fill-[#E7FFDB] drop-shadow-sm"
                    >
                      <path d="M0,0 L0,13 L8,0 Z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 8 13"
                      height="13"
                      width="8"
                      className="absolute top-0 -left-[8px] fill-white drop-shadow-sm scale-x-[-1]"
                    >
                      <path d="M0,0 L0,13 L8,0 Z" />
                    </svg>
                  )}

                  <div className="leading-relaxed">
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            const codeString = String(children).replace(
                              /\n$/,
                              "",
                            );

                            if (!inline && match) {
                              return (
                                <div className="rounded-md overflow-hidden my-2 border border-gray-200">
                                  <div className="bg-gray-100 px-3 py-1 flex justify-between items-center border-b border-gray-200">
                                    <span className="text-xs font-mono font-semibold text-gray-600">
                                      {match[1].toUpperCase()}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          codeString,
                                        );
                                        // Optional: Add visual feedback toast
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                      Copy
                                    </button>
                                  </div>
                                  <SyntaxHighlighter
                                    style={oneLight}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                      margin: 0,
                                      fontSize: "12px",
                                    }}
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }
                            return (
                              <code
                                className={`${className} bg-gray-100 rounded px-1 py-0.5 text-xs font-mono text-red-600`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          // Tailor other elements to fit chat bubble
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc ml-4 mb-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal ml-4 mb-2">
                              {children}
                            </ol>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  <div
                    className={`text-[10px] bg-transparent text-right mt-1 ${msg.role === "user" ? "text-green-800/60" : "text-gray-400"}`}
                  >
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex gap-1 relative">
                  <svg
                    viewBox="0 0 8 13"
                    height="13"
                    width="8"
                    className="absolute top-0 -left-[8px] fill-white drop-shadow-sm scale-x-[-1]"
                  >
                    <path d="M0,0 L0,13 L8,0 Z" />
                  </svg>
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 bg-[#F0F2F5] flex items-end gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex flex-1 gap-2 items-center"
            >
              <div className="flex-1 bg-white rounded-2xl px-4 py-2 shadow-sm border border-white focus-within:border-white">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 bg-[#008069] text-white rounded-full hover:bg-[#006e5a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  height="20"
                  width="20"
                  className="fill-current"
                >
                  <path d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Float Button - WhatsApp Style */}
      <button
        onClick={toggleChat}
        className="group flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 bg-[#25D366] hover:bg-[#20bd5a] hover:scale-105"
      >
        <span className="text-3xl text-white">
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              height="28"
              width="28"
              className="fill-white"
            >
              <path d="M12.031,6.172c-3.181,0-5.767,2.586-5.768,5.766c-0.001,1.299,0.38,2.425,1.045,3.58l-0.744,3.283l3.359-0.881	c1.093,0.595,2.107,0.813,3.108,0.813c3.18,0,5.767-2.585,5.767-5.766C17.799,8.758,15.212,6.172,12.031,6.172z M2.18,1.908	c-0.638,0.732-0.638,3.561,0,4.293C2.818,6.932,12,17,12,17s9.182-10.068,9.82-10.799c0.638-0.732,0.638-3.561,0-4.293	C21.182,1.177,12,11,12,11S2.818,1.177,2.18,1.908z"></path>
              <path d="M12.001,0C5.373,0,0,5.373,0,12c0,6.627,5.373,12,12.001,12C18.627,24,24,18.627,24,12C24,5.373,18.627,0,12.001,0z M12.031,21.963	c-2.006,0-3.699-0.902-4.965-1.74l-4.721,1.238l1.046-4.615c-0.932-1.621-1.467-3.204-1.466-5.03c0-4.945,4.023-8.967,8.968-8.967	c4.945,0,8.967,4.022,8.967,8.967S16.976,21.963,12.031,21.963z"></path>
            </svg>
          )}
        </span>
        <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Chat with AI
        </span>
      </button>
    </div>
  );
};

export default ChatBot;
