import React from 'react';

export default function Survey() {
  const surveyUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeRZ74lzonv3_uGe1uSZbV8NvSGslNiuLCtrm81g-FN_usAag/viewform?usp=header";

  return (
    <div className="container center" style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="panel" style={{ 
        padding: '40px', 
        maxWidth: '500px', 
        textAlign: 'center' 
      }}>
        <h2 style={{ 
          marginBottom: '16px', 
          fontSize: '24px', 
          fontWeight: 600,
          color: 'var(--text)'
        }}>
          Survey Required
        </h2>
        <p style={{ 
          marginBottom: '24px', 
          fontSize: '16px', 
          color: 'var(--muted)',
          lineHeight: '1.6'
        }}>
          You have completed 15 interactions. Please complete the final survey.
        </p>
        <a
          href={surveyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
          style={{
            display: 'inline-block',
            textDecoration: 'none',
            width: '100%'
          }}
        >
          Open Survey
        </a>
      </div>
    </div>
  );
}

