import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SHORE_Z, WATER_LEVEL } from "../config/chapter";

export const waterUniforms = {
  uTime: { value: 0 },
  uDeep: { value: new THREE.Color("#1d4f5e") },
  uShallow: { value: new THREE.Color("#4e9a94") },
  uSky: { value: new THREE.Color("#cfd8de") },
  uSunDir: { value: new THREE.Vector3(-0.7, 0.22, -0.68).normalize() },
  uSunColor: { value: new THREE.Color("#ffdcb4") },
  uFog: { value: new THREE.Color("#d6d2cc") },
  uShore: { value: SHORE_Z },
};

const vert = /* glsl */ `
uniform float uTime; uniform float uShore;
varying vec3 vWorld; varying float vDist;
void main(){
  vec4 w = modelMatrix * vec4(position,1.0);
  // calm Bosphorus swell, damped toward the shore
  float damp = smoothstep(uShore + 1.0, uShore - 25.0, w.z) * 0.8 + 0.2;
  float h = sin(dot(w.xz, vec2(0.12, 0.05)) + uTime*0.8)*0.07
          + sin(dot(w.xz, vec2(-0.05, 0.16)) + uTime*1.1)*0.05
          + sin(dot(w.xz, vec2(0.31, 0.27)) + uTime*1.9)*0.02;
  w.y += h * damp;
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uFog;
uniform float uTime; uniform float uShore;
varying vec3 vWorld; varying float vDist;
float n2(vec2 p){ return sin(p.x)*sin(p.y); }
vec3 waveNormal(vec2 p){
  // layered analytic ripples for small-scale detail (derivatives of sums of sines)
  float t = uTime;
  vec2 g = vec2(0.0);
  vec2 d1 = vec2(0.12,0.05);  g += d1 * cos(dot(p,d1)+t*0.8)*0.07;
  vec2 d2 = vec2(-0.05,0.16); g += d2 * cos(dot(p,d2)+t*1.1)*0.05;
  vec2 d3 = vec2(0.31,0.27);  g += d3 * cos(dot(p,d3)+t*1.9)*0.02;
  vec2 d4 = vec2(1.3,-0.9);   g += d4 * cos(dot(p,d4)+t*2.7)*0.006;
  vec2 d5 = vec2(-1.1,1.7);   g += d5 * cos(dot(p,d5)+t*3.3)*0.005;
  vec2 d6 = vec2(2.9,2.1);    g += d6 * cos(dot(p,d6)+t*4.1)*0.0025;
  return normalize(vec3(-g.x, 1.0, -g.y));
}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = waveNormal(vWorld.xz);
  float distFade = smoothstep(30.0, 600.0, vDist);
  N = normalize(mix(N, vec3(0.0,1.0,0.0), distFade*0.6));
  float fres = 0.02 + 0.98*pow(1.0 - max(dot(N,V),0.0), 5.0);
  float depth = smoothstep(uShore, uShore - 30.0, vWorld.z);
  vec3 body = mix(uShallow, uDeep, depth);
  // sand visible through very shallow water
  body = mix(vec3(0.72,0.64,0.5), body, smoothstep(uShore + 0.6, uShore - 3.5, vWorld.z));
  vec3 col = mix(body, uSky, fres);
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N,H),0.0), 400.0) * 6.0 + pow(max(dot(N,H),0.0), 60.0)*0.15;
  col += uSunColor * spec;
  // gentle lapping foam at the waterline
  float lap = uShore - 0.4 + sin(uTime*0.9 + vWorld.x*0.15)*0.35 + sin(uTime*0.5 + vWorld.x*0.04)*0.25;
  float foam = smoothstep(0.9, 0.0, abs(vWorld.z - lap)) * (0.55 + 0.45*n2(vWorld.xz*vec2(3.1,5.3) + uTime));
  col = mix(col, vec3(0.95,0.95,0.93), clamp(foam,0.0,1.0)*0.55);
  float fog = smoothstep(80.0, 1500.0, vDist);
  col = mix(col, uFog, fog*0.85);
  float alpha = smoothstep(uShore + 0.9, uShore - 0.2, vWorld.z);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function Water({ segments }: { segments: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4000, 2000, segments * 2, segments);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -1000 + SHORE_Z + 2);
    return g;
  }, [segments]);
  useFrame((_, dt) => {
    waterUniforms.uTime.value += dt;
  });
  return (
    <mesh geometry={geo} position={[0, WATER_LEVEL, 0]} renderOrder={1}>
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={waterUniforms}
        transparent
        depthWrite
      />
    </mesh>
  );
}
