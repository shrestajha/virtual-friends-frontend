import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getParticipant, addMessage, getAssignedCharacters, getCurrentTopic, sendChat } from '../api';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Tabs, Tab, Alert } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CharacterInteractionSurvey from '../components/CharacterInteractionSurvey';
import TopicDisplay from '../components/TopicDisplay';

export default function ChatPage({ user }) {
  // State Management
  const [participant, setParticipant] = useState(null); // Stores all 3 characters and their chat histories
  const [currentCharacterId, setCurrentCharacterId] = useState(null); // Tracks which character's chat is displayed
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingParticipant, setLoadingParticipant] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Character Interaction Survey state
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyCharacterId, setSurveyCharacterId] = useState(null);
  const [surveyCharacterName, setSurveyCharacterName] = useState('');
  const [completedSurveys, setCompletedSurveys] = useState(new Set()); // Track completed survey character IDs
  
  // Topic state
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicInfo, setTopicInfo] = useState(null);
  const [topicsCompleted, setTopicsCompleted] = useState([]);
  const [canAdvance, setCanAdvance] = useState(false);
  const [topicLoading, setTopicLoading] = useState(true);
  const [topicAdvancementMessage, setTopicAdvancementMessage] = useState(null);

  // Check if any character has reached 7 interactions and show survey for that character
  const checkAndShowSurvey = useCallback((participantData) => {
    if (!participantData || !participantData.characters) {
      console.log('checkAndShowSurvey: No participant data or characters');
      return;
    }
    
    const characters = participantData.characters || [];
    console.log('checkAndShowSurvey: Checking', characters.length, 'characters');
    
    // Log interaction counts for debugging
    characters.forEach(char => {
      console.log(`Character ${char.name} (${char.id}): ${char.interactions || 0} interactions`);
    });
    
    // Find the first character that has reached 7 interactions and hasn't completed its survey
    const characterNeedingSurvey = characters.find(char => {
      const interactions = char.interactions || 0;
      const charId = String(char.id);
      const isCompleted = completedSurveys.has(charId);
      const hasEnoughInteractions = interactions >= 7;
      
      console.log(`Character ${char.name} (${charId}): ${interactions} interactions, survey completed? ${isCompleted}`);
      
      return hasEnoughInteractions && !isCompleted;
    });
    
    if (characterNeedingSurvey) {
      const charId = String(characterNeedingSurvey.id);
      const charName = characterNeedingSurvey.name || 'this character';
      
      console.log('Character has 7 interactions! Showing survey for:', charName, '(ID:', charId, ')');
      setSurveyCharacterId(charId);
      setSurveyCharacterName(charName);
      setSurveyOpen(true);
    } else {
      console.log('No character needs survey yet (either not at 7 interactions or already completed)');
    }
  }, [completedSurveys]);

  // Fetch current topic information
  const loadCurrentTopic = useCallback(async () => {
    if (!user) return;
    
    try {
      setTopicLoading(true);
      const topicData = await getCurrentTopic();
      console.log('Current topic data:', topicData);
      
      setCurrentTopic(topicData.current_topic);
      setTopicInfo(topicData.topic_info);
      
      // Parse topics_completed (can be array or comma-separated string)
      if (Array.isArray(topicData.topics_completed)) {
        setTopicsCompleted(topicData.topics_completed);
      } else if (typeof topicData.topics_completed === 'string' && topicData.topics_completed.trim()) {
        const completed = topicData.topics_completed.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
        setTopicsCompleted(completed);
      } else {
        setTopicsCompleted([]);
      }
      
      setCanAdvance(topicData.can_advance || false);
    } catch (error) {
      console.error('Failed to load current topic:', error);
      // Don't show error to user, topics are optional
    } finally {
      setTopicLoading(false);
    }
  }, [user]);

  // On Load: Call getParticipant() (with auth token) to get or create participant data
  useEffect(() => {
    if (user) {
      loadParticipant();
      loadCurrentTopic();
    }
  }, [user, loadCurrentTopic]);

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

  // Check for survey eligibility when participant data changes
  useEffect(() => {
    if (participant && participant.characters && participant.characters.length > 0) {
      checkAndShowSurvey(participant);
    }
  }, [participant, checkAndShowSurvey]);

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
      
      // Check if survey should be shown after loading
      checkAndShowSurvey(data);
      
      return data;
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
      
      // Check if it's a 404 error - refresh character assignments
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        console.log('404 error detected, refreshing character assignments...');
        try {
          // Call /characters/assigned to refresh character assignments
          const assignedChars = await getAssignedCharacters();
          console.log('Refreshed character assignments:', assignedChars);
          
          // Store updated character assignments
          if (assignedChars && Array.isArray(assignedChars)) {
            localStorage.setItem("assignedCharacters", JSON.stringify(assignedChars));
          } else if (assignedChars && assignedChars.characters && Array.isArray(assignedChars.characters)) {
            localStorage.setItem("assignedCharacters", JSON.stringify(assignedChars.characters));
          }
          
          // Retry loading participant after refreshing assignments
          console.log('Retrying participant load after refreshing assignments...');
          const retryData = await getParticipant(user.email);
          if (retryData) {
            setParticipant(retryData);
            if (retryData._id) {
              localStorage.setItem('participantId', retryData._id);
            }
            if (retryData.characters && retryData.characters.length > 0 && !currentCharacterId) {
              setCurrentCharacterId(retryData.characters[0].id);
            }
            checkAndShowSurvey(retryData);
            setLoadingParticipant(false);
            return retryData;
          }
        } catch (refreshError) {
          console.error('Failed to refresh character assignments:', refreshError);
          userFriendlyMessage = 'Character assignments not found. Please try logging in again.';
        }
      }
      
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
      return null;
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

  // Send Message: Call POST /chat endpoint
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentCharacterId || loading || !user || !participant) return;

    const character = participant.characters?.find(c => 
      c.id === currentCharacterId || 
      c.id === String(currentCharacterId) ||
      String(c.id) === String(currentCharacterId)
    );
    const currentCount = character?.interactions || character?.interaction_count || 0;
    
    if (currentCount >= 7) {
      return; // Already at limit
    }

    setInput('');
    setLoading(true);

    try {
      // POST /chat - Send message to agent
      const chatResponse = await sendChat(String(currentCharacterId), text);
      console.log('Chat response:', chatResponse);
      
      // After sending via /chat, also update participant data to track interactions
      // Use email or stored participant ID (prefer stored ID if available for efficiency)
      const participantId = localStorage.getItem('participantId') || user.email || participant._id || participant.id;
      
      let updatedParticipant = null;
      if (participantId) {
        try {
          // Update participant data to track interactions and get survey status
          updatedParticipant = await addMessage(participantId, String(currentCharacterId), 'participant', text);
        } catch (error) {
          console.warn('Failed to update participant data, but chat message was sent:', error);
          // Chat message was sent successfully, just reload participant data
          updatedParticipant = await loadParticipant();
        }
      } else {
        // If no participant ID, just reload participant data
        updatedParticipant = await loadParticipant();
      }
      
      // Update participant data to track interactions and get survey status
      // Use the updated participant data from response, or reload if not returned
      if (updatedParticipant && updatedParticipant.characters) {
        setParticipant(updatedParticipant);
        // Update stored participant ID if returned
        if (updatedParticipant._id) {
          localStorage.setItem('participantId', updatedParticipant._id);
        }
        
        // Check if response includes survey trigger information
        // The backend may return show_survey, character_id, and character_name in the response
        if (updatedParticipant.show_survey === true) {
          console.log('Survey trigger detected in participant response');
          // Use character_id from show_survey response (required by backend)
          const charId = updatedParticipant.character_id || currentCharacterId;
          const charName = updatedParticipant.character_name || 
            updatedParticipant.characters?.find(c => 
              c.id === charId || 
              c.id === String(charId) ||
              String(c.id) === String(charId)
            )?.name || 'this character';
          
          // Only show survey if not already completed for this character
          if (!completedSurveys.has(String(charId))) {
            console.log('Opening survey for character:', charName, '(ID:', charId, ')');
            // Store the character_id from show_survey response to use when submitting survey
            setSurveyCharacterId(charId);
            setSurveyCharacterName(charName);
            setSurveyOpen(true);
          } else {
            console.log('Survey already completed for character:', charName);
          }
        }
        
        // Check if all characters have reached 7 interactions and show survey
        checkAndShowSurvey(updatedParticipant);
      } else {
        // Fallback: reload participant data to get updated chat history and interaction counts
        const reloadedParticipant = await loadParticipant();
        if (reloadedParticipant) {
          checkAndShowSurvey(reloadedParticipant);
        }
      }
      
      // Survey is now handled via show_survey flag in addMessage response OR by checking interactions
      
      // Refocus input field after successful send (unless survey dialog opens)
      if (!updatedParticipant || updatedParticipant.show_survey !== true) {
        // Only refocus if survey dialog is not opening
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
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
      
      // Refocus input field even on error (so user can retry)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
  const hasReachedLimit = currentCount >= 7;
  // Backend returns 'surveyUnlocked' field (camelCase)
  const surveyUnlocked = participant.surveyUnlocked === true || participant.survey_unlocked === true;

  // Handle survey completion
  const handleSurveyComplete = async (characterId, characterName) => {
    // Mark this character's survey as completed
    setCompletedSurveys(prev => new Set([...prev, String(characterId)]));
    console.log(`Survey completed for character ${characterId} (${characterName})`);
    
    // Store previous topic to check if it advanced
    const previousTopic = currentTopic;
    
    // Reload topic data to check if topic advanced
    try {
      const updatedTopicData = await getCurrentTopic();
      console.log('Topic data after survey:', updatedTopicData);
      
      const newTopic = updatedTopicData.current_topic;
      
      // Check if topic advanced
      if (newTopic > previousTopic) {
        setTopicAdvancementMessage(`Topic ${previousTopic} completed! You've advanced to Topic ${newTopic}.`);
        // Clear message after 5 seconds
        setTimeout(() => setTopicAdvancementMessage(null), 5000);
      }
      
      // Update topic state
      setCurrentTopic(newTopic);
      setTopicInfo(updatedTopicData.topic_info);
      
      // Parse topics_completed
      if (Array.isArray(updatedTopicData.topics_completed)) {
        setTopicsCompleted(updatedTopicData.topics_completed);
      } else if (typeof updatedTopicData.topics_completed === 'string' && updatedTopicData.topics_completed.trim()) {
        const completed = updatedTopicData.topics_completed.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
        setTopicsCompleted(completed);
      }
      
      setCanAdvance(updatedTopicData.can_advance || false);
    } catch (error) {
      console.error('Failed to reload topic after survey:', error);
    }
    
    // Show success message
    alert(`Survey completed! Thank you for your feedback. You can continue chatting with ${characterName}.`);
    
    // Reload participant data to get updated interaction counts (should be reset to 0)
    // Chat history will remain visible as it's preserved in the backend
    await loadParticipant();
    
    // Refocus input field so user can continue chatting
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Topic Advancement Message */}
      {topicAdvancementMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2, mx: 2, mt: 2 }}
          onClose={() => setTopicAdvancementMessage(null)}
        >
          {topicAdvancementMessage}
        </Alert>
      )}

      {/* Topic Display */}
      {topicInfo && (
        <Box sx={{ px: 2, pt: 2 }}>
          <TopicDisplay 
            topicInfo={topicInfo}
            currentTopic={currentTopic}
            topicsCompleted={topicsCompleted}
            canAdvance={canAdvance}
          />
        </Box>
      )}

      {/* Progress Indicator */}
      {currentTopic && (
        <Paper elevation={1} sx={{ mx: 2, mb: 2, p: 2, bgcolor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2">
              <strong>Current Topic:</strong> {currentTopic}/11
            </Typography>
            <Typography variant="body2">
              <strong>Completed Topics:</strong> {topicsCompleted.length}/11
            </Typography>
            <Typography variant="body2">
              <strong>Interactions this topic:</strong> {currentCount}/7
            </Typography>
            <Typography variant="body2">
              <strong>Survey Status:</strong>{' '}
              {completedSurveys.has(String(currentCharacterId)) 
                ? 'Completed' 
                : currentCount >= 7 
                  ? 'Available' 
                  : 'Not Available'}
            </Typography>
          </Box>
        </Paper>
      )}

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
            const isCompleted = count >= 7;
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
                      {count}/7
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

      {/* Chat Header: Display Agent Name */}
      {currentCharacter && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 1.5, 
            mx: 2, 
            mb: 1, 
            bgcolor: '#1976d2', 
            color: 'white',
            borderRadius: 1
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }}>
            Chatting with {currentCharacter.name}
          </Typography>
        </Paper>
      )}

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
            Start a conversation with {currentCharacter?.name || 'your agent'} about the topic scenarios above!
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
            Completed – Survey available once all characters reach 7
          </Typography>
        </Paper>
      )}

      {/* Message Input: Sends participant messages */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            inputRef={inputRef}
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
            autoFocus
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
