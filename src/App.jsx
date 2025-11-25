import React, { useEffect, useState, useRef } from "react";
import { getCharactersByIds, me, logout } from "./api";
import LoginForm from "./LoginForm";
import CharacterSwitcher from "./components/CharacterSwitcher";
import CharacterProfile from "./components/CharacterProfile";
import Survey from "./components/Survey";
import ChatBox from "./components/ChatBox";

const MAX_MESSAGES = 15;

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("start"); // 'start' | 'chat' | 'survey'
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [error, setError] = useState(null);

  // Check message count and show survey
  useEffect(() => {
    if (userMessageCount >= MAX_MESSAGES && view === "chat") {
      setView("survey");
    }
  }, [userMessageCount, view]);


  // On mount: check if logged in and preload characters
  useEffect(() => {
    me()
      .then((u) => {
        setUser(u);
        setView("chat");
        loadAssignedCharacters(u);
      })
      .catch(() => {});
  }, []);

  // Load assigned characters based on character_ids from /auth/me
  const loadAssignedCharacters = async (userData) => {
    setLoadingCharacters(true);
    setError(null);
    
    try {
      // Get character_ids from user data (from /auth/me response)
      let characterIds = [];
      
      if (userData.character_ids && Array.isArray(userData.character_ids)) {
        characterIds = userData.character_ids;
      } else {
        // Fallback: try localStorage
        const storedIds = localStorage.getItem("assignedCharacterIds");
        if (storedIds) {
          try {
            characterIds = JSON.parse(storedIds);
          } catch (e) {
            console.error("Failed to parse stored character IDs", e);
          }
        }
      }
      
      if (characterIds.length === 0) {
        setError("No characters assigned. Please contact support.");
        setCharacters([]);
        setSelected(null);
        setLoadingCharacters(false);
        return;
      }

      console.log("Loading characters for IDs:", characterIds);
      
      // Fetch character details for ONLY the assigned character IDs
      const characterData = await getCharactersByIds(characterIds);
      
      console.log("Loaded characters:", characterData);
      
      if (characterData.length === 0) {
        setError("Failed to load character details. Please try again.");
        setCharacters([]);
        setSelected(null);
        setLoadingCharacters(false);
        return;
      }

      // Store in localStorage for persistence
      localStorage.setItem("assignedCharacters", JSON.stringify(characterData));
      localStorage.setItem("assignedCharacterIds", JSON.stringify(characterIds));
      
      setCharacters(characterData);
      
      // Select first character if none selected
      if (!selected || !characterData.find((c) => c.id === selected.id)) {
        setSelected(characterData[0]);
      }
    } catch (e) {
      console.error("Failed to load characters", e);
      setError(`Failed to load characters: ${e.message}`);
      
      // Try to load from localStorage as fallback
      const stored = localStorage.getItem("assignedCharacters");
      if (stored) {
        try {
          const storedChars = JSON.parse(stored);
          if (Array.isArray(storedChars) && storedChars.length > 0) {
            console.log("Using stored characters as fallback:", storedChars);
            setCharacters(storedChars);
            if (!selected || !storedChars.find((c) => c.id === selected.id)) {
              setSelected(storedChars[0]);
            }
            setLoadingCharacters(false);
            return;
          }
        } catch (parseError) {
          console.error("Failed to parse stored characters", parseError);
        }
      }
      
      setCharacters([]);
      setSelected(null);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const handleSelectCharacter = (id) => {
    const ch = characters.find((c) => c.id === id) || null;
    setSelected(ch);
  };

  const handleCharacterChange = (character) => {
    setSelected(character);
  };

  const handleMessageSent = () => {
    // Increment user message count when a message is sent
    setUserMessageCount(prev => {
      const newCount = prev + 1;
      // Show survey if we've reached the limit
      if (newCount >= MAX_MESSAGES) {
        setView("survey");
      }
      return newCount;
    });
  };

  // Show login form
  if (view === "start") {
    return (
      <div className="container center">
        <LoginForm
          onSuccess={async () => {
            const u = await me();
            setUser(u);
            setView("chat");
            setUserMessageCount(0); // Reset message count on login
            await loadAssignedCharacters(u);
          }}
        />
      </div>
    );
  }

  // Show survey after 15 messages
  if (view === "survey") {
    return <Survey />;
  }

  // Show chat interface
  return (
    <div className="container">
      {/* Header with logout */}
      <div className="header">
        <div className="brand" style={{ marginRight: "auto" }}>
          Welcome, {user?.email || "User"}
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)", marginRight: "12px" }}>
          Messages: {userMessageCount}/{MAX_MESSAGES}
        </div>
        <button
          className="button small"
          onClick={() => {
            logout();
            setUser(null);
            setView("start");
            setUserMessageCount(0);
            setCharacters([]);
            setSelected(null);
          }}
        >
          Logout
        </button>
      </div>

      {/* Loading state */}
      {loadingCharacters && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
          Loading characters...
        </div>
      )}

      {/* Error message */}
      {error && !loadingCharacters && (
        <div style={{ 
          padding: "16px", 
          background: "#fee2e2", 
          color: "#991b1b", 
          borderRadius: "8px", 
          marginBottom: "16px",
          border: "1px solid #fecaca"
        }}>
          {error}
          <button
            onClick={() => {
              me().then(u => {
                setUser(u);
                loadAssignedCharacters(u);
              });
            }}
            className="button small"
            style={{ marginTop: "8px", display: "block" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Character Switcher */}
      {!loadingCharacters && characters.length > 0 && (
        <CharacterSwitcher
          characters={characters}
          selectedId={selected?.id}
          onSelect={handleSelectCharacter}
        />
      )}

      {/* Character Profile */}
      {selected && <CharacterProfile character={selected} />}

      {/* ChatBox - Only shows assigned characters */}
      {!loadingCharacters && (
        <ChatBox
          characters={characters}
          selectedCharacter={selected}
          onCharacterChange={handleCharacterChange}
          userMessageCount={userMessageCount}
          maxMessages={MAX_MESSAGES}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
}
