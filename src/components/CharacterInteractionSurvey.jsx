import React, { useState, useEffect } from 'react';
import { getCharacterSurveyStatus, submitCharacterSurvey } from '../api';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Somewhat Disagree' },
  { value: 4, label: 'Neither Agree nor Disagree' },
  { value: 5, label: 'Somewhat Agree' },
  { value: 6, label: 'Agree' },
  { value: 7, label: 'Strongly Agree' }
];

const QUESTIONS = [
  { key: 'q1_satisfied_help', text: 'I am satisfied with the AI agent\'s help regarding my problem.' },
  { key: 'q2_satisfied_responses', text: 'I am satisfied with the AI agent\'s responses to my problem.' },
  { key: 'q3_follow_steps', text: 'It\'s likely that I follow the steps suggested by the agent.' },
  { key: 'q4_prefer_ai_over_human', text: 'If I experience the same problem again, I would prefer to interact with an AI agent rather than a human service representative.' },
  { key: 'q5_recognized_feelings', text: 'The AI agent accurately recognized how I was feeling about the service problem.' },
  { key: 'q6_understood_emotions', text: 'The AI agent showed a clear understanding of why the situation was emotionally frustrating or upsetting for me.' },
  { key: 'q7_appropriate_emotional_response', text: 'The AI agent responded to my emotions in a way that felt appropriate to the situation.' },
  { key: 'q8_reduced_negative_emotions', text: 'The AI agent helped reduce my negative emotions (e.g., frustration, anger, disappointment) during the interaction.' },
  { key: 'q9_used_emotional_cues', text: 'The AI agent used my emotional cues to guide how it handled the service recovery.' },
  { key: 'q10_accurate_information', text: 'The AI provided accurate and factually correct information in response to my service issue.' },
  { key: 'q11_effectively_solved', text: 'The AI effectively solved or helped resolve the problem I encountered.' },
  { key: 'q12_logically_reasoned', text: 'The AI\'s responses were logically reasoned and made sense in context.' },
  { key: 'q13_adapted_responses', text: 'The AI adapted its responses based on the details of my situation.' },
  { key: 'q14_handled_quickly', text: 'The AI handled the task quickly and competently without unnecessary delays.' },
  { key: 'q15_felt_realistic', text: 'My experience with the AI agent felt realistic.' },
  { key: 'q16_engaged_seriously', text: 'I engaged with the task seriously.' }
];

export default function CharacterInteractionSurvey({ 
  characterId, 
  characterName, 
  open, 
  onClose, 
  onComplete 
}) {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && characterId) {
      checkStatus();
      // Reset answers when dialog opens
      setAnswers({});
      setError(null);
    }
  }, [open, characterId]);

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await getCharacterSurveyStatus(characterId);
      if (status.completed) {
        setAlreadyCompleted(true);
      } else {
        setAlreadyCompleted(false);
      }
    } catch (err) {
      console.error('Failed to check survey status:', err);
      // Continue anyway - allow user to try submitting
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAnswerChange = (questionKey, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
    // Clear error when user makes a selection
    if (error) {
      setError(null);
    }
  };

  const isFormValid = () => {
    return QUESTIONS.every(q => answers[q.key] !== undefined && answers[q.key] !== null);
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitCharacterSurvey(characterId, answers);
      // Success - call onComplete callback
      if (onComplete) {
        onComplete(characterId, characterName);
      }
      // Close dialog
      onClose();
    } catch (err) {
      console.error('Survey submission error:', err);
      const errorMessage = err.message || 'Failed to submit survey';
      
      // Handle specific error cases
      if (errorMessage.includes('not at 7') || errorMessage.includes('7 interactions') || errorMessage.includes('not at 10') || errorMessage.includes('10 interactions') || errorMessage.includes('not at 15') || errorMessage.includes('15 interactions')) {
        setError('This character needs 7 interactions before you can submit the survey.');
      } else if (errorMessage.includes('already completed')) {
        setError('You\'ve already completed the survey for this character.');
        setAlreadyCompleted(true);
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (question, characterName) => {
    return question.text;
  };

  if (checkingStatus) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (alreadyCompleted) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Survey Completed</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You've already completed the survey for {characterName}.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        Please indicate the extent to which you agree with the following statements about the AI agent you interacted with during the service recovery.
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          (1 = Strongly disagree, 7 = Strongly agree)
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 400 }}><strong>Statement</strong></TableCell>
                {LIKERT_OPTIONS.map(option => (
                  <TableCell key={option.value} align="center" sx={{ minWidth: 90 }}>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                      {option.value}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                      {option.label}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {QUESTIONS.map((question, idx) => (
                <TableRow key={question.key}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                      {idx + 1}. {getQuestionText(question, characterName)}
                    </Typography>
                  </TableCell>
                  {LIKERT_OPTIONS.map(option => (
                    <TableCell key={option.value} align="center">
                      <Radio
                        checked={answers[question.key] === option.value}
                        onChange={() => handleAnswerChange(question.key, option.value)}
                        value={option.value}
                        size="small"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {Object.keys(answers).length} of {QUESTIONS.length} questions answered
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid() || loading}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Submit Survey'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

