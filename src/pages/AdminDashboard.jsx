import React, { useState, useEffect } from 'react';
import { getAdminDashboard, getAdminUsers, makeUserAdmin, removeUserAdmin } from '../api';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Allowed admin emails - only these two emails can have admin access
const ALLOWED_ADMIN_EMAILS = [
  'shresta.jha@uga.edu',
  'elham.yazdani@uga.edu'
];

// Helper function to check if email is allowed for admin access
const isAllowedAdminEmail = (email) => {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

// Helper function to get EI/CI level color
// Backend now sends string values: "Low", "Medium", "High"
const getLevelColor = (level) => {
  // Handle string values from backend
  if (typeof level === 'string') {
    const levelUpper = level.toUpperCase();
    if (levelUpper === 'HIGH') return '#4caf50'; // Green
    if (levelUpper === 'MEDIUM') return '#ff9800'; // Orange
    if (levelUpper === 'LOW') return '#f44336'; // Red
  }
  // Fallback for numeric values (backward compatibility)
  if (typeof level === 'number') {
    if (level >= 8) return '#4caf50'; // Green
    if (level >= 4) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }
  // Default gray for unknown values
  return '#9e9e9e';
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// Helper function to parse agent_name from backend
// Format: "Agent 1 (Low/Low)" - preferred text format from admin endpoints
// OR: "7/4 (7/4)" - legacy numeric format (for backward compatibility)
// Returns: { agentName: "Agent 1", eiCiCombination: "Low/Low" } or { agentName: "Agent 7", eiLevel: 4, ... }
const parseAgentName = (agentName) => {
  if (!agentName) return { agentName: 'N/A', eiLevel: null, ciLevel: null, eiCiCombination: null };
  
  const agentNameStr = String(agentName).trim();
  
  // Priority 1: Handle text format "Agent 1 (Low/Low)" or "Agent 1 (Low/Medium)" - preferred format
  const textFormatMatch = agentNameStr.match(/^(Agent\s+\d+|Agent\s*\d+|\d+)\s*\(([^)]+)\)$/);
  if (textFormatMatch) {
    let parsedName = textFormatMatch[1].trim();
    const combination = textFormatMatch[2].trim();
    
    // Extract agent number if name is numeric or "Agent X"
    const agentMatch = parsedName.match(/(?:Agent\s*)?(\d+)/i);
    if (agentMatch) {
      const agentId = parseInt(agentMatch[1], 10);
      if (agentId >= 1 && agentId <= 9) {
        parsedName = `Agent ${agentId}`;
      }
    }
    
    // Check if combination is text format (Low/Low, Medium/High, etc.)
    if (combination.match(/^(Low|Medium|High)\/(Low|Medium|High)$/i)) {
      return {
        agentName: parsedName,
        eiLevel: null,
        ciLevel: null,
        eiCiCombination: combination // Already in text format
      };
    }
  }
  
  // Priority 2: Handle legacy numeric format "7/4 (7/4)" - for backward compatibility
  const numericFormatMatch = agentNameStr.match(/^(\d+)\/(\d+)(?:\s*\((\d+)\/(\d+)\))?$/);
  if (numericFormatMatch) {
    const agentId = parseInt(numericFormatMatch[1], 10);
    const eiLevelNum = parseInt(numericFormatMatch[2], 10);
    const ciLevelNum = numericFormatMatch[4] ? parseInt(numericFormatMatch[4], 10) : parseInt(numericFormatMatch[3], 10) || null;
    
    if (agentId >= 1 && agentId <= 9) {
      return {
        agentName: `Agent ${agentId}`,
        eiLevel: eiLevelNum,
        ciLevel: ciLevelNum || eiLevelNum,
        eiCiCombination: null // Will be converted from numeric to text
      };
    }
  }
  
  // Priority 3: Handle just "Agent 1" or "Agent X" format (no EI/CI)
  const agentOnlyMatch = agentNameStr.match(/^(Agent\s+\d+|Agent\s*\d+|\d+)$/i);
  if (agentOnlyMatch) {
    const agentMatch = agentNameStr.match(/(?:Agent\s*)?(\d+)/i);
    if (agentMatch) {
      const agentId = parseInt(agentMatch[1], 10);
      if (agentId >= 1 && agentId <= 9) {
        return {
          agentName: `Agent ${agentId}`,
          eiLevel: null,
          ciLevel: null,
          eiCiCombination: null
        };
      }
    }
  }
  
  // Default: return as-is (shouldn't happen with correct backend format)
  return {
    agentName: agentNameStr,
    eiLevel: null,
    ciLevel: null,
    eiCiCombination: null
  };
};

// EI/CI Level Badge Component
// Backend now sends string values: "Low", "Medium", "High"
const LevelBadge = ({ level, label }) => {
  // Display string value directly, or format numeric as fallback
  let displayValue;
  if (typeof level === 'string') {
    displayValue = level; // Display "Low", "Medium", "High" directly
  } else if (typeof level === 'number') {
    displayValue = `${level}/10`; // Fallback for numeric values
  } else {
    displayValue = 'N/A';
  }
  
  return (
    <Chip
      label={`${label}: ${displayValue}`}
      size="small"
      sx={{
        bgcolor: getLevelColor(level),
        color: 'white',
        fontWeight: 'bold',
        mr: 0.5
      }}
    />
  );
};

// Helper function to get Likert scale label
const getLikertLabel = (value) => {
  const labels = {
    1: "Strongly Disagree",
    2: "Disagree",
    3: "Neither Agree nor Disagree",
    4: "Somewhat Agree",
    5: "Agree",
    6: "Strongly Agree"
  };
  return labels[value] || "Unknown";
};

// Helper function to calculate average score
const calculateSurveyAverage = (surveyData) => {
  if (!surveyData) return 0;
  const values = [
    surveyData.q1_thoughtful_guidance,
    surveyData.q2_explained_tradeoffs,
    surveyData.q3_problem_solving,
    surveyData.q4_validated_feelings,
    surveyData.q5_supportive_compassionate,
    surveyData.q6_emotional_needs,
    surveyData.q7_seemed_intelligent,
    surveyData.q8_would_talk_again
  ].filter(v => v !== undefined && v !== null);
  
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
};

// Helper function to convert numeric EI/CI levels to text
const numericLevelToText = (level) => {
  if (typeof level === 'string') {
    const upper = level.toUpperCase();
    if (upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
      return level; // Already text
    }
  }
  if (typeof level === 'number') {
    if (level >= 8) return 'High';
    if (level >= 4) return 'Medium';
    return 'Low';
  }
  return null;
};

// Helper function to format EI/CI combination from separate fields or combined string
const formatEICICombination = (eiLevel, ciLevel, combination) => {
  // If combination is already provided as text (e.g., "Low/Medium")
  if (combination && typeof combination === 'string') {
    // Check if it's already in the correct format
    if (combination.match(/^(Low|Medium|High)\/(Low|Medium|High)$/i)) {
      return combination;
    }
  }
  
  // Convert numeric levels to text if needed
  const eiText = numericLevelToText(eiLevel);
  const ciText = numericLevelToText(ciLevel);
  
  if (eiText && ciText) {
    return `${eiText}/${ciText}`;
  }
  
  return combination || null;
};

// Expandable Chat Row Component
const ChatRow = ({ chat, type, onViewSurvey }) => {
  const [expanded, setExpanded] = useState(false);
  const [surveyExpanded, setSurveyExpanded] = useState(false);
  const [signupSurveyExpanded, setSignupSurveyExpanded] = useState(false);
  const messages = chat.messages || [];
  const surveyData = chat.interaction_survey_data;
  const surveyCompleted = chat.interaction_survey_completed === true;
  const signupSurveyData = chat.signup_survey_data;
  const signupSurveyCompleted = chat.signup_survey_completed === true;

  // Parse agent_name from backend (format: "7/4 (7/4)" or "Agent 1 (Low/Medium)")
  const agentNameField = chat.agent_name || chat.character_name;
  const { agentName, eiLevel: parsedEI, ciLevel: parsedCI, eiCiCombination: parsedCombination } = parseAgentName(agentNameField);
  
  // Format EI/CI combination - prioritize parsed text combination, then convert from numeric values
  let eiCiCombination = parsedCombination;
  
  // If we have parsed numeric EI/CI levels from agent_name, convert them to text
  if (!eiCiCombination && (parsedEI !== null || parsedCI !== null)) {
    eiCiCombination = formatEICICombination(parsedEI, parsedCI, null);
  }
  
  // If still no combination, try converting from separate fields in chat object
  if (!eiCiCombination && (chat.character_ei_level !== undefined || chat.character_ci_level !== undefined)) {
    eiCiCombination = formatEICICombination(chat.character_ei_level, chat.character_ci_level, null);
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            disabled={messages.length === 0}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          {type === 'user' ? chat.user_email : (chat.participant_email || 'No email')}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {agentName}
          </Typography>
        </TableCell>
        <TableCell>
          {eiCiCombination ? (
            <Chip
              label={`EI/CI: ${eiCiCombination}`}
              size="small"
              sx={{
                bgcolor: '#2196f3',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">N/A</Typography>
          )}
        </TableCell>
        <TableCell>
          {type === 'user' ? chat.message_count : chat.interactions}
        </TableCell>
        <TableCell>{formatDate(type === 'user' ? chat.last_message_at : chat.last_message_at)}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {signupSurveyCompleted && signupSurveyData && (
              <Chip
                label="Signup Survey ✓"
                color="info"
                size="small"
                onClick={() => setSignupSurveyExpanded(!signupSurveyExpanded)}
                sx={{ cursor: 'pointer' }}
              />
            )}
            {surveyCompleted && surveyData ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Interaction (Avg: ${calculateSurveyAverage(surveyData)}/6)`}
                  color="success"
                  size="small"
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  onClick={() => {
                    if (onViewSurvey) {
                      onViewSurvey(chat, surveyData);
                    } else {
                      setSurveyExpanded(!surveyExpanded);
                    }
                  }}
                >
                  View
                </Button>
              </Box>
            ) : (
              <Chip
                label={chat.survey_unlocked ? 'Unlocked' : 'No Survey'}
                color={chat.survey_unlocked ? 'warning' : 'default'}
                size="small"
              />
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded || surveyExpanded || signupSurveyExpanded ? 1 : 0 }}>
          {/* Signup Survey Display */}
          {signupSurveyData && (
            <Collapse in={signupSurveyExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Signup Survey Results
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Completed: {formatDate(signupSurveyData.completed_at)}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Question</strong></TableCell>
                        <TableCell><strong>Response</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>How often do you use AI chatbots?</TableCell>
                        <TableCell>{signupSurveyData.q1_ai_chatbot_frequency}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Have you chatted with a virtual character in the past 6 months?</TableCell>
                        <TableCell>{signupSurveyData.q2_virtual_character_experience}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>To what extent do you think AI chatbots can reason and make decisions?</TableCell>
                        <TableCell>{signupSurveyData.q3_ai_reasoning_belief}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>To what extent do you think AI chatbots can empathize and express emotions?</TableCell>
                        <TableCell>{signupSurveyData.q4_ai_empathy_belief}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Collapse>
          )}
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Chat History ({messages.length} messages)
              </Typography>
              {messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No messages yet
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {[...messages].sort((a, b) => {
                    const timeA = new Date(a.created_at || a.timestamp || 0);
                    const timeB = new Date(b.created_at || b.timestamp || 0);
                    return timeA - timeB;
                  }).map((msg, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1,
                        p: 1,
                        bgcolor: (msg.sender === 'user' || msg.sender === 'participant') ? '#e3f2fd' : '#fff3e0',
                        borderRadius: 1,
                        borderLeft: 3,
                        borderColor: (msg.sender === 'user' || msg.sender === 'participant') ? '#2196f3' : '#ff9800'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        <strong>{msg.sender === 'user' || msg.sender === 'participant' ? 'User' : 'Character'}</strong>
                        {' • '}
                        {formatDate(msg.created_at || msg.timestamp)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {msg.content || msg.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
          {surveyData && (
            <Collapse in={surveyExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Survey Results: {agentName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Completed: {formatDate(surveyData.completed_at)}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Question</strong></TableCell>
                        <TableCell align="center"><strong>Response</strong></TableCell>
                        <TableCell align="center"><strong>Score</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Provided thoughtful, strategic guidance</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q1_thoughtful_guidance)}</TableCell>
                        <TableCell align="center">{surveyData.q1_thoughtful_guidance}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Clearly explained trade-offs or options</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q2_explained_tradeoffs)}</TableCell>
                        <TableCell align="center">{surveyData.q2_explained_tradeoffs}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Seemed capable at problem-solving</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q3_problem_solving)}</TableCell>
                        <TableCell align="center">{surveyData.q3_problem_solving}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Recognized and validated the user's feelings</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q4_validated_feelings)}</TableCell>
                        <TableCell align="center">{surveyData.q4_validated_feelings}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Seemed supportive and compassionate</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q5_supportive_compassionate)}</TableCell>
                        <TableCell align="center">{surveyData.q5_supportive_compassionate}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Prioritized the user's emotional needs</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q6_emotional_needs)}</TableCell>
                        <TableCell align="center">{surveyData.q6_emotional_needs}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Overall, seemed intelligent</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q7_seemed_intelligent)}</TableCell>
                        <TableCell align="center">{surveyData.q7_seemed_intelligent}/6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>I would want to talk to this character again</TableCell>
                        <TableCell align="center">{getLikertLabel(surveyData.q8_would_talk_again)}</TableCell>
                        <TableCell align="center">{surveyData.q8_would_talk_again}/6</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, p: 1, bgcolor: '#c8e6c9', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Average Score:</strong> {calculateSurveyAverage(surveyData)}/6
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          )}
        </TableCell>
      </TableRow>
    </>
  );
};

// Survey Response Row Component - displays all survey data for a user
const SurveyResponseRow = ({ userData, onViewSurvey }) => {
  const [expanded, setExpanded] = useState(false);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const [signupSurveyExpanded, setSignupSurveyExpanded] = useState(false);
  
  const hasConsent = userData.consentAccepted;
  const hasSignupSurvey = userData.signupSurveyCompleted && userData.signupSurveyData;
  const hasInteractionSurveys = userData.interactionSurveys.length > 0;
  
  return (
    <Paper sx={{ mb: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">{userData.email}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {hasConsent && (
              <Chip 
                label={`Consent: ${formatDate(userData.consentDate)}`} 
                color="success" 
                size="small" 
              />
            )}
            {hasSignupSurvey && (
              <Chip 
                label={`Signup Survey: ${formatDate(userData.signupSurveyData?.completed_at)}`} 
                color="info" 
                size="small" 
              />
            )}
            {hasInteractionSurveys && (
              <Chip 
                label={`Interaction Surveys: ${userData.interactionSurveys.length}`} 
                color="primary" 
                size="small" 
              />
            )}
          </Box>
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2 }}>
          {/* Consent Form Section */}
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: hasConsent ? '#e8f5e9' : '#ffebee' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Consent Form
              </Typography>
              <IconButton size="small" onClick={() => setConsentExpanded(!consentExpanded)}>
                {consentExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            {hasConsent ? (
              <Typography variant="body2" color="text.secondary">
                Status: Accepted
                {userData.consentDate && ` • Date: ${formatDate(userData.consentDate)}`}
              </Typography>
            ) : (
              <Typography variant="body2" color="error">
                Not completed
              </Typography>
            )}
            <Collapse in={consentExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="body2">
                  The user has accepted the research study consent form.
                  {userData.consentDate && ` Accepted on ${formatDate(userData.consentDate)}.`}
                </Typography>
              </Box>
            </Collapse>
          </Paper>
          
          {/* Signup Survey Section */}
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: hasSignupSurvey ? '#e3f2fd' : '#fff3e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Initial Signup Survey
              </Typography>
              <IconButton size="small" onClick={() => setSignupSurveyExpanded(!signupSurveyExpanded)}>
                {signupSurveyExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            {hasSignupSurvey ? (
              <Typography variant="body2" color="text.secondary">
                Completed: {formatDate(userData.signupSurveyData?.completed_at)}
              </Typography>
            ) : (
              <Typography variant="body2" color="warning.main">
                Not completed
              </Typography>
            )}
            <Collapse in={signupSurveyExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                {userData.signupSurveyData ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Question</strong></TableCell>
                          <TableCell><strong>Response</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Q1: How often do you use AI chatbots?</TableCell>
                          <TableCell>{userData.signupSurveyData.q1_ai_chatbot_frequency || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q2: Have you chatted with a virtual character in the past 6 months?</TableCell>
                          <TableCell>{userData.signupSurveyData.q2_virtual_character_experience || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q3: To what extent do you think AI chatbots can reason and make decisions?</TableCell>
                          <TableCell>{userData.signupSurveyData.q3_ai_reasoning_belief || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q4: To what extent do you think AI chatbots can empathize and express emotions?</TableCell>
                          <TableCell>{userData.signupSurveyData.q4_ai_empathy_belief || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q5: Which is NOT powered by AI?</TableCell>
                          <TableCell>{userData.signupSurveyData.q5_not_powered_by_ai || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q6: Which fields contribute to AI development?</TableCell>
                          <TableCell>{userData.signupSurveyData.q6_fields_contributing_to_ai || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q7: What is a common form of knowledge representation in AI?</TableCell>
                          <TableCell>{userData.signupSurveyData.q7_knowledge_representation || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q8: Which algorithmic approach is commonly used for decision-making?</TableCell>
                          <TableCell>{userData.signupSurveyData.q8_decision_making_algorithm || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q9: What is the first step in a typical ML process?</TableCell>
                          <TableCell>{userData.signupSurveyData.q9_first_step_ml || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q10: Which is an example of metadata?</TableCell>
                          <TableCell>{userData.signupSurveyData.q10_metadata_example || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q11: How do supervised ML algorithms learn?</TableCell>
                          <TableCell>{userData.signupSurveyData.q11_supervised_ml_learning || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q12: How can an AI system interact with the physical world?</TableCell>
                          <TableCell>{userData.signupSurveyData.q12_ai_physical_world || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q13: Which sensors allow an AI system to perceive the world?</TableCell>
                          <TableCell>{userData.signupSurveyData.q13_sensors_perception || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Q14: Which statement best describes the programmability of AI systems?</TableCell>
                          <TableCell>{userData.signupSurveyData.q14_ai_programmability || 'N/A'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No survey data available
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>
          
          {/* Interaction Surveys Section */}
          <Paper elevation={1} sx={{ p: 2, bgcolor: hasInteractionSurveys ? '#f3e5f5' : '#f5f5f5' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Interaction Surveys (Completed: {userData.interactionSurveys.length})
            </Typography>
            {hasInteractionSurveys ? (
              <Box sx={{ mt: 2 }}>
                {userData.interactionSurveys.map((interaction, idx) => (
                  <Paper key={idx} elevation={0} sx={{ p: 2, mb: 1, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {interaction.agentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed: {formatDate(interaction.completedAt)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AssignmentIcon />}
                      onClick={() => {
                        if (onViewSurvey) {
                          const fakeChat = { agent_name: interaction.agentName, user_email: userData.email };
                          onViewSurvey(fakeChat, interaction.surveyData);
                        }
                      }}
                    >
                      View Full Survey
                    </Button>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No interaction surveys completed yet
              </Typography>
            )}
          </Paper>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default function AdminDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadAdminUsers();
  }, []);

  const handleViewSurvey = (chat, surveyData) => {
    // Parse agent_name from backend
    const agentNameField = chat.agent_name || chat.character_name;
    const { agentName, eiCiCombination } = parseAgentName(agentNameField);
    
    setSelectedSurvey({
      userEmail: chat.user_email || chat.participant_email || 'No email',
      characterName: agentName,
      eiCiCombination: eiCiCombination,
      surveyData: surveyData,
      completedAt: surveyData?.completed_at
    });
    setSurveyDialogOpen(true);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      const errorMessage = err.message || 'Failed to load dashboard';
      
      // Handle specific error cases
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('You do not have admin access.');
        setTimeout(() => {
          window.location.href = '/chat';
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const data = await getAdminUsers();
      setAdminUsers(Array.isArray(data) ? data : (data.admins || []));
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  const handleMakeAdmin = async () => {
    if (!newAdminEmail.trim()) {
      setAdminError('Please enter an email address');
      return;
    }

    const email = newAdminEmail.trim().toLowerCase();
    
    // Frontend validation: Only allow specific emails to be made admin
    if (!isAllowedAdminEmail(email)) {
      setAdminError(`Admin access is restricted. Only ${ALLOWED_ADMIN_EMAILS.join(' and ')} can have admin access.`);
      return;
    }

    try {
      setAdminLoading(true);
      setAdminError(null);
      
      // Find user ID by email (you may need to adjust this based on your API)
      // For now, assuming the API accepts email directly
      await makeUserAdmin(newAdminEmail);
      
      setAdminDialogOpen(false);
      setNewAdminEmail('');
      await loadAdminUsers();
      await loadDashboard();
    } catch (err) {
      const errorMessage = err.message || 'Failed to make user admin';
      if (errorMessage.includes('Maximum') || errorMessage.includes('2 admins')) {
        setAdminError('Maximum of 2 admins allowed');
      } else if (errorMessage.includes('not authorized') || errorMessage.includes('restricted')) {
        setAdminError(errorMessage);
      } else {
        setAdminError(errorMessage);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (adminUsers.length <= 1) {
      setAdminError('Cannot remove the last admin');
      return;
    }

    if (user && user.id === userId) {
      setAdminError('Cannot remove your own admin status');
      return;
    }

    try {
      setAdminLoading(true);
      setAdminError(null);
      await removeUserAdmin(userId);
      await loadAdminUsers();
      await loadDashboard();
    } catch (err) {
      const errorMessage = err.message || 'Failed to remove admin';
      if (errorMessage.includes('last admin')) {
        setAdminError('Cannot remove the last admin');
      } else if (errorMessage.includes('your own')) {
        setAdminError('Cannot remove your own admin status');
      } else {
        setAdminError(errorMessage);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadDashboard}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No dashboard data available</Alert>
      </Box>
    );
  }

  const { total_users, total_participants, total_conversations, total_messages, user_chats, participant_chats, characters } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadDashboard();
            loadAdminUsers();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {total_users || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Participants
              </Typography>
              <Typography variant="h4">
                {total_participants || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Conversations
              </Typography>
              <Typography variant="h4">
                {total_conversations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Messages
              </Typography>
              <Typography variant="h4">
                {total_messages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Management Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Admin Users</Typography>
          <Button
            variant="contained"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={() => setAdminDialogOpen(true)}
            disabled={adminUsers.length >= 2}
            title={adminUsers.length >= 2 ? "Maximum of 2 admins allowed" : "Add admin (restricted to specific emails)"}
          >
            Make Admin
          </Button>
        </Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Admin access is restricted to: {ALLOWED_ADMIN_EMAILS.join(' and ')}
        </Alert>
        {adminUsers.length >= 2 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Maximum of 2 admins allowed. Both allowed admin emails are already admins.
          </Alert>
        )}
        {adminError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAdminError(null)}>
            {adminError}
          </Alert>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow key={admin.id || admin.email}>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<PersonRemoveIcon />}
                      onClick={() => handleRemoveAdmin(admin.id || admin.user_id)}
                      disabled={adminUsers.length <= 1 || (user && user.id === (admin.id || admin.user_id))}
                    >
                      Remove Admin
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tabs for User Chats and Participant Chats */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`User Assignments`} />
          <Tab label={`Survey Responses`} />
          <Tab label={`Participant Chats`} />
          <Tab label={`Agents (${characters?.length || 0})`} />
        </Tabs>

        {/* User Assignments Tab */}
        {tabValue === 0 && (() => {
          // Aggregate user-agent assignments from both user_chats and participant_chats
          const allChats = [...(user_chats || []), ...(participant_chats || [])];
          const userAssignments = {};
          
          // Group by user email to get their assigned agent
          allChats.forEach(chat => {
            const email = chat.user_email || chat.participant_email || 'No email';
            const agentNameField = chat.agent_name || chat.character_name;
            
            // Only set assignment if not already set (users have 1 agent, so first one found is the assigned one)
            if (!userAssignments[email] && agentNameField) {
              const parsed = parseAgentName(agentNameField);
              userAssignments[email] = {
                email: email,
                agentName: parsed.agentName,
                agentId: chat.character_id,
                eiCiCombination: parsed.eiCiCombination,
                eiLevel: parsed.eiLevel,
                ciLevel: parsed.ciLevel
              };
            }
          });
          
          const assignments = Object.values(userAssignments);
          
          return (
            <Box sx={{ p: 2 }}>
              {assignments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No user assignments found
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>User Email</strong></TableCell>
                        <TableCell><strong>Assigned Agent</strong></TableCell>
                        <TableCell><strong>EI/CI Levels</strong></TableCell>
                        <TableCell><strong>Current Topic</strong></TableCell>
                        <TableCell><strong>Current Scenario</strong></TableCell>
                        <TableCell><strong>Topics Completed</strong></TableCell>
                        <TableCell><strong>Scenarios Completed</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignments.map((assignment, idx) => {
                        // Find the user's chat data to get topic/scenario info
                        const userChat = allChats.find(c => 
                          (c.user_email || c.participant_email) === assignment.email
                        );
                        const currentTopic = userChat?.current_topic || 'N/A';
                        const currentScenario = userChat?.current_scenario || 'N/A';
                        const topicsCompleted = userChat?.topics_completed || [];
                        const scenariosCompleted = userChat?.scenarios_completed || [];
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell>{assignment.email}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {assignment.agentName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {assignment.eiCiCombination ? (
                                <Chip 
                                  label={assignment.eiCiCombination}
                                  size="small"
                                  sx={{
                                    bgcolor: getLevelColor(assignment.eiCiCombination.split('/')[0]),
                                    color: 'white',
                                    fontWeight: 500
                                  }}
                                />
                              ) : assignment.eiLevel && assignment.ciLevel ? (
                                <Chip 
                                  label={`${assignment.eiLevel}/${assignment.ciLevel}`}
                                  size="small"
                                  sx={{
                                    bgcolor: getLevelColor(assignment.eiLevel),
                                    color: 'white',
                                    fontWeight: 500
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">N/A</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {typeof currentTopic === 'number' ? (
                                <Chip 
                                  label={`Topic ${currentTopic}`}
                                  size="small"
                                  sx={{ bgcolor: '#2563eb', color: 'white' }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {currentTopic}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {currentScenario === 'A' || currentScenario === 'B' ? (
                                <Chip 
                                  label={`Scenario ${currentScenario}`}
                                  size="small"
                                  sx={{ 
                                    bgcolor: currentScenario === 'A' ? '#2563eb' : '#9333ea', 
                                    color: 'white' 
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {currentScenario}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {Array.isArray(topicsCompleted) && topicsCompleted.length > 0 ? (
                                <Typography variant="body2">
                                  {topicsCompleted.join(', ')}
                                </Typography>
                              ) : typeof topicsCompleted === 'string' && topicsCompleted.trim() ? (
                                <Typography variant="body2">
                                  {topicsCompleted}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  None
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {Array.isArray(scenariosCompleted) && scenariosCompleted.length > 0 ? (
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                  {scenariosCompleted.join(', ')}
                                </Typography>
                              ) : typeof scenariosCompleted === 'string' && scenariosCompleted.trim() ? (
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                  {scenariosCompleted}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  None
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          );
        })()}

        {/* Survey Responses Tab */}
        {tabValue === 1 && (() => {
          // Aggregate survey data from both user_chats and participant_chats
          const allChats = [...(user_chats || []), ...(participant_chats || [])];
          const surveyByUser = {};
          
          // Group chats by user email
          allChats.forEach(chat => {
            const email = chat.user_email || chat.participant_email || 'No email';
            if (!surveyByUser[email]) {
              surveyByUser[email] = {
                email: email,
                consentAccepted: chat.consent_accepted || false,
                consentDate: chat.consent_accepted_at || null,
                signupSurveyCompleted: chat.signup_survey_completed || false,
                signupSurveyData: chat.signup_survey_data || null,
                interactionSurveys: []
              };
            }
            
            // Collect interaction surveys for each character
            if (chat.interaction_survey_completed && chat.interaction_survey_data) {
              const agentNameField = chat.agent_name || chat.character_name;
              const { agentName } = parseAgentName(agentNameField);
              
              surveyByUser[email].interactionSurveys.push({
                agentName: agentName,
                agentId: chat.character_id,
                surveyData: chat.interaction_survey_data,
                completedAt: chat.interaction_survey_data?.completed_at || null
              });
            }
            
            // Update consent and signup survey from latest chat if not set
            if (!surveyByUser[email].consentAccepted && chat.consent_accepted) {
              surveyByUser[email].consentAccepted = true;
              surveyByUser[email].consentDate = chat.consent_accepted_at;
            }
            if (!surveyByUser[email].signupSurveyCompleted && chat.signup_survey_completed) {
              surveyByUser[email].signupSurveyCompleted = true;
              surveyByUser[email].signupSurveyData = chat.signup_survey_data;
            }
          });
          
          const surveyUsers = Object.values(surveyByUser);
          
          return (
            <Box sx={{ p: 2 }}>
              {surveyUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No survey responses found
                </Typography>
              ) : (
                surveyUsers.map((userData, idx) => (
                  <SurveyResponseRow 
                    key={idx} 
                    userData={userData} 
                    onViewSurvey={handleViewSurvey}
                  />
                ))
              )}
            </Box>
          );
        })()}

        {/* Participant Chats Tab */}
        {tabValue === 2 && (() => {
          // Aggregate chats by user email to show only one row per user
          const allChats = [...(user_chats || []), ...(participant_chats || [])];
          const userChatMap = {};
          
          // Group chats by user email
          allChats.forEach(chat => {
            const email = chat.user_email || chat.participant_email || 'No email';
            if (!userChatMap[email]) {
              userChatMap[email] = [];
            }
            userChatMap[email].push(chat);
          });
          
          // For each user, find their assigned agent (the one with interactions > 0, or first one)
          const uniqueUserChats = Object.entries(userChatMap).map(([email, chats]) => {
            // Sort chats by interactions (descending) to prioritize the one being used
            const sortedChats = [...chats].sort((a, b) => {
              const aInteractions = a.message_count || a.interactions || 0;
              const bInteractions = b.message_count || b.interactions || 0;
              return bInteractions - aInteractions;
            });
            
            // Return the chat with the most interactions (the one being used)
            return sortedChats[0];
          });
          
          return (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="50px"></TableCell>
                    <TableCell><strong>Participant Email</strong></TableCell>
                    <TableCell><strong>Assigned Agent</strong></TableCell>
                    <TableCell><strong>EI/CI Levels</strong></TableCell>
                    <TableCell><strong>Interactions</strong></TableCell>
                    <TableCell><strong>Last Message</strong></TableCell>
                    <TableCell><strong>Survey Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uniqueUserChats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No participant chats found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    uniqueUserChats.map((chat, idx) => (
                      <ChatRow key={idx} chat={chat} type="participant" onViewSurvey={handleViewSurvey} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()}

        {/* Agents Tab */}
        {tabValue === 3 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Agent</strong></TableCell>
                  <TableCell><strong>EI Level</strong></TableCell>
                  <TableCell><strong>CI Level</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!characters || characters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No agents found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  characters.map((char) => {
                    // Parse agent name - convert numeric IDs to "Agent X" format
                    let agentName = char.name;
                    if (char.id && typeof char.id === 'number' && char.id >= 1 && char.id <= 9) {
                      agentName = `Agent ${char.id}`;
                    } else if (typeof char.name === 'number' && char.name >= 1 && char.name <= 9) {
                      agentName = `Agent ${char.name}`;
                    } else {
                      // Try to parse from name field
                      const parsed = parseAgentName(char.name);
                      agentName = parsed.agentName;
                    }
                    
                    return (
                      <TableRow key={char.id}>
                        <TableCell>{agentName}</TableCell>
                        <TableCell>
                          <LevelBadge level={char.ei_level} label="EI" />
                        </TableCell>
                        <TableCell>
                          <LevelBadge level={char.ci_level} label="CI" />
                        </TableCell>
                        <TableCell>{char.description || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Make Admin Dialog */}
      <Dialog open={adminDialogOpen} onClose={() => setAdminDialogOpen(false)}>
        <DialogTitle>Make User Admin</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Only these emails can be granted admin access: {ALLOWED_ADMIN_EMAILS.join(', ')}
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="User Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="Enter email address"
            helperText="Only allowed admin emails can be granted admin access"
            sx={{ mt: 1 }}
          />
          {adminError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {adminError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAdminDialogOpen(false);
            setNewAdminEmail('');
            setAdminError(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleMakeAdmin} 
            variant="contained"
            disabled={adminLoading}
          >
            {adminLoading ? <CircularProgress size={20} /> : 'Make Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Survey Details Dialog */}
      <Dialog 
        open={surveyDialogOpen} 
        onClose={() => setSurveyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Survey Results: {selectedSurvey?.characterName}
        </DialogTitle>
        <DialogContent>
          {selectedSurvey && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>User:</strong> {selectedSurvey.userEmail}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Agent:</strong> {selectedSurvey.characterName}
                  {selectedSurvey.eiCiCombination && ` (${selectedSurvey.eiCiCombination})`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Completed:</strong> {formatDate(selectedSurvey.completedAt)}
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Question</strong></TableCell>
                      <TableCell align="center"><strong>Response</strong></TableCell>
                      <TableCell align="center"><strong>Score</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Provided thoughtful, strategic guidance</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q1_thoughtful_guidance)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q1_thoughtful_guidance}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Clearly explained trade-offs or options</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q2_explained_tradeoffs)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q2_explained_tradeoffs}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Seemed capable at problem-solving</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q3_problem_solving)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q3_problem_solving}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Recognized and validated the user's feelings</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q4_validated_feelings)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q4_validated_feelings}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Seemed supportive and compassionate</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q5_supportive_compassionate)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q5_supportive_compassionate}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Prioritized the user's emotional needs</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q6_emotional_needs)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q6_emotional_needs}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Overall, seemed intelligent</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q7_seemed_intelligent)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q7_seemed_intelligent}/6</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>I would want to talk to this character again</TableCell>
                      <TableCell align="center">{getLikertLabel(selectedSurvey.surveyData?.q8_would_talk_again)}</TableCell>
                      <TableCell align="center">{selectedSurvey.surveyData?.q8_would_talk_again}/6</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, p: 2, bgcolor: '#c8e6c9', borderRadius: 1 }}>
                <Typography variant="h6">
                  <strong>Average Score:</strong> {calculateSurveyAverage(selectedSurvey.surveyData)}/6
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSurveyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
