import React, { useState, useEffect, useRef } from "react";
import { 
  getCurrentTopic, 
  selectScenario, 
  getChatHistory, 
  me,
  getCharacterSurveyStatus
} from "../api";
import ChatBox from "../components/ChatBox";
import CharacterInteractionSurvey from "../components/CharacterInteractionSurvey";

export default function ChatPage({ user }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicInfo, setTopicInfo] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyAvailable, setSurveyAvailable] = useState(false);
  const [completedSurveys, setCompletedSurveys] = useState(new Set());

  // Load initial data
  useEffect(() => {
    if (!user) {
      console.log('[ChatPage] No user provided');
      return;
    }
    
    console.log('[ChatPage] Loading data for user:', user.email);
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get user's assigned character
        console.log('[ChatPage] Fetching user data from /auth/me...');
        const userData = await me();
        console.log('[ChatPage] User data received:', userData);
        
        if (userData.characters && userData.characters.length > 0) {
          const char = userData.characters[0];
          console.log('[ChatPage] Setting character:', char);
          setSelectedCharacter(char);
          setInteractionCount(char.message_count || char.interactions || 0);
    } else {
          console.warn('[ChatPage] No characters found in user data');
    }

        // Load current topic and scenario
    try {
          console.log('[ChatPage] Fetching topic data from /topics/current...');
      const topicData = await getCurrentTopic();
          console.log('[ChatPage] Topic data received:', topicData);
          setCurrentTopic(topicData.current_topic);
      setTopicInfo(topicData.topic_info);
      
          // Set current scenario (A or B)
      if (topicData.current_scenario === 'A' || topicData.current_scenario === 'B') {
        setCurrentScenario(topicData.current_scenario);
      } else if (!topicData.scenario_a_completed) {
        setCurrentScenario('A');
            // Initialize Scenario A if not already done
            if (userData.characters && userData.characters.length > 0) {
              try {
                await selectScenario('A');
              } catch (err) {
                console.error('Failed to initialize Scenario A:', err);
              }
            }
          } else if (topicData.scenario_a_completed && !topicData.scenario_b_completed) {
            setCurrentScenario('B');
            // Initialize Scenario B if not already done
            if (userData.characters && userData.characters.length > 0) {
              try {
                await selectScenario('B');
        } catch (err) {
                console.error('Failed to initialize Scenario B:', err);
              }
            }
          }
        } catch (topicError) {
          console.error('Failed to load topic data (this may be a backend issue):', topicError);
          // Set defaults so UI still works
          setCurrentTopic(1);
          setCurrentScenario('A');
          setTopicInfo({
            functional_scenario: 'Please wait for topic data to load...',
            experiential_scenario: 'Please wait for topic data to load...'
          });
        }

        // Load chat history
        if (userData.characters && userData.characters.length > 0) {
          const charId = userData.characters[0].id;
          try {
            const history = await getChatHistory(String(charId));
            if (Array.isArray(history)) {
                  // Sort by timestamp
              const sorted = [...history].sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
                    const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
                    return timeA - timeB;
                  });
              setChatHistory(sorted);
          }
        } catch (err) {
            console.error('Failed to load chat history:', err);
          }
        }

        // Check survey availability
        if (userData.characters && userData.characters.length > 0) {
          const charId = userData.characters[0].id;
          try {
            const surveyStatus = await getCharacterSurveyStatus(String(charId));
            setSurveyAvailable(surveyStatus.available || false);
          } catch (err) {
            console.error('Failed to check survey status:', err);
          }
      }
    } catch (error) {
        console.error('Failed to load data:', error);
        // Don't block UI if topic/scenario data fails - show what we have
        // This allows the chat to work even if topic endpoints are down
    } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Check if survey should be shown (7 interactions reached)
  useEffect(() => {
    if (interactionCount >= 7 && !surveyOpen && selectedCharacter) {
      const charId = String(selectedCharacter.id);
      if (!completedSurveys.has(charId)) {
        console.log('[ChatPage] Opening survey - 7 interactions reached');
        setSurveyOpen(true);
      }
    }
  }, [interactionCount, surveyOpen, selectedCharacter, completedSurveys]);

  // Handle message sent - increment interaction count and reload data
  const handleMessageSent = async () => {
    // Increment immediately for responsive UI
    setInteractionCount(prev => {
      const newCount = prev + 1;
      console.log('[ChatPage] Message sent, interaction count:', newCount);
      return newCount;
    });
    
    // Reload user data to get updated interaction count from backend
    try {
      const userData = await me();
      if (userData.characters && userData.characters.length > 0) {
        const char = userData.characters[0];
        const newCount = char.message_count || char.interactions || 0;
        console.log('[ChatPage] Updated interaction count from backend:', newCount);
        setInteractionCount(newCount);
        
        // Check survey availability after updating count
        if (newCount >= 7) {
          try {
            const surveyStatus = await getCharacterSurveyStatus(String(char.id));
            setSurveyAvailable(surveyStatus.available !== false); // Default to true if not explicitly false
            console.log('[ChatPage] Survey availability:', surveyStatus.available);
          } catch (err) {
            console.error('Failed to check survey status:', err);
            // Default to available if check fails
            setSurveyAvailable(true);
          }
        }
      }
      
      // Reload chat history to get latest messages
      if (selectedCharacter) {
        const history = await getChatHistory(String(selectedCharacter.id));
        if (Array.isArray(history)) {
          const sorted = [...history].sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
            const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
            return timeA - timeB;
          });
          setChatHistory(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to reload data after message:', err);
    }
  };

  // Handle survey completion
  const handleSurveyComplete = async (characterId, characterName) => {
    setCompletedSurveys(prev => new Set([...prev, String(characterId)]));
    setSurveyOpen(false);
    setSurveyAvailable(false);
    
    // Reload topic data to see if we should advance
    try {
      const topicData = await getCurrentTopic();
      setCurrentTopic(topicData.current_topic);
      setTopicInfo(topicData.topic_info);
      
      // If Scenario A completed, move to Scenario B
      if (currentScenario === 'A' && topicData.scenario_a_completed) {
        setCurrentScenario('B');
        setInteractionCount(0);
        // Auto-select Scenario B
          try {
          await selectScenario('B');
          } catch (err) {
          console.error('Failed to select Scenario B:', err);
        }
      } 
      // If Scenario B completed, move to next topic
      else if (currentScenario === 'B' && topicData.scenario_b_completed) {
          setCurrentScenario(null);
      setInteractionCount(0);
        // Topic will advance automatically on backend
      }
    } catch (error) {
      console.error('Failed to reload topic data:', error);
    }
  };

  // Get scenario prompt text
  const getScenarioPrompt = () => {
    if (!topicInfo || !currentScenario) return null;
    return currentScenario === 'A' 
      ? topicInfo.functional_scenario 
      : topicInfo.experiential_scenario;
  };

  // Always show the layout, even if loading or if data fails
  const scenarioPrompt = getScenarioPrompt();
  
  console.log('[ChatPage] Rendering with state:', {
    loading,
    hasCharacter: !!selectedCharacter,
    currentTopic,
    currentScenario,
    interactionCount,
    hasTopicInfo: !!topicInfo
  });

  return (
    <div style={{ 
      display: 'flex', 
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      backgroundColor: '#f9fafb'
    }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {/* Topic/Scenario Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          {loading ? (
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading topic data...</div>
          ) : (
            <>
              <div style={{ 
                fontSize: '14px', 
                  fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Topic {currentTopic || 'N/A'}
              </div>
              {currentScenario && (
                <div style={{ 
                  fontSize: '16px', 
                      fontWeight: 600,
                  color: '#111827',
                  marginBottom: '12px'
                }}>
                  Scenario {currentScenario}
                </div>
              )}
              {scenarioPrompt && (
                <div style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: '#6b7280',
                    marginBottom: '6px'
                  }}>
                    Scenario Prompt:
                  </div>
                  {scenarioPrompt}
                </div>
              )}
              {!currentScenario && !loading && (
                <div style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  No scenario active. Topic data may not be available.
                </div>
              )}
            </>
          )}
        </div>

        {/* Interaction Counter */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            Interactions
          </div>
          <div style={{ 
            fontSize: '24px', 
                    fontWeight: 600,
            color: interactionCount >= 7 ? '#16a34a' : '#111827'
          }}>
            {interactionCount}/7
          </div>
          {interactionCount >= 7 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#16a34a',
              marginTop: '8px'
            }}>
              Survey available
            </div>
          )}
        </div>

        {/* Character Info */}
        {selectedCharacter && (
          <div style={{ padding: '20px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Your Agent
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#111827'
            }}>
              {selectedCharacter.name || `Agent ${selectedCharacter.id}`}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden'
      }}>
        <ChatBox
          selectedCharacter={selectedCharacter}
          userMessageCount={interactionCount}
          maxMessages={1000000}
          onMessageSent={handleMessageSent}
          initialChatHistory={chatHistory}
          onChatHistoryUpdate={setChatHistory}
        />
      </div>

      {/* Survey Dialog */}
      {selectedCharacter && (
        <CharacterInteractionSurvey
          characterId={String(selectedCharacter.id)}
          characterName={selectedCharacter.name || `Agent ${selectedCharacter.id}`}
          open={surveyOpen}
          onClose={() => setSurveyOpen(false)}
          onComplete={handleSurveyComplete}
        />
      )}
    </div>
  );
}
