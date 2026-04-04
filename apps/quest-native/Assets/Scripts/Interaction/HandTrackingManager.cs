using UnityEngine;

/// <summary>
/// Hand Tracking Manager — bridges Meta Interaction SDK to CAD operations.
/// Handles pinch-to-grab, fist-to-rotate, palm-for-menu.
/// </summary>
public class HandTrackingManager : MonoBehaviour
{
    [Header("OVR Hands")]
    public OVRHand leftHand;
    public OVRHand rightHand;
    public OVRSkeleton leftSkeleton;
    public OVRSkeleton rightSkeleton;

    [Header("Interaction")]
    public float pinchThreshold = 0.7f;
    public float grabRadius = 0.1f;
    public LayerMask interactableLayer;

    [Header("State")]
    public bool isLeftPinching;
    public bool isRightPinching;
    public bool isLeftGrabbing;
    public bool isRightGrabbing;
    public Vector3 leftPinchPosition;
    public Vector3 rightPinchPosition;

    // Grab state
    private bool _isGrabbing;
    private Transform _grabbedObject;
    private Vector3 _grabOffset;
    private Quaternion _grabRotOffset;

    // Scale state
    private bool _isBimanualScaling;
    private float _initialBimanualDist;
    private Vector3 _initialScale;

    // Menu state
    private float _palmFacingTimer;

    void Update()
    {
        if (leftHand == null || rightHand == null) return;

        UpdatePinchState();
        UpdateGrabState();
        UpdateBimanualScale();
        UpdatePalmMenu();
    }

    void UpdatePinchState()
    {
        if (leftHand.IsTracked)
        {
            float leftPinch = leftHand.GetFingerPinchStrength(OVRHand.HandFinger.Index);
            isLeftPinching = leftPinch > pinchThreshold;

            if (isLeftPinching && leftSkeleton != null && leftSkeleton.Bones != null)
            {
                var indexTip = leftSkeleton.Bones[(int)OVRSkeleton.BoneId.Hand_IndexTip];
                var thumbTip = leftSkeleton.Bones[(int)OVRSkeleton.BoneId.Hand_ThumbTip];
                if (indexTip != null && thumbTip != null)
                    leftPinchPosition = (indexTip.Transform.position + thumbTip.Transform.position) / 2f;
            }
        }

        if (rightHand.IsTracked)
        {
            float rightPinch = rightHand.GetFingerPinchStrength(OVRHand.HandFinger.Index);
            isRightPinching = rightPinch > pinchThreshold;

            if (isRightPinching && rightSkeleton != null && rightSkeleton.Bones != null)
            {
                var indexTip = rightSkeleton.Bones[(int)OVRSkeleton.BoneId.Hand_IndexTip];
                var thumbTip = rightSkeleton.Bones[(int)OVRSkeleton.BoneId.Hand_ThumbTip];
                if (indexTip != null && thumbTip != null)
                    rightPinchPosition = (indexTip.Transform.position + thumbTip.Transform.position) / 2f;
            }
        }
    }

    void UpdateGrabState()
    {
        // Single hand pinch = grab nearest object
        if (isRightPinching && !_isGrabbing && !_isBimanualScaling)
        {
            // Raycast or sphere check for nearby objects
            Collider[] hits = Physics.OverlapSphere(rightPinchPosition, grabRadius, interactableLayer);
            if (hits.Length > 0)
            {
                _grabbedObject = hits[0].transform;
                _grabOffset = _grabbedObject.position - rightPinchPosition;
                _grabRotOffset = _grabbedObject.rotation;
                _isGrabbing = true;

                // Select the object
                var cadObj = _grabbedObject.GetComponent<CADObjectComponent>();
                if (cadObj != null) AppManager.Instance.SelectObject(_grabbedObject.gameObject);
            }
        }

        if (_isGrabbing && isRightPinching && _grabbedObject != null)
        {
            // Move object with hand
            _grabbedObject.position = Vector3.Lerp(
                _grabbedObject.position,
                rightPinchPosition + _grabOffset,
                0.4f
            );
        }

        if (_isGrabbing && !isRightPinching)
        {
            _isGrabbing = false;
            _grabbedObject = null;
        }
    }

    void UpdateBimanualScale()
    {
        if (isLeftPinching && isRightPinching)
        {
            float currentDist = Vector3.Distance(leftPinchPosition, rightPinchPosition);

            if (!_isBimanualScaling)
            {
                _isBimanualScaling = true;
                _initialBimanualDist = currentDist;
                if (AppManager.Instance.modelRoot != null)
                    _initialScale = AppManager.Instance.modelRoot.localScale;
            }
            else
            {
                float scaleFactor = currentDist / _initialBimanualDist;
                scaleFactor = Mathf.Clamp(scaleFactor, 0.1f, 5f);
                AppManager.Instance.modelRoot.localScale = _initialScale * scaleFactor;
            }
        }
        else
        {
            _isBimanualScaling = false;
        }
    }

    void UpdatePalmMenu()
    {
        if (!leftHand.IsTracked) { _palmFacingTimer = 0; return; }

        // Check if left palm faces head
        var wristBone = leftSkeleton.Bones[(int)OVRSkeleton.BoneId.Hand_WristRoot];
        if (wristBone == null) return;

        Vector3 palmNormal = -wristBone.Transform.up; // -Y is palm normal per spec
        Vector3 toHead = (Camera.main.transform.position - wristBone.Transform.position).normalized;
        float dot = Vector3.Dot(palmNormal, toHead);

        if (dot > 0.6f && wristBone.Transform.position.y > 0.3f)
        {
            _palmFacingTimer += Time.deltaTime;
            if (_palmFacingTimer > 0.3f)
            {
                AppManager.Instance.menu?.Toggle();
                _palmFacingTimer = -1f; // Prevent re-triggering
            }
        }
        else
        {
            _palmFacingTimer = Mathf.Max(0, _palmFacingTimer);
        }
    }

    /// <summary>
    /// Get pinch position for tap-to-place on workbench
    /// </summary>
    public Vector3? GetActivePinchPosition()
    {
        if (isRightPinching) return rightPinchPosition;
        if (isLeftPinching) return leftPinchPosition;
        return null;
    }
}
