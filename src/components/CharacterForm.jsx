import React, { useState } from 'react';
import { createCharacter } from '../api';

export default function CharacterForm({ onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Set default EI/CI values (hidden from UI)
      const ch = await createCharacter({
        name,
        description,
        ei_level: 8, // Default value
        ci_level: 6, // Default value
        base_prompt: ''
      });
      setName(''); setDescription('');
      onCreated?.(ch);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel" style={{padding: 20}}>
      <div className="label" style={{ marginBottom: 16 }}>Create a Character</div>
      <div style={{display:'grid', gap:16}}>
        <div>
          <input 
            className="input" 
            placeholder="Character name" 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            required 
          />
        </div>
        <div>
          <textarea 
            className="textarea" 
            rows={4} 
            placeholder="Description (optional)" 
            value={description} 
            onChange={e=>setDescription(e.target.value)} 
          />
        </div>
        <button className="button" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating…' : 'Create Character'}
        </button>
      </div>
    </form>
  );
}
