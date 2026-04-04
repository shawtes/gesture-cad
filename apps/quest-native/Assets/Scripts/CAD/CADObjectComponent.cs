using UnityEngine;

/// <summary>
/// Attached to every CAD object. Handles selection visuals and interaction.
/// </summary>
public class CADObjectComponent : MonoBehaviour
{
    public string objectName;
    public string objectType;
    public bool isSelected;

    private Renderer _renderer;
    private Material _originalMaterial;
    private GameObject _selectionHighlight;

    void Awake()
    {
        _renderer = GetComponent<Renderer>();
    }

    public void SetSelected(bool selected)
    {
        isSelected = selected;

        if (selected)
        {
            // Create selection highlight (orange wireframe overlay)
            if (_selectionHighlight == null)
            {
                _selectionHighlight = Instantiate(gameObject, transform.parent);
                _selectionHighlight.name = "selection_highlight";
                _selectionHighlight.transform.localPosition = transform.localPosition;
                _selectionHighlight.transform.localRotation = transform.localRotation;
                _selectionHighlight.transform.localScale = transform.localScale * 1.02f;

                // Remove all components except renderer
                Destroy(_selectionHighlight.GetComponent<CADObjectComponent>());
                Destroy(_selectionHighlight.GetComponent<Collider>());
                var rb = _selectionHighlight.GetComponent<Rigidbody>();
                if (rb) Destroy(rb);

                var hlRenderer = _selectionHighlight.GetComponent<Renderer>();
                var hlMat = new Material(Shader.Find("Standard"));
                hlMat.color = new Color(1f, 0.4f, 0f, 0.3f); // Orange
                hlMat.SetFloat("_Mode", 3); // Transparent
                hlMat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                hlMat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                hlMat.SetInt("_ZWrite", 0);
                hlMat.DisableKeyword("_ALPHATEST_ON");
                hlMat.EnableKeyword("_ALPHABLEND_ON");
                hlMat.renderQueue = 3000;
                hlRenderer.material = hlMat;
            }
        }
        else
        {
            if (_selectionHighlight != null)
            {
                Destroy(_selectionHighlight);
                _selectionHighlight = null;
            }
        }
    }

    void OnDestroy()
    {
        if (_selectionHighlight != null) Destroy(_selectionHighlight);
    }
}
