'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

interface JobCard3DProps {
  position: [number, number, number]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  index: number
  jobId: string
}

const JobCard3D: React.FC<JobCard3DProps> = ({ position, status, index, jobId }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current && groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.3
      
      // Smooth rotation on hover
      if (hovered) {
        meshRef.current.rotation.x += 0.01
        meshRef.current.rotation.y += 0.01
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1)
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
        meshRef.current.rotation.x *= 0.95
        meshRef.current.rotation.y *= 0.95
      }
    }
  })

  const statusColors = {
    pending: '#fbbf24',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
  }

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[1.2, 1.2, 0.2]} />
        <meshPhongMaterial
          color={statusColors[status]}
          emissive={statusColors[status]}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          wireframe={false}
          shininess={100}
        />
        
        {/* Glow effect */}
        <pointLight
          position={[0, 0, 0.8]}
          intensity={hovered ? 3 : 1.5}
          distance={6}
          color={statusColors[status]}
        />
      </mesh>

      {/* Animated rings around card */}
      {hovered && (
        <>
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[1.8, 0.05, 16, 32]} />
            <meshBasicMaterial color={statusColors[status]} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
            <torusGeometry args={[1.5, 0.04, 16, 32]} />
            <meshBasicMaterial color={statusColors[status]} transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  )
}

const Scene: React.FC<{ jobs: Array<{ id: string; status: 'pending' | 'processing' | 'completed' | 'failed' }> }> = ({ jobs }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} />
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        autoRotate={true}
        autoRotateSpeed={1.5}
        maxPolarAngle={Math.PI * 0.7}
        minPolarAngle={Math.PI * 0.3}
      />
      
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, 10]} intensity={0.8} color="#8b5cf6" />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#3b82f6" />
      
      {/* Background gradient with fog */}
      <fog attach="fog" args={['#000000', 5, 50]} />

      {/* Animated background ring */}
      <mesh position={[0, 0, -2]} rotation={[0, 0, 0]}>
        <torusGeometry args={[6, 0.1, 32, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.1} />
      </mesh>

      {/* Job Cards */}
      {jobs.map((job, index) => {
        const angle = (index / Math.max(jobs.length, 1)) * Math.PI * 2
        const radius = 4
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const y = (index - jobs.length / 2) * 0.6

        return (
          <JobCard3D
            key={job.id}
            position={[x, y, z]}
            status={job.status}
            index={index}
            jobId={job.id}
          />
        )
      })}
    </>
  )
}

interface JobQueue3DProps {
  jobs: Array<{ id: string; status: 'pending' | 'processing' | 'completed' | 'failed' }>
}

const JobQueue3D: React.FC<JobQueue3DProps> = ({ jobs }) => {
  return (
    <div className="w-full h-96 rounded-xl overflow-hidden glass mb-8">
      <Canvas>
        <Scene jobs={jobs} />
      </Canvas>
    </div>
  )
}

export default JobQueue3D
