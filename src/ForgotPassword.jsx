import React, { useState, useEffect } from "react";
import { forgotPassword } from "./api";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await forgotPassword(email);
      setSuccess(true);
      setCooldown(30); // 30-second cooldown
      
      // Navigate to verify code page with email in state
      setTimeout(() => {
        window.history.pushState({ email }, "", "/verify-code");
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 1500);
    } catch (err) {
      const errorMessage = err.message || "Something went wrong";
      console.error("Forgot password error:", err);
      
      // Handle specific error cases
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS') || errorMessage.includes('network')) {
        setError("Network error: Unable to connect to the server. Please check your internet connection or try again later.");
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError("Too many requests. Please wait a moment before trying again.");
        setCooldown(30);
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        setError("Server error: The server encountered an issue. Please try again later or contact support.");
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError("Authentication error. Please try again.");
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setError("The requested service was not found. Please contact support.");
      } else {
        // Show a more user-friendly message for other errors
        const userFriendlyMessage = errorMessage.includes('HTTP') 
          ? "An error occurred. Please try again later." 
          : errorMessage;
        setError(userFriendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ padding: 40, maxWidth: 480, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 32, fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>
        Forgot Password
      </h2>

      {success ? (
        <div>
          <div style={{
            padding: "16px",
            background: "#d1fae5",
            color: "#065f46",
            borderRadius: "8px",
            marginBottom: "24px",
            border: "1px solid #a7f3d0"
          }}>
            If an account exists, a reset code has been sent.
          </div>
          <div className="hint" style={{ marginTop: 16, textAlign: "center" }}>
            Redirecting to verification page...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cooldown > 0}
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="submit"
            className="button"
            style={{ width: "100%" }}
            disabled={loading || cooldown > 0}
          >
            {loading ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send Reset Code"}
          </button>

          {cooldown > 0 && (
            <div className="hint" style={{ marginTop: "12px", textAlign: "center", color: "#6b7280" }}>
              Please wait {cooldown} second{cooldown !== 1 ? 's' : ''} before requesting another code.
            </div>
          )}
        </form>
      )}

      {error && (
        <div className="hint" style={{ color: "red", marginTop: "12px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div className="hint" style={{ marginTop: 16, textAlign: "center" }}>
        Remember your password?{" "}
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, "", "/login");
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="link"
        >
          Log in
        </a>
      </div>
    </div>
  );
}

