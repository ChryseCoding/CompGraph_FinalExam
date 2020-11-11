import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';


class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
};

class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    //Movement
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations));

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    //add character here
    loader.setPath('./resources/maleadv/');
    loader.load('breathidle.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState('idle');
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);
  
        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/maleadv/');
      loader.load('finalwalk.fbx', (a) => { _OnLoad('walk', a); });
      loader.load('breathidle.fbx', (a) => { _OnLoad('idle', a); });
      loader.load('kneel.fbx', (a) => { _OnLoad('kneel', a); });
      
    });
  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
        velocity.x * this._decceleration.x,
        velocity.y * this._decceleration.y,
        velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
//character forward movment
    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds*2;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
 
    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);

    oldPosition.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
};

class BasicCharacterControllerInput {
  constructor() {
    this._Init();    
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      space: false,

    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = true;
        break;

      case 83: // s
        this._keys.backward = true;
        break;

      case 32: // SPACE
        this._keys.space = true;
        break;

    }
  }

  _onKeyUp(event) {
    switch(event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;

    }
  }
};


class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null; 
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;
    
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};


class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState('idle', IdleState);
    this._AddState('walk', WalkState);
    this._AddState('kneel', kneelState);
  }
};
class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
};
class kneelState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    }
  }

  get Name() {
    return 'kneel';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['kneel'].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener('finished', this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.reset();  
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  _Finished() {
    this._Cleanup();
    this._parent.SetState('idle');
  }

  _Cleanup() {
    const action = this._parent._proxy._animations['kneel'].action;
    
    action.getMixer().removeEventListener('finished', this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {
  }
};


class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['walk'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'idle') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('run');
      }
      return;
    }

    this._parent.SetState('idle');
  }
};





class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    } else if (input._keys.space) {
      this._parent.SetState('kneel');
    }
  }
};


class CharacterControllerDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(80, 35, 45); //70 for mirror

    this._scene = new THREE.Scene();



//RANDOM NUMBER GENERATOR
function random(min, max) {
  if (isNaN(max)) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

//Particles
const MAXPARTICLES = 10000;
let particlesGeometry = new THREE.Geometry();
for (let i = 0; i < MAXPARTICLES; i++) {
  let particle = new THREE.Vector3(
    random(-500, 500),
    random(-500, 500),
    random(-500, 500)
  );
  particlesGeometry.vertices.push(particle);
}
let particleMaterial = new THREE.ParticleBasicMaterial({
  color: 0xFFA500,
  size: 0.3,
 
});

let particleMesh = new THREE.ParticleSystem(particlesGeometry, particleMaterial);
particleMesh.sortParticles = true;
particleMesh.rotation.y += -200;
particleMesh.rotation.x += 200;
particleMesh.rotation.z += -200;
this._scene.add(particleMesh);



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
    let brownBarkGeometry = new THREE.CylinderGeometry(1,2,30,32);
    let brownBarkMaterial = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/brownwood.jpg'), side: THREE.DoubleSide} );
    let brownBarkMesh = new THREE.Mesh(brownBarkGeometry, brownBarkMaterial);
    
    brownBarkMesh.position.y = 0
    brownBarkMesh.position.x = 0
    brownBarkMesh.position.z = 20
    
    //LEAVES
    let pinkLeavesGeometry = new THREE.SphereGeometry(5, 60, 60);
    let pinkLeavesMaterial = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeavesMesh = new THREE.Mesh(pinkLeavesGeometry, pinkLeavesMaterial);
    
    pinkLeavesMesh.position.y = 13
    pinkLeavesMesh.position.x = 0
    pinkLeavesMesh.position.z = 20

    //LEAVES 1
    let pinkLeaves1Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves1Mesh = new THREE.Mesh(pinkLeaves1Geometry, pinkLeaves1Material);
    
    pinkLeaves1Mesh.position.x = 2.123
    pinkLeaves1Mesh.position.y = 9.818
    pinkLeaves1Mesh.position.z = 22.695

    //LEAVES 2
    let pinkLeaves2Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves2Mesh = new THREE.Mesh(pinkLeaves2Geometry, pinkLeaves2Material);
    
    pinkLeaves2Mesh.position.x = -0.446
    pinkLeaves2Mesh.position.y = 12.761
    pinkLeaves2Mesh.position.z = 23.327
  
    //LEAVES 3
    let pinkLeaves3Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves3Mesh = new THREE.Mesh(pinkLeaves3Geometry, pinkLeaves3Material);
    
    pinkLeaves3Mesh.position.x = -2.505
    pinkLeaves3Mesh.position.y = 10.682
    pinkLeaves3Mesh.position.z = 22.695
  
    //LEAVES 4
    let pinkLeaves4Geometry = new THREE.SphereGeometry(4, 60, 60);
    let pinkLeaves4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves4Mesh = new THREE.Mesh(pinkLeaves4Geometry, pinkLeaves4Material);
    
    pinkLeaves4Mesh.position.x = -0.426
    pinkLeaves4Mesh.position.y = 16.675
    pinkLeaves4Mesh.position.z = 19.604
  
    //LEAVES 5
    let pinkLeaves5Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves5Mesh = new THREE.Mesh(pinkLeaves5Geometry, pinkLeaves5Material);
    
    pinkLeaves5Mesh.position.x = -2.008
    pinkLeaves5Mesh.position.y = 15.689
    pinkLeaves5Mesh.position.z = 22.695
  
    //LEAVES 6
    let pinkLeaves6Geometry = new THREE.SphereGeometry(3.5, 60, 60);
    let pinkLeaves6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves6Mesh = new THREE.Mesh(pinkLeaves6Geometry, pinkLeaves6Material);
    
    pinkLeaves6Mesh.position.x = 2.475
    pinkLeaves6Mesh.position.y = 14.715
    pinkLeaves6Mesh.position.z = 21.166

    //LEAVES 7
    let pinkLeaves7Geometry = new THREE.SphereGeometry(4, 60, 60);
    let pinkLeaves7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves7Mesh = new THREE.Mesh(pinkLeaves7Geometry, pinkLeaves7Material);
    
    pinkLeaves7Mesh.position.x = 2.196
    pinkLeaves7Mesh.position.y = 9.612
    pinkLeaves7Mesh.position.z = 20.302

    //LEAVES 8
    let pinkLeaves8Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves8Mesh = new THREE.Mesh(pinkLeaves8Geometry, pinkLeaves8Material);
    
    pinkLeaves8Mesh.position.x = 2.911
    pinkLeaves8Mesh.position.y = 14.289
    pinkLeaves8Mesh.position.z = 19.611

    //LEAVES 9
    let pinkLeaves9Geometry = new THREE.SphereGeometry(3.5, 60, 60);
    let pinkLeaves9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves9Mesh = new THREE.Mesh(pinkLeaves9Geometry, pinkLeaves9Material);
    
    pinkLeaves9Mesh.position.x = 0.370
    pinkLeaves9Mesh.position.y = 12.670
    pinkLeaves9Mesh.position.z = 17.379

    //LEAVES 10
    let pinkLeaves10Geometry = new THREE.SphereGeometry(4, 60, 60);
    let pinkLeaves10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves10Mesh = new THREE.Mesh(pinkLeaves10Geometry, pinkLeaves10Material);
    
    pinkLeaves10Mesh.position.x = -2.282
    pinkLeaves10Mesh.position.y = 13.164
    pinkLeaves10Mesh.position.z = 19.171

    //LEAVES 11
    let pinkLeaves11Geometry = new THREE.SphereGeometry(3, 60, 60);
    let pinkLeaves11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pinkleaves.jpg'), side: THREE.DoubleSide});
    let pinkLeaves11Mesh = new THREE.Mesh(pinkLeaves11Geometry, pinkLeaves11Material);
    
    pinkLeaves11Mesh.position.x = -2.252
    pinkLeaves11Mesh.position.y = 9.530
    pinkLeaves11Mesh.position.z = 19.432

    //PINK TREE
    let pinkTree = new THREE.Group();
    pinkTree.add(brownBarkMesh);
    pinkTree.add(pinkLeavesMesh);
    pinkTree.add(pinkLeaves1Mesh);
    pinkTree.add(pinkLeaves2Mesh);
    pinkTree.add(pinkLeaves3Mesh);
    pinkTree.add(pinkLeaves4Mesh);
    pinkTree.add(pinkLeaves5Mesh);
    pinkTree.add(pinkLeaves6Mesh);
    pinkTree.add(pinkLeaves7Mesh);
    pinkTree.add(pinkLeaves8Mesh);
    pinkTree.add(pinkLeaves9Mesh);
    pinkTree.add(pinkLeaves10Mesh);
    pinkTree.add(pinkLeaves11Mesh);
    this._scene.add(pinkTree);
  
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
  this._scene.add(forest);
  
  //CLONE 1
  let forest1 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest1.position.set( 150, 0, -100 );
    forest1.rotation.y = 1
    this._scene.add(forest1);
  }

  //CLONE 2
  let forest2 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest2.position.set( -150, 0, 100 );
    forest2.rotation.y = 2
    this._scene.add(forest2);
  }
  
  //CLONE 3
  let forest3 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest3.position.set( -150, 0, -100 );
    forest3.rotation.y = 3
    this._scene.add(forest3);
  }

  //CLONE 4
  let forest4 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest4.position.set( 0, 0, 200 );
    forest4.rotation.y = 4
    this._scene.add(forest4);
  }
  
  //CLONE 5
  let forest5 = forest.clone();
  for ( let i = 0; i < 1; i ++ ) {
    forest5.position.set( 0, 0, -200 );
    forest5.rotation.y = 5
    this._scene.add(forest5);
  }

  //////////////////////////////////////////////////////////////////  
//end here((1))

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
    this._scene.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, 0.25);
    this._scene.add(light);

    const controls = new OrbitControls(
      this._camera, this._threejs.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './resources/posx.jpg',
        './resources/negx.jpg',
        './resources/posy.jpg',
        './resources/negy.jpg',
        './resources/posz.jpg',
        './resources/negz.jpg',
    ]);
    texture.encoding = THREE.sRGBEncoding;
    this._scene.background = texture;

//SKYBOX    
let stageGeometry = new THREE.BoxBufferGeometry(500,100,500);
let stageGround = 
[
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/grass.png'), side: THREE.DoubleSide}),
  
];
let stageMaterials = new THREE.MeshFaceMaterial(stageGround);
let stageCube = new THREE.Mesh(stageGeometry, stageMaterials);
this._scene.add(stageCube);
stageCube.position.x=0
stageCube.position.y=50
stageCube.position.z=0

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    }
    this._controls = new BasicCharacterController(params);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();
      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new CharacterControllerDemo();
});