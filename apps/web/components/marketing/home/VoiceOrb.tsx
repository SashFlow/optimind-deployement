// import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
// import { Canvas, useFrame } from "@react-three/fiber";
// import { Suspense, useRef } from "react";
// import type { Mesh } from "three";

// function Orb() {
// 	const ref = useRef<Mesh>(null);
// 	useFrame((state) => {
// 		if (!ref.current) return;
// 		const t = state.clock.elapsedTime;
// 		ref.current.rotation.y = t * 0.15;
// 		ref.current.rotation.x = Math.sin(t * 0.2) * 0.1;
// 	});
// 	return (
// 		<Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
// 			<Sphere ref={ref} args={[1.6, 128, 128]}>
// 				<MeshDistortMaterial
// 					color="#5eead4"
// 					emissive="#0d9488"
// 					emissiveIntensity={0.4}
// 					distort={0.55}
// 					speed={1.6}
// 					roughness={0.15}
// 					metalness={0.85}
// 				/>
// 			</Sphere>
// 			<Sphere args={[1.85, 64, 64]}>
// 				<meshBasicMaterial
// 					color="#fb7185"
// 					wireframe
// 					transparent
// 					opacity={0.12}
// 				/>
// 			</Sphere>
// 		</Float>
// 	);
// }

export function VoiceOrb() {
	return (
		// <Canvas
		// 	camera={{ position: [0, 0, 4.2], fov: 45 }}
		// 	dpr={[1, 2]}
		// 	gl={{ antialias: true, alpha: true }}
		// >
		// 	<Suspense fallback={null}>
		// 		<ambientLight intensity={0.3} />
		// 		<pointLight
		// 			position={[5, 5, 5]}
		// 			intensity={1.5}
		// 			color="#5eead4"
		// 		/>
		// 		<pointLight
		// 			position={[-5, -3, 2]}
		// 			intensity={1}
		// 			color="#fb7185"
		// 		/>
		// 		<Orb />
		// 	</Suspense>
		// </Canvas>
		<div>HELLO</div>
	);
}
