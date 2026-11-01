'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useOS } from '@/lib/jarvis/osStore';
import { orbSignal } from '@/lib/jarvis/voice';

/* JARVIS AI's "face": a noise-displaced energy sphere inside a wire shell and
 * two orbit rings. Reacts to orbSignal — mic loudness while listening, a
 * pulse while thinking, word boundaries while speaking. */

const NOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+2.0*C.xxx;vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertex = /* glsl */ `
uniform float uTime; uniform float uLevel;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
${NOISE}
void main(){
  float n = snoise(normal * 1.7 + uTime * 0.45);
  vNoise = n;
  vec3 pos = position + normal * n * (0.06 + uLevel * 0.28);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uColor; uniform float uLevel; uniform float uTime;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
  float bands = 0.5 + 0.5 * sin(vNoise * 9.0 + uTime * 2.0);
  vec3 col = uColor * (0.25 + fres * 1.6 + bands * 0.25 * (0.4 + uLevel));
  col += vec3(1.0) * pow(fres, 5.0) * 0.6;
  gl_FragColor = vec4(col, 0.35 + fres * 0.65);
}`;

const COLORS: Record<string, THREE.Color> = {
  idle: new THREE.Color('#2effb0'),
  listening: new THREE.Color('#4de3ff'),
  thinking: new THREE.Color('#8affd8'),
  speaking: new THREE.Color('#b9ffe6'),
};

function Core() {
  const mesh = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  const smooth = useRef(0);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLevel: { value: 0 }, uColor: { value: COLORS.idle!.clone() } }),
    [],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const s = orbSignal.state;
    const target =
      s === 'thinking' ? 0.3 + Math.sin(t * 7) * 0.18 : s === 'listening' || s === 'speaking' ? orbSignal.level : 0.06 + Math.sin(t * 1.4) * 0.04;
    smooth.current += (target - smooth.current) * Math.min(1, dt * 9);
    if (s === 'speaking') orbSignal.level *= 0.9; // word-boundary pulses decay
    uniforms.uTime.value = t;
    uniforms.uLevel.value = smooth.current;
    uniforms.uColor.value.lerp(COLORS[s] ?? COLORS.idle!, Math.min(1, dt * 4));
    const scale = 1 + smooth.current * 0.12;
    mesh.current?.scale.setScalar(scale);
    if (shell.current) {
      shell.current.rotation.y = t * 0.25;
      shell.current.rotation.x = t * 0.12;
    }
    if (rings.current) {
      rings.current.rotation.z = t * (s === 'thinking' ? 1.6 : 0.4);
      rings.current.children[1]?.rotation.set(Math.PI / 2.4, 0, -t * 0.7);
    }
  });

  return (
    <>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 48]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={shell} scale={1.32}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#2effb0" wireframe transparent opacity={0.16} />
      </mesh>
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[1.62, 0.008, 8, 160]} />
          <meshBasicMaterial color="#5cffc4" transparent opacity={0.7} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.8, 0.005, 8, 160]} />
          <meshBasicMaterial color="#2effb0" transparent opacity={0.35} />
        </mesh>
      </group>
    </>
  );
}

export default function JarvisOrb() {
  // No WebGL frames while the window sits in the dock.
  const docked = useOS((s) => s.windows.some((w) => w.id === 'jarvis' && w.minimized));
  return (
    <Canvas
      className="app-ai-orb-canvas"
      frameloop={docked ? 'never' : 'always'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    >
      <Core />
    </Canvas>
  );
}
