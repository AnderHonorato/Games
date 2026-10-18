/** Silhuetas equipadas: recursos exclusivos do modelo dono. */
import * as THREE from 'three';
import { armaInicial, type IdArmaInicial } from '../dados/armas-iniciais';
export function criarArmaInicial(id: IdArmaInicial): THREE.Group {
  const grupo = new THREE.Group();
  grupo.name = `arma-${id}`;
  const metal = new THREE.MeshStandardMaterial({
    color: armaInicial(id).cor,
    roughness: 0.3,
    metalness: 0.65,
  });
  const cabo = new THREE.MeshStandardMaterial({ color: '#4a3040', roughness: 0.85 });
  const brilho = new THREE.MeshStandardMaterial({
    color: '#c4f4ff',
    emissive: '#559dcc',
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  function parte(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z = 0) {
    const malha = new THREE.Mesh(geo, mat);
    malha.position.set(x, y, z);
    malha.castShadow = true;
    grupo.add(malha);
    return malha;
  }
  if (id === 'lamina') {
    parte(new THREE.CylinderGeometry(0.065, 0.07, 0.34, 8), cabo, 0, 0);
    parte(new THREE.BoxGeometry(0.48, 0.09, 0.14), metal, 0, 0.19);
    parte(new THREE.BoxGeometry(0.17, 0.95, 0.065), metal, 0, 0.7);
    parte(new THREE.ConeGeometry(0.12, 0.28, 4), metal, 0, 1.31).rotation.y = Math.PI / 4;
    parte(new THREE.OctahedronGeometry(0.11), brilho, 0, -0.23);
  } else if (id === 'cajado') {
    parte(new THREE.CylinderGeometry(0.055, 0.075, 1.9, 9), cabo, 0, 0.4);
    const aro = parte(new THREE.TorusGeometry(0.25, 0.06, 8, 24), metal, 0, 1.43);
    aro.rotation.y = Math.PI / 7;
    parte(new THREE.OctahedronGeometry(0.2), brilho, 0, 1.43);
    parte(new THREE.CylinderGeometry(0.095, 0.08, 0.2, 8), metal, 0, -0.57);
  } else if (id === 'martelo') {
    parte(new THREE.CylinderGeometry(0.065, 0.085, 1.25, 8), cabo, 0, 0.35);
    parte(new THREE.BoxGeometry(0.95, 0.5, 0.48), metal, 0, 1.06);
    parte(new THREE.BoxGeometry(0.12, 0.56, 0.53), brilho, 0, 1.06);
    parte(new THREE.OctahedronGeometry(0.12), metal, 0, -0.36);
  }
  if (id === 'arco') {
    const arco = parte(new THREE.TorusGeometry(0.62, 0.055, 7, 20, Math.PI), metal, 0, 0.42);
    arco.rotation.z = -Math.PI / 2;
    parte(new THREE.CylinderGeometry(0.012, 0.012, 1.24, 4), brilho, 0, 0.42);
    parte(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), cabo, 0.61, 0.42);
    parte(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5), cabo, 0.24, 0.42).rotation.z =
      Math.PI / 2;
    parte(new THREE.ConeGeometry(0.07, 0.2, 4), metal, -0.3, 0.42).rotation.z = Math.PI / 2;
  } else if (id === 'foice') {
    parte(new THREE.CylinderGeometry(0.045, 0.06, 1.85, 8), cabo, 0, 0.35);
    const lua = parte(
      new THREE.TorusGeometry(0.48, 0.1, 4, 16, Math.PI * 0.87),
      metal,
      -0.35,
      1.22
    );
    lua.rotation.z = -0.6;
    parte(new THREE.ConeGeometry(0.1, 0.35, 3), metal, -0.79, 1.1).rotation.z = -2.5;
    parte(new THREE.OctahedronGeometry(0.12), brilho, 0, 1.2);
  } else if (id === 'lanca') {
    parte(new THREE.CylinderGeometry(0.04, 0.055, 2.1, 7), cabo, 0, 0.4);
    parte(new THREE.ConeGeometry(0.16, 0.6, 4), metal, 0, 1.72).rotation.y = Math.PI / 4;
    parte(new THREE.BoxGeometry(0.33, 0.065, 0.12), metal, 0, 1.4);
    parte(new THREE.OctahedronGeometry(0.08), brilho, 0, 1.4, 0.09);
    parte(new THREE.ConeGeometry(0.075, 0.25, 6), metal, 0, -0.75).rotation.z = Math.PI;
  } else if (id === 'grimorio') {
    for (const lado of [-1, 1]) {
      parte(new THREE.BoxGeometry(0.39, 0.64, 0.055), metal, lado * 0.205, 0.6, -0.05);
      const paginas = parte(
        new THREE.BoxGeometry(0.34, 0.56, 0.11),
        cabo,
        lado * 0.205,
        0.6,
        0.025
      );
      paginas.rotation.y = -lado * 0.12;
    }
    parte(new THREE.CylinderGeometry(0.045, 0.045, 0.68, 7), brilho, 0, 0.6);
    const selo = parte(new THREE.OctahedronGeometry(0.14), brilho, 0, 0.66, 0.2);
    selo.scale.z = 0.35;
    parte(new THREE.BoxGeometry(0.065, 0.3, 0.025), metal, 0.21, 0.2, 0.08);
  }
  grupo.rotation.z = -0.18;
  grupo.scale.setScalar(0.82);
  return grupo;
}
export function descartarArmaInicial(grupo: THREE.Group): void {
  const geometrias = new Set<THREE.BufferGeometry>(),
    materiais = new Set<THREE.Material>();
  grupo.removeFromParent();
  grupo.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometrias.add(o.geometry);
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(mat);
    }
  });
  for (const g of geometrias) g.dispose();
  for (const m of materiais) m.dispose();
  grupo.clear();
}
