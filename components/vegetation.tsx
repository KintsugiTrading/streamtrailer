"use client"

import { useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { PlantInstance } from "./stream-trailer"

interface VegetationProps {
  plants: PlantInstance[]
}

const MAX_INSTANCES = 10000

export function Vegetation({ plants }: VegetationProps) {
  const trees = useMemo(() => plants.filter((p) => p.type === "tree"), [plants])
  const shrubs = useMemo(() => plants.filter((p) => p.type === "shrub"), [plants])
  const grass = useMemo(() => plants.filter((p) => p.type === "grass"), [plants])
  const bridges = useMemo(() => plants.filter((p) => p.type === "bridge"), [plants])

  const treeRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const bridgeRef = useRef<THREE.InstancedMesh>(null)

  // Material ref for updating uniforms
  const grassMaterialRef = useRef<THREE.MeshStandardMaterial>(null)

  const dummy = useMemo(() => new THREE.Object3D(), [])

  // --- Geometries ---

  // Realistic Grass Geometry
  const grassGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.1, 0.5, 1, 4)
    geometry.translate(0, 0.25, 0)
    return geometry
  }, [])

  // Realistic Tree Geometry (Pine Tree)
  const treeGeometry = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = []

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 6)
    trunkGeo.translate(0, 0.5, 0)
    // Color attribute for trunk (brown)
    const trunkColor = new Float32Array(trunkGeo.attributes.position.count * 3)
    for (let i = 0; i < trunkColor.length; i += 3) {
      trunkColor[i] = 0.36; trunkColor[i + 1] = 0.25; trunkColor[i + 2] = 0.2; // #5D4037
    }
    trunkGeo.setAttribute('color', new THREE.BufferAttribute(trunkColor, 3))
    geometries.push(trunkGeo)

    // Foliage (3 stacked cones)
    const levels = 3
    for (let i = 0; i < levels; i++) {
      const size = 1.0 - (i * 0.2)
      const y = 0.8 + (i * 0.6)
      const coneGeo = new THREE.ConeGeometry(0.6 * size, 1.0, 7)
      coneGeo.translate(0, y + 0.5, 0)

      // Color attribute for foliage (green)
      const foliageColor = new Float32Array(coneGeo.attributes.position.count * 3)
      for (let j = 0; j < foliageColor.length; j += 3) {
        foliageColor[j] = 0.18; foliageColor[j + 1] = 0.35; foliageColor[j + 2] = 0.15; // #2d5a27
      }
      coneGeo.setAttribute('color', new THREE.BufferAttribute(foliageColor, 3))
      geometries.push(coneGeo)
    }

    // Check if mergeGeometries exists (it should)
    if (BufferGeometryUtils.mergeGeometries) {
      return BufferGeometryUtils.mergeGeometries(geometries)
    }
    return geometries[0] // Fallback
  }, [])

  // Realistic Bridge Geometry (Plank Bridge)
  const bridgeGeometry = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = []

    // Main beams
    const beamGeo1 = new THREE.BoxGeometry(0.1, 0.1, 2)
    beamGeo1.translate(-0.4, 0, 0)
    geometries.push(beamGeo1)

    const beamGeo2 = new THREE.BoxGeometry(0.1, 0.1, 2)
    beamGeo2.translate(0.4, 0, 0)
    geometries.push(beamGeo2)

    // Planks
    const plankCount = 8
    for (let i = 0; i < plankCount; i++) {
      const z = -0.9 + (i * (1.8 / (plankCount - 1)))
      const plankGeo = new THREE.BoxGeometry(1.0, 0.05, 0.15)
      plankGeo.translate(0, 0.08, z)

      // Randomize plank slightly
      plankGeo.rotateY((Math.random() - 0.5) * 0.05)
      plankGeo.rotateZ((Math.random() - 0.5) * 0.02)

      geometries.push(plankGeo)
    }

    if (BufferGeometryUtils.mergeGeometries) {
      return BufferGeometryUtils.mergeGeometries(geometries)
    }
    return geometries[0] // Fallback
  }, [])


  // --- Animation ---

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
      vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float wave = sin(uTime * 2.0 + instancePos.x * 0.5 + instancePos.z * 0.5);
      float displacement = pow(transformed.y, 2.0) * wave * windStrength;
      
      transformed.x += displacement;
      transformed.z += displacement * 0.5;
      `
    )
  }, [])


  // --- Instance Updates ---

  useEffect(() => {
    const treeMesh = treeRef.current
    if (!treeMesh?.instanceMatrix) return

    trees.forEach((tree, i) => {
      if (i >= MAX_INSTANCES) return
      dummy.position.set(tree.position[0], tree.position[1], tree.position[2])
      dummy.scale.setScalar(tree.scale)
      dummy.updateMatrix()
      treeMesh.setMatrixAt(i, dummy.matrix)
    })

    for (let i = trees.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      treeMesh.setMatrixAt(i, dummy.matrix)
    }
    treeMesh.instanceMatrix.needsUpdate = true
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
      const bladesPerClump = 5
      for (let b = 0; b < bladesPerClump; b++) {
        if (instanceIndex >= MAX_INSTANCES) break
        const offsetX = (Math.random() - 0.5) * 0.3
        const offsetZ = (Math.random() - 0.5) * 0.3
        const rotation = Math.random() * Math.PI
        const scale = g.scale * (0.2 + Math.random() * 0.15)

        dummy.position.set(g.position[0] + offsetX, g.position[1], g.position[2] + offsetZ)
        dummy.rotation.set(0, rotation, 0)
        dummy.scale.set(scale, scale, scale)
        dummy.updateMatrix()
        grassMesh.setMatrixAt(instanceIndex, dummy.matrix)
        instanceIndex++
      }
    })

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
      dummy.rotation.set(0, Math.random() * 0.1, 0) // Slight random rotation
      dummy.scale.set(b.scale, b.scale, b.scale)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    })

    for (let i = bridges.length; i < MAX_INSTANCES; i++) {
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      bridgeMesh.setMatrixAt(i, dummy.matrix)
    }
    bridgeMesh.instanceMatrix.needsUpdate = true
  }, [bridges, dummy])

  return (
    <group>
      {/* Trees */}
      <instancedMesh ref={treeRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <primitive object={treeGeometry} />
        <meshStandardMaterial vertexColors roughness={0.8} />
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
        <primitive object={bridgeGeometry} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}
