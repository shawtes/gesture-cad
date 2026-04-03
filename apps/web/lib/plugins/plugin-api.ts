/**
 * Plugin API — extensible system for custom tools, panels, and commands.
 *
 * Plugins can register:
 * - Tools (appear in toolbar)
 * - Panels (appear in sidebar)
 * - Commands (callable from menu or shortcuts)
 * - Geometry generators (custom primitives)
 */

import type { SketchEntity } from "../sketch-entities";
import type { Feature, TessellatedMesh } from "../features";

export interface PluginTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  onActivate: () => void;
  onDeactivate?: () => void;
  onClick?: (pos: { x: number; z: number }) => SketchEntity | null;
}

export interface PluginPanel {
  id: string;
  name: string;
  icon: string;
  render: () => string; // Returns HTML string (sandboxed)
}

export interface PluginCommand {
  id: string;
  name: string;
  shortcut?: string;
  execute: (context: PluginContext) => void;
}

export interface PluginGeometryGenerator {
  id: string;
  name: string;
  icon: string;
  generate: (params: Record<string, number>) => TessellatedMesh;
  defaultParams: Record<string, number>;
}

export interface PluginContext {
  /** Read current entities */
  getEntities: () => SketchEntity[];
  /** Read current features */
  getFeatures: () => Feature[];
  /** Add an entity */
  addEntity: (entity: SketchEntity) => void;
  /** Add a feature */
  addFeature: (feature: Feature) => void;
  /** Show a notification */
  notify: (message: string, type?: "info" | "success" | "error") => void;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tools?: PluginTool[];
  panels?: PluginPanel[];
  commands?: PluginCommand[];
  generators?: PluginGeometryGenerator[];
  onLoad?: (context: PluginContext) => void;
  onUnload?: () => void;
}

/**
 * Plugin Manager — registry for installed plugins.
 */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private context: PluginContext | null = null;

  setContext(context: PluginContext): void {
    this.context = context;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[Plugin] "${plugin.id}" already registered, replacing`);
    }
    this.plugins.set(plugin.id, plugin);
    if (this.context) {
      plugin.onLoad?.(this.context);
    }
    console.log(`[Plugin] Registered: ${plugin.name} v${plugin.version}`);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.onUnload?.();
      this.plugins.delete(pluginId);
    }
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getAllTools(): PluginTool[] {
    return this.getAllPlugins().flatMap((p) => p.tools || []);
  }

  getAllCommands(): PluginCommand[] {
    return this.getAllPlugins().flatMap((p) => p.commands || []);
  }

  getAllGenerators(): PluginGeometryGenerator[] {
    return this.getAllPlugins().flatMap((p) => p.generators || []);
  }

  executeCommand(commandId: string): void {
    if (!this.context) return;
    for (const plugin of this.plugins.values()) {
      const cmd = plugin.commands?.find((c) => c.id === commandId);
      if (cmd) {
        cmd.execute(this.context);
        return;
      }
    }
    console.warn(`[Plugin] Command not found: ${commandId}`);
  }

  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.onUnload?.();
    }
    this.plugins.clear();
  }
}
