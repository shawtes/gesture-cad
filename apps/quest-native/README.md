# GestureCAD Quest — Native Quest 3 App

Holographic CAD workbench for Meta Quest 3. Port of the WebXR app to native Unity.

## Setup

### Prerequisites
- Unity 6000.0 LTS (Unity 6) with Android module
- Meta Quest Developer account
- Quest 3 in Developer Mode
- ADB installed (`brew install android-platform-tools`)

### Install Unity
1. Download Unity Hub: https://unity.com/download
2. Install Unity 6 LTS with Android Build Support
3. Open this project: `apps/quest-native/`

### First Time Setup
1. Open project in Unity
2. Unity will download Meta XR SDK packages from the scoped registry
3. Go to menu: Quest → Apply Build Settings
4. Window → XR Plugin Management → Enable Oculus
5. Set OVRManager on camera rig:
   - Hand Tracking: Controllers And Hands
   - Passthrough: Supported
   - Target Devices: Quest 3

### Build & Deploy
```bash
# Build APK
# (from Unity menu: File → Build And Run)
# Or via CLI:
Unity -projectPath . -executeMethod BuildScript.Build -buildTarget Android -quit -batchmode

# Sideload to Quest
adb install -r Builds/GestureCAD.apk

# Launch
adb shell am start -n com.gesturecad.quest/com.unity3d.player.UnityPlayerActivity

# View logs
adb logcat -s Unity:V
```

## Architecture

```
Assets/
├── Scenes/Main.unity          — Main scene
├── Scripts/
│   ├── Core/AppManager.cs     — App state, tool routing
│   ├── CAD/
│   │   ├── CADEngine.cs       — Geometry creation, modifiers, undo
│   │   └── CADObjectComponent.cs — Per-object selection, highlights
│   ├── Interaction/
│   │   └── HandTrackingManager.cs — Hand tracking, grab, scale, menu
│   ├── Workbench/
│   │   ├── WorkbenchController.cs — Table, grid, placement
│   │   └── ToolPuck.cs        — Clickable tool buttons
│   ├── UI/
│   │   ├── MenuController.cs  — World-space menu panel
│   │   └── TutorialController.cs — Step-by-step guide
│   └── Splats/
│       └── GaussianSplatLoader.cs — Gaussian splat file loading
├── Shaders/
│   └── Hologram.shader        — Scan lines, edge glow, flicker
├── Materials/                 — Hologram, solid, glass, metal, matte
├── Prefabs/                   — Interaction rig, tool pucks, workbench
└── Editor/
    └── BuildScript.cs         — Quest 3 build configuration
```

## Features (ported from WebXR app)

- [x] Holographic workbench with 3D grid
- [x] Tool pucks around table edges (pokeable)
- [x] Hand tracking (pinch=grab, fist=rotate, palm=menu)
- [x] Controller support (trigger=select, grip=menu)
- [x] 6 material modes (hologram/solid/wireframe/glass/metal/matte)
- [x] 5 primitives (box, cylinder, sphere, cone, torus)
- [x] Sketch+extrude (rect, circle, polygon)
- [x] House generator (1-bed, 2-bed, 3-bed)
- [x] Object selection with highlight
- [x] Clone, mirror, linear/circular pattern
- [x] Undo/redo stack
- [x] Tap-to-place on table grid
- [x] Table height/scale adjustment
- [x] 11-step interactive tutorial
- [x] Gaussian splat loading (placeholder, needs aras-p package)
- [x] Hologram shader (HLSL port)

## Performance Targets
- 90 FPS on Quest 3
- Foveated rendering enabled
- Vulkan graphics API
- ASTC texture compression
- < 100 draw calls
- < 200k triangles
