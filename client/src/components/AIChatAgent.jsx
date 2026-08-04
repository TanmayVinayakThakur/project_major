import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, MessageSquare, Loader, CornerDownRight, CheckCircle } from 'lucide-react';

// Simple parser to render basic markdown elements (bold, tables, lists, linebreaks)
const parseMarkdown = (text) => {
  if (!text) return '';
  
  // Escaping basic HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold text: **bold**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Markdown lists: - item or * item
  html = html.replace(/^(?:\s*[-*]\s+)(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-5 my-2">$1</ul>');

  // Inline code: `code`
  html = html.replace(/`(.*?)`/g, '<code class="bg-purple-950/50 text-purple-300 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');

  // Markdown tables
  const lines = html.split('\n');
  let inTable = false;
  let tableRows = [];
  let parsedLines = [];

  for (let line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // It's a table row
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Skip alignment rows e.g. |---|---|
      if (line.includes('---') || line.includes('-:-')) {
        continue;
      }

      inTable = true;
      tableRows.push(cells);
    } else {
      if (inTable) {
        // Output the accumulated table
        let tableHtml = '<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-purple-800/40 text-left text-sm">';
        tableRows.forEach((row, rIdx) => {
          tableHtml += `<tr class="${rIdx === 0 ? 'bg-purple-950/60 font-semibold' : 'border-t border-purple-800/20'}">`;
          row.forEach(cell => {
            tableHtml += `<td class="p-2 border border-purple-800/30">${cell}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        parsedLines.push(tableHtml);
        
        tableRows = [];
        inTable = false;
      }
      parsedLines.push(line);
    }
  }
  
  if (inTable) {
    let tableHtml = '<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-purple-800/40 text-left text-sm">';
    tableRows.forEach((row, rIdx) => {
      tableHtml += `<tr class="${rIdx === 0 ? 'bg-purple-950/60 font-semibold' : 'border-t border-purple-800/20'}">`;
      row.forEach(cell => {
        tableHtml += `<td class="p-2 border border-purple-800/30">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</table></div>';
    parsedLines.push(tableHtml);
  }

  return parsedLines.join('<br />');
};

function AIChatAgent({ onApplyRoute, currentLocations }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: "Hello! I am your **CommuteIQ Travel Assistant** 🚇.\n\nAsk me anything about planning your journey in Bangalore. For example:\n* *'Find a route from Indiranagar to Majestic'* \n* *'What's the best hybrid route between Whitefield and Koramangala?'*",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [appliedRouteId, setAppliedRouteId] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      // Map history to server format
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.error === 'API_KEY_MISSING') {
          setApiKeyMissing(true);
          setMessages(prev => [
            ...prev,
            {
              role: 'model',
              content: data.message,
              timestamp: new Date(),
              error: true
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'model',
              content: data.text,
              route: data.route,
              timestamp: new Date()
            }
          ]);
        }
      } else {
        throw new Error('Server connection failure');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: '⚠️ Failed to connect to the AI travel helper. Please make sure the backend server is running.',
          timestamp: new Date(),
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRoute = (routeData, msgIndex) => {
    if (!routeData) return;
    
    // Pass route to parent App.jsx
    onApplyRoute(routeData);
    setAppliedRouteId(msgIndex);
    
    // Add success chat message
    setMessages(prev => [
      ...prev,
      {
        role: 'model',
        content: `✅ I've loaded that route onto your map! You can now click **"Start Journey"** to enable real-time tracking.`,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[1000] p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg shadow-purple-900/40 border border-purple-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 group"
      >
        {isOpen ? <X size={22} /> : <Bot size={22} className="group-hover:animate-bounce" />}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-medium whitespace-nowrap">
          Ask Travel AI
        </span>
      </button>

      {/* Glassmorphic Chat Widget Container */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-slate-950/80 backdrop-blur-md border border-purple-800/30 rounded-2xl shadow-2xl flex flex-col z-[1000] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="p-4 bg-purple-950/40 border-b border-purple-800/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-400">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">CommuteIQ Assistant</h3>
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Live Agent
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-900/60"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                    msg.role === 'user'
                      ? 'bg-purple-900/40 border-purple-500/30 text-purple-300'
                      : 'bg-slate-900 border-purple-800/30 text-purple-400'
                  }`}
                >
                  {msg.role === 'user' ? 'ME' : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-tr-none'
                        : msg.error
                        ? 'bg-red-950/30 border border-red-900/30 text-red-300 rounded-tl-none'
                        : 'bg-slate-900/60 border border-purple-900/20 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                      className="markdown-body"
                    />
                  </div>

                  {/* Render interactive Route Card if route payload is attached */}
                  {msg.route && msg.route.pureMetro && (
                    <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 space-y-2 text-xs backdrop-blur-sm animate-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-300 flex items-center gap-1">
                          <CheckCircle size={13} /> Custom Route Recommendation
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Comparing modes: Metro, Cab, and Hybrid exit via {msg.route.hybrid?.exitStation?.name || 'N/A'}.
                      </div>
                      <button
                        onClick={() => handleApplyRoute(msg.route, index)}
                        disabled={appliedRouteId === index}
                        className={`w-full py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                          appliedRouteId === index
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/40'
                        }`}
                      >
                        <CornerDownRight size={13} />
                        {appliedRouteId === index ? 'Route Applied' : 'Apply Route on Map'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-purple-800/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Loader size={14} className="animate-spin" />
                </div>
                <div className="bg-slate-900/60 border border-purple-900/20 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* API Key Missing Instruction */}
          {apiKeyMissing && (
            <div className="p-3 bg-yellow-950/20 border-t border-yellow-900/20 text-[10px] text-yellow-300 space-y-1">
              <strong>Configuration Needed:</strong> Run the terminal setup command in the implementaton plan to register your `GEMINI_API_KEY` to `server/.env` and restart the backend.
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-slate-950 border-t border-purple-850/20 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CommuteIQ AI..."
              className="flex-1 bg-slate-900/80 border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-transparent text-white rounded-xl transition-all"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AIChatAgent;
