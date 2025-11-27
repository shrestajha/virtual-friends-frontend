import React, { useEffect, useState } from "react";
import { me, logout } from "./api";
import LoginForm from "./LoginForm";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import CharacterSwitcher from "./components/CharacterSwitcher";
import CharacterProfile from "./components/CharacterProfile";
import Survey from "./components/Survey";
import ChatBox from "./components/ChatBox";
import ChatPage from "./pages/ChatPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminConversationView from "./pages/AdminConversationView";

const MAX_MESSAGES = 15;

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("start"); // 'start' | 'chat' | 'survey'
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [error, setError] = useState(null);
  const [loginMessage, setLoginMessage] = useState("");

  // Handle URL-based routing when pathname changes
  useEffect(() => {
    const updateViewFromPath = () => {
      const path = window.location.pathname;
      
      // If user is logged in and tries to access auth pages, redirect to chat
      if (user && (path === "/login" || path === "/signup" || path === "/forgot-password" || path === "/reset-password")) {
        window.history.pushState({}, "", "/chat");
        setView("chat");
        return;
      }

      // Handle admin routes
      if (user) {
        if (path.startsWith("/admin/conversations/")) {
          const match = path.match(/^\/admin\/conversations\/(\d+)$/);
          if (match) {
            if (!user.is_admin) {
              window.history.pushState({}, "", "/chat");
              setView("chat");
              return;
            }
            setView("admin-conversation");
            return;
          }
        } else if (path === "/admin") {
          if (!user.is_admin) {
            window.history.pushState({}, "", "/chat");
            setView("chat");
            return;
          }
          setView("admin");
          return;
        } else if (path === "/chat" || path === "/") {
          setView("chat");
          return;
        }
      }

      // Handle routing for auth pages (only if not logged in)
      if (!user) {
        if (path === "/forgot-password") {
          setView("forgot-password");
        } else if (path === "/reset-password") {
          setView("reset-password");
        } else if (path === "/login") {
          setView("login");
        } else if (path === "/signup") {
          setView("signup");
        } else if (path === "/") {
          // Default to start (which shows login/signup)
          setView("start");
        } else {
          // Redirect unknown routes to login
          window.history.pushState({}, "", "/");
          setView("start");
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

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [user]);

  // Check message count and show survey
  useEffect(() => {
    if (userMessageCount >= MAX_MESSAGES && view === "chat") {
      setView("survey");
    }
  }, [userMessageCount, view]);


  // On mount: check if logged in and preload characters, and check initial route
  useEffect(() => {
    // Check initial route first
    const path = window.location.pathname;
    const authPages = ["/forgot-password", "/reset-password", "/login", "/signup"];
    
    if (authPages.includes(path)) {
      // Set view based on path
      if (path === "/forgot-password") {
        setView("forgot-password");
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
      .then((u) => {
        setUser(u);
        // Store user with is_admin flag
        localStorage.setItem("user", JSON.stringify(u));
        // Determine view based on path
        if (path.startsWith("/admin/conversations/")) {
          const match = path.match(/^\/admin\/conversations\/(\d+)$/);
          if (match && u.is_admin) {
            setView("admin-conversation");
          } else {
            setView("chat");
            window.history.pushState({}, "", "/chat");
          }
        } else if (path === "/admin" && u.is_admin) {
          setView("admin");
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

  // Get token from URL for reset password
  const getTokenFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  };

  // Handle navigation
  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    const pathname = window.location.pathname;
    if (pathname === "/forgot-password") {
      setView("forgot-password");
    } else if (pathname === "/reset-password") {
      setView("reset-password");
    } else if (pathname === "/login") {
      setView("login");
    } else if (pathname === "/signup") {
      setView("signup");
    } else {
      setView("start");
    }
  };

  // Show forgot password page
  if (view === "forgot-password") {
    return (
      <div className="container center">
        <ForgotPassword
          onBack={() => {
            navigateTo("/login");
            setLoginMessage("");
          }}
        />
      </div>
    );
  }

  // Show reset password page
  if (view === "reset-password") {
    const token = getTokenFromURL();
    if (!token) {
      return (
        <div className="container center">
          <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 16, fontSize: "24px", fontWeight: 600 }}>Invalid Reset Link</h2>
            <p style={{ marginBottom: 24, color: "var(--muted)" }}>
              The reset link is invalid or has expired.
            </p>
            <button
              className="button"
              onClick={() => navigateTo("/login")}
              style={{ width: "100%" }}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="container center">
        <ResetPassword token={token} />
      </div>
    );
  }

  // Check for message in URL params (for password reset success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    if (message) {
      setLoginMessage(decodeURIComponent(message));
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
            // Store user with is_admin flag
            localStorage.setItem("user", JSON.stringify(u));
            setView("chat");
            setUserMessageCount(0); // Reset message count on login
            setLoginMessage("");
            window.history.pushState({}, "", "/chat");
            loadAssignedCharacters(u);
          }}
        />
      </div>
    );
  }

  // Show survey after 15 messages
  if (view === "survey") {
    return <Survey />;
  }

  // Show admin dashboard
  if (view === "admin" && user?.is_admin) {
    return (
      <div className="container">
        <div className="header">
          <div className="brand" style={{ marginRight: "auto" }}>
            Admin Dashboard
          </div>
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
              setUserMessageCount(0);
              setCharacters([]);
              setSelected(null);
              localStorage.removeItem("user");
            }}
          >
            Logout
          </button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  // Show admin conversation view
  if (view === "admin-conversation" && user?.is_admin) {
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
      <div className="container" style={{ height: "100vh", overflow: "hidden" }}>
        {/* Header with logout and admin link */}
        <div className="header" style={{ position: "relative", zIndex: 1000 }}>
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
              setUserMessageCount(0);
              setCharacters([]);
              setSelected(null);
              localStorage.removeItem("user");
            }}
          >
            Logout
          </button>
        </div>
        <ChatPage user={user} />
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
          userMessageCount={userMessageCount}
          maxMessages={MAX_MESSAGES}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
}
