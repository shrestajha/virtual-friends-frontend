import React from 'react';
import { Box, Paper, Typography, Divider, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function TopicDisplay({ topicInfo, currentTopic, topicsCompleted, canAdvance }) {
  if (!topicInfo) {
    return null;
  }

  const isCompleted = topicsCompleted.includes(topicInfo.topic_number);

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 2, 
        bgcolor: isCompleted ? '#e8f5e9' : '#fff',
        border: isCompleted ? '2px solid #4caf50' : '1px solid #e0e0e0'
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

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
          Scenario A: Functional Loss
        </Typography>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: '#e3f2fd', 
            borderRadius: 1,
            borderLeft: '4px solid #1976d2'
          }}
        >
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            {topicInfo.functional_scenario}
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#9c27b0' }}>
          Scenario B: Experiential Loss
        </Typography>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: '#f3e5f5', 
            borderRadius: 1,
            borderLeft: '4px solid #9c27b0'
          }}
        >
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            {topicInfo.experiential_scenario}
          </Typography>
        </Paper>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        You'll chat with your agent about one of these scenarios. Complete 7 interactions and the survey to advance to the next topic.
      </Alert>
    </Paper>
  );
}

