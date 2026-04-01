"use client";

import { useState } from "react";
import { useCADState, useCADDispatch } from "@/lib/store";
import { evaluateExpression } from "@/lib/parameters";

export function ParameterPanel() {
  const { parameters } = useCADState();
  const dispatch = useCADDispatch();
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const paramMap = new Map(parameters.map((p) => [p.name, p.value]));

  const handleEdit = (name: string) => {
    const param = parameters.find((p) => p.name === name);
    if (param) {
      setEditingParam(name);
      setEditValue(param.expression || String(param.value));
      setError(null);
    }
  };

  const handleSave = () => {
    if (!editingParam) return;
    try {
      const value = evaluateExpression(editValue, paramMap);
      dispatch({
        type: "SET_PARAMETER",
        name: editingParam,
        value,
        expression: editValue !== String(value) ? editValue : undefined,
      });
      setEditingParam(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditingParam(null);
      setError(null);
    }
  };

  return (
    <div style={styles.panel} data-testid="parameter-panel">
      <div style={styles.header}>
        <span style={styles.headerTitle}>Parameters</span>
        <span style={styles.badge}>{parameters.length}</span>
      </div>

      <div style={styles.list}>
        {parameters.map((param) => (
          <div key={param.name} style={styles.row}>
            <span style={styles.paramName}>{param.name}</span>
            {editingParam === param.name ? (
              <div style={styles.editRow}>
                <input
                  style={styles.input}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  autoFocus
                  data-testid={`param-input-${param.name}`}
                />
              </div>
            ) : (
              <span
                style={styles.paramValue}
                onClick={() => handleEdit(param.name)}
                data-testid={`param-value-${param.name}`}
                title={param.expression ? `Expression: ${param.expression}` : "Click to edit"}
              >
                {param.value.toFixed(2)}
                {param.expression && <span style={styles.exprIcon}> ƒ</span>}
              </span>
            )}
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 200,
    height: "100%",
    background: "#141414",
    borderLeft: "1px solid #2a2a2a",
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    fontFamily: "inherit",
    fontSize: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid #2a2a2a",
  },
  headerTitle: {
    fontWeight: 600,
    color: "#e5e5e5",
    fontSize: 13,
  },
  badge: {
    background: "#2a2a2a",
    color: "#a0a0a0",
    padding: "1px 6px",
    borderRadius: 8,
    fontSize: 10,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px",
    borderBottom: "1px solid #1e1e1e",
  },
  paramName: {
    color: "#a0a0a0",
    fontSize: 12,
  },
  paramValue: {
    color: "#3b82f6",
    fontWeight: 500,
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: 3,
    transition: "background 0.1s",
  },
  exprIcon: {
    color: "#8b5cf6",
    fontSize: 10,
  },
  editRow: {
    display: "flex",
  },
  input: {
    width: 80,
    padding: "2px 6px",
    background: "#0a0a0a",
    border: "1px solid #3b82f6",
    borderRadius: 3,
    color: "#e5e5e5",
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
  },
  error: {
    padding: "6px 12px",
    color: "#ef4444",
    fontSize: 11,
    borderTop: "1px solid #2a2a2a",
  },
};
