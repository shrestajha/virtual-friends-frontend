import React, { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../api';

export default function ChatBox({ character }){
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);

  useEffect(()=>{
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior:'smooth' });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !character) return;
    setInput('');
    const user = { role:'user', content:text };
    setMessages(prev => [...prev, user]);
    setLoading(true);
    try {
      const res = await sendMessage(character.id, text);
      const bot = { role:'assistant', content: res.reply };
      setMessages(prev => [...prev, bot]);
    } catch(e){
      setMessages(prev => [...prev, { role:'assistant', content: 'Error: ' + e.message }]);
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
      <div ref={scroller} className="messages">
        {!character && <div className="meta">Pick or create a character to start chatting.</div>}
        {character && messages.length === 0 && (
          <div className="meta">Now chatting with <strong>{character.name}</strong>. Say hello!</div>
        )}
        {messages.map((m,i)=> (
          <div className={"bubble " + (m.role === 'user' ? 'user' : 'bot')} key={i}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="composer">
        <textarea
          className="textarea"
          rows={2}
          placeholder={character ? `Message ${character.name}…` : 'Select a character first'}
          disabled={!character || loading}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button className="button" onClick={onSend} disabled={!character || loading}>{loading ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
