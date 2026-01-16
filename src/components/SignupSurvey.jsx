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

// Q5: Which of the following is NOT powered by AI?
const q5Options = [
  "Self-driving cars (1)",
  "Google's search algorithm (2)",
  "A basic calculator (3)",
  "Chatbots (4)"
];

// Q6: Which fields contribute to AI development?
const q6Options = [
  "Computer science (1)",
  "Mathematics (2)",
  "Psychology (3)",
  "All of the above (4)"
];

// Q7: Knowledge representation in AI
const q7Options = [
  "Neural Networks (1)",
  "Waterfall model (2)",
  "Agile methodology (3)",
  "SWOT analysis (4)"
];

// Q8: Algorithmic approach for decision-making
const q8Options = [
  "Dijkstra's algorithm (1)",
  "Depth-first search (2)",
  "Decision trees (3)",
  "Fourier Transform (4)"
];

// Q9: First step in ML process
const q9Options = [
  "Data collection (1)",
  "Model selection (2)",
  "Prediction (3)",
  "Model evaluation (4)"
];

// Q10: Example of metadata
const q10Options = [
  "A spreadsheet of numbers (1)",
  "Column headers in a table (2)",
  "A chart visualization (3)",
  "Raw sensor data (4)"
];

// Q11: How supervised ML learns
const q11Options = [
  "From labeled data (1)",
  "From rewards and punishments (2)",
  "By observing human behavior (3)",
  "From intrinsic motivation (4)"
];

// Q12: AI interacting with physical world
const q12Options = [
  "By planning movements (1)",
  "By reacting to sensor inputs (2)",
  "By actuating motors (3)",
  "All of the above (4)"
];

// Q13: Sensors for perception
const q13Options = [
  "Cameras (1)",
  "Microphones (2)",
  "Thermometers (3)",
  "All of the above (4)"
];

// Q14: Programmability of AI systems
const q14Options = [
  "They cannot be programmed by humans (1)",
  "They program themselves (2)",
  "They are programmed using data (3)",
  "They are programmed by computer code (4)"
];

export default function SignupSurvey({ onComplete }) {
  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
    q6: '',
    q7: '',
    q8: '',
    q9: '',
    q10: '',
    q11: '',
    q12: '',
    q13: '',
    q14: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const isFormValid = () => {
    return answers.q1 && answers.q2 && answers.q3 && answers.q4 &&
           answers.q5 && answers.q6 && answers.q7 && answers.q8 &&
           answers.q9 && answers.q10 && answers.q11 && answers.q12 &&
           answers.q13 && answers.q14;
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
      if (!answers.q5) errors.q5 = 'This field is required';
      if (!answers.q6) errors.q6 = 'This field is required';
      if (!answers.q7) errors.q7 = 'This field is required';
      if (!answers.q8) errors.q8 = 'This field is required';
      if (!answers.q9) errors.q9 = 'This field is required';
      if (!answers.q10) errors.q10 = 'This field is required';
      if (!answers.q11) errors.q11 = 'This field is required';
      if (!answers.q12) errors.q12 = 'This field is required';
      if (!answers.q13) errors.q13 = 'This field is required';
      if (!answers.q14) errors.q14 = 'This field is required';
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await submitSignupSurvey({
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        q6: answers.q6,
        q7: answers.q7,
        q8: answers.q8,
        q9: answers.q9,
        q10: answers.q10,
        q11: answers.q11,
        q12: answers.q12,
        q13: answers.q13,
        q14: answers.q14
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
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
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

          {/* Question 5 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q5}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q5-label">
              Which of the following is NOT powered by AI?
            </InputLabel>
            <Select
              labelId="q5-label"
              id="q5"
              value={answers.q5}
              label="Which of the following is NOT powered by AI?"
              onChange={(e) => handleChange('q5', e.target.value)}
            >
              {q5Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q5 && <FormHelperText>{fieldErrors.q5}</FormHelperText>}
          </FormControl>

          {/* Question 6 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q6}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q6-label">
              Which of the following fields contributes to the development of artificial intelligence?
            </InputLabel>
            <Select
              labelId="q6-label"
              id="q6"
              value={answers.q6}
              label="Which of the following fields contributes to the development of artificial intelligence?"
              onChange={(e) => handleChange('q6', e.target.value)}
            >
              {q6Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q6 && <FormHelperText>{fieldErrors.q6}</FormHelperText>}
          </FormControl>

          {/* Question 7 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q7}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q7-label">
              What is a common form of knowledge representation in AI?
            </InputLabel>
            <Select
              labelId="q7-label"
              id="q7"
              value={answers.q7}
              label="What is a common form of knowledge representation in AI?"
              onChange={(e) => handleChange('q7', e.target.value)}
            >
              {q7Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q7 && <FormHelperText>{fieldErrors.q7}</FormHelperText>}
          </FormControl>

          {/* Question 8 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q8}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q8-label">
              Which algorithmic approach is commonly used for decision-making in AI?
            </InputLabel>
            <Select
              labelId="q8-label"
              id="q8"
              value={answers.q8}
              label="Which algorithmic approach is commonly used for decision-making in AI?"
              onChange={(e) => handleChange('q8', e.target.value)}
            >
              {q8Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q8 && <FormHelperText>{fieldErrors.q8}</FormHelperText>}
          </FormControl>

          {/* Question 9 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q9}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q9-label">
              What is the first step in a typical machine learning process?
            </InputLabel>
            <Select
              labelId="q9-label"
              id="q9"
              value={answers.q9}
              label="What is the first step in a typical machine learning process?"
              onChange={(e) => handleChange('q9', e.target.value)}
            >
              {q9Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q9 && <FormHelperText>{fieldErrors.q9}</FormHelperText>}
          </FormControl>

          {/* Question 10 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q10}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q10-label">
              Which of the following is an example of metadata?
            </InputLabel>
            <Select
              labelId="q10-label"
              id="q10"
              value={answers.q10}
              label="Which of the following is an example of metadata?"
              onChange={(e) => handleChange('q10', e.target.value)}
            >
              {q10Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q10 && <FormHelperText>{fieldErrors.q10}</FormHelperText>}
          </FormControl>

          {/* Question 11 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q11}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q11-label">
              How do supervised machine learning algorithms learn?
            </InputLabel>
            <Select
              labelId="q11-label"
              id="q11"
              value={answers.q11}
              label="How do supervised machine learning algorithms learn?"
              onChange={(e) => handleChange('q11', e.target.value)}
            >
              {q11Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q11 && <FormHelperText>{fieldErrors.q11}</FormHelperText>}
          </FormControl>

          {/* Question 12 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q12}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q12-label">
              How can an AI system interact with the physical world?
            </InputLabel>
            <Select
              labelId="q12-label"
              id="q12"
              value={answers.q12}
              label="How can an AI system interact with the physical world?"
              onChange={(e) => handleChange('q12', e.target.value)}
            >
              {q12Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q12 && <FormHelperText>{fieldErrors.q12}</FormHelperText>}
          </FormControl>

          {/* Question 13 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q13}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q13-label">
              Which of the following sensors allow an AI system to perceive the world?
            </InputLabel>
            <Select
              labelId="q13-label"
              id="q13"
              value={answers.q13}
              label="Which of the following sensors allow an AI system to perceive the world?"
              onChange={(e) => handleChange('q13', e.target.value)}
            >
              {q13Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q13 && <FormHelperText>{fieldErrors.q13}</FormHelperText>}
          </FormControl>

          {/* Question 14 */}
          <FormControl 
            fullWidth 
            required 
            error={!!fieldErrors.q14}
            sx={{ mb: 3 }}
          >
            <InputLabel id="q14-label">
              Which statement best describes the programmability of AI systems?
            </InputLabel>
            <Select
              labelId="q14-label"
              id="q14"
              value={answers.q14}
              label="Which statement best describes the programmability of AI systems?"
              onChange={(e) => handleChange('q14', e.target.value)}
            >
              {q14Options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.q14 && <FormHelperText>{fieldErrors.q14}</FormHelperText>}
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

