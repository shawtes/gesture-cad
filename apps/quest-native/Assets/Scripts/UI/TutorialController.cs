using UnityEngine;
using TMPro;

/// <summary>
/// In-app tutorial — world-space panels with step-by-step instructions.
/// </summary>
public class TutorialController : MonoBehaviour
{
    [Header("UI")]
    public GameObject tutorialPanel;
    public TextMeshProUGUI titleText;
    public TextMeshProUGUI contentText;
    public TextMeshProUGUI tipText;
    public TextMeshProUGUI stepText;
    public UnityEngine.UI.Button nextButton;
    public UnityEngine.UI.Button backButton;
    public UnityEngine.UI.Button closeButton;

    private int currentStep;

    private static readonly (string title, string content, string tip)[] STEPS = new[]
    {
        ("Welcome", "GestureCAD Quest — your holographic CAD workbench.\nDesign 3D models in AR/VR using hands or controllers.", "Pinch, grab, and poke to interact"),
        ("The Workbench", "A floating table with a 3D grid sits in front of you.\nYour models appear on this table.\nWalk around it to view from any angle.", "Adjust table height and size in the Menu"),
        ("Opening the Menu", "Three ways to open:\n1. Poke the floating MENU button\n2. Squeeze right controller grip\n3. Face left palm toward yourself", "The MENU button follows your view"),
        ("Adding Shapes", "Poke tool pucks on the workbench edges:\nFront: Sketch tools (Line, Rect, Circle)\nRight: Build (Box, Cylinder, Sphere)\nBack: Boolean & Patterns\nLeft: Edit, Sculpt, Generate", "Poke = touch with index fingertip"),
        ("Hand Gestures", "Pinch: Grab and move objects\nTwo-hand pinch: Scale up/down\nFist near object: Rotate\nOpen palm: Reset view\nPoke: Select / press buttons", "Controller trigger = pinch equivalent"),
        ("Materials", "Menu → MATERIAL:\nHologram, Solid, Wireframe, Glass, Metal, Matte\n\nEach mode changes how objects look.\nAll work with color presets.", "Solid and Metal look best in AR"),
        ("Placement", "Tap the table grid to set where objects appear.\nAn orange cursor shows the target.\nNext shape you add appears there.", "Without a cursor, objects auto-spiral"),
        ("Selection", "Poke or pinch-click any object to select it.\nOrange highlight shows selection.\nMenu shows controls for the selected object:\nScale, Clone, Mirror, Delete, Pattern", "Tap empty space to deselect"),
        ("Generate Houses", "Menu → GENERATE:\n1-Bed apartment, 2-Bed house, 3-Bed house.\nBuilds walls, rooms, furniture automatically.\nAll from real architectural standards.", "Each generates 5-10 objects"),
        ("Sculpt", "Menu → Sculpt:\nGrab: push/pull vertices\nSmooth: average surface\nInflate: puff out\n\nPinch near a vertex to sculpt.", "Works best on spheres and tori"),
        ("You're Ready!", "Quick start:\n1. Poke a tool puck to add a shape\n2. Pinch to grab and move it\n3. Open Menu for more tools\n4. Change materials and colors\n5. Generate a house!\n\nHave fun building!", "Tap ? anytime to reopen this tutorial"),
    };

    void Start()
    {
        nextButton?.onClick.AddListener(Next);
        backButton?.onClick.AddListener(Back);
        closeButton?.onClick.AddListener(Hide);
        Hide();
    }

    void Update()
    {
        if (!tutorialPanel.activeSelf) return;

        // Follow camera
        var cam = Camera.main.transform;
        transform.position = Vector3.Lerp(
            transform.position,
            cam.position + cam.forward * 0.6f,
            0.05f
        );
        transform.rotation = Quaternion.Slerp(transform.rotation, cam.rotation, 0.05f);
    }

    public void Show()
    {
        currentStep = 0;
        tutorialPanel.SetActive(true);
        UpdateUI();
    }

    public void Hide()
    {
        tutorialPanel.SetActive(false);
        PlayerPrefs.SetInt("tutorial_done", 1);
    }

    void Next()
    {
        if (currentStep < STEPS.Length - 1) { currentStep++; UpdateUI(); }
        else Hide();
    }

    void Back()
    {
        if (currentStep > 0) { currentStep--; UpdateUI(); }
    }

    void UpdateUI()
    {
        var step = STEPS[currentStep];
        if (titleText) titleText.text = step.title;
        if (contentText) contentText.text = step.content;
        if (tipText) tipText.text = "💡 " + step.tip;
        if (stepText) stepText.text = $"{currentStep + 1} / {STEPS.Length}";
        if (backButton) backButton.gameObject.SetActive(currentStep > 0);
        if (nextButton)
        {
            var txt = nextButton.GetComponentInChildren<TextMeshProUGUI>();
            if (txt) txt.text = currentStep == STEPS.Length - 1 ? "Start Building" : "Next →";
        }
    }
}
