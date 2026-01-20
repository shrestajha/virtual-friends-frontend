import React from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export default function ScenarioSelector({
  currentScenario,
  scenarioACompleted,
  scenarioBCompleted,
  scenarioAInteractions,
  scenarioBInteractions,
  onSelectScenario,
  disabled
}) {
  const getScenarioStatus = (scenario) => {
    const isActive = currentScenario === scenario;
    const isCompleted = scenario === 'A' ? scenarioACompleted : scenarioBCompleted;
    const interactions = scenario === 'A' ? scenarioAInteractions : scenarioBInteractions;
    
    if (isCompleted) {
      return { status: 'completed', label: 'Complete ✓', color: '#10b981' };
    } else if (isActive) {
      return { status: 'active', label: `In Progress (${interactions}/7)`, color: '#2563eb' };
    } else if (interactions > 0) {
      return { status: 'in-progress', label: `In Progress (${interactions}/7)`, color: '#9333ea' };
    } else {
      return { status: 'not-started', label: 'Not Started', color: '#9ca3af' };
    }
  };

  const scenarioAStatus = getScenarioStatus('A');
  const scenarioBStatus = getScenarioStatus('B');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Select Scenario
      </Typography>
      
      {/* Scenario A Card */}
      <Paper
        elevation={currentScenario === 'A' ? 4 : 1}
        sx={{
          p: 2.5,
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: currentScenario === 'A' ? '2px solid #2563eb' : '1px solid #e5e7eb',
          bgcolor: currentScenario === 'A' ? '#eff6ff' : '#fff',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          '&:hover': disabled ? {} : {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)'
          }
        }}
        onClick={() => !disabled && onSelectScenario('A')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2563eb' }}>
            Scenario A: Functional Loss
          </Typography>
          {scenarioACompleted ? (
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ color: scenarioAStatus.color, fontSize: 28 }} />
          )}
        </Box>
        <Chip
          label={scenarioAStatus.label}
          size="small"
          sx={{
            bgcolor: scenarioAStatus.color,
            color: 'white',
            fontWeight: 500,
            mt: 1
          }}
        />
      </Paper>

      {/* Scenario B Card */}
      <Paper
        elevation={currentScenario === 'B' ? 4 : 1}
        sx={{
          p: 2.5,
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: currentScenario === 'B' ? '2px solid #9333ea' : '1px solid #e5e7eb',
          bgcolor: currentScenario === 'B' ? '#faf5ff' : '#fff',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          '&:hover': disabled ? {} : {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)'
          }
        }}
        onClick={() => !disabled && onSelectScenario('B')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#9333ea' }}>
            Scenario B: Experiential Loss
          </Typography>
          {scenarioBCompleted ? (
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ color: scenarioBStatus.color, fontSize: 28 }} />
          )}
        </Box>
        <Chip
          label={scenarioBStatus.label}
          size="small"
          sx={{
            bgcolor: scenarioBStatus.color,
            color: 'white',
            fontWeight: 500,
            mt: 1
          }}
        />
      </Paper>

      {scenarioACompleted && scenarioBCompleted && (
        <Box sx={{ mt: 1, p: 1.5, bgcolor: '#d1fae5', borderRadius: '8px' }}>
          <Typography variant="body2" sx={{ color: '#065f46', fontWeight: 500, textAlign: 'center' }}>
            ✓ Both scenarios completed! Topic will advance automatically.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

