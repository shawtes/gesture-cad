using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// Quest 3 build configuration and CLI build script.
/// Run: Unity -executeMethod BuildScript.Build -buildTarget Android -quit -batchmode
/// </summary>
public class BuildScript
{
    [MenuItem("Quest/Apply Build Settings")]
    public static void ApplyQuestSettings()
    {
        // Android platform
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);

        // ARM64 only
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

        // Vulkan graphics
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan });
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);

        // ASTC textures
        EditorUserBuildSettings.androidBuildSubtarget = MobileTextureSubtarget.ASTC;

        // API levels
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel32;
        PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel32;

        // IL2CPP
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);

        // Package name
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.gesturecad.quest");

        // Quality
        PlayerSettings.colorSpace = ColorSpace.Linear;
        QualitySettings.vSyncCount = 0;
        Application.targetFrameRate = 90;

        // Product name
        PlayerSettings.productName = "GestureCAD";
        PlayerSettings.companyName = "GestureCAD";

        Debug.Log("Quest 3 build settings applied successfully.");
    }

    public static void Build()
    {
        ApplyQuestSettings();

        var options = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Main.unity" },
            locationPathName = "Builds/GestureCAD.apk",
            target = BuildTarget.Android,
            options = BuildOptions.None,
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);

        if (report.summary.result == BuildResult.Succeeded)
        {
            Debug.Log($"Build succeeded: {report.summary.totalSize / 1024 / 1024} MB");
        }
        else
        {
            throw new System.Exception($"Build failed with {report.summary.totalErrors} errors");
        }
    }
}
