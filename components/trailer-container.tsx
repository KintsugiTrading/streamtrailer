"use client"

import { RigidBody } from "@react-three/rapier"

export function TrailerContainer() {
  return (
    <group position={[0, 0, 0]}>
      {/* Base of trailer */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[10, 0.2, 16]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Side walls */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* Left wall */}
        <mesh position={[-5, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.2, 16]} />
          <meshStandardMaterial color="#34495e" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Right wall */}
        <mesh position={[5, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.2, 16]} />
          <meshStandardMaterial color="#34495e" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Back wall (high side) */}
        <mesh position={[0, 0.5, -8]} castShadow>
          <boxGeometry args={[10, 1.2, 0.2]} />
          <meshStandardMaterial color="#34495e" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Front wall (low side for water exit) */}
        <mesh position={[0, 0.2, 8]} castShadow>
          <boxGeometry args={[10, 0.6, 0.2]} />
          <meshStandardMaterial color="#34495e" metalness={0.5} roughness={0.5} />
        </mesh>
      </RigidBody>

      {/* Corner supports / Jacks */}
      {[
        [-4.8, -1.2, -7.8],
        [4.8, -1.2, -7.8],
        [-4.8, -1.2, 7.8],
        [4.8, -1.2, 7.8],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.15, 1.4, 8]} />
            <meshStandardMaterial color="#1a252f" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 8]} />
            <meshStandardMaterial color="#1a252f" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      <group position={[0, -0.8, 0]}>
        {/* Axle */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 11, 8]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Wheels */}
        {[-5.6, 5.6].map((x, i) => (
          <group key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            {/* Tire */}
            <mesh castShadow>
              <cylinderGeometry args={[0.6, 0.6, 0.4, 24]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
            {/* Rim */}
            <mesh position={[0, 0.21, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.21, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[0, -0.5, 8]} rotation={[0, 0, 0]}>
        {/* A-Frame */}
        <mesh position={[-1.5, 0, 2]} rotation={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.15, 0.15, 4.5]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[1.5, 0, 2]} rotation={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.15, 0.15, 4.5]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Connector */}
        <mesh position={[0, 0, 4.2]} castShadow>
          <boxGeometry args={[0.2, 0.15, 1]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Hitch Ball Cup */}
        <mesh position={[0, 0.05, 4.7]} castShadow>
          <sphereGeometry args={[0.12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Tongue Jack */}
        <group position={[0.5, 0, 3.5]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
            <meshStandardMaterial color="#1a252f" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      </group>

      {/* Water inlet pipe (top back) */}
      <mesh position={[0, 1, -8.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 12]} />
        <meshStandardMaterial color="#546e7a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Outlet drain (front bottom) */}
      <mesh position={[0, -0.3, 8.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 12]} />
        <meshStandardMaterial color="#37474f" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}
