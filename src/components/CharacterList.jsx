import React from 'react';

export default function CharacterList({ items, selectedId, onSelect }){
  return (
    <div className="list">
      {items.map(ch => (
        <button key={ch.id} className="list-item" onClick={()=>onSelect(ch)} style={{textAlign:'left'}}>
          <div>
            <div style={{fontWeight:700}}>{ch.name}</div>
            <div className="meta">EI {ch.ei_level}/10 • CI {ch.ci_level}/10</div>
            {ch.description && <div className="meta" style={{marginTop:4}}>{ch.description}</div>}
          </div>
          <div className="badge">#{ch.id}</div>
        </button>
      ))}
      {items.length === 0 && <div className="meta">No characters yet. Create one below.</div>}
    </div>
  );
}
