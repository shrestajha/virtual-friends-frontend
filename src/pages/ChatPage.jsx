import React, { useState, useEffect, useRef } from 'react';
import { getParticipant, addMessage } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CharacterInteractionSurvey from '../components/CharacterInteractionSurvey';

export default function ChatPage({ user }) {
  // State Management
  const [participant, setParticipant] = useState(null); // Stores all 3 characters and their chat histories
  const [currentCharacterId, setCurrentCharacterId] = useState(null); // Tracks which character's chat is displayed
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingParticipant, setLoadingParticipant] = useState(true);
  const messagesEndRef = useRef(null);
  
  // Character Interaction Survey state
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyCharacterId, setSurveyCharacterId] = useState(null);
  const [surveyCharacterName, setSurveyCharacterName] = useState('');
  const [completedSurveys, setCompletedSurveys] = useState(new Set()); // Track completed survey character IDs

  // On Load: Call getParticipant() (with auth token) to get or create participant data
  useEffect(() => {
    if (user) {
      loadParticipant();
    }
  }, [user]);

  // Switch Character: Update currentCharacterId and render corresponding chatHistory
  useEffect(() => {
    if (participant?.characters && participant.characters.length > 0 && !currentCharacterId) {
      // Select first character by default
      setCurrentCharacterId(participant.characters[0].id);
    }
  }, [participant, currentCharacterId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentCharacterId && participant) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [participant, currentCharacterId]);

  const loadParticipant = async () => {
    try {
      setLoadingParticipant(true);
      // Use user's email as participant_id
      // GET /mongo/participants/{email} - backend auto-creates if missing
      // Expected response structure:
      // {
      //   "_id": "1",
      //   "surveyUnlocked": false,
      //   "characters": [
      //     {
      //       "id": "1",
      //       "name": "A",
      //       "interactions": 12,
      //       "chatHistory": [
      //         { "sender": "participant", "message": "hi", "timestamp": "..." },
      //         ...
      //       ]
      //     }
      //   ]
      // }
      if (!user || !user.email) {
        throw new Error('User email is required to load participant');
      }
      
      console.log('Loading participant for email:', user.email);
      const data = await getParticipant(user.email);
      console.log('Participant data loaded:', data);
      
      // Validate response structure
      if (!data) {
        throw new Error('Invalid participant data received');
      }
      
      // Store participant ID (integer) for future use (optional optimization)
      if (data._id) {
        localStorage.setItem('participantId', data._id);
        console.log('Stored participant ID:', data._id);
      }
      
      setParticipant(data);
      
      // Select first character if available
      if (data.characters && data.characters.length > 0 && !currentCharacterId) {
        setCurrentCharacterId(data.characters[0].id);
      }
    } catch (error) {
      console.error('Failed to load participant:', error);
      console.error('Error details:', {
        message: error.message,
        user: user?.email,
        stack: error.stack
      });
      
      // Check for specific backend database errors
      const errorMessage = error.message || 'Unknown error occurred';
      let userFriendlyMessage = 'Failed to load participant data.';
      
      // Check if it's a 403 error - survey required
      if (errorMessage.includes('403') || errorMessage.includes('survey') || errorMessage.includes('Please complete')) {
        userFriendlyMessage = 'Please complete the signup survey before accessing chat features.';
        // Redirect to signup survey
        window.history.pushState({}, "", "/signup-survey");
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      // Check if it's a database schema error
      if (errorMessage.includes('column participants.email does not exist')) {
        userFriendlyMessage = 'Backend database configuration error: The participants table is missing an email column. Please contact the administrator.';
        console.error('BACKEND FIX NEEDED: The participants table needs an email column, or the backend should use user ID from auth token instead of email lookup.');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        userFriendlyMessage = 'Server error occurred. The backend may need to be updated. Please try again later or contact support.';
      }
      
      // Show error message
      alert(userFriendlyMessage);
      
      // Don't block the UI completely - allow user to see the error but continue
      // Set a minimal participant state so the UI doesn't break
      setParticipant({
        _id: null,
        surveyUnlocked: false,
        characters: []
      });
    } finally {
      setLoadingParticipant(false);
    }
  };

  // Get chat history for current character
  const getCurrentChatHistory = () => {
    if (!participant || !currentCharacterId) return [];
    
    const character = participant.characters?.find(c => 
      c.id === currentCharacterId || 
      c.id === String(currentCharacterId) ||
      String(c.id) === String(currentCharacterId)
    );
    if (!character) return [];
    
    // Get chat history for this character (from backend structure)
    // Backend returns: character.chatHistory array with { sender, message, timestamp }
    const chatHistory = character.chatHistory || character.chat_history || character.messages || [];
    
    // Backend already returns messages ordered by timestamp, but sort to be safe
    return [...chatHistory].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeA - timeB;
    });
  };

  // Send Message: Call POST /mongo/participants/message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentCharacterId || loading || !user || !participant) return;

    const character = participant.characters?.find(c => 
      c.id === currentCharacterId || 
      c.id === String(currentCharacterId) ||
      String(c.id) === String(currentCharacterId)
    );
    const currentCount = character?.interactions || character?.interaction_count || 0;
    
    if (currentCount >= 15) {
      return; // Already at limit
    }

    setInput('');
    setLoading(true);

    try {
      // Use email or stored participant ID (prefer stored ID if available for efficiency)
      const participantId = localStorage.getItem('participantId') || user.email || participant._id || participant.id;
      
      if (!participantId) {
        throw new Error('Participant ID is required');
      }
      
      // POST /mongo/participants/message
      // Use email or stored participant ID, character_id as string, sender as "participant"
      const updatedParticipant = await addMessage(participantId, String(currentCharacterId), 'participant', text);
      
      // Check if response includes survey trigger information
      // The backend may return show_survey, character_id, and character_name in the response
      if (updatedParticipant && updatedParticipant.show_survey === true) {
        const charId = updatedParticipant.character_id || currentCharacterId;
        const charName = updatedParticipant.character_name || 
          participant.characters?.find(c => 
            c.id === charId || 
            c.id === String(charId) ||
            String(c.id) === String(charId)
          )?.name || 'this character';
        
        // Only show survey if not already completed for this character
        if (!completedSurveys.has(String(charId))) {
          setSurveyCharacterId(charId);
          setSurveyCharacterName(charName);
          setSurveyOpen(true);
        }
      }
      
      // Use the updated participant data from response, or reload if not returned
      if (updatedParticipant && updatedParticipant.characters) {
        setParticipant(updatedParticipant);
        // Update stored participant ID if returned
        if (updatedParticipant._id) {
          localStorage.setItem('participantId', updatedParticipant._id);
        }
      } else {
        // Fallback: reload participant data to get updated chat history and interaction counts
        await loadParticipant();
      }
      
      // Survey is now handled via show_survey flag in addMessage response
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error.message || '';
      
      // Handle 403 error - survey required
      if (errorMessage.includes('403') || errorMessage.includes('survey') || errorMessage.includes('Please complete')) {
        alert('Please complete the signup survey before accessing chat features.');
        // Redirect to signup survey
        window.history.pushState({}, "", "/signup-survey");
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      
      alert('Failed to send message: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Switch Character: Update currentCharacterId
  const handleTabChange = (event, newValue) => {
    setCurrentCharacterId(newValue);
  };

  if (loadingParticipant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!participant || !participant.characters || participant.characters.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error">
          No participant data found. Please contact support.
        </Typography>
      </Box>
    );
  }

  const characters = participant.characters || [];
  const currentCharacter = characters.find(c => 
    c.id === currentCharacterId || 
    c.id === String(currentCharacterId) ||
    String(c.id) === String(currentCharacterId)
  );
  const chatHistory = getCurrentChatHistory();
  // Backend returns 'interactions' field
  const currentCount = currentCharacter?.interactions || 0;
  const hasReachedLimit = currentCount >= 15;
  // Backend returns 'surveyUnlocked' field (camelCase)
  const surveyUnlocked = participant.surveyUnlocked === true || participant.survey_unlocked === true;

  // Handle survey completion
  const handleSurveyComplete = (characterId, characterName) => {
    // Mark this character's survey as completed
    setCompletedSurveys(prev => new Set([...prev, String(characterId)]));
    console.log(`Survey completed for character ${characterId} (${characterName})`);
    // Optionally reload participant data to get updated survey status
    loadParticipant();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Character Tabs / Selector */}
      <Paper elevation={2} sx={{ borderRadius: 0 }}>
        <Tabs
          value={currentCharacterId || false}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {characters.map((char) => {
            // Backend returns 'interactions' field
            const count = char.interactions || 0;
            const isCompleted = count >= 15;
            return (
              <Tab
                key={char.id}
                value={char.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: currentCharacterId === char.id ? 600 : 400 }}>
                      {char.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: isCompleted ? '#16a34a' : 'text.secondary',
                        fontSize: '0.7rem'
                      }}
                    >
                      {count}/15
                    </Typography>
                  </Box>
                }
                sx={{
                  textTransform: 'none',
                  minHeight: 72,
                  opacity: isCompleted ? 0.7 : 1
                }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Survey is now handled automatically via CharacterInteractionSurvey component */}

      {/* Chat Window: Displays chatHistory for the selected character */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2, 
          bgcolor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {chatHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Start a conversation with {currentCharacter?.name || 'your character'}!
          </Typography>
        ) : (
          chatHistory.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                justifyContent: (msg.sender === 'participant' || msg.sender === 'user' || msg.role === 'user') ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  bgcolor: (msg.sender === 'participant' || msg.sender === 'user' || msg.role === 'user') ? '#1976d2' : '#e0e0e0',
                  color: (msg.sender === 'participant' || msg.sender === 'user' || msg.role === 'user') ? 'white' : 'black',
                  borderRadius: 2
                }}
              >
                <Typography variant="body1">{msg.message || msg.content}</Typography>
                {(msg.timestamp || msg.created_at) && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      mt: 0.5, 
                      opacity: 0.7,
                      fontSize: '0.7rem'
                    }}
                  >
                    {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
                  </Typography>
                )}
              </Paper>
            </Box>
          ))
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                bgcolor: '#e0e0e0',
                borderRadius: 2
              }}
            >
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Thinking...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Completion Message */}
      {hasReachedLimit && !surveyUnlocked && (
        <Paper elevation={1} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 0 }}>
          <Typography variant="body2" align="center" color="text.secondary">
            Completed – Survey available once all characters reach 15
          </Typography>
        </Paper>
      )}

      {/* Message Input: Sends participant messages */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={
              hasReachedLimit 
                ? "You have reached the interaction limit for this character" 
                : "Type your message... (Press Enter to send)"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || hasReachedLimit}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || loading || hasReachedLimit}
            startIcon={<SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Paper>

      {/* Character Interaction Survey Dialog */}
      <CharacterInteractionSurvey
        characterId={surveyCharacterId}
        characterName={surveyCharacterName}
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onComplete={handleSurveyComplete}
      />
    </Box>
  );
}
