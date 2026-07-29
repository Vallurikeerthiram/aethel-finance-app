import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Trash2, ShieldCheck } from 'lucide-react';
import { db } from '../services/db';
import { AiChatMessage, UserSettings } from '../types';
import { queryAiAdvisor } from '../services/aiAgent';

interface Props {
  settings: UserSettings;
}

const PRESET_QUESTIONS = [
  "What is my personal inflation rate & top price hikes?",
  "Why should I step up my SIP investments next year?",
  "How is my investment portfolio performing?",
  "Where am I spending the most money this month?"
];

export const AiAdvisorView: React.FC<Props> = ({ settings }) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const loadChatHistory = async () => {
    const list = await db.aiMessages.toArray();
    if (list.length === 0) {
      // Initial welcome message
      const welcome: AiChatMessage = {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `👋 **Welcome to Aethel Financial Intelligence Agent**!

I am your **100% On-Device, Privacy-First AI Financial Advisor**.

I analyze your daily expense logs, commodity price trends, personal inflation gap, and investment portfolio to help you build unbreakable long-term wealth.

Try asking me one of the prompt chips below!`,
        timestamp: new Date().toISOString()
      };
      await db.aiMessages.put(welcome);
      setMessages([welcome]);
    } else {
      setMessages(list);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isThinking) return;

    const userMsg: AiChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toISOString()
    };

    const newMsgList = [...messages, userMsg];
    setMessages(newMsgList);
    await db.aiMessages.put(userMsg);
    setInputQuery('');
    setIsThinking(true);

    try {
      const botAnswerText = await queryAiAdvisor(queryText);

      const botMsg: AiChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: botAnswerText,
        timestamp: new Date().toISOString()
      };

      setMessages([...newMsgList, botMsg]);
      await db.aiMessages.put(botMsg);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `msg-bot-err-${Date.now()}`,
        sender: 'assistant',
        text: `Sorry, I encountered an error answering your request: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMsgList, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear AI Chat history?')) {
      await db.aiMessages.clear();
      loadChatHistory();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', gap: '16px' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Aethel On-Device AI Financial Advisor</h2>
            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} />
              <span>Offline Ready • On-Device Neural Model</span>
            </div>
          </div>
        </div>

        <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#fb7185' }} onClick={handleClearHistory}>
          <Trash2 size={14} />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Preset Question Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 14px', whiteSpace: 'nowrap', borderRadius: 'var(--radius-full)' }}
            onClick={() => handleSendQuery(q)}
          >
            <Sparkles size={14} color="#8b5cf6" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages List */}
      <div className="glass-card" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            {msg.sender === 'assistant' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={18} />
              </div>
            )}

            <div style={{
              background: msg.sender === 'user' ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : 'var(--bg-surface-elevated)',
              color: '#f8fafc',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border-glass)',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>

            {msg.sender === 'user' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Bot size={18} className="animate-spin" />
            <span>Analyzing transactions & computing personal inflation model...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(inputQuery); }} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Ask Aethel AI anything about your inflation, expenses, step-up or portfolio..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          style={{ flex: 1, padding: '14px 18px' }}
        />
        <button type="submit" className="btn-primary" disabled={isThinking || !inputQuery.trim()} style={{ padding: '14px 24px' }}>
          <Send size={18} />
          <span>Ask AI</span>
        </button>
      </form>

    </div>
  );
};
