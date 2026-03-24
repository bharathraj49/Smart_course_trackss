import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";

const AIContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState(null); // { title: string, description: string, content: string }

  // Persist messages in session storage so they survive refreshing but clear on close/logout if desired
  // For now, let's keep them in memory for SPA navigation, or localStorage for deeper persistence.
  // Let's use localStorage for "Quality of Life" persistence.
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("ai_chat_history");
    return saved
      ? JSON.parse(saved)
      : [
          {
            role: "assistant",
            content:
              "Hi! I am your AI Learning Assistant. I follow you across the app. Ask me anything!",
          },
        ];
  });

  useEffect(() => {
    localStorage.setItem("ai_chat_history", JSON.stringify(messages));
  }, [messages]);

  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const updateContext = useCallback((newContext) => {
    // Only update if meaningfully different to avoid re-renders or confusion
    setContext((prev) => ({ ...prev, ...newContext }));
  }, []);

  const getAssessmentHelp = useCallback(
    async (question, userAnswer, correctAnswer, courseContext) => {
      try {
        const response = await axios.post("/ai/assessment-help", {
          question,
          userAnswer,
          correctAnswer,
          courseContext,
        });
        return response.data;
      } catch (error) {
        console.error("Error getting assessment help:", error);
        throw error;
      }
    },
    [],
  );

  const addMessage = useCallback((role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const clearChat = useCallback(() => {
    const initialMsg = {
      role: "assistant",
      content: "Chat history cleared. How can I help you now?",
    };
    setMessages([initialMsg]);
    localStorage.setItem("ai_chat_history", JSON.stringify([initialMsg]));
  }, []);

  // Dynamic Context Provider (lazy evaluation for efficiency)
  const contextProviderRef = React.useRef(null);

  const registerContextProvider = useCallback((fn) => {
    contextProviderRef.current = fn;
  }, []);

  const getDynamicContext = useCallback(() => {
    if (contextProviderRef.current) {
      try {
        return contextProviderRef.current();
      } catch (e) {
        console.error("Error fetching dynamic context:", e);
        return null;
      }
    }
    return null;
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      toggleChat,
      openChat,
      closeChat,
      messages,
      addMessage,
      clearChat,
      context,
      updateContext,
      getAssessmentHelp,
      registerContextProvider,
      getDynamicContext,
    }),
    [
      isOpen,
      toggleChat,
      openChat,
      closeChat,
      messages,
      addMessage,
      clearChat,
      context,
      updateContext,
      getAssessmentHelp,
      registerContextProvider,
      getDynamicContext,
    ],
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
