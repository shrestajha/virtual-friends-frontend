import React, { useEffect, useState } from "react";
import { me, logout, getConsentStatus } from "./api";
import LoginForm from "./LoginForm";
import ForgotPassword from "./ForgotPassword";
import VerifyResetCode from "./VerifyResetCode";
import ResetPassword from "./ResetPassword";
import CharacterSwitcher from "./components/CharacterSwitcher";
import CharacterProfile from "./components/CharacterProfile";
import ConsentForm from "./components/ConsentForm";
import SignupSurvey from "./components/SignupSurvey";
import ChatBox from "./components/ChatBox";
import ChatPage from "./pages/ChatPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminConversationView from "./pages/AdminConversationView";

const MAX_MESSAGES = 15;

// Allowed admin emails - frontend check until backend is fixed
const ALLOWED_ADMIN_EMAILS = [
  'shresta.jha@uga.edu',
  'elham.yazdani@uga.edu'
];

// Helper to check if user should have admin access
const hasAdminAccess = (user) => {
  if (!user || !user.email) return false;
  // Check backend is_admin flag first
  if (user.is_admin === true) return true;
  // Fallback: check if email is in allowed list (temporary until backend is fixed)
  return ALLOWED_ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("start"); // 'start' | 'chat' | 'survey' | 'consent' | 'signup-survey'
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  // Track message counts per character: { characterId: count }
  const [messageCountsPerCharacter, setMessageCountsPerCharacter] = useState({});
  const [error, setError] = useState(null);
  const [loginMessage, setLoginMessage] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(null); // null = not checked, true = accepted, false = not accepted

  // Handle URL-based routing when pathname changes
  useEffect(() => {
    const updateViewFromPath = () => {
      const path = window.location.pathname;
      console.log("[App] updateViewFromPath called, path:", path, "user:", user);
      
      // If user is logged in and tries to access auth pages, redirect to chat
      // BUT allow forgot-password, verify-code, and reset-password even when logged in
      if (user && (path === "/login" || path === "/signup")) {
        window.history.pushState({}, "", "/chat");
        setView("chat");
        return;
      }

      // Handle admin routes
      if (user) {
        if (path.startsWith("/admin/conversations/")) {
          const match = path.match(/^\/admin\/conversations\/(\d+)$/);
          if (match) {
            if (!hasAdminAccess(user)) {
              window.history.pushState({}, "", "/chat");
              setView("chat");
              return;
            }
            setView("admin-conversation");
            return;
          }
        } else if (path === "/admin") {
          if (!hasAdminAccess(user)) {
            window.history.pushState({}, "", "/chat");
            setView("chat");
            return;
          }
          setView("admin");
          return;
        } else if (path === "/chat" || path === "/") {
          // Check consent first
          if (consentAccepted === false) {
            window.history.pushState({}, "", "/consent");
            setView("consent");
            return;
          }
          // Check if survey is required before allowing chat access
          if (user.survey_required === true) {
            window.history.pushState({}, "", "/signup-survey");
            setView("signup-survey");
            return;
          }
          setView("chat");
          return;
        }
      }

      // Handle consent route (requires authentication)
      if (path === "/consent") {
        if (!user) {
          // Not logged in, redirect to login
          window.history.pushState({}, "", "/login");
          setView("login");
          return;
        }
        // Check if consent is already accepted
        if (consentAccepted === true) {
          // Consent already accepted, check survey
          if (user.survey_required === true) {
            window.history.pushState({}, "", "/signup-survey");
            setView("signup-survey");
          } else {
            window.history.pushState({}, "", "/chat");
            setView("chat");
          }
          return;
        }
        setView("consent");
        return;
      }

      // Handle signup survey route (requires authentication)
      if (path === "/signup-survey") {
        if (!user) {
          // Not logged in, redirect to login
          window.history.pushState({}, "", "/login");
          setView("login");
          return;
        }
        // Check consent first
        if (consentAccepted === false) {
          window.history.pushState({}, "", "/consent");
          setView("consent");
          return;
        }
        // Check if survey is actually required
        if (user.survey_required === true) {
          setView("signup-survey");
          return;
        } else {
          // Survey already completed, redirect to chat
          window.history.pushState({}, "", "/chat");
          setView("chat");
          return;
        }
      }

      // Handle routing for auth pages (only if not logged in)
      if (!user) {
        if (path === "/forgot-password") {
          console.log("[App] Setting view to forgot-password");
          setView("forgot-password");
          return;
        } else if (path === "/verify-code") {
          console.log("[App] Setting view to verify-code");
          setView("verify-code");
          return;
        } else if (path === "/reset-password") {
          console.log("[App] Setting view to reset-password");
          setView("reset-password");
          return;
        } else if (path === "/login") {
          setView("login");
          return;
        } else if (path === "/signup") {
          setView("signup");
          return;
        } else if (path === "/") {
          // Default to start (which shows login/signup)
          setView("start");
          return;
        } else {
          // Redirect unknown routes to login
          window.history.pushState({}, "", "/");
          setView("start");
          return;
        }
      }
    };

    // Check on mount and when user state changes
    updateViewFromPath();

    // Listen for popstate events (back/forward buttons)
    const handlePopState = () => {
      updateViewFromPath();
    };

    // Also listen for hashchange (though we're not using hash routing)
    const handleHashChange = () => {
      updateViewFromPath();
    };

    // Listen for custom navigation events
    const handleNavigation = () => {
      updateViewFromPath();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("navigation", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("navigation", handleNavigation);
    };
  }, [user, consentAccepted]);

  // Survey status is now checked in ChatPage component
  // This effect is no longer needed


  // On mount: check if logged in and preload characters, and check initial route
  useEffect(() => {
    // Check initial route first
    const path = window.location.pathname;
    const authPages = ["/forgot-password", "/verify-code", "/reset-password", "/login", "/signup"];
    
    if (authPages.includes(path)) {
      // Set view based on path
      if (path === "/forgot-password") {
        setView("forgot-password");
      } else if (path === "/verify-code") {
        setView("verify-code");
      } else if (path === "/reset-password") {
        setView("reset-password");
      } else if (path === "/login") {
        setView("login");
      } else if (path === "/signup") {
        setView("signup");
      }
      // Don't check auth if on auth page
      return;
    }
    
    // For non-auth pages, check if logged in
    me()
      .then(async (u) => {
        setUser(u);
        // Store user with is_admin flag
        localStorage.setItem("user", JSON.stringify(u));
        
        // Initialize message counts from /auth/me response
        const counts = {};
        if (u.characters && Array.isArray(u.characters)) {
          u.characters.forEach(char => {
            if (char.id && typeof char.message_count === 'number') {
              counts[char.id] = char.message_count;
            }
          });
        }
        setMessageCountsPerCharacter(counts);
        console.log('Initialized message counts from /auth/me:', counts);
        
        // Check consent status
        let consentStatus = false;
        try {
          // Try to get consent status from backend
          const consentData = await getConsentStatus();
          consentStatus = consentData.consent_accepted === true;
        } catch (err) {
          console.log('Could not fetch consent status from backend, checking localStorage:', err);
          // Fallback to localStorage
          const storedConsent = localStorage.getItem('consent_accepted');
          consentStatus = storedConsent === 'true';
        }
        setConsentAccepted(consentStatus);
        
        // Check consent first
        if (!consentStatus) {
          setView("consent");
          window.history.pushState({}, "", "/consent");
          return;
        }
        
        // Check if signup survey is required
        if (u.survey_required === true) {
          setView("signup-survey");
          window.history.pushState({}, "", "/signup-survey");
          return;
        }
        
        // Survey status is now handled in ChatPage component
        
        // Determine view based on path
        if (path.startsWith("/admin/conversations/")) {
          const match = path.match(/^\/admin\/conversations\/(\d+)$/);
          if (match && hasAdminAccess(u)) {
            setView("admin-conversation");
          } else {
            setView("chat");
            window.history.pushState({}, "", "/chat");
          }
        } else if (path === "/admin") {
          // Check admin access using helper function
          const userWithAdminCheck = { ...u, is_admin: hasAdminAccess(u) ? true : u.is_admin };
          if (hasAdminAccess(userWithAdminCheck)) {
            setView("admin");
          } else {
            setView("chat");
            window.history.pushState({}, "", "/chat");
          }
        } else {
        setView("chat");
          if (path !== "/chat") {
            window.history.pushState({}, "", "/chat");
          }
        }
        loadAssignedCharacters(u);
      })
      .catch(() => {
        // Not logged in, default to start (which shows login/signup)
        setView("start");
      });
  }, []);

  // Load assigned characters directly from /auth/me response
  const loadAssignedCharacters = (userData) => {
    setLoadingCharacters(true);
    setError(null);
    
    try {
      // Get characters array directly from /auth/me response
      const charactersArray = userData.characters || [];
      
      console.log("Characters from /auth/me:", charactersArray);
      
      if (charactersArray.length === 0) {
        setError("No characters assigned. Please contact support.");
        setCharacters([]);
        setSelected(null);
        setLoadingCharacters(false);
        return;
      }

      // Store in localStorage for persistence
      localStorage.setItem("assignedCharacters", JSON.stringify(charactersArray));
      
      // Store characters directly in state
      setCharacters(charactersArray);
      
      // Select first character if none selected
      if (!selected || !charactersArray.find((c) => c.id === selected.id)) {
        setSelected(charactersArray[0]);
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

  const handleMessageSent = (characterId, count = null) => {
    // If count is provided, set it directly (for initialization from /auth/me)
    // Otherwise, increment the count (when a new message is sent)
    setMessageCountsPerCharacter(prev => {
      const newCounts = {
        ...prev,
        [characterId]: count !== null ? count : ((prev[characterId] || 0) + 1)
      };
      console.log(`Message counts per character:`, newCounts);
      // Check if this character has reached the limit
      if (newCounts[characterId] >= MAX_MESSAGES) {
        // Show survey when any character reaches the limit
        if (view === "chat") {
          setView("survey");
        }
      }
      return newCounts;
    });
  };

  // Refresh message counts from backend
  const refreshMessageCounts = async () => {
    try {
      const u = await me();
      const counts = {};
      if (u.characters && Array.isArray(u.characters)) {
        u.characters.forEach(char => {
          if (char.id && typeof char.message_count === 'number') {
            counts[char.id] = char.message_count;
          }
        });
      }
      setMessageCountsPerCharacter(counts);
      console.log('Refreshed message counts from /auth/me:', counts);
    } catch (error) {
      console.error('Failed to refresh message counts:', error);
    }
  };

  // Get token from URL for reset password
  const getTokenFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  };

  // Handle navigation
  const navigateTo = (path) => {
    console.log("[App] navigateTo called with path:", path);
    window.history.pushState({}, "", path);
    // Directly update view based on path
    const pathname = window.location.pathname;
    console.log("[App] Current pathname:", pathname);
    if (pathname === "/forgot-password") {
      console.log("[App] Setting view to forgot-password via navigateTo");
      setView("forgot-password");
    } else if (pathname === "/verify-code") {
      console.log("[App] Setting view to verify-code via navigateTo");
      setView("verify-code");
    } else if (pathname === "/reset-password") {
      console.log("[App] Setting view to reset-password via navigateTo");
      setView("reset-password");
    } else if (pathname === "/login") {
      setView("login");
    } else if (pathname === "/signup") {
      setView("signup");
    } else {
      setView("start");
    }
  };

  // Expose navigation function globally for components that need it
  React.useEffect(() => {
    window.__navigateTo = navigateTo;
    // Also expose updateViewFromPath for manual triggering
    window.__updateViewFromPath = () => {
      const path = window.location.pathname;
      console.log("[App] Manual updateViewFromPath, path:", path, "user:", user);
      
      if (!user) {
        if (path === "/forgot-password") {
          console.log("[App] Manually setting view to forgot-password");
          setView("forgot-password");
        } else if (path === "/verify-code") {
          setView("verify-code");
        } else if (path === "/reset-password") {
          setView("reset-password");
        } else if (path === "/login") {
          setView("login");
        } else if (path === "/signup") {
          setView("signup");
        } else if (path === "/") {
          setView("start");
        }
      }
    };
    return () => {
      delete window.__navigateTo;
      delete window.__updateViewFromPath;
    };
  }, [user, navigateTo]);

  // Check for message in URL params (for password reset success)
  // MUST be before any conditional returns to avoid React hooks error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    if (message) {
      setLoginMessage(decodeURIComponent(message));
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Show forgot password page
  if (view === "forgot-password") {
    console.log("[App] Rendering ForgotPassword component");
    return (
      <div className="container center" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <ForgotPassword
          onBack={() => {
            navigateTo("/login");
            setLoginMessage("");
          }}
        />
      </div>
    );
  }

  // Show verify reset code page
  if (view === "verify-code") {
    const state = window.history.state;
    const email = state?.email || "";
    return (
      <div className="container center">
        <VerifyResetCode
          email={email}
          onBack={() => {
            navigateTo("/forgot-password");
            setLoginMessage("");
          }}
        />
      </div>
    );
  }

  // Show reset password page
  if (view === "reset-password") {
    const state = window.history.state;
    const email = state?.email || "";
    if (!email) {
      return (
        <div className="container center">
          <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 16, fontSize: "24px", fontWeight: 600 }}>Invalid Reset Link</h2>
            <p style={{ marginBottom: 24, color: "var(--muted)" }}>
              Please verify your code first.
            </p>
            <button
              className="button"
              onClick={() => navigateTo("/forgot-password")}
              style={{ width: "100%" }}
            >
              Back to Forgot Password
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="container center">
        <ResetPassword email={email} />
      </div>
    );
  }

  // Show login/signup form
  if (view === "start" || view === "login" || view === "signup") {
    // Determine mode based on view and current pathname
    const currentPath = window.location.pathname;
    let initialMode = "register"; // default
    if (view === "login" || currentPath === "/login") {
      initialMode = "login";
    } else if (view === "signup" || currentPath === "/signup") {
      initialMode = "register";
    } else if (view === "start") {
      // Default to register for start view
      initialMode = "register";
    }
    
    return (
      <div className="container center">
        <LoginForm
          key={view} // Force re-render when view changes
          initialMode={initialMode}
          loginMessage={loginMessage}
          onSuccess={async () => {
            const u = await me();
            setUser(u);
            // Store user with is_admin flag and survey_required
            localStorage.setItem("user", JSON.stringify(u));
            
            // Initialize message counts from /auth/me response
            const counts = {};
            if (u.characters && Array.isArray(u.characters)) {
              u.characters.forEach(char => {
                if (char.id && typeof char.message_count === 'number') {
                  counts[char.id] = char.message_count;
                }
              });
            }
            setMessageCountsPerCharacter(counts);
            console.log('Initialized message counts from /auth/me:', counts);
            
            // Check consent status first
            let consentStatus = false;
            try {
              const consentData = await getConsentStatus();
              consentStatus = consentData.consent_accepted === true;
            } catch (err) {
              console.log('Could not fetch consent status, checking localStorage:', err);
              const storedConsent = localStorage.getItem('consent_accepted');
              consentStatus = storedConsent === 'true';
            }
            setConsentAccepted(consentStatus);
            
            // Check consent first
            if (!consentStatus) {
              setView("consent");
              window.history.pushState({}, "", "/consent");
              setLoginMessage("");
              return;
            }
            
            // Check if signup survey is required
            if (u.survey_required === true) {
              setView("signup-survey");
              window.history.pushState({}, "", "/signup-survey");
              setLoginMessage("");
              return;
            }
            
            // Survey status is now handled in ChatPage component
            
            setView("chat");
            setLoginMessage("");
            window.history.pushState({}, "", "/chat");
            loadAssignedCharacters(u);
          }}
          onSurveyRequired={async () => {
            // After registration, check user status
            const u = await me();
            setUser(u);
            localStorage.setItem("user", JSON.stringify(u));
            
            // Check consent status first
            let consentStatus = false;
            try {
              const consentData = await getConsentStatus();
              consentStatus = consentData.consent_accepted === true;
            } catch (err) {
              console.log('Could not fetch consent status, checking localStorage:', err);
              const storedConsent = localStorage.getItem('consent_accepted');
              consentStatus = storedConsent === 'true';
            }
            setConsentAccepted(consentStatus);
            
            // Check consent first
            if (!consentStatus) {
              setView("consent");
              window.history.pushState({}, "", "/consent");
              setLoginMessage("");
              return;
            }
            
            setView("signup-survey");
            window.history.pushState({}, "", "/signup-survey");
            setLoginMessage("");
          }}
        />
      </div>
    );
  }

  // Show consent form
  if (view === "consent") {
    return (
      <ConsentForm
        onAccept={async () => {
          // Consent accepted, update state
          setConsentAccepted(true);
          
          // Reload user data to check survey status
          try {
            const u = await me();
            setUser(u);
            localStorage.setItem("user", JSON.stringify(u));
            
            // Check if signup survey is required
            if (u.survey_required === true) {
              setView("signup-survey");
              window.history.pushState({}, "", "/signup-survey");
            } else {
              // Navigate to chat
              setView("chat");
              window.history.pushState({}, "", "/chat");
              loadAssignedCharacters(u);
            }
          } catch (error) {
            console.error('Failed to reload user data:', error);
            // Still check survey status from current user object
            if (user?.survey_required === true) {
              setView("signup-survey");
              window.history.pushState({}, "", "/signup-survey");
            } else {
              setView("chat");
              window.history.pushState({}, "", "/chat");
            }
          }
        }}
      />
    );
  }

  // Show signup survey
  if (view === "signup-survey") {
    return (
      <SignupSurvey
        onComplete={async () => {
          // Reload user data to get updated survey_required status
          try {
            const u = await me();
            setUser(u);
            localStorage.setItem("user", JSON.stringify(u));
            // Navigate to chat
            setView("chat");
            window.history.pushState({}, "", "/chat");
            loadAssignedCharacters(u);
          } catch (error) {
            console.error('Failed to reload user data:', error);
            // Still navigate to chat even if reload fails
            setView("chat");
            window.history.pushState({}, "", "/chat");
          }
        }}
      />
    );
  }

  // Survey is now handled in ChatPage component (CharacterInteractionSurvey)

  // Show admin dashboard
  if (view === "admin" && hasAdminAccess(user)) {
    return (
      <div className="container">
        <div className="header">
          <div className="brand" style={{ marginRight: "auto" }}>
            <a href="/chat" style={{ textDecoration: "none", color: "inherit" }}>Virtual Friends</a>
          </div>
          {user?.is_admin && (
            <a href="/admin" style={{ marginRight: "1rem", textDecoration: "none", color: "inherit" }}>
              Admin Dashboard
            </a>
          )}
          <button
            className="button small"
            onClick={() => {
              window.history.pushState({}, "", "/chat");
              setView("chat");
            }}
            style={{ marginRight: "8px" }}
          >
            Back to Chat
          </button>
          <button
            className="button small"
            onClick={() => {
              logout();
              setUser(null);
              setView("start");
              setMessageCountsPerCharacter({});
              setCharacters([]);
              setSelected(null);
              localStorage.removeItem("user");
            }}
          >
            Logout
          </button>
        </div>
        <AdminDashboard user={user} />
      </div>
    );
  }

  // Show admin conversation view
  if (view === "admin-conversation" && hasAdminAccess(user)) {
    const match = window.location.pathname.match(/^\/admin\/conversations\/(\d+)$/);
    const conversationId = match ? parseInt(match[1]) : null;
    
    if (!conversationId) {
      window.history.pushState({}, "", "/admin");
      setView("admin");
      return null;
    }

    return (
      <div className="container" style={{ height: "100vh", overflow: "hidden" }}>
        <AdminConversationView conversationId={conversationId} />
      </div>
    );
  }

  // Show chat page (new /chat route)
  if (view === "chat" && user) {
    return (
      <div className="container" style={{ 
        height: "100vh", 
        display: "flex", 
        flexDirection: "column", 
        overflow: "hidden" 
      }}>
        {/* Header with logout and admin link */}
        <div className="header" style={{ 
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backgroundColor: "var(--bg, #fff)"
        }}>
          <div className="brand" style={{ marginRight: "auto" }}>
            Welcome, {user?.email || "User"}
          </div>
          {hasAdminAccess(user) && (
            <button
              className="button small"
              onClick={() => {
                window.history.pushState({}, "", "/admin");
                setView("admin");
              }}
              style={{ marginRight: "8px" }}
            >
              Admin Dashboard
            </button>
          )}
          <button
            className="button small"
            onClick={() => {
              logout();
              setUser(null);
              setView("start");
              setMessageCountsPerCharacter({});
              setCharacters([]);
              setSelected(null);
              localStorage.removeItem("user");
            }}
          >
            Logout
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ChatPage 
            user={user} 
          />
        </div>
      </div>
    );
  }

  // Legacy chat interface (fallback)
  return (
    <div className="container">
      {/* Header with logout */}
      <div className="header">
        <div className="brand" style={{ marginRight: "auto" }}>
          Welcome, {user?.email || "User"}
        </div>
        {user?.is_admin && (
          <button
            className="button small"
            onClick={() => {
              window.history.pushState({}, "", "/admin");
              setView("admin");
            }}
            style={{ marginRight: "8px" }}
          >
            Admin Dashboard
          </button>
        )}
        <button
          className="button small"
          onClick={() => {
            logout();
            setUser(null);
            setView("start");
            setMessageCountsPerCharacter({});
            setCharacters([]);
            setSelected(null);
            localStorage.removeItem("user");
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
          selectedCharacter={selected}
          userMessageCount={messageCountsPerCharacter[selected?.id] || 0}
          maxMessages={MAX_MESSAGES}
          onMessageSent={() => handleMessageSent(selected?.id)}
        />
      )}
    </div>
  );
}
