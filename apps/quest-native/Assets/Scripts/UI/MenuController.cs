using UnityEngine;
using TMPro;

/// <summary>
/// World-space menu panel — renders as a floating UI in XR.
/// Uses TextMeshPro on 3D canvas (no Screen Space overlay in VR).
/// </summary>
public class MenuController : MonoBehaviour
{
    [Header("Panel")]
    public GameObject menuPanel;
    public Canvas menuCanvas;

    [Header("Sections")]
    public GameObject addSection;
    public GameObject modifySection;
    public GameObject materialSection;
    public GameObject tableSection;
    public GameObject objectsSection;
    public GameObject selectedSection;

    [Header("Material Buttons")]
    public UnityEngine.UI.Button hologramBtn;
    public UnityEngine.UI.Button solidBtn;
    public UnityEngine.UI.Button wireframeBtn;
    public UnityEngine.UI.Button glassBtn;
    public UnityEngine.UI.Button metallicBtn;
    public UnityEngine.UI.Button matteBtn;

    [Header("Selected Object Info")]
    public TextMeshProUGUI selectedNameText;
    public UnityEngine.UI.Slider scaleSlider;

    public bool isOpen;

    void Start()
    {
        menuPanel.SetActive(false);

        // Wire material buttons
        hologramBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Hologram));
        solidBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Solid));
        wireframeBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Wireframe));
        glassBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Glass));
        metallicBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Metallic));
        matteBtn?.onClick.AddListener(() => SetMaterial(MaterialMode.Matte));

        scaleSlider?.onValueChanged.AddListener(OnScaleChanged);
    }

    void Update()
    {
        if (!isOpen) return;

        // Position menu in front of camera, to the left
        var cam = Camera.main.transform;
        Vector3 targetPos = cam.position + cam.forward * 0.5f + cam.right * -0.3f + cam.up * -0.1f;
        transform.position = Vector3.Lerp(transform.position, targetPos, 0.05f);
        transform.rotation = Quaternion.Slerp(transform.rotation, cam.rotation, 0.05f);

        // Update selected object info
        UpdateSelectedInfo();
    }

    public void Toggle()
    {
        isOpen = !isOpen;
        menuPanel.SetActive(isOpen);
    }

    public void Show() { isOpen = true; menuPanel.SetActive(true); }
    public void Hide() { isOpen = false; menuPanel.SetActive(false); }

    void SetMaterial(MaterialMode mode)
    {
        AppManager.Instance.cadEngine.SetMaterialMode(mode);
    }

    void OnScaleChanged(float value)
    {
        var selected = AppManager.Instance.selectedObject;
        if (selected != null)
        {
            var comp = selected.GetComponent<CADObjectComponent>();
            if (comp != null)
                AppManager.Instance.cadEngine.ScaleObject(comp, value);
        }
    }

    void UpdateSelectedInfo()
    {
        var selected = AppManager.Instance.selectedObject;
        bool hasSelection = selected != null;
        selectedSection?.SetActive(hasSelection);

        if (hasSelection && selectedNameText != null)
        {
            var comp = selected.GetComponent<CADObjectComponent>();
            selectedNameText.text = comp?.objectName ?? "Unknown";
        }
    }

    // ═══ Button handlers (called from UI) ═══

    public void OnAddBox() => AppManager.Instance.SetTool("box");
    public void OnAddCylinder() => AppManager.Instance.SetTool("cylinder");
    public void OnAddSphere() => AppManager.Instance.SetTool("sphere");
    public void OnAddCone() => AppManager.Instance.SetTool("cone");
    public void OnAddTorus() => AppManager.Instance.SetTool("torus");

    public void OnGenerate1Bed() => AppManager.Instance.SetTool("generate_1bed");
    public void OnGenerate2Bed() => AppManager.Instance.SetTool("generate_2bed");
    public void OnGenerate3Bed() => AppManager.Instance.SetTool("generate_3bed");

    public void OnClone()
    {
        var sel = AppManager.Instance.selectedObject?.GetComponent<CADObjectComponent>();
        if (sel != null) AppManager.Instance.cadEngine.CloneObject(sel);
    }

    public void OnMirror()
    {
        var sel = AppManager.Instance.selectedObject?.GetComponent<CADObjectComponent>();
        if (sel != null) AppManager.Instance.cadEngine.MirrorObject(sel);
    }

    public void OnDelete()
    {
        var sel = AppManager.Instance.selectedObject?.GetComponent<CADObjectComponent>();
        if (sel != null) AppManager.Instance.cadEngine.DeleteObject(sel);
    }

    public void OnUndo() => AppManager.Instance.Undo();
    public void OnRedo() => AppManager.Instance.Redo();
    public void OnClearAll() => AppManager.Instance.ClearAll();
}
