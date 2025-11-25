import React, { useState } from "react";
import { forgotPassword } from "./api";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
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
            If this email exists, a reset link has been sent.
          </div>
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/login";
            }}
            className="button"
            style={{ width: "100%", display: "block", textAlign: "center", textDecoration: "none" }}
          >
            Back to Login
          </a>
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
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="submit"
            className="button"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
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
            window.location.href = "/login";
          }}
          className="link"
        >
          Log in
        </a>
      </div>
    </div>
  );
}

