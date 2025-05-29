import { Canvas } from '@react-three/fiber';
import PBDCloth from './components/PBDCloth';
// import ClothMesh from './components/ClothMesh'; 

function App() {
  return (
    <Canvas 
      orthographic 
      camera={{ position: [100, 100, -500], zoom: 220 }}
      gl={{ preserveDrawingBuffer: true }}
      style={{ width: '100vw', height: '100vh', background: '#cce7ff' }}
    >
      <PBDCloth />
    </Canvas>
  );
}

export default App;
