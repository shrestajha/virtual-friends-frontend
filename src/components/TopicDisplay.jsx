import React from 'react';
import { Box, Paper, Typography, Divider, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function TopicDisplay({ topicInfo, currentTopic, topicsCompleted, canAdvance, currentScenario, scenarioACompleted, scenarioBCompleted }) {
  if (!topicInfo) {
    return null;
  }

  const isCompleted = topicsCompleted.includes(topicInfo.topic_number);
  
  // Determine which scenario to show
  // Show Scenario A first, then Scenario B only after A is completed
  const showScenarioA = !scenarioACompleted || currentScenario === 'A';
  const showScenarioB = scenarioACompleted && (!scenarioBCompleted || currentScenario === 'B');
  const activeScenario = currentScenario || (showScenarioA ? 'A' : 'B');

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2.5, 
        mb: 2, 
        bgcolor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: isCompleted ? '2px solid #10b981' : '1px solid #e5e7eb'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Topic {topicInfo.topic_number}: {topicInfo.category}
        </Typography>
        {isCompleted && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4caf50' }}>
            <CheckCircleIcon />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Completed
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Show Scenario A only if it's not completed or it's the current scenario */}
      {showScenarioA && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#2563eb' }}>
            Scenario A: Functional Loss
            {activeScenario === 'A' && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: '#16a34a', fontWeight: 600 }}>
                (Active)
              </Typography>
            )}
          </Typography>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              bgcolor: activeScenario === 'A' ? '#eff6ff' : '#fff', 
              borderRadius: '12px',
              boxShadow: activeScenario === 'A' 
                ? '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)'
                : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              border: activeScenario === 'A' ? '2px solid #2563eb' : '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }
            }}
          >
            <Typography variant="body1" sx={{ lineHeight: 1.7, color: activeScenario === 'A' ? '#1e40af' : '#4b5563' }}>
              {topicInfo.functional_scenario}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Show Scenario B only after Scenario A is completed */}
      {showScenarioB && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#9333ea' }}>
            Scenario B: Experiential Loss
            {activeScenario === 'B' && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: '#16a34a', fontWeight: 600 }}>
                (Active)
              </Typography>
            )}
          </Typography>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              bgcolor: activeScenario === 'B' ? '#faf5ff' : '#fff', 
              borderRadius: '12px',
              boxShadow: activeScenario === 'B' 
                ? '0 4px 6px -1px rgba(147, 51, 234, 0.2), 0 2px 4px -1px rgba(147, 51, 234, 0.1)'
                : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              border: activeScenario === 'B' ? '2px solid #9333ea' : '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }
            }}
          >
            <Typography variant="body1" sx={{ lineHeight: 1.7, color: activeScenario === 'B' ? '#7e22ce' : '#4b5563' }}>
              {topicInfo.experiential_scenario}
            </Typography>
          </Paper>
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        {showScenarioA && !showScenarioB 
          ? "Complete 7 interactions and the survey for Scenario A to unlock Scenario B."
          : showScenarioB
          ? "Complete 7 interactions and the survey for Scenario B to advance to the next topic."
          : "You'll chat with your agent about the scenario above. Complete 7 interactions and the survey to advance."
        }
      </Alert>
    </Paper>
  );
}

