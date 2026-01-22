import React, { useState, useEffect, useRef } from 'react';
import { sendChat, getChatHistory } from '../api';

export default function ChatBox({ 
  selectedCharacter, 
  userMessageCount, 
  maxMessages, 
  onMessageSent, // Can accept boolean: onMessageSent(showSurvey)
  initialChatHistory = [],
  onChatHistoryUpdate
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scroller = useRef(null);
  const messagesEndRef = useRef(null);

  // Convert backend message format to display format
  const convertMessage = (msg) => {
    const isUser = msg.sender === 'participant' || msg.sender === 'user' || msg.role === 'user';
    return {
      role: isUser ? 'user' : 'assistant',
      content: msg.message || msg.content || '',
      timestamp: msg.timestamp || msg.created_at
    };
  };

  // Load chat history from backend
  useEffect(() => {
    if (!selectedCharacter?.id) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const history = await getChatHistory(String(selectedCharacter.id));
        if (Array.isArray(history)) {
          // Sort by timestamp
          const sorted = [...history].sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
            const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
            return timeA - timeB;
          });
          const converted = sorted.map(convertMessage);
          setMessages(converted);
          if (onChatHistoryUpdate) {
            onChatHistoryUpdate(sorted);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        // Fallback to initialChatHistory if provided
        if (initialChatHistory.length > 0) {
          const converted = initialChatHistory.map(convertMessage);
          setMessages(converted);
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [selectedCharacter?.id]);

  // Also use initialChatHistory if provided and we don't have messages yet
  useEffect(() => {
    if (initialChatHistory.length > 0 && messages.length === 0 && !loadingHistory) {
      const converted = initialChatHistory.map(convertMessage);
      setMessages(converted);
    }
  }, [initialChatHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !selectedCharacter || userMessageCount >= maxMessages) return;
    
    setInput('');
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      console.log('[ChatBox] Sending message to character:', selectedCharacter.id);
      const res = await sendChat(selectedCharacter.id, text);
      console.log('[ChatBox] Chat response received:', res);
      
      const botMsg = { 
        role: 'assistant', 
        content: res.reply,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => {
        const updated = [...prev, botMsg];
        // Update parent with full history
        if (onChatHistoryUpdate) {
          const backendFormat = updated.map(msg => ({
            sender: msg.role === 'user' ? 'participant' : 'agent',
            message: msg.content,
            timestamp: msg.timestamp,
            role: msg.role
          }));
          onChatHistoryUpdate(backendFormat);
        }
        return updated;
      });
      
      // Check if survey should be shown (from backend response)
      if (res.show_survey === true) {
        console.log('[ChatBox] Backend indicates survey should be shown');
        // Notify parent to show survey
        if (onMessageSent) {
          onMessageSent(true); // Pass true to indicate survey should show
        }
      } else {
        // Notify parent that a message was sent (normal case)
        if (onMessageSent) {
          onMessageSent(false);
        }
      }
    } catch(e) {
      console.error('[ChatBox] Error sending message:', e);
      setMessages(prev => {
        const errorMsg = { role: 'assistant', content: 'Error: ' + e.message };
        const updated = [...prev, errorMsg];
        // Remove the user message if send failed
        return updated.filter((m, i) => i !== updated.length - 2 || m.role !== 'user');
      });
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="panel chat">
      {/* Messages */}
      <div ref={scroller} className="messages">
        {!selectedCharacter && (
          <div className="meta" style={{ textAlign: 'center', padding: '20px' }}>
            Please select a character using the buttons above to start chatting.
          </div>
        )}
        {selectedCharacter && messages.length === 0 && !loadingHistory && (
          <div className="meta" style={{ textAlign: 'center', padding: '20px' }}>
            Now chatting with <strong>{selectedCharacter.name}</strong>. Say hello!
          </div>
        )}
        {loadingHistory && (
          <div className="meta" style={{ textAlign: 'center', padding: '20px' }}>
            Loading chat history...
          </div>
        )}
        {messages.map((m, i) => (
          <div className={"bubble " + (m.role === 'user' ? 'user' : 'bot')} key={i}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bubble bot">
            <span style={{ opacity: 0.6 }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="composer">
        <textarea
          className="textarea"
          rows={2}
          placeholder={
            selectedCharacter 
              ? userMessageCount >= maxMessages
                ? "You have reached the message limit"
                : `Message ${selectedCharacter.name}… (Press Enter to send, Shift+Enter for new line)`
              : 'Select a character using the buttons above'
          }
          disabled={!selectedCharacter || loading || userMessageCount >= maxMessages}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Auto-resize textarea
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={onKey}
          style={{
            resize: "none",
            minHeight: "44px",
            maxHeight: "120px",
            overflowY: "auto"
          }}
        />
        <button 
          className="button" 
          onClick={onSend} 
          disabled={!selectedCharacter || loading || !input.trim() || userMessageCount >= maxMessages}
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
