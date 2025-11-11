import React, { useState } from 'react';
import { createCharacter } from '../api';

export default function CharacterForm({ onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ei, setEi] = useState(8);
  const [ci, setCi] = useState(6);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ch = await createCharacter({
        name,
        description,
        ei_level: Number(ei),
        ci_level: Number(ci),
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
    <form onSubmit={submit} className="panel" style={{padding:12}}>
      <div className="label">Create a Character</div>
      <div style={{display:'grid', gap:8}}>
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <textarea className="textarea" rows={3} placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <div className="label">Emotional Intelligence</div>
            <input className="input" type="number" min="0" max="10" value={ei} onChange={e=>setEi(e.target.value)} />
          </div>
          <div>
            <div className="label">Cognitive Intelligence</div>
            <input className="input" type="number" min="0" max="10" value={ci} onChange={e=>setCi(e.target.value)} />
          </div>
        </div>
        <button className="button" disabled={loading}>{loading ? 'Creating…' : 'Create character'}</button>
      </div>
    </form>
  );
}
