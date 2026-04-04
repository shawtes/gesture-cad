using UnityEngine;

/// <summary>
/// GestureCAD Quest — Main application manager.
/// Initializes XR, manages app state, coordinates all systems.
/// </summary>
public class AppManager : MonoBehaviour
{
    public static AppManager Instance { get; private set; }

    [Header("References")]
    public Transform workbenchRoot;
    public Transform modelRoot;
    public HandTrackingManager handTracking;
    public CADEngine cadEngine;
    public WorkbenchController workbench;
    public MenuController menu;
    public TutorialController tutorial;

    [Header("Settings")]
    public float tableHeight = 0.78f;
    public float tableScale = 1.0f;
    public MaterialMode materialMode = MaterialMode.Hologram;
    public HologramPreset colorPreset = HologramPreset.Cyan;

    [Header("State")]
    public string activeTool = "select";
    public GameObject selectedObject;
    public int objectCount;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;

        // Quest 3 performance settings
        OVRManager.display.displayFrequency = 90f;
        QualitySettings.vSyncCount = 0;
        Application.targetFrameRate = 90;
    }

    void Start()
    {
        // Enable hand tracking
        OVRPlugin.StartBodyTracking();

        // Show tutorial on first launch
        if (!PlayerPrefs.HasKey("tutorial_done"))
        {
            tutorial?.Show();
        }
    }

    public void SetTool(string toolId)
    {
        activeTool = toolId;

        // Auto-create primitives
        switch (toolId)
        {
            case "box": cadEngine.AddBox(workbench.GetPlacementPosition()); break;
            case "cylinder": cadEngine.AddCylinder(workbench.GetPlacementPosition()); break;
            case "sphere": cadEngine.AddSphere(workbench.GetPlacementPosition()); break;
            case "cone": cadEngine.AddCone(workbench.GetPlacementPosition()); break;
            case "torus": cadEngine.AddTorus(workbench.GetPlacementPosition()); break;
            case "generate_1bed": cadEngine.GenerateHouse("1bed"); break;
            case "generate_2bed": cadEngine.GenerateHouse("2bed"); break;
            case "generate_3bed": cadEngine.GenerateHouse("3bed"); break;
        }

        objectCount = cadEngine.objects.Count;
    }

    public void SelectObject(GameObject obj)
    {
        // Deselect previous
        if (selectedObject != null)
        {
            var prev = selectedObject.GetComponent<CADObjectComponent>();
            if (prev != null) prev.SetSelected(false);
        }

        selectedObject = obj;

        if (obj != null)
        {
            var comp = obj.GetComponent<CADObjectComponent>();
            if (comp != null) comp.SetSelected(true);
        }
    }

    public void Undo() => cadEngine.Undo();
    public void Redo() => cadEngine.Redo();
    public void ClearAll() { cadEngine.ClearAll(); selectedObject = null; objectCount = 0; }
}

public enum MaterialMode { Hologram, Solid, Wireframe, Glass, Metallic, Matte }
public enum HologramPreset { Cyan, Blue, Green, Orange, Purple, Red, White }
