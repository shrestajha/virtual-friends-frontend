import React from 'react';

export default function CharacterList({ items, selectedId, onSelect }){
  return (
    <div className="list">
      {items.map(ch => (
        <button key={ch.id} className="list-item" onClick={()=>onSelect(ch)} style={{textAlign:'left'}}>
          <div style={{ flex: 1 }}>
            <div style={{fontWeight:600, fontSize: '16px'}}>{ch.name}</div>
          </div>
          <div className="badge">#{ch.id}</div>
        </button>
      ))}
      {items.length === 0 && <div className="meta" style={{padding: '20px', textAlign: 'center'}}>No characters yet. Create one below.</div>}
    </div>
  );
}
