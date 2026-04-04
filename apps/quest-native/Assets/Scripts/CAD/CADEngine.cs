using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Local CAD Engine — creates and manages 3D geometry.
/// Port of apps/xr/lib/local-cad-engine.ts
/// </summary>
public class CADEngine : MonoBehaviour
{
    [Header("References")]
    public Transform modelRoot;
    public Material hologramMaterial;
    public Material solidMaterial;
    public Material wireframeMaterial;
    public Material glassMaterial;
    public Material metallicMaterial;
    public Material matteMaterial;

    public List<CADObjectComponent> objects = new List<CADObjectComponent>();
    private Stack<List<CADObjectData>> undoStack = new Stack<List<CADObjectData>>();
    private Stack<List<CADObjectData>> redoStack = new Stack<List<CADObjectData>>();

    // Golden angle spiral for auto-positioning
    private int placementIndex = 0;

    public Vector3 GetNextPosition()
    {
        if (placementIndex == 0) { placementIndex++; return Vector3.zero; }
        float angle = placementIndex * 137.5f * Mathf.Deg2Rad;
        float radius = 0.2f + placementIndex * 0.12f;
        radius = Mathf.Min(radius, 2f);
        placementIndex++;
        return new Vector3(Mathf.Cos(angle) * radius, 0, Mathf.Sin(angle) * radius);
    }

    // ═══ Primitive Creation ═══

    public CADObjectComponent AddBox(Vector3? position = null, float size = 1f)
    {
        return CreatePrimitive(PrimitiveType.Cube, position, new Vector3(size, size, size), "Box");
    }

    public CADObjectComponent AddCylinder(Vector3? position = null, float radius = 0.5f, float height = 1f)
    {
        var obj = CreatePrimitive(PrimitiveType.Cylinder, position, new Vector3(radius * 2, height / 2, radius * 2), "Cylinder");
        return obj;
    }

    public CADObjectComponent AddSphere(Vector3? position = null, float radius = 0.5f)
    {
        return CreatePrimitive(PrimitiveType.Sphere, position, new Vector3(radius * 2, radius * 2, radius * 2), "Sphere");
    }

    public CADObjectComponent AddCone(Vector3? position = null)
    {
        // Unity doesn't have a cone primitive — use a cylinder scaled
        var obj = CreatePrimitive(PrimitiveType.Cylinder, position, new Vector3(1, 0.5f, 1), "Cone");
        // Scale top to zero to approximate a cone
        var mesh = obj.GetComponent<MeshFilter>().mesh;
        var verts = mesh.vertices;
        for (int i = 0; i < verts.Length; i++)
        {
            if (verts[i].y > 0) verts[i] = new Vector3(0, verts[i].y, 0);
        }
        mesh.vertices = verts;
        mesh.RecalculateNormals();
        return obj;
    }

    public CADObjectComponent AddTorus(Vector3? position = null)
    {
        // Create torus from ProBuilder or use a mesh asset
        // For now, use a placeholder sphere
        var obj = CreatePrimitive(PrimitiveType.Sphere, position, Vector3.one * 0.5f, "Torus");
        return obj;
    }

    private CADObjectComponent CreatePrimitive(PrimitiveType type, Vector3? position, Vector3 scale, string name)
    {
        SaveUndo();

        Vector3 pos = position ?? GetNextPosition();
        GameObject go = GameObject.CreatePrimitive(type);
        go.name = $"{name}_{objects.Count}";
        go.transform.SetParent(modelRoot);
        go.transform.localPosition = pos + new Vector3(0, scale.y / 2, 0);
        go.transform.localScale = scale;

        // Apply current material
        ApplyMaterial(go);

        // Add CAD component
        var comp = go.AddComponent<CADObjectComponent>();
        comp.objectName = go.name;
        comp.objectType = name.ToLower();

        // Make it interactable
        var rb = go.GetComponent<Rigidbody>();
        if (rb == null) rb = go.AddComponent<Rigidbody>();
        rb.isKinematic = true;
        rb.useGravity = false;

        objects.Add(comp);
        AppManager.Instance.objectCount = objects.Count;
        return comp;
    }

    // ═══ Materials ═══

    public void ApplyMaterial(GameObject go)
    {
        var renderer = go.GetComponent<Renderer>();
        if (renderer == null) return;

        Material mat = GetCurrentMaterial();
        renderer.material = mat;
    }

    public Material GetCurrentMaterial()
    {
        switch (AppManager.Instance.materialMode)
        {
            case MaterialMode.Hologram: return hologramMaterial;
            case MaterialMode.Solid: return solidMaterial;
            case MaterialMode.Wireframe: return wireframeMaterial;
            case MaterialMode.Glass: return glassMaterial;
            case MaterialMode.Metallic: return metallicMaterial;
            case MaterialMode.Matte: return matteMaterial;
            default: return hologramMaterial;
        }
    }

    public void SetMaterialMode(MaterialMode mode)
    {
        AppManager.Instance.materialMode = mode;
        foreach (var obj in objects)
        {
            ApplyMaterial(obj.gameObject);
        }
    }

    // ═══ Modifiers ═══

    public void ScaleObject(CADObjectComponent obj, float factor)
    {
        SaveUndo();
        obj.transform.localScale *= factor;
    }

    public void CloneObject(CADObjectComponent obj)
    {
        SaveUndo();
        var clone = Instantiate(obj.gameObject, modelRoot);
        clone.name = obj.objectName + "_copy";
        clone.transform.localPosition += new Vector3(0.5f, 0, 0);
        var comp = clone.GetComponent<CADObjectComponent>();
        comp.objectName = clone.name;
        objects.Add(comp);
        AppManager.Instance.objectCount = objects.Count;
    }

    public void MirrorObject(CADObjectComponent obj)
    {
        SaveUndo();
        var clone = Instantiate(obj.gameObject, modelRoot);
        clone.name = obj.objectName + "_mirror";
        var pos = clone.transform.localPosition;
        pos.x = -pos.x;
        clone.transform.localPosition = pos;
        clone.transform.localScale = new Vector3(
            -clone.transform.localScale.x,
            clone.transform.localScale.y,
            clone.transform.localScale.z
        );
        var comp = clone.GetComponent<CADObjectComponent>();
        comp.objectName = clone.name;
        objects.Add(comp);
        AppManager.Instance.objectCount = objects.Count;
    }

    public void DeleteObject(CADObjectComponent obj)
    {
        SaveUndo();
        objects.Remove(obj);
        Destroy(obj.gameObject);
        AppManager.Instance.objectCount = objects.Count;
        if (AppManager.Instance.selectedObject == obj.gameObject)
            AppManager.Instance.selectedObject = null;
    }

    public void LinearPattern(CADObjectComponent obj, int count, float spacing)
    {
        SaveUndo();
        for (int i = 1; i < count; i++)
        {
            var clone = Instantiate(obj.gameObject, modelRoot);
            clone.name = $"{obj.objectName}_{i + 1}of{count}";
            clone.transform.localPosition += new Vector3(spacing * i, 0, 0);
            var comp = clone.GetComponent<CADObjectComponent>();
            comp.objectName = clone.name;
            objects.Add(comp);
        }
        AppManager.Instance.objectCount = objects.Count;
    }

    public void CircularPattern(CADObjectComponent obj, int count)
    {
        SaveUndo();
        float angleStep = 360f / count;
        float radius = obj.transform.localPosition.magnitude;
        if (radius < 0.3f) radius = 0.5f;

        for (int i = 1; i < count; i++)
        {
            var clone = Instantiate(obj.gameObject, modelRoot);
            clone.name = $"{obj.objectName}_{i + 1}of{count}";
            float angle = angleStep * i * Mathf.Deg2Rad;
            clone.transform.localPosition = new Vector3(
                Mathf.Cos(angle) * radius,
                obj.transform.localPosition.y,
                Mathf.Sin(angle) * radius
            );
            clone.transform.localRotation = Quaternion.Euler(0, angleStep * i, 0);
            var comp = clone.GetComponent<CADObjectComponent>();
            comp.objectName = clone.name;
            objects.Add(comp);
        }
        AppManager.Instance.objectCount = objects.Count;
    }

    // ═══ House Generator ═══

    public void GenerateHouse(string type)
    {
        SaveUndo();
        switch (type)
        {
            case "1bed": Generate1Bed(); break;
            case "2bed": Generate2Bed(); break;
            case "3bed": Generate3Bed(); break;
        }
        AppManager.Instance.objectCount = objects.Count;
    }

    private void AddWall(float x1, float z1, float x2, float z2, float height)
    {
        float w = Mathf.Abs(x2 - x1);
        float d = Mathf.Abs(z2 - z1);
        if (w < 0.01f) w = 0.15f;
        if (d < 0.01f) d = 0.15f;
        float cx = (x1 + x2) / 2f;
        float cz = (z1 + z2) / 2f;

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "Wall";
        go.transform.SetParent(modelRoot);
        go.transform.localScale = new Vector3(w, height, d);
        go.transform.localPosition = new Vector3(cx, height / 2, cz);
        ApplyMaterial(go);

        var comp = go.AddComponent<CADObjectComponent>();
        comp.objectName = go.name;
        comp.objectType = "wall";
        var rb = go.AddComponent<Rigidbody>();
        rb.isKinematic = true; rb.useGravity = false;
        objects.Add(comp);
    }

    private void AddFurniture(float x, float z, float w, float d, float h, string name)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.SetParent(modelRoot);
        go.transform.localScale = new Vector3(w, h, d);
        go.transform.localPosition = new Vector3(x, h / 2, z);
        ApplyMaterial(go);

        var comp = go.AddComponent<CADObjectComponent>();
        comp.objectName = name;
        comp.objectType = "furniture";
        var rb = go.AddComponent<Rigidbody>();
        rb.isKinematic = true; rb.useGravity = false;
        objects.Add(comp);
    }

    private void Generate1Bed()
    {
        float s = 0.1f; // Scale factor for meters
        AddWall(-3.5f*s, -3.5f*s, 3.5f*s, 3.5f*s, 3*s); // Outer
        AddWall(-3.5f*s, 0.4f*s, 0, 0.6f*s, 3*s); // Bedroom wall
        AddFurniture(-1.75f*s, 2.4f*s, 1.5f*s, 1.8f*s, 0.5f*s, "Bed");
        AddFurniture(-1.4f*s, -2.6f*s, 2.2f*s, 0.8f*s, 0.45f*s, "Sofa");
        AddFurniture(1.75f*s, -3f*s, 3.1f*s, 0.6f*s, 0.9f*s, "Kitchen");
    }

    private void Generate2Bed()
    {
        float s = 0.08f;
        AddWall(-5*s, -4*s, 5*s, 4*s, 3*s);
        AddWall(-0.85f*s, -4*s, -0.65f*s, 4*s, 3*s);
        AddWall(0.65f*s, -4*s, 0.85f*s, 4*s, 3*s);
        AddWall(-5*s, -0.1f*s, -0.75f*s, 0.1f*s, 3*s);
        AddFurniture(-3*s, 2*s, 2*s, 2*s, 0.5f*s, "Master Bed");
        AddFurniture(2.25f*s, 2*s, 1.5f*s, 2*s, 0.5f*s, "Bed 2");
        AddFurniture(2.9f*s, -3.15f*s, 3.8f*s, 0.7f*s, 0.9f*s, "Kitchen");
        AddFurniture(-2.75f*s, -3.1f*s, 2.5f*s, 0.8f*s, 0.45f*s, "Sofa");
    }

    private void Generate3Bed()
    {
        float s = 0.06f;
        AddWall(-6*s, -5*s, 6*s, 5*s, 3*s);
        AddWall(-1.1f*s, -5*s, -0.9f*s, 5*s, 3*s);
        AddWall(1.9f*s, -5*s, 2.1f*s, -1*s, 3*s);
        AddWall(-1*s, 1.4f*s, 6*s, 1.6f*s, 3*s);
        AddFurniture(-4.35f*s, 3.5f*s, 1.3f*s, 2*s, 0.5f*s, "Master Bed");
        AddFurniture(0.5f*s, 3.25f*s, 2*s, 1.5f*s, 0.5f*s, "Bed 2");
        AddFurniture(3.25f*s, 3.25f*s, 1.5f*s, 1.5f*s, 0.5f*s, "Bed 3");
        AddFurniture(-3.5f*s, -3.6f*s, 3*s, 0.8f*s, 0.45f*s, "Sofa");
        AddFurniture(3.85f*s, -4.15f*s, 3.3f*s, 0.7f*s, 0.9f*s, "Kitchen");
    }

    // ═══ Undo/Redo ═══

    private void SaveUndo()
    {
        var state = new List<CADObjectData>();
        foreach (var obj in objects)
        {
            state.Add(new CADObjectData
            {
                name = obj.objectName,
                type = obj.objectType,
                position = obj.transform.localPosition,
                rotation = obj.transform.localRotation,
                scale = obj.transform.localScale,
            });
        }
        undoStack.Push(state);
        redoStack.Clear();
        if (undoStack.Count > 30) { /* trim */ }
    }

    public void Undo()
    {
        if (undoStack.Count == 0) return;
        // Save current for redo
        var current = new List<CADObjectData>();
        foreach (var obj in objects) current.Add(new CADObjectData { name = obj.objectName });
        redoStack.Push(current);

        ClearAllWithoutUndo();
        var state = undoStack.Pop();
        // Rebuild from state... (simplified)
    }

    public void Redo()
    {
        if (redoStack.Count == 0) return;
        var state = redoStack.Pop();
        // Rebuild...
    }

    public void ClearAll()
    {
        SaveUndo();
        ClearAllWithoutUndo();
    }

    private void ClearAllWithoutUndo()
    {
        foreach (var obj in objects) Destroy(obj.gameObject);
        objects.Clear();
        placementIndex = 0;
    }
}

[System.Serializable]
public class CADObjectData
{
    public string name;
    public string type;
    public Vector3 position;
    public Quaternion rotation;
    public Vector3 scale;
}
