"use client";

import { useState, useEffect } from "react";
import type { CollabState } from "@/lib/collaboration/yjs-provider";

interface PresenceBarProps {
  collabState: CollabState | null;
  onConnect?: (roomId: string) => void;
  onDisconnect?: () => void;
}

export function PresenceBar({ collabState, onConnect, onDisconnect }: PresenceBarProps) {
  const [roomInput, setRoomInput] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  if (!collabState?.connected) {
    return (
      <div style={styles.bar}>
        {showJoin ? (
          <div style={styles.joinForm}>
            <input
              style={styles.input}
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room ID..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && roomInput.trim()) {
                  onConnect?.(roomInput.trim());
                  setShowJoin(false);
                }
              }}
            />
            <button style={styles.connectBtn} onClick={() => {
              if (roomInput.trim()) { onConnect?.(roomInput.trim()); setShowJoin(false); }
            }}>
              Join
            </button>
            <button style={styles.cancelBtn} onClick={() => setShowJoin(false)}>Cancel</button>
          </div>
        ) : (
          <button style={styles.collabBtn} onClick={() => setShowJoin(true)}>
            Collaborate
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.bar}>
      <div style={styles.roomBadge}>
        <span style={styles.greenDot} />
        Room: {collabState.roomId}
      </div>
      <div style={styles.users}>
        {collabState.users.map((user) => (
          <div key={user.id} style={{ ...styles.avatar, background: user.color }} title={user.name}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span style={styles.userCount}>{collabState.users.length} online</span>
      <button style={styles.disconnectBtn} onClick={onDisconnect}>Leave</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: { display: "flex", alignItems: "center", gap: 8 },
  collabBtn: {
    padding: "4px 12px", background: "#8b5cf6", border: "none", borderRadius: 5,
    color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600,
  },
  joinForm: { display: "flex", gap: 4, alignItems: "center" },
  input: {
    width: 100, padding: "3px 8px", background: "#111", border: "1px solid #444",
    borderRadius: 4, color: "#fff", fontFamily: "inherit", fontSize: 11,
  },
  connectBtn: {
    padding: "3px 10px", background: "#22c55e", border: "none", borderRadius: 4,
    color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600,
  },
  cancelBtn: {
    padding: "3px 8px", background: "transparent", border: "none",
    color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
  },
  roomBadge: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "2px 8px", background: "#22c55e22", borderRadius: 10,
    color: "#22c55e", fontSize: 10, fontWeight: 600,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, background: "#22c55e" },
  users: { display: "flex", gap: 2 },
  avatar: {
    width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff",
  },
  userCount: { fontSize: 10, color: "#888" },
  disconnectBtn: {
    padding: "2px 8px", background: "#333", border: "none", borderRadius: 3,
    color: "#888", cursor: "pointer", fontFamily: "inherit", fontSize: 10,
  },
};
