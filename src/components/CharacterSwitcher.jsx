import React from 'react';

export default function CharacterSwitcher({ characters, selectedId, onSelect }) {
  if (!characters || characters.length === 0) return null;

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: '16px'
    }}>
      {characters.map((char) => (
        <button
          key={char.id}
          onClick={() => onSelect(char.id)}
          className="button"
          style={{
            background: selectedId === char.id ? 'var(--accent)' : 'var(--panel)',
            color: selectedId === char.id ? 'white' : 'var(--text)',
            border: `1px solid ${selectedId === char.id ? 'var(--accent)' : 'var(--border)'}`,
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: selectedId === char.id ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {char.name}
        </button>
      ))}
    </div>
  );
}

