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
  { value: 3, label: 'Neither Agree nor Disagree' },
  { value: 4, label: 'Somewhat Agree' },
  { value: 5, label: 'Agree' },
  { value: 6, label: 'Strongly Agree' }
];

const QUESTIONS = [
  { key: 'q1_thoughtful_guidance', text: 'provided thoughtful, strategic guidance.' },
  { key: 'q2_explained_tradeoffs', text: 'clearly explained trade-offs or options.' },
  { key: 'q3_problem_solving', text: 'seemed capable at problem-solving.' },
  { key: 'q4_validated_feelings', text: 'recognized and validated the user\'s feelings.' },
  { key: 'q5_supportive_compassionate', text: 'seemed supportive and compassionate.' },
  { key: 'q6_emotional_needs', text: 'prioritized the user\'s emotional needs.' },
  { key: 'q7_seemed_intelligent', text: 'seemed intelligent.' },
  { key: 'q8_would_talk_again', text: 'I would want to talk to {characterName} again.' }
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
      if (errorMessage.includes('Not all characters complete') || errorMessage.includes('all assigned characters')) {
        setError('You need to complete 15 interactions with all 3 characters before you can submit surveys.');
      } else if (errorMessage.includes('not at 15') || errorMessage.includes('15 interactions')) {
        setError('This character needs 15 interactions before you can submit the survey.');
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
    if (question.key === 'q8_would_talk_again') {
      return question.text.replace('{characterName}', characterName);
    }
    return `${characterName} ${question.text}`;
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Please rate your experience with {characterName}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 300 }}><strong>Statement</strong></TableCell>
                {LIKERT_OPTIONS.map(option => (
                  <TableCell key={option.value} align="center" sx={{ minWidth: 100 }}>
                    <Typography variant="caption" display="block">
                      {option.value}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
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
                    <Typography variant="body2">
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

