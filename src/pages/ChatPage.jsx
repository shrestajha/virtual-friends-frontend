import React, { useMemo, useState } from "react";
import ChatBox from "../components/ChatBox";

/**
 * Clean, always-visible chat page.
 * Uses the existing ChatBox + styles from `src/styles.css`.
 */
export default function ChatPage({ user }) {
  const selectedCharacter = useMemo(() => {
    // Backend assigns one character per user; App also keeps this on `user.characters[0]`.
    const first = user?.characters?.[0];
    return first?.id ? first : null;
  }, [user]);

  // Keep a local counter so the ChatBox never looks "disabled" due to missing counts.
  const [localMessageCount, setLocalMessageCount] = useState(0);
  const maxMessages = 1000000; // effectively unlimited for now

  return (
    <div
      className="container"
      style={{
        height: "100%",
        maxWidth: "52rem",
        paddingTop: 16,
        paddingBottom: 16,
      }}
    >
      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 600 }}>
            {selectedCharacter ? `Chatting with: ${selectedCharacter.name || "Your agent"}` : "No agent assigned"}
          </div>
          <div className="meta" style={{ marginLeft: "auto" }}>
            {user?.email ? user.email : ""}
          </div>
        </div>
        {!selectedCharacter && (
          <div className="meta" style={{ marginTop: 8 }}>
            Your account does not have a character/agent yet. Please contact support.
          </div>
        )}
      </div>

      <ChatBox
        selectedCharacter={selectedCharacter}
        userMessageCount={localMessageCount}
        maxMessages={maxMessages}
        onMessageSent={() => setLocalMessageCount((c) => c + 1)}
      />
    </div>
  );
}

 
