import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

const SCENE = new THREE.Scene();
const FOV = 75;
const NEAR = 0.1;
const FAR = 1000;
const MAXPARTICLES = 1000;
const RENDERER = new THREE.WebGLRenderer();
RENDERER.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(RENDERER.domElement);

//CAMERA
let camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  NEAR,
  FAR
);

camera.position.x = 80,
camera.position.y = 35;
camera.position.z = 45;
camera.lookAt(new THREE.Vector3(0, 0, 0));  

//Particles
let particlesGeometry = new THREE.Geometry();
for (let i = 0; i < MAXPARTICLES; i++) {
  let particle = new THREE.Vector3(
    random(-300, 300),
    random(-300, 300),
    random(-300, 300)
  );
  particlesGeometry.vertices.push(particle);
}
let particleMaterial = new THREE.ParticleBasicMaterial({
  color: 0xFFA500,
  size: 0.3,
 
});
let particleMesh = new THREE.ParticleSystem(particlesGeometry, particleMaterial);
particleMesh.sortParticles = true;
SCENE.add(particleMesh);

//SKYBOX    
let stageGeometry = new THREE.BoxBufferGeometry(500,100,500);
let stageGround = 
[
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/grass.png'), side: THREE.DoubleSide}),
  //new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  //new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide})

];
let stageMaterials = new THREE.MeshFaceMaterial(stageGround);
let stageCube = new THREE.Mesh(stageGeometry, stageMaterials);
SCENE.add(stageCube);
stageCube.position.x=0
stageCube.position.y=50
stageCube.position.z=0

////////////////////////////////////////////////////////////////////////////
//////////////////////             FOREST             //////////////////////
////////////////////////////////////////////////////////////////////////////

//TREE 1 (Round)
  //BARK
  let bark1Geometry = new THREE.CylinderGeometry(4,4,30,32);
  let bark1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
  let bark1Mesh = new THREE.Mesh(bark1Geometry, bark1Material);
  
  bark1Mesh.position.y = 0
  bark1Mesh.position.x = 10
  bark1Mesh.position.z = -50
  
  //LEAVES
  let leaves1Geometry = new THREE.SphereGeometry(16, 16, 16);
  let leaves1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
  let leaves1Mesh = new THREE.Mesh(leaves1Geometry, leaves1Material);
  
  leaves1Mesh.position.y = 30
  leaves1Mesh.position.x = 10
  leaves1Mesh.position.z = -50
  
  //TREE 1
  let tree1 = new THREE.Group();
  tree1.add(bark1Mesh);
  tree1.add(leaves1Mesh);  
  
////////////////////////////////////////////////////////////////////////////

//TREE 2 (Round) 
  //BARK
  let bark2Geometry = new THREE.CylinderGeometry(2, 2, 30, 32);
  let bark2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
  let bark2Mesh = new THREE.Mesh(bark2Geometry, bark2Material);
  
  bark2Mesh.position.y = 0
  bark2Mesh.position.x = 25
  bark2Mesh.position.z = 20
    //LEAVES
  let leaves2Geometry = new THREE.SphereGeometry(10, 10, 10);
  let leaves2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
  let leaves2Mesh = new THREE.Mesh(leaves2Geometry, leaves2Material);
  
  leaves2Mesh.position.y = 19
  leaves2Mesh.position.x = 25
  leaves2Mesh.position.z = 20

  //TREE 2
  let tree2 = new THREE.Group();
  tree2.add(bark2Mesh);
  tree2.add(leaves2Mesh);

////////////////////////////////////////////////////////////////////////////

//TREE 3 (Pointy)
  //BARK
  let bark3Geometry = new THREE.CylinderGeometry(3.5, 5, 30, 32);
  let bark3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
  let bark3Mesh = new THREE.Mesh(bark3Geometry, bark3Material);

  bark3Mesh.position.y = 0
  bark3Mesh.position.x = -35
  bark3Mesh.position.z = 35
  //LEAVES
  let leaves3Geometry = new THREE.CylinderGeometry(0, 15, 45, 32, 64);
  let leaves3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
  let leaves3Mesh = new THREE.Mesh(leaves3Geometry, leaves3Material);

  leaves3Mesh.position.y = 35
  leaves3Mesh.position.x = -35
  leaves3Mesh.position.z = 35

  //TREE 3
  let tree3 = new THREE.Group();
  tree3.add(bark3Mesh);
  tree3.add(leaves3Mesh);  

////////////////////////////////////////////////////////////////////////////
  
//TREE 4 (Pointy)
  //BARK
  let bark4Geometry = new THREE.CylinderGeometry(2,2,30,32);
  let bark4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
  let bark4Mesh = new THREE.Mesh(bark4Geometry, bark4Material);
    
  bark4Mesh.position.y = 0
  bark4Mesh.position.x = -60
  bark4Mesh.position.z = -9
  
  //LEAVES
  let leaves4Geometry = new THREE.CylinderGeometry(0, 7, 24, 40, 20);
  let leaves4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
  let leaves4Mesh = new THREE.Mesh(leaves4Geometry, leaves4Material);
    
  leaves4Mesh.position.y = 20
  leaves4Mesh.position.x = -60
  leaves4Mesh.position.z = -9
  
  //TREE 4
  let tree4 = new THREE.Group();
  tree4.add(bark4Mesh);
  tree4.add(leaves4Mesh);  
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 5 (Pointy)
    //BARK
    let bark5Geometry = new THREE.CylinderGeometry(10,10,30,32);
    let bark5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark5Mesh = new THREE.Mesh(bark4Geometry, bark4Material);
    
    bark5Mesh.position.y = 0
    bark5Mesh.position.x = 50
    bark5Mesh.position.z = -70
    
    //LEAVES
    let leaves5Geometry = new THREE.CylinderGeometry(0, 14, 34, 14, 2);
    let leaves5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves5Mesh = new THREE.Mesh(leaves5Geometry, leaves5Material);
    
    leaves5Mesh.position.y = 30
    leaves5Mesh.position.x = 50
    leaves5Mesh.position.z = -70
  
    //TREE 5
    let tree5 = new THREE.Group();
    tree5.add(bark5Mesh);
    tree5.add(leaves5Mesh);  
  
    ////////////////////////////////////////////////////////////////////////////
  
    //TREE 6 (Pointy)
    //BARK
    let bark6Geometry = new THREE.CylinderGeometry(2,2,30,32);
    let bark6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark6Mesh = new THREE.Mesh(bark6Geometry, bark6Material);
    
    bark6Mesh.position.y = 0
    bark6Mesh.position.x = 20
    bark6Mesh.position.z = -70
    
    //LEAVES
    let leaves6Geometry = new THREE.CylinderGeometry(0, 7, 40, 40, 2);
    let leaves6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves6Mesh = new THREE.Mesh(leaves6Geometry, leaves6Material);
    
    leaves6Mesh.position.y = 30
    leaves6Mesh.position.x = 20
    leaves6Mesh.position.z = -70
  
    //TREE 6
    let tree6 = new THREE.Group();
    tree6.add(bark6Mesh);
    tree6.add(leaves6Mesh);  
  
  ////////////////////////////////////////////////////////////////////////////
  
  //TREE 7 (Round) 
    //BARK
    let bark7Geometry = new THREE.CylinderGeometry(3,3,30,32);
    let bark7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark7Mesh = new THREE.Mesh(bark7Geometry, bark7Material);
    
    bark7Mesh.position.y = 0
    bark7Mesh.position.x = 50
    bark7Mesh.position.z = -20
    
    //LEAVES
    let leaves7Geometry = new THREE.SphereGeometry(10, 60, 60);
    let leaves7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves7Mesh = new THREE.Mesh(leaves7Geometry, leaves7Material);
    
    leaves7Mesh.position.y = 20
    leaves7Mesh.position.x = 50
    leaves7Mesh.position.z = -20
   
    //TREE 7
    let tree7 = new THREE.Group();
    tree7.add(bark7Mesh);
    tree7.add(leaves7Mesh);  
  
  ////////////////////////////////////////////////////////////////////////////
  
  //TREE 8 (Round)
    //BARK
    let bark8Geometry = new THREE.CylinderGeometry(3,3,30,32);
    let bark8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark8Mesh = new THREE.Mesh(bark8Geometry, bark8Material);
    
    bark8Mesh.position.y = 0
    bark8Mesh.position.x = -50
    bark8Mesh.position.z = 0
    
    //LEAVES
    let leaves8Geometry = new THREE.SphereGeometry(10, 60, 60);
    let leaves8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves8Mesh = new THREE.Mesh(leaves8Geometry, leaves8Material);
    
    leaves8Mesh.position.y = 20
    leaves8Mesh.position.x = -50
    leaves8Mesh.position.z = 0
  
    //TREE 8
    let tree8 = new THREE.Group();
    tree8.add(bark8Mesh);
    tree8.add(leaves8Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
  
    //TREE 9 (Round) 
    //BARK
    let bark9Geometry = new THREE.CylinderGeometry(4,4,60,32);
    let bark9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark9Mesh = new THREE.Mesh(bark9Geometry, bark9Material);
    
    bark9Mesh.position.y = -0
    bark9Mesh.position.x = 80  
    bark9Mesh.position.z = -70
    
    //LEAVES
    let leaves9Geometry = new THREE.SphereGeometry(20, 60, 60);
    let leaves9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves9Mesh = new THREE.Mesh(leaves9Geometry, leaves9Material);
    
    leaves9Mesh.position.y = 30
    leaves9Mesh.position.x = 80
    leaves9Mesh.position.z = -70
  
    //TREE 9
    let tree9 = new THREE.Group();
    tree9.add(bark9Mesh);
    tree9.add(leaves9Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 10 (Pointy)
    //BARK
    let bark10Geometry = new THREE.CylinderGeometry(2,2,30,32);
    let bark10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark10Mesh = new THREE.Mesh(bark10Geometry, bark10Material);
    
    bark10Mesh.position.y = 0
    bark10Mesh.position.x = 40
    bark10Mesh.position.z = 50
    
    //LEAVES
    let leaves10Geometry = new THREE.CylinderGeometry(0, 7, 40, 40, 2);
    let leaves10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves10Mesh = new THREE.Mesh(leaves10Geometry, leaves10Material);
    
    leaves10Mesh.position.y = 30
    leaves10Mesh.position.x = 40
    leaves10Mesh.position.z = 50
    
    //TREE 10
    let tree10 = new THREE.Group();
    tree10.add(bark10Mesh);
    tree10.add(leaves10Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 11 (Pointy)
    //BARK
    let bark11Geometry = new THREE.CylinderGeometry(3,3,50,32);
    let bark11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark11Mesh = new THREE.Mesh(bark11Geometry, bark11Material);
    
    bark11Mesh.position.y = 0
    bark11Mesh.position.x = -30
    bark11Mesh.position.z = 60
    
    //LEAVES
    let leaves11Geometry = new THREE.CylinderGeometry(0, 9, 40, 60, 2);
    let leaves11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves11Mesh = new THREE.Mesh(leaves11Geometry, leaves11Material);
    
    leaves11Mesh.position.y = 30
    leaves11Mesh.position.x = -30
    leaves11Mesh.position.z = 60
  
    //TREE 11
    let tree11 = new THREE.Group();
    tree11.add(bark11Mesh);
    tree11.add(leaves11Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 12 (Round) 
    //BARK
    let bark12Geometry = new THREE.CylinderGeometry(4,4,40,32);
    let bark12Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark12Mesh = new THREE.Mesh(bark12Geometry, bark12Material);
    
    bark12Mesh.position.y = 0
    bark12Mesh.position.x = -80  
    bark12Mesh.position.z = 40
      //LEAVES
    let leaves12Geometry = new THREE.SphereGeometry(20, 60, 60);
    let leaves12Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves12Mesh = new THREE.Mesh(leaves12Geometry, leaves12Material);
    
    leaves12Mesh.position.y = 35
    leaves12Mesh.position.x = -80
    leaves12Mesh.position.z = 40
  
    //TREE 12
    let tree12 = new THREE.Group();
    tree12.add(bark12Mesh);
    tree12.add(leaves12Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 13 (Pointy)
    //BARK
    let bark13Geometry = new THREE.CylinderGeometry(4,4,40,32);
    let bark13Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark13Mesh = new THREE.Mesh(bark13Geometry, bark13Material);
    
    bark13Mesh.position.y = 0
    bark13Mesh.position.x = 50
    bark13Mesh.position.z = 0
    
    //LEAVES
    let leaves13Geometry = new THREE.CylinderGeometry(0, 15, 40, 50, 2);
    let leaves13Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves13Mesh = new THREE.Mesh(leaves13Geometry, leaves13Material);
    
    leaves13Mesh.position.y = 40
    leaves13Mesh.position.x = 50
    leaves13Mesh.position.z = 0
  
    //TREE 13
    let tree13 = new THREE.Group();
    tree13.add(bark13Mesh);
    tree13.add(leaves13Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 14 (Round) 
    //BARK
    let bark14Geometry = new THREE.CylinderGeometry(3,3,50,32);
    let bark14Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark14Mesh = new THREE.Mesh(bark14Geometry, bark14Material);
    
    bark14Mesh.position.y = 0
    bark14Mesh.position.x = -50
    bark14Mesh.position.z = 70
    
    //LEAVES
    let leaves14Geometry = new THREE.SphereGeometry(12, 60, 60);
    let leaves14Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves14Mesh = new THREE.Mesh(leaves14Geometry, leaves14Material);
    
    leaves14Mesh.position.y = 20
    leaves14Mesh.position.x = -50
    leaves14Mesh.position.z = 70
  
    //TREE 14
    let tree14 = new THREE.Group();
    tree14.add(bark14Mesh);
    tree14.add(leaves14Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 15 (Pointy)
    //BARK
    let bark15Geometry = new THREE.CylinderGeometry(3,3,40,32);
    let bark15Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark15Mesh = new THREE.Mesh(bark15Geometry, bark15Material);
    
    bark15Mesh.position.y = 0
    bark15Mesh.position.x = -20
    bark15Mesh.position.z = -30
  
    //LEAVES
    let leaves15Geometry = new THREE.CylinderGeometry(0, 9, 40, 50, 2);
    let leaves15Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves15Mesh = new THREE.Mesh(leaves15Geometry, leaves15Material);
    
    leaves15Mesh.position.y = 30
    leaves15Mesh.position.x = -20
    leaves15Mesh.position.z = -30
  
    //TREE 15
    let tree15 = new THREE.Group();
    tree15.add(bark15Mesh);
    tree15.add(leaves15Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 16 (Round) 
    //BARK
    let bark16Geometry = new THREE.CylinderGeometry(4,4,50,32);
    let bark16Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark16Mesh = new THREE.Mesh(bark16Geometry, bark16Material);
    
    bark16Mesh.position.y = 0
    bark16Mesh.position.x = -50
    bark16Mesh.position.z = -50
    
    //LEAVES
    let leaves16Geometry = new THREE.SphereGeometry(20, 60, 60);
    let leaves16Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
    let leaves16Mesh = new THREE.Mesh(leaves16Geometry, leaves16Material);
    
    leaves16Mesh.position.y = 40
    leaves16Mesh.position.x = -50
    leaves16Mesh.position.z = -50
    
    //TREE 16
    let tree16 = new THREE.Group();
    tree16.add(bark16Mesh);
    tree16.add(leaves16Mesh);
  
  ////////////////////////////////////////////////////////////////////////////
  
    //TREE 17 (Pointy)
    //BARK
    let bark17Geometry = new THREE.CylinderGeometry(3,3,40,32);
    let bark17Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
    let bark17Mesh = new THREE.Mesh(bark17Geometry, bark17Material);
  
    bark17Mesh.position.y = 0
    bark17Mesh.position.x = -60
    bark17Mesh.position.z = -80
  
    //LEAVES
    let leaves17Geometry = new THREE.CylinderGeometry(0, 9, 40, 50, 2);
    let leaves17Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
    let leaves17Mesh = new THREE.Mesh(leaves17Geometry, leaves17Material);
    
    leaves17Mesh.position.y = 40
    leaves17Mesh.position.x = -60
    leaves17Mesh.position.z = -80
  
    //TREE 17
    let tree17 = new THREE.Group();
    tree17.add(bark17Mesh);
    tree17.add(leaves17Mesh);
  
////////////////////////////////////////////////////////////////////////////

    //PINK TREE
    //BARK
    let brownBarkGeometry = new THREE.CylinderGeometry(1,1,10,32);
    let brownBarkMaterial = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/brownwood.jpg'), side: THREE.DoubleSide} );
    let brownBarkMesh = new THREE.Mesh(brownBarkGeometry, brownBarkMaterial);
    
    //LEAVES
    let pinkLeavesGeometry = new THREE.SphereGeometry(4, 60, 60);
    let pinkLeavesMaterial = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeavesMesh = new THREE.Mesh(pinkLeavesGeometry, pinkLeavesMaterial);
    
    pinkLeavesMesh.position.y = 7

    //PINK TREE
    let pinkTree = new THREE.Group();
    pinkTree.add(brownBarkMesh);
    pinkTree.add(pinkLeavesMesh);
    SCENE.add(pinkTree);
  
  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////
  
  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////
  
//FOREST
let forest = new THREE.Group();
  forest.add(tree1);
  forest.add(tree2);
  forest.add(tree3);
  forest.add(tree4);
  forest.add(tree5);
  forest.add(tree6);
  forest.add(tree7);
  forest.add(tree8);
  forest.add(tree9);
  forest.add(tree10);
  forest.add(tree11);
  forest.add(tree12);
  forest.add(tree13);
  forest.add(tree14);
  forest.add(tree15);
  forest.add(tree16);
  forest.add(tree17);
  forest.position.set( 150, 0, 100 )
  
  //CLONE 1
  let forest1 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest1.position.set( 150, 0, -100 );
    forest1.rotation.y = 1
  }

  //CLONE 2
  let forest2 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest2.position.set( -150, 0, 100 );
    forest2.rotation.y = 2
  }
  
  //CLONE 3
  let forest3 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest3.position.set( -150, 0, -100 );
    forest3.rotation.y = 3
  }

  //CLONE 4
  let forest4 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest4.position.set( 0, 0, 200 );
    forest4.rotation.y = 4
  }
  
  //CLONE 5
  let forest5 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest5.position.set( 0, 0, -200 );
    forest5.rotation.y = 5
  }

  //WHOLEFOREST
  let wholeForest = new THREE.Group();
  wholeForest.add(forest);
  wholeForest.add(forest1);
  wholeForest.add(forest2);
  wholeForest.add(forest3);
  wholeForest.add(forest4);
  wholeForest.add(forest5);
  SCENE.add(wholeForest);

  //WHOLEFOREST CLONE
  let wholeForestCLONE = wholeForest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    wholeForestCLONE.position.set();
    wholeForestCLONE.rotation.y = -10
  }
  SCENE.add(wholeForestCLONE);

  //EVERYTHING
  let everything = new THREE.Group();
  everything.add(wholeForest);
  everything.add(stageCube);
  SCENE.add(everything);

  //////////////////////////////////////////////////////////////////  

//RANDOM NUMBER GENERATOR
function random(min, max) {
  if (isNaN(max)) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

//LIGHT
let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    SCENE.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, 0.25);
    SCENE.add(light);

//RENDER LOOP
function render() {
    requestAnimationFrame(render);
    particleMesh.rotation.y += -0.00200;
    particleMesh.rotation.x += 0.00200;
    particleMesh.rotation.z += 0.00200;
    everything.rotation.y += 0.001;
    RENDERER.render(SCENE, camera);
  }
  render();

//RESIZE
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  RENDERER.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize, false);