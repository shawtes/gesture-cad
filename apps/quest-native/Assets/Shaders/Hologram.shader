// Hologram shader for Unity — port of apps/xr/lib/hologram-material.ts
Shader "GestureCAD/Hologram"
{
    Properties
    {
        _Color ("Color", Color) = (0, 0.67, 0.8, 0.55)
        _ScanLineSpeed ("Scan Line Speed", Float) = 2.0
        _ScanLineDensity ("Scan Line Density", Float) = 40.0
        _FlickerSpeed ("Flicker Speed", Float) = 8.0
        _EdgeGlow ("Edge Glow", Float) = 2.0
        _NoiseAmount ("Noise Amount", Float) = 0.5
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 normal : TEXCOORD0;
                float3 worldPos : TEXCOORD1;
                float2 uv : TEXCOORD2;
            };

            float4 _Color;
            float _ScanLineSpeed;
            float _ScanLineDensity;
            float _FlickerSpeed;
            float _EdgeGlow;
            float _NoiseAmount;

            // Simple hash noise
            float hash(float n)
            {
                return frac(sin(n) * 43758.5453123);
            }

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.normal = normalize(mul((float3x3)unity_ObjectToWorld, v.normal));
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                o.uv = v.uv;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float3 color = _Color.rgb;

                // Fresnel edge glow
                float3 viewDir = normalize(_WorldSpaceCameraPos - i.worldPos);
                float fresnel = 1.0 - abs(dot(viewDir, i.normal));
                fresnel = pow(fresnel, 2.0) * _EdgeGlow;
                color += fresnel * float3(0.3, 0.6, 1.0);

                // Scan lines
                float scanLine = sin(i.worldPos.y * _ScanLineDensity + _Time.y * _ScanLineSpeed);
                scanLine = smoothstep(0.3, 0.7, scanLine * 0.5 + 0.5);
                float scanAlpha = lerp(0.6, 1.0, scanLine);

                // Fine scan lines
                float fineScan = sin(i.worldPos.y * _ScanLineDensity * 8.0 + _Time.y * _ScanLineSpeed * 0.5);
                fineScan = smoothstep(0.4, 0.6, fineScan * 0.5 + 0.5);
                scanAlpha *= lerp(0.85, 1.0, fineScan);

                // Flicker
                float flicker = 1.0 - _NoiseAmount * 0.3 * (
                    sin(_Time.y * _FlickerSpeed) *
                    sin(_Time.y * _FlickerSpeed * 1.7 + 1.0) *
                    0.5 + 0.5
                );

                // Noise
                float n = hash(i.worldPos.x * 20 + i.worldPos.y * 30 + _Time.y * 2);
                float noiseOverlay = 1.0 - _NoiseAmount * 0.15 * n;

                float alpha = _Color.a * scanAlpha * flicker * noiseOverlay;
                color += fresnel * 0.5 * _Color.rgb;

                return fixed4(color, alpha);
            }
            ENDCG
        }
    }
}
