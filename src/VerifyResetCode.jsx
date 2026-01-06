import React, { useState, useEffect, useRef } from "react";
import { verifyResetCode } from "./api";

export default function VerifyResetCode({ email: emailProp, onBack }) {
  const [email, setEmail] = useState(emailProp || "");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
  const [expired, setExpired] = useState(false);
  const inputRefs = useRef([]);

  // Get email from route state if not provided as prop
  useEffect(() => {
    const state = window.history.state;
    if (state && state.email && !email) {
      setEmail(state.email);
    }
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && !expired) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !expired) {
      setExpired(true);
      setError("The verification code has expired. Please request a new code.");
    }
  }, [countdown, expired]);

  // Auto-focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(""); // Clear error when user types

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        if (digits.length === 6) {
          const newCode = [...code];
          digits.forEach((digit, i) => {
            if (i < 6) newCode[i] = digit;
          });
          setCode(newCode);
          inputRefs.current[5]?.focus();
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const codeString = code.join("");
    
    if (codeString.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    if (!email) {
      setError("Email is required. Please go back and enter your email.");
      return;
    }

    if (expired) {
      setError("The verification code has expired. Please request a new code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyResetCode(email, codeString);
      // Success - navigate to reset password page with email
      window.history.pushState({ email }, "", "/reset-password");
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      const errorMessage = err.message || "Verification failed";
      
      // Extract remaining attempts from error message
      const attemptsMatch = errorMessage.match(/(\d+)\s+attempt/i);
      if (attemptsMatch) {
        setRemainingAttempts(parseInt(attemptsMatch[1]));
      }
      
      // Handle expired code
      if (errorMessage.includes('expired') || errorMessage.includes('Expired')) {
        setExpired(true);
        setCountdown(0);
      }
      
      setError(errorMessage);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    // Navigate back to forgot password page
    window.history.pushState({ email }, "", "/forgot-password");
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 32, fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>
        Verify Reset Code
      </h2>

      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <p style={{ color: "var(--text)", marginBottom: "8px" }}>
          Enter the 6-digit code sent to:
        </p>
        <p style={{ fontWeight: 600, color: "#1e40af" }}>{email || "your email"}</p>
      </div>

      {!expired && countdown > 0 && (
        <div style={{
          padding: "12px",
          background: "#eff6ff",
          color: "#1e40af",
          borderRadius: "8px",
          marginBottom: "24px",
          textAlign: "center",
          fontWeight: 500
        }}>
          Code expires in: {formatTime(countdown)}
        </div>
      )}

      {expired && (
        <div style={{
          padding: "12px",
          background: "#fef2f2",
          color: "#dc2626",
          borderRadius: "8px",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          Code has expired. Please request a new code.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "24px"
        }}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading || expired}
              style={{
                width: "50px",
                height: "60px",
                fontSize: "24px",
                textAlign: "center",
                border: "2px solid #d1d5db",
                borderRadius: "8px",
                outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#1e40af";
                e.target.style.boxShadow = "0 0 0 3px rgba(30, 64, 175, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
          ))}
        </div>

        <button
          type="submit"
          className="button"
          style={{ width: "100%" }}
          disabled={loading || expired || code.join("").length !== 6}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      </form>

      {remainingAttempts !== null && (
        <div className="hint" style={{ marginTop: "12px", textAlign: "center", color: "#dc2626" }}>
          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
        </div>
      )}

      {error && (
        <div className="hint" style={{ color: "red", marginTop: "12px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          type="button"
          onClick={handleResendCode}
          className="link"
          style={{
            background: "none",
            border: "none",
            color: "#1e40af",
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: "14px"
          }}
        >
          Request a new code
        </button>
      </div>

      <div className="hint" style={{ marginTop: 16, textAlign: "center" }}>
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, "", "/login");
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="link"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}

