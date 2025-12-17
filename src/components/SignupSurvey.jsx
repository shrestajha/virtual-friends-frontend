import React, { useState } from 'react';
import { submitSignupSurvey } from '../api';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';

const q1Options = [
  "Never",
  "Less than monthly",
  "Monthly",
  "Weekly",
  "Several times a week",
  "Daily"
];

const q2Options = [
  "No",
  "Yes, once",
  "Yes, a few times",
  "Yes, frequently"
];

const beliefOptions = [
  "Not at all",
  "Slightly",
  "A little",
  "Moderately",
  "Quite",
  "Very much",
  "Extremely"
];

export default function SignupSurvey({ onComplete }) {
  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const isFormValid = () => {
    return answers.q1 && answers.q2 && answers.q3 && answers.q4;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate all fields
    if (!isFormValid()) {
      const errors = {};
      if (!answers.q1) errors.q1 = 'This field is required';
      if (!answers.q2) errors.q2 = 'This field is required';
      if (!answers.q3) errors.q3 = 'This field is required';
      if (!answers.q4) errors.q4 = 'This field is required';
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await submitSignupSurvey({
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4
      });

      // Success - call onComplete to navigate to chat
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Survey submission error:', err);
      const errorMessage = err.message || 'Failed to submit survey';
      
      // Handle specific error cases
      if (errorMessage.includes('400') || errorMessage.includes('already completed')) {
        setError('Survey has already been completed. Redirecting to chat...');
        // Redirect to chat after a short delay
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 2000);
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('422') || errorMessage.includes('validation')) {
        setError('Invalid answer option. Please select valid answers for all questions.');
        // Could parse validation errors and highlight specific fields
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (question, value) => {
    setAnswers(prev => ({
      ...prev,
      [question]: value
    }));
    // Clear field error when user selects an answer
    if (fieldErrors[question]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[question];
        return newErrors;
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: '#f5f5f5'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: '600px',
          width: '100%'
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3, fontWeight: 600 }}>
          Welcome! Please complete this quick survey
        </Typography>

        {error && (
          <Alert 
            severity={error.includes('already completed') ? 'info' : 'error'} 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question 1 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q1}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q1-label">
              How often do you use AI chatbots (e.g., ChatGPT)?
            </InputLabel>
            <Select
              labelId="q1-label"
              id="q1"
              value={answers.q1}
              label="How often do you use AI chatbots (e.g., ChatGPT)?"
              onChange={(e) => handleChange('q1', e.target.value)}
            >
              {q1Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q1 && <FormHelperText>{fieldErrors.q1}</FormHelperText>}
          </FormControl>

          {/* Question 2 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q2}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q2-label">
              Have you chatted with a virtual character (e.g., Character AI, Replika, in-game NPC chat, etc.) in the past 6 months?
            </InputLabel>
            <Select
              labelId="q2-label"
              id="q2"
              value={answers.q2}
              label="Have you chatted with a virtual character (e.g., Character AI, Replika, in-game NPC chat, etc.) in the past 6 months?"
              onChange={(e) => handleChange('q2', e.target.value)}
            >
              {q2Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q2 && <FormHelperText>{fieldErrors.q2}</FormHelperText>}
          </FormControl>

          {/* Question 3 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q3}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q3-label">
              To what extent do you think AI chatbots can reason and make decisions?
            </InputLabel>
            <Select
              labelId="q3-label"
              id="q3"
              value={answers.q3}
              label="To what extent do you think AI chatbots can reason and make decisions?"
              onChange={(e) => handleChange('q3', e.target.value)}
            >
              {beliefOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q3 && <FormHelperText>{fieldErrors.q3}</FormHelperText>}
          </FormControl>

          {/* Question 4 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q4}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q4-label">
              To what extent do you think AI chatbots can empathize and express emotions?
            </InputLabel>
            <Select
              labelId="q4-label"
              id="q4"
              value={answers.q4}
              label="To what extent do you think AI chatbots can empathize and express emotions?"
              onChange={(e) => handleChange('q4', e.target.value)}
            >
              {beliefOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q4 && <FormHelperText>{fieldErrors.q4}</FormHelperText>}
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!isFormValid() || loading}
            sx={{ mt: 2 }}
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
        </form>
      </Paper>
    </Box>
  );
}

