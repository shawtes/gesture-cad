using UnityEngine;
using TMPro;

/// <summary>
/// Tool Puck — clickable/pokeable button on the workbench edge.
/// Uses Interaction SDK for hand poke and ray interaction.
/// </summary>
public class ToolPuck : MonoBehaviour
{
    [Header("Config")]
    public string toolId;
    public string toolLabel;
    public string toolIcon;

    [Header("Visuals")]
    public MeshRenderer puckMesh;
    public TextMeshPro iconText;
    public TextMeshPro labelText;
    public GameObject glowRing;
    public GameObject hoverRing;

    [Header("Colors")]
    public Color normalColor = new Color(0.67f, 0.67f, 0.67f, 0.18f);
    public Color hoverColor = new Color(0, 0.8f, 0.6f, 0.45f);
    public Color activeColor = new Color(1, 1, 1, 0.7f);
    public Color activeTextColor = new Color(1, 0.2f, 0.4f);
    public Color normalTextColor = new Color(0.07f, 0.07f, 0.07f);

    private bool _isHovered;
    private bool _isActive;

    void Start()
    {
        if (iconText != null) iconText.text = toolIcon;
        if (labelText != null) labelText.text = toolLabel;
        UpdateVisuals();
    }

    void Update()
    {
        _isActive = AppManager.Instance.activeTool == toolId;
        UpdateVisuals();

        // Floating animation when active
        if (_isActive)
        {
            float y = transform.localPosition.y + Mathf.Sin(Time.time * 3) * 0.004f;
            transform.localPosition = new Vector3(transform.localPosition.x, y, transform.localPosition.z);
        }
    }

    void UpdateVisuals()
    {
        if (puckMesh != null)
        {
            puckMesh.material.color = _isActive ? activeColor : _isHovered ? hoverColor : normalColor;
        }

        if (iconText != null)
        {
            iconText.color = _isActive ? activeTextColor : _isHovered ? new Color(1, 0.4f, 0) : normalTextColor;
            iconText.fontSize = _isActive ? 0.034f : 0.028f;
        }

        if (labelText != null)
        {
            labelText.color = _isActive ? activeTextColor : normalTextColor;
        }

        if (glowRing != null) glowRing.SetActive(_isActive);
        if (hoverRing != null) hoverRing.SetActive(_isHovered && !_isActive);
    }

    // Called by Interaction SDK PokeInteractable or HandGrabInteractable
    public void OnPoked()
    {
        AppManager.Instance.SetTool(toolId);
    }

    // Also support pointer click
    public void OnPointerClick()
    {
        AppManager.Instance.SetTool(toolId);
    }

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("HandTip")) _isHovered = true;
    }

    void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("HandTip")) _isHovered = false;
    }
}
