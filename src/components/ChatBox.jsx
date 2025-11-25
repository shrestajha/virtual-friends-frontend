import React, { useState, useEffect, useRef } from 'react';
import { sendChat } from '../api';

export default function ChatBox({ selectedCharacter, userMessageCount, maxMessages, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when character changes
  useEffect(() => {
    setMessages([]);
  }, [selectedCharacter?.id]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !selectedCharacter || userMessageCount >= maxMessages) return;
    
    setInput('');
    const user = { role: 'user', content: text };
    setMessages(prev => [...prev, user]);
    setLoading(true);
    
    try {
      const res = await sendChat(selectedCharacter.id, text);
      const bot = { role: 'assistant', content: res.reply };
      setMessages(prev => [...prev, bot]);
      // Notify parent that a message was sent
      if (onMessageSent) {
        onMessageSent();
      }
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }]);
      // Remove the user message if send failed
      setMessages(prev => prev.filter((m, i) => i !== prev.length - 1 || m.role !== 'user'));
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
        {selectedCharacter && messages.length === 0 && (
          <div className="meta" style={{ textAlign: 'center', padding: '20px' }}>
            Now chatting with <strong>{selectedCharacter.name}</strong>. Say hello!
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
