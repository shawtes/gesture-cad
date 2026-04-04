using UnityEngine;

/// <summary>
/// Holographic Workbench — the table with grid, tool pucks, and placement cursor.
/// </summary>
public class WorkbenchController : MonoBehaviour
{
    [Header("Table")]
    public Transform tableSurface;
    public Transform gridContainer;
    public float tableHeight = 0.78f;
    public float tableScale = 1.0f;

    [Header("Placement")]
    public GameObject placementCursorPrefab;
    public Vector3? placementPosition;
    private GameObject _placementCursor;

    [Header("Tool Pucks")]
    public ToolPuck[] toolPucks;

    void Start()
    {
        UpdateTableTransform();
    }

    public void SetTableHeight(float height)
    {
        tableHeight = Mathf.Clamp(height, 0.4f, 1.2f);
        UpdateTableTransform();
    }

    public void SetTableScale(float scale)
    {
        tableScale = Mathf.Clamp(scale, 0.5f, 2.0f);
        UpdateTableTransform();
    }

    void UpdateTableTransform()
    {
        if (tableSurface != null)
        {
            tableSurface.localPosition = new Vector3(0, tableHeight, 0);
            tableSurface.localScale = new Vector3(tableScale, 1, tableScale);
        }
    }

    /// <summary>
    /// Called when user taps the table surface
    /// </summary>
    public void OnTableTap(Vector3 worldPosition)
    {
        // Convert to table-local coordinates
        Vector3 localPos = tableSurface.InverseTransformPoint(worldPosition);
        placementPosition = new Vector3(localPos.x, 0, localPos.z);

        // Show placement cursor
        if (_placementCursor == null && placementCursorPrefab != null)
        {
            _placementCursor = Instantiate(placementCursorPrefab, tableSurface);
        }

        if (_placementCursor != null)
        {
            _placementCursor.transform.localPosition = placementPosition.Value + new Vector3(0, 0.01f, 0);
            _placementCursor.SetActive(true);
        }
    }

    /// <summary>
    /// Get where to place the next object
    /// </summary>
    public Vector3 GetPlacementPosition()
    {
        if (placementPosition.HasValue)
        {
            Vector3 pos = placementPosition.Value;
            return pos;
        }
        return AppManager.Instance.cadEngine.GetNextPosition();
    }
}
