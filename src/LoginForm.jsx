import React, { useState, useMemo } from "react";
import { login, register } from "./api";

export default function LoginForm({ onSuccess, initialMode = "register", loginMessage = "" }) {
  const [mode, setMode] = useState(initialMode); // login | register

  // Update mode when initialMode prop changes (e.g., when route changes)
  React.useEffect(() => {
    if (initialMode !== mode) {
      setMode(initialMode);
      // Reset form state when switching modes
      setEmail("");
      setPassword("");
      setError("");
      setSuccessMessage("");
    }
  }, [initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [assignedCharacter, setAssignedCharacter] = useState(null);
  const [successMessage, setSuccessMessage] = useState(loginMessage);

  // Update success message when prop changes
  React.useEffect(() => {
    if (loginMessage) {
      setSuccessMessage(loginMessage);
    }
  }, [loginMessage]);

  // Password validation rules
  const passwordValidation = useMemo(() => {
    if (!password) {
      return {
        doesNotContainEmail: null,
        minLength: null,
        hasNumberOrSymbol: null,
        strength: null
      };
    }

    // Check if password contains email (check both full email and local part before @)
    const emailLower = email.toLowerCase().trim();
    const emailLocal = emailLower.split('@')[0];
    const containsEmail = email ? (password.toLowerCase().includes(emailLower) || password.toLowerCase().includes(emailLocal)) : false;
    
    const minLength = password.length >= 8;
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const doesNotContainEmail = !containsEmail;

    // Calculate strength based on passed rules
    const passedRules = [minLength, hasNumberOrSymbol, doesNotContainEmail].filter(Boolean).length;
    let strength = "weak";
    if (passedRules === 3) {
      strength = "strong";
    } else if (passedRules >= 2) {
      strength = "medium";
    }

    return {
      doesNotContainEmail,
      minLength,
      hasNumberOrSymbol,
      strength
    };
  }, [password, email]);

  const isPasswordValid = passwordValidation.strength && 
    passwordValidation.doesNotContainEmail === true && 
    passwordValidation.minLength === true && 
    passwordValidation.hasNumberOrSymbol === true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
        setError("");
        onSuccess();
      } else {

        // Validate password before submitting
        if (!isPasswordValid) {
          setError("Please ensure all password requirements are met.");
          return;
        }
        // Sign up and get assigned characters
        const res = await register(email, password);
        // Store assigned characters in localStorage
        if (res.characters && Array.isArray(res.characters)) {
          localStorage.setItem("assignedCharacters", JSON.stringify(res.characters));
        }
        // If your backend returns character info:
        if (res.character) {
          setAssignedCharacter(res.character);
        } else if (res.characters && Array.isArray(res.characters) && res.characters.length > 0) {
          // If backend returns multiple characters, show the first one
          setAssignedCharacter(res.characters[0]);
        } else {
          // fallback — auto-login if no character in response
          await login(email, password);
          onSuccess();
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  // Show assigned character screen after signup
  if (assignedCharacter) {
    return (
      <div className="panel" style={{ padding: 32, maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
        <h2 style={{ marginBottom: 16, fontSize: "24px", fontWeight: 600 }}>Welcome to Virtual Friends!</h2>
        <p style={{ marginBottom: 20, color: "var(--muted)" }}>You've been paired with:</p>
        <div
          className="character-card"
          style={{
            textAlign: "left",
            marginTop: "12px",
          }}
        >
          <h3 style={{ marginBottom: 12, fontSize: "20px", fontWeight: 600 }}>{assignedCharacter.name}</h3>
        </div>
        <button
          className="button"
          style={{ marginTop: 24, width: "100%" }}
          onClick={async () => {
            await login(email, password);
            onSuccess();
          }}
        >
          Start Chatting
        </button>
      </div>
    );
  }

  // Default login/register form
  if (mode === "login") {
    return (
      <div className="panel" style={{ padding: 32, maxWidth: 400, margin: "40px auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontSize: "24px", fontWeight: 600 }}>
          Log In
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "16px" }}
          />
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "var(--muted)"
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <div style={{ textAlign: "right", marginBottom: "16px" }}>
            <a
              href="/forgot-password"
              onClick={(e) => {
                e.preventDefault();
                // Use pushState for client-side navigation
                window.history.pushState({}, "", "/forgot-password");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              style={{ fontSize: "14px", color: "var(--accent)", textDecoration: "none", cursor: "pointer" }}
            >
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="button" style={{ width: "100%" }}>
            Log In
          </button>
        </form>

        {successMessage && (
          <div style={{
            padding: "12px",
            background: "#d1fae5",
            color: "#065f46",
            borderRadius: "8px",
            marginTop: "12px",
            border: "1px solid #a7f3d0",
            textAlign: "center"
          }}>
            {successMessage}
          </div>
        )}

        {error && <div className="hint" style={{ color: "red", marginTop: "12px" }}>{error}</div>}

        <div className="hint" style={{ marginTop: 12, textAlign: "center" }}>
          Don't have an account?{" "}
          <a
            href="/signup"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/signup";
            }}
            className="link"
          >
            Sign up
          </a>
        </div>
      </div>
    );
  }

  // Sign Up form with password validation
  return (
    <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 32, fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>
        Sign Up
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Email Field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontSize: "14px", 
            fontWeight: 500,
            color: "var(--text)"
          }}>
            Email
          </label>
          <input
            className="input"
            type="email"
            placeholder="john_addison@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontSize: "14px", 
            fontWeight: 500,
            color: "var(--text)"
          }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="secret"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "var(--muted)"
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "6px",
                marginBottom: "12px",
                fontSize: "13px"
              }}>
                <span style={{ color: passwordValidation.strength === "weak" ? "#dc2626" : passwordValidation.strength === "medium" ? "#f59e0b" : "#16a34a" }}>
                  {passwordValidation.strength === "weak" ? "✗" : passwordValidation.strength === "medium" ? "⚠" : "✓"}
                </span>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>
                  Password strength:{" "}
                  <span style={{ 
                    color: passwordValidation.strength === "weak" ? "#dc2626" : passwordValidation.strength === "medium" ? "#f59e0b" : "#16a34a",
                    fontWeight: 600
                  }}>
                    {passwordValidation.strength || "weak"}
                  </span>
                </span>
              </div>

              {/* Password Requirements */}
              <div style={{
                background: "#f9fafb",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  marginBottom: "8px",
                  color: passwordValidation.doesNotContainEmail ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.doesNotContainEmail ? "✓" : "✗"}</span>
                  <span>Cannot contain your email address</span>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  marginBottom: "8px",
                  color: passwordValidation.minLength ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.minLength ? "✓" : "✗"}</span>
                  <span>At least 8 characters</span>
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  color: passwordValidation.hasNumberOrSymbol ? "#16a34a" : "#dc2626"
                }}>
                  <span>{passwordValidation.hasNumberOrSymbol ? "✓" : "✗"}</span>
                  <span>Contains a number or symbol</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="button" 
          style={{ width: "100%", marginTop: "8px" }}
          disabled={mode === "register" && (!password || !isPasswordValid)}
        >
          Sign Up
        </button>
      </form>

      {error && <div className="hint" style={{ color: "red", marginTop: "12px" }}>{error}</div>}

      <div className="hint" style={{ marginTop: 16, textAlign: "center" }}>
        Already registered?{" "}
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            // Use pushState for client-side navigation
            window.history.pushState({}, "", "/login");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="link"
        >
          Log in
        </a>
      </div>
    </div>
  );
}
