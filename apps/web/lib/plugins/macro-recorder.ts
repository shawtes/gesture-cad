/**
 * Macro Recorder — captures user actions as replayable sequences.
 *
 * Records CAD dispatch actions, gesture events, and tool activations.
 * Can replay macros to automate repetitive workflows.
 */

import type { CADAction } from "../store";

export interface MacroAction {
  action: CADAction;
  timestamp: number;
  /** Delay from previous action in ms */
  delay: number;
}

export interface Macro {
  id: string;
  name: string;
  description: string;
  actions: MacroAction[];
  createdAt: number;
  totalDuration: number; // ms
}

type MacroListener = (event: "start" | "stop" | "action") => void;

let macroCounter = 0;

export class MacroRecorder {
  private recording = false;
  private actions: MacroAction[] = [];
  private startTime = 0;
  private lastActionTime = 0;
  private savedMacros: Macro[] = [];
  private listeners: MacroListener[] = [];

  get isRecording(): boolean {
    return this.recording;
  }

  get macros(): Readonly<Macro[]> {
    return this.savedMacros;
  }

  onEvent(listener: MacroListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  /** Start recording actions */
  startRecording(): void {
    this.recording = true;
    this.actions = [];
    this.startTime = Date.now();
    this.lastActionTime = this.startTime;
    this.emit("start");
  }

  /** Record a single action */
  recordAction(action: CADAction): void {
    if (!this.recording) return;

    const now = Date.now();
    this.actions.push({
      action,
      timestamp: now,
      delay: now - this.lastActionTime,
    });
    this.lastActionTime = now;
    this.emit("action");
  }

  /** Stop recording and save the macro */
  stopRecording(name?: string): Macro | null {
    if (!this.recording || this.actions.length === 0) {
      this.recording = false;
      return null;
    }

    this.recording = false;
    const macro: Macro = {
      id: `macro_${++macroCounter}`,
      name: name || `Macro ${macroCounter}`,
      description: `${this.actions.length} actions`,
      actions: [...this.actions],
      createdAt: Date.now(),
      totalDuration: Date.now() - this.startTime,
    };

    this.savedMacros.push(macro);
    this.actions = [];
    this.emit("stop");
    return macro;
  }

  /** Cancel recording without saving */
  cancelRecording(): void {
    this.recording = false;
    this.actions = [];
    this.emit("stop");
  }

  /**
   * Replay a macro by dispatching its actions with original timing.
   */
  async replayMacro(
    macroId: string,
    dispatch: (action: CADAction) => void,
    speed: number = 1
  ): Promise<void> {
    const macro = this.savedMacros.find((m) => m.id === macroId);
    if (!macro) return;

    for (const step of macro.actions) {
      if (step.delay > 0) {
        await new Promise((r) => setTimeout(r, step.delay / speed));
      }
      dispatch(step.action);
    }
  }

  /** Delete a saved macro */
  deleteMacro(id: string): void {
    this.savedMacros = this.savedMacros.filter((m) => m.id !== id);
  }

  /** Export macros as JSON */
  exportMacros(): string {
    return JSON.stringify(this.savedMacros, null, 2);
  }

  /** Import macros from JSON */
  importMacros(json: string): number {
    try {
      const imported = JSON.parse(json) as Macro[];
      this.savedMacros.push(...imported);
      return imported.length;
    } catch {
      return 0;
    }
  }

  private emit(event: "start" | "stop" | "action"): void {
    for (const l of this.listeners) l(event);
  }
}
