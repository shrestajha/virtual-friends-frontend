import React from 'react';

export default function CharacterProfile({ character }) {
  if (!character) return null;

  return (
    <div className="character-card" style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      padding: '16px',
      marginBottom: '20px',
      background: 'var(--panel)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      {character.img && (
        <img 
          src={character.img} 
          alt={character.name}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--border)'
          }}
        />
      )}
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          margin: 0, 
          marginBottom: '4px', 
          fontSize: '18px', 
          fontWeight: 600,
          color: 'var(--text)'
        }}>
          {character.name}
        </h3>
        {character.bio && (
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            {character.bio}
          </p>
        )}
      </div>
    </div>
  );
}

