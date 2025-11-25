import React from 'react';

export default function CharacterSwitcher({ characters, selectedId, onSelect }) {
  if (!characters || characters.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: 'var(--muted)',
        marginBottom: '16px'
      }}>
        No characters available
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: '16px'
    }}>
      {characters.map((char) => {
        const isSelected = selectedId === char.id;
        return (
          <button
            key={char.id}
            onClick={() => {
              console.log("Selecting character:", char.id, char.name);
              onSelect(char.id);
            }}
            className="button"
            style={{
              background: isSelected ? 'var(--accent)' : 'var(--panel)',
              color: isSelected ? 'white' : 'var(--text)',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: isSelected ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSelected ? 1 : 0.8
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.target.style.opacity = '1';
                e.target.style.background = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.target.style.opacity = '0.8';
                e.target.style.background = 'var(--panel)';
              }
            }}
          >
            {char.name || `Character ${char.id}`}
          </button>
        );
      })}
    </div>
  );
}

