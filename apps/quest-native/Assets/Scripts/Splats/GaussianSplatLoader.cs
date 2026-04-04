using UnityEngine;

/// <summary>
/// Gaussian Splat Loader — loads .ply/.splat files onto the workbench.
/// Uses aras-p/UnityGaussianSplatting when available.
/// </summary>
public class GaussianSplatLoader : MonoBehaviour
{
    [Header("Config")]
    public Transform splatRoot;
    public float splatScale = 1.0f;

    [Header("Performance (Quest 3)")]
    [Tooltip("Max splat count for Quest 3 standalone")]
    public int maxSplats = 200000;
    [Tooltip("Cull splats below this opacity")]
    public float opacityCutoff = 0.05f;

    /// <summary>
    /// Load a gaussian splat file and place it on the workbench.
    /// Requires UnityGaussianSplatting package.
    /// </summary>
    public void LoadSplatFile(string path)
    {
        // TODO: Integrate with aras-p/UnityGaussianSplatting
        // 1. Import .ply file as GaussianSplatAsset
        // 2. Create GameObject with GaussianSplatRenderer
        // 3. Apply Quest optimization settings
        // 4. Parent to splatRoot on workbench

        Debug.Log($"GaussianSplatLoader: Loading {path} (max {maxSplats} splats)");

        // Placeholder — creates a point cloud approximation
        // Replace with real GaussianSplatRenderer when package is added
        var go = new GameObject("GaussianSplat");
        go.transform.SetParent(splatRoot);
        go.transform.localPosition = Vector3.zero;
        go.transform.localScale = Vector3.one * splatScale;

        Debug.Log("GaussianSplatLoader: Loaded (placeholder). Add aras-p/UnityGaussianSplatting for real rendering.");
    }

    /// <summary>
    /// Quest 3 performance settings for gaussian splatting
    /// </summary>
    public void ApplyQuestOptimizations()
    {
        // Enable foveated rendering (reduces peripheral resolution)
        OVRManager.foveatedRenderingLevel = OVRManager.FoveatedRenderingLevel.HighTop;
        OVRManager.useDynamicFoveatedRendering = true;

        // Application Space Warp for framerate stability
        OVRManager.SetSpaceWarp(true);

        Debug.Log("Quest 3 optimizations applied for gaussian splatting");
    }
}
