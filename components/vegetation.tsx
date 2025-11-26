"use client"

import { useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import type { PlantInstance } from "./stream-trailer"

interface VegetationProps {
  plants: PlantInstance[]
}

const MAX_INSTANCES = 10000 // Increased for grass density

export function Vegetation({ plants }: VegetationProps) {
  const trees = useMemo(() => plants.filter((p) => p.type === "tree"), [plants])
  const shrubs = useMemo(() => plants.filter((p) => p.type === "shrub"), [plants])
  const grass = useMemo(() => plants.filter((p) => p.type === "grass"), [plants])
  const bridges = useMemo(() => plants.filter((p) => p.type === "bridge"), [plants])

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const foliageRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const bridgeRef = useRef<THREE.InstancedMesh>(null)

  // Material ref for updating uniforms
  const grassMaterialRef = useRef<THREE.MeshStandardMaterial>(null)

  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Create grass blade geometry
  const grassGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.1, 0.5, 1, 4)
    geometry.translate(0, 0.25, 0) // Move pivot to bottom
    return geometry
  }, [])

  useFrame((state) => {
    if (grassMaterialRef.current?.userData.shader) {
      grassMaterialRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const onBeforeCompile = useMemo(() => (shader: any) => {
    shader.uniforms.uTime = { value: 0 }
    if (grassMaterialRef.current) {
      grassMaterialRef.current.userData.shader = shader
    }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTime;
      `
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // Tapering
      float taper = 1.0 - (transformed.y / 0.5) * 0.7;
      transformed.x *= taper;

      // Wind animation
      float windStrength = 0.15;
      // Use world position for noise/wave if possible, or instance position
      // instanceMatrix[3] contains translation
      vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      
      float wave = sin(uTime * 2.0 + instancePos.x * 0.5 + instancePos.z * 0.5);
      
      // Apply wind displacement based on height (squared for stiffness at bottom)
      float displacement = pow(transformed.y, 2.0) * wave * windStrength;
      
      transformed.x += displacement;
      transformed.z += displacement * 0.5;
      `
    )

    // Gradient color in fragment shader?
    // For now, let's stick to standard lighting.
  }, [])

  useEffect(() => {
    const trunk = trunkRef.current
    const foliage = foliageRef.current

    if (!trunk?.instanceMatrix || !foliage?.instanceMatrix) return

    // Update tree instances
    trees.forEach((tree, i) => {
      if (i >= MAX_INSTANCES) return

      // Trunk
      dummy.position.set(tree.position[0], tree.position[1] + 0.4, tree.position[2])
      dummy.scale.set(tree.scale * 0.5, tree.scale, tree.scale * 0.5)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)

      // Foliage
      dummy.position.set(tree.position[0], tree.position[1] + 1.2 * tree.scale, tree.position[2])
      dummy.scale.setScalar(tree.scale)
      dummy.updateMatrix()
      foliage.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused instances by scaling to 0
    for (let i = trees.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)
      foliage.setMatrixAt(i, dummy.matrix)
    }

    trunk.instanceMatrix.needsUpdate = true
    foliage.instanceMatrix.needsUpdate = true
  }, [trees, dummy])

  useEffect(() => {
    const shrub = shrubRef.current

    if (!shrub?.instanceMatrix) return

    shrubs.forEach((s, i) => {
      if (i >= MAX_INSTANCES) return

      dummy.position.set(s.position[0], s.position[1] + 0.2, s.position[2])
      dummy.scale.setScalar(s.scale * 0.6)
      dummy.updateMatrix()
      shrub.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused
    for (let i = shrubs.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      shrub.setMatrixAt(i, dummy.matrix)
    }

    shrub.instanceMatrix.needsUpdate = true
  }, [shrubs, dummy])

  useEffect(() => {
    const grassMesh = grassRef.current

    if (!grassMesh?.instanceMatrix) return

    let instanceIndex = 0

    grass.forEach((g) => {
      // Create a clump of grass for each "grass" plant
      const bladesPerClump = 5

      for (let b = 0; b < bladesPerClump; b++) {
        if (instanceIndex >= MAX_INSTANCES) break

        const offsetX = (Math.random() - 0.5) * 0.3
        const offsetZ = (Math.random() - 0.5) * 0.3
        const rotation = Math.random() * Math.PI
        const scale = g.scale * (0.2 + Math.random() * 0.15) // Much smaller grass

        // Position directly on the ground (pivot is at bottom)
        dummy.position.set(g.position[0] + offsetX, g.position[1], g.position[2] + offsetZ)
        dummy.rotation.set(0, rotation, 0)
        dummy.scale.set(scale, scale, scale)
        dummy.updateMatrix()
        grassMesh.setMatrixAt(instanceIndex, dummy.matrix)

        instanceIndex++
      }
    })

    // Hide unused
    for (let i = instanceIndex; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(i, dummy.matrix)
    }

    grassMesh.instanceMatrix.needsUpdate = true
  }, [grass, dummy])

  useEffect(() => {
    const bridgeMesh = bridgeRef.current

    if (!bridgeMesh?.instanceMatrix) return

    bridges.forEach((b, i) => {
      if (i >= MAX_INSTANCES) return

      dummy.position.set(b.position[0], b.position[1] + 0.1, b.position[2])
      dummy.scale.set(b.scale * 2, b.scale * 0.1, b.scale * 0.5)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    })

    // Hide unused
    for (let i = bridges.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    }

    bridgeMesh.instanceMatrix.needsUpdate = true
  }, [bridges, dummy])

  return (
    <group>
      {/* Tree Trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <cylinderGeometry args={[0.08, 0.15, 0.8, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </instancedMesh>

      {/* Tree Foliage */}
      <instancedMesh ref={foliageRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <coneGeometry args={[0.5, 1, 6]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </instancedMesh>

      {/* Shrubs */}
      <instancedMesh ref={shrubRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 6, 6]} />
        <meshStandardMaterial color="#4a7c42" roughness={0.9} />
      </instancedMesh>

      {/* Grass */}
      <instancedMesh ref={grassRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <primitive object={grassGeometry} />
        <meshStandardMaterial
          ref={grassMaterialRef}
          color="#6b8e23"
          roughness={0.9}
          side={THREE.DoubleSide}
          onBeforeCompile={onBeforeCompile}
        />
      </instancedMesh>

      {/* Bridges */}
      <instancedMesh ref={bridgeRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </instancedMesh>
    </group>
  )
}
