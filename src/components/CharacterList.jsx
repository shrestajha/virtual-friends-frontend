import React from 'react';
import { filterEICI } from '../utils';

export default function CharacterList({ items, selectedId, onSelect }){
  return (
    <div className="list">
      {items.map(ch => (
        <button key={ch.id} className="list-item" onClick={()=>onSelect(ch)} style={{textAlign:'left'}}>
          <div style={{ flex: 1 }}>
            <div style={{fontWeight:600, fontSize: '16px', marginBottom: 4}}>{ch.name}</div>
            {ch.description && (
              <div style={{fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5', marginTop: 4}}>
                {filterEICI(ch.description)}
              </div>
            )}
            {!ch.description && (
              <div style={{fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic'}}>
                No description available
              </div>
            )}
          </div>
          <div className="badge">#{ch.id}</div>
        </button>
      ))}
      {items.length === 0 && <div className="meta" style={{padding: '20px', textAlign: 'center'}}>No characters yet. Create one below.</div>}
    </div>
  );
}
