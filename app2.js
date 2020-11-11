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
const MAXPARTICLES = 350;
let particlesGeometry = new THREE.Geometry();
for (let i = 0; i < MAXPARTICLES; i++) {
  let particle = new THREE.Vector3(
    random(-100, 100),
    random(-100, 100),
    random(-110, 110)
  );
  particlesGeometry.vertices.push(particle);
}
let particleMaterial = new THREE.ParticleBasicMaterial({
  color: 0xFFA500,
  size: 0.3,
 
});

let particleMesh = new THREE.ParticleSystem(particlesGeometry, particleMaterial);
particleMesh.sortParticles = true;
this._scene.add(particleMesh);

////////////////////LAMP//////////////////
//LAMP POLE
let poleGeometry = new THREE.CylinderGeometry( 1.5, 1.5, 100, 32);
let poleMaterial = new THREE.MeshBasicMaterial( {color: "#8f6558"} );
let poleMesh = new THREE.Mesh(poleGeometry, poleMaterial );
this._scene.add( poleMesh );

poleMesh.position.y = -10
poleMesh.position.x = 0
poleMesh.position.z = 395

//LAMP BULB
let bulbGeometry = new THREE.CubeGeometry( 8, 10, 8);
let bulbMaterial = new THREE.MeshBasicMaterial( {color: "#808080"} );
let bulbMesh = new THREE.Mesh( bulbGeometry, bulbMaterial );
this._scene.add(bulbMesh );

bulbMesh.position.y = 32
bulbMesh.position.x = 0
bulbMesh.position.z = 395
bulbMesh.rotation.y = 1


//LAMP MISC
let lampmiscGeometry = new THREE.CubeGeometry( 4, 2, 14);
let lampmiscMaterial = new THREE.MeshBasicMaterial( {color: "#808080"} );
let lampmiscMesh = new THREE.Mesh(lampmiscGeometry, lampmiscMaterial );
this._scene.add( lampmiscMesh );

lampmiscMesh.position.y = 22
lampmiscMesh.position.x = 0
lampmiscMesh.position.z = 395
lampmiscMesh.rotation.y= 1

//LAMP BASE
let basegeometry = new THREE.ConeGeometry( 6, 5, 8);
let basematerial = new THREE.MeshBasicMaterial( {color: "#808080"} );
let baseMesh = new THREE.Mesh( basegeometry, basematerial );
this._scene.add( baseMesh);

baseMesh.position.y = -1.5
baseMesh.position.x = 0
baseMesh.position.z = 395
baseMesh.rotation.y = 1
////////////////////RIGHT SIDE///////////////////////////
//Bush 1 (Round) 
  let bush1Geometry = new THREE.SphereGeometry(6, 6, 6);
  let bush1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
  let bush1Mesh = new THREE.Mesh(bush1Geometry, bush1Material);
  this._scene.add(bush1Mesh);
  
  bush1Mesh.position.y = 0
  bush1Mesh.position.x = -40
  bush1Mesh.position.z = 35
//Bush 2 (Round) 
let bush2Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush2Mesh = new THREE.Mesh(bush2Geometry, bush2Material);
this._scene.add(bush2Mesh);

bush2Mesh.position.y = 0
bush2Mesh.position.x = -40
bush2Mesh.position.z = 80
//Bush 3 (Round) 
let bush3Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush3Mesh = new THREE.Mesh(bush3Geometry, bush3Material);
this._scene.add(bush3Mesh);

bush3Mesh.position.y = 0
bush3Mesh.position.x = -40
bush3Mesh.position.z = 125
//Bush 4 (Round) 
let bush4Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush4Mesh = new THREE.Mesh(bush4Geometry, bush4Material);
this._scene.add(bush4Mesh);

bush4Mesh.position.y = 0
bush4Mesh.position.x = -40
bush4Mesh.position.z = 170
//Bush 5 (Round) 
let bush5Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush5Mesh = new THREE.Mesh(bush5Geometry, bush5Material);
this._scene.add(bush5Mesh);

bush5Mesh.position.y = 0
bush5Mesh.position.x = -40
bush5Mesh.position.z = 215
//Bush 6 (Round) 
let bush6Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush6Mesh = new THREE.Mesh(bush6Geometry, bush6Material);
this._scene.add(bush6Mesh);

bush6Mesh.position.y = 0
bush6Mesh.position.x = -40
bush6Mesh.position.z = 260
//Bush 7 (Round) 
let bush7Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush7Mesh = new THREE.Mesh(bush7Geometry, bush7Material);
this._scene.add(bush7Mesh);

bush7Mesh.position.y = 0
bush7Mesh.position.x = -40
bush7Mesh.position.z = 305
//Bush 8 (Round) 
let bush8Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush8Mesh = new THREE.Mesh(bush8Geometry, bush8Material);
this._scene.add(bush8Mesh);

bush8Mesh.position.y = 0
bush8Mesh.position.x = -40
bush8Mesh.position.z = 350
//Bush 9 (Round) 
let bush9Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush9Mesh = new THREE.Mesh(bush9Geometry, bush9Material);
this._scene.add(bush9Mesh);

bush9Mesh.position.y = 0
bush9Mesh.position.x = -40
bush9Mesh.position.z = 395

////Bush 28 (Round) 
let bush28Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush28Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush28Mesh = new THREE.Mesh(bush28Geometry, bush28Material);
this._scene.add(bush28Mesh);

bush28Mesh.position.y = 0
bush28Mesh.position.x = -40
bush28Mesh.position.z = -10

//Bush 29 (Round) 
let bush29Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush29Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush29Mesh = new THREE.Mesh(bush29Geometry, bush29Material);
this._scene.add(bush29Mesh);

bush29Mesh.position.y = 0
bush29Mesh.position.x = -40
bush29Mesh.position.z = -55

//Bush 30 (Round) 
let bush30Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush30Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush30Mesh = new THREE.Mesh(bush30Geometry, bush30Material);
this._scene.add(bush30Mesh);

bush30Mesh.position.y = 0
bush30Mesh.position.x = -40
bush30Mesh.position.z = -100

//Bush 31 (Round) 
let bush31Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush31Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush31Mesh = new THREE.Mesh(bush31Geometry, bush31Material);
this._scene.add(bush31Mesh);

bush31Mesh.position.y = 0
bush31Mesh.position.x = -40
bush31Mesh.position.z = -145

//Bush 32 (Round) 
let bush32Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush32Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush32Mesh = new THREE.Mesh(bush32Geometry, bush32Material);
this._scene.add(bush32Mesh);

bush32Mesh.position.y = 0
bush32Mesh.position.x = -40
bush32Mesh.position.z = -190

//Bush 33 (Round) 
let bush33Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush33Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush33Mesh = new THREE.Mesh(bush33Geometry, bush33Material);
this._scene.add(bush33Mesh);

bush33Mesh.position.y = 0
bush33Mesh.position.x = -40
bush33Mesh.position.z = -235

//Bush 34 (Round) 
let bush34Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush34Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush34Mesh = new THREE.Mesh(bush34Geometry, bush34Material);
this._scene.add(bush34Mesh);

bush34Mesh.position.y = 0
bush34Mesh.position.x = -40
bush34Mesh.position.z = -280

//Bush 35 (Round) 
let bush35Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush35Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush35Mesh = new THREE.Mesh(bush35Geometry, bush35Material);
this._scene.add(bush35Mesh);

bush35Mesh.position.y = 0
bush35Mesh.position.x = -40
bush35Mesh.position.z = -325

//Bush 36 (Round) 
let bush36Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush36Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush36Mesh = new THREE.Mesh(bush36Geometry, bush36Material);
this._scene.add(bush36Mesh);

bush36Mesh.position.y = 0
bush36Mesh.position.x = -40
bush36Mesh.position.z = -370
////////////////////////////////////////////////////////////////

/////////////////////////////LEFT SIDE//////////////////////////
//Bush 10 (Round) 
let bush10Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush10Mesh = new THREE.Mesh(bush10Geometry, bush10Material);
this._scene.add(bush10Mesh);

bush10Mesh.position.y = 0
bush10Mesh.position.x = 40
bush10Mesh.position.z = 35
//Bush 11 (Round) 
let bush11Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush11Mesh = new THREE.Mesh(bush11Geometry, bush11Material);
this._scene.add(bush11Mesh);

bush11Mesh.position.y = 0
bush11Mesh.position.x = 40
bush11Mesh.position.z = 80
//Bush 12 (Round) 
let bush12Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush12Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush12Mesh = new THREE.Mesh(bush12Geometry, bush12Material);
this._scene.add(bush12Mesh);

bush12Mesh.position.y = 0
bush12Mesh.position.x = 40
bush12Mesh.position.z = 125
//Bush 13 (Round) 
let bush13Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush13Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush13Mesh = new THREE.Mesh(bush13Geometry, bush13Material);
this._scene.add(bush13Mesh);

bush13Mesh.position.y = 0
bush13Mesh.position.x = 40
bush13Mesh.position.z = 170
//Bush 14 (Round) 
let bush14Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush14Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush14Mesh = new THREE.Mesh(bush14Geometry, bush14Material);
this._scene.add(bush14Mesh);

bush14Mesh.position.y = 0
bush14Mesh.position.x = 40
bush14Mesh.position.z = 215
//Bush 15 (Round) 
let bush15Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush15Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush15Mesh = new THREE.Mesh(bush15Geometry, bush15Material);
this._scene.add(bush15Mesh);

bush15Mesh.position.y = 0
bush15Mesh.position.x = 40
bush15Mesh.position.z = 260
//Bush 16 (Round) 
let bush16Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush16Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush16Mesh = new THREE.Mesh(bush16Geometry, bush16Material);
this._scene.add(bush16Mesh);

bush16Mesh.position.y = 0
bush16Mesh.position.x = 40
bush16Mesh.position.z = 305
//Bush 17 (Round) 
let bush17Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush17Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush17Mesh = new THREE.Mesh(bush17Geometry, bush17Material);
this._scene.add(bush17Mesh);

bush17Mesh.position.y = 0
bush17Mesh.position.x = 40
bush17Mesh.position.z = 350
//Bush 18 (Round) 
let bush18Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush18Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush18Mesh = new THREE.Mesh(bush18Geometry, bush18Material);
this._scene.add(bush18Mesh);

bush18Mesh.position.y = 0
bush18Mesh.position.x = 40
bush18Mesh.position.z = 395

//Bush 19 (Round) 
let bush19Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush19Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush19Mesh = new THREE.Mesh(bush19Geometry, bush19Material);
this._scene.add(bush19Mesh);

bush19Mesh.position.y = 0
bush19Mesh.position.x = 40
bush19Mesh.position.z = -10

//Bush 20 (Round) 
let bush20Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush20Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush20Mesh = new THREE.Mesh(bush20Geometry, bush20Material);
this._scene.add(bush20Mesh);

bush20Mesh.position.y = 0
bush20Mesh.position.x = 40
bush20Mesh.position.z = -55

//Bush 21 (Round) 
let bush21Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush21Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush21Mesh = new THREE.Mesh(bush21Geometry, bush21Material);
this._scene.add(bush21Mesh);

bush21Mesh.position.y = 0
bush21Mesh.position.x = 40
bush21Mesh.position.z = -100

//Bush 22 (Round) 
let bush22Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush22Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush22Mesh = new THREE.Mesh(bush22Geometry, bush22Material);
this._scene.add(bush22Mesh);

bush22Mesh.position.y = 0
bush22Mesh.position.x = 40
bush22Mesh.position.z = -145

//Bush 23 (Round) 
let bush23Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush23Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush23Mesh = new THREE.Mesh(bush23Geometry, bush23Material);
this._scene.add(bush23Mesh);

bush23Mesh.position.y = 0
bush23Mesh.position.x = 40
bush23Mesh.position.z = -190

//Bush 24 (Round) 
let bush24Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush24Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush24Mesh = new THREE.Mesh(bush24Geometry, bush24Material);
this._scene.add(bush24Mesh);

bush24Mesh.position.y = 0
bush24Mesh.position.x = 40
bush24Mesh.position.z = -235

//Bush 25 (Round) 
let bush25Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush25Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush25Mesh = new THREE.Mesh(bush25Geometry, bush25Material);
this._scene.add(bush25Mesh);

bush25Mesh.position.y = 0
bush25Mesh.position.x = 40
bush25Mesh.position.z = -280

//Bush 26 (Round) 
let bush26Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush26Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush26Mesh = new THREE.Mesh(bush26Geometry, bush26Material);
this._scene.add(bush26Mesh);

bush26Mesh.position.y = 0
bush26Mesh.position.x = 40
bush26Mesh.position.z = -325

//Bush 27 (Round) 
let bush27Geometry = new THREE.SphereGeometry(6, 6, 6);
let bush27Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/leavesTexture.png'), side: THREE.DoubleSide});
let bush27Mesh = new THREE.Mesh(bush27Geometry, bush27Material);
this._scene.add(bush27Mesh);

bush27Mesh.position.y = 0
bush27Mesh.position.x = 40
bush27Mesh.position.z = -370


/////////////////////////////RIGHT SIDE/////////////////////////
//TREE 1 (Pointy)
//BARK
let bark1Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark1Mesh = new THREE.Mesh(bark1Geometry, bark1Material);
this._scene.add(bark1Mesh);

bark1Mesh.position.y = 14
bark1Mesh.position.x = -60
bark1Mesh.position.z = 35
  //LEAVES
let leaves1Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves1Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves1Mesh = new THREE.Mesh(leaves1Geometry, leaves1Material);
this._scene.add(leaves1Mesh);

leaves1Mesh.position.y = 45
leaves1Mesh.position.x = -60
leaves1Mesh.position.z = 35

//TREE 2 (Pointy)
//BARK
let bark2Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark2Mesh = new THREE.Mesh(bark2Geometry, bark2Material);
this._scene.add(bark2Mesh);

bark2Mesh.position.y = 14
bark2Mesh.position.x = -60
bark2Mesh.position.z = 80
  //LEAVES
let leaves2Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves2Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves2Mesh = new THREE.Mesh(leaves2Geometry, leaves2Material);
this._scene.add(leaves2Mesh);

leaves2Mesh.position.y = 45
leaves2Mesh.position.x = -60
leaves2Mesh.position.z = 80

//TREE 3 (Pointy)
//BARK
let bark3Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark3Mesh = new THREE.Mesh(bark3Geometry, bark3Material);
this._scene.add(bark3Mesh);

bark3Mesh.position.y = 14
bark3Mesh.position.x = -60
bark3Mesh.position.z = 125
  //LEAVES
let leaves3Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves3Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves3Mesh = new THREE.Mesh(leaves3Geometry, leaves3Material);
this._scene.add(leaves3Mesh);

leaves3Mesh.position.y = 45
leaves3Mesh.position.x = -60
leaves3Mesh.position.z = 125

//TREE 4 (Pointy)
//BARK
let bark4Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark4Mesh = new THREE.Mesh(bark4Geometry, bark4Material);
this._scene.add(bark4Mesh);

bark4Mesh.position.y = 14
bark4Mesh.position.x = -60
bark4Mesh.position.z = 170
  //LEAVES
let leaves4Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves4Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves4Mesh = new THREE.Mesh(leaves3Geometry, leaves3Material);
this._scene.add(leaves4Mesh);

leaves4Mesh.position.y = 45
leaves4Mesh.position.x = -60
leaves4Mesh.position.z = 170

//TREE 5 (Pointy)
//BARK
let bark5Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark5Mesh = new THREE.Mesh(bark5Geometry, bark5Material);
this._scene.add(bark5Mesh);

bark5Mesh.position.y = 14
bark5Mesh.position.x = -60
bark5Mesh.position.z = 215
  //LEAVES
let leaves5Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves5Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves5Mesh = new THREE.Mesh(leaves5Geometry, leaves5Material);
this._scene.add(leaves5Mesh);

leaves5Mesh.position.y = 45
leaves5Mesh.position.x = -60
leaves5Mesh.position.z = 215

//TREE 6 (Pointy)
//BARK
let bark6Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark6Mesh = new THREE.Mesh(bark6Geometry, bark6Material);
this._scene.add(bark6Mesh);

bark6Mesh.position.y = 14
bark6Mesh.position.x = -60
bark6Mesh.position.z = 260
  //LEAVES
let leaves6Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves6Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves6Mesh = new THREE.Mesh(leaves6Geometry, leaves6Material);
this._scene.add(leaves6Mesh);

leaves6Mesh.position.y = 45
leaves6Mesh.position.x = -60
leaves6Mesh.position.z = 260

//TREE 7 (Pointy)
//BARK
let bark7Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark7Mesh = new THREE.Mesh(bark7Geometry, bark7Material);
this._scene.add(bark7Mesh);

bark7Mesh.position.y = 14
bark7Mesh.position.x = -60
bark7Mesh.position.z = 305
  //LEAVES
let leaves7Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves7Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves7Mesh = new THREE.Mesh(leaves7Geometry, leaves7Material);
this._scene.add(leaves7Mesh);

leaves7Mesh.position.y = 45
leaves7Mesh.position.x = -60
leaves7Mesh.position.z = 350

//TREE 8 (Pointy)
//BARK
let bark8Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark8Mesh = new THREE.Mesh(bark8Geometry, bark8Material);
this._scene.add(bark8Mesh);

bark8Mesh.position.y = 14
bark8Mesh.position.x = -60
bark8Mesh.position.z = 350
  //LEAVES
let leaves8Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves8Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves8Mesh = new THREE.Mesh(leaves8Geometry, leaves8Material);
this._scene.add(leaves8Mesh);

leaves8Mesh.position.y = 45
leaves8Mesh.position.x = -60
leaves8Mesh.position.z = 305

//TREE 9 (Pointy)
//BARK
let bark9Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark9Mesh = new THREE.Mesh(bark9Geometry, bark9Material);
this._scene.add(bark9Mesh);

bark9Mesh.position.y = 14
bark9Mesh.position.x = -60
bark9Mesh.position.z = 395
  //LEAVES
let leaves9Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves9Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves9Mesh = new THREE.Mesh(leaves9Geometry, leaves9Material);
this._scene.add(leaves9Mesh);

leaves9Mesh.position.y = 45
leaves9Mesh.position.x = -60
leaves9Mesh.position.z = 395

//TREE 28 (Pointy)
//BARK
let bark28Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark28Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark28Mesh = new THREE.Mesh(bark28Geometry, bark28Material);
this._scene.add(bark28Mesh);

bark28Mesh.position.y = 14
bark28Mesh.position.x = -60
bark28Mesh.position.z = -10
  //LEAVES
let leaves28Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves28Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves28Mesh = new THREE.Mesh(leaves28Geometry, leaves28Material);
this._scene.add(leaves28Mesh);

leaves28Mesh.position.y = 45
leaves28Mesh.position.x = -60
leaves28Mesh.position.z = -10

//TREE 29 (Pointy)
//BARK
let bark29Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark29Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark29Mesh = new THREE.Mesh(bark29Geometry, bark29Material);
this._scene.add(bark29Mesh);

bark29Mesh.position.y = 14
bark29Mesh.position.x = -60
bark29Mesh.position.z = -55
  //LEAVES
let leaves29Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves29Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves29Mesh = new THREE.Mesh(leaves29Geometry, leaves29Material);
this._scene.add(leaves29Mesh);

leaves29Mesh.position.y = 45
leaves29Mesh.position.x = -60
leaves29Mesh.position.z = -55

//TREE 30 (Pointy)
//BARK
let bark30Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark30Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark30Mesh = new THREE.Mesh(bark30Geometry, bark30Material);
this._scene.add(bark30Mesh);

bark30Mesh.position.y = 14
bark30Mesh.position.x = -60
bark30Mesh.position.z = -100
  //LEAVES
let leaves30Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves30Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves30Mesh = new THREE.Mesh(leaves30Geometry, leaves30Material);
this._scene.add(leaves30Mesh);

leaves30Mesh.position.y = 45
leaves30Mesh.position.x = -60
leaves30Mesh.position.z = -100

//TREE 31 (Pointy)
//BARK
let bark31Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark31Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark31Mesh = new THREE.Mesh(bark31Geometry, bark31Material);
this._scene.add(bark31Mesh);

bark31Mesh.position.y = 14
bark31Mesh.position.x = -60
bark31Mesh.position.z = -145
  //LEAVES
let leaves31Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves31Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves31Mesh = new THREE.Mesh(leaves31Geometry, leaves31Material);
this._scene.add(leaves31Mesh);

leaves31Mesh.position.y = 45
leaves31Mesh.position.x = -60
leaves31Mesh.position.z = -145

//TREE 32 (Pointy)
//BARK
let bark32Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark32Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark32Mesh = new THREE.Mesh(bark32Geometry, bark32Material);
this._scene.add(bark32Mesh);

bark32Mesh.position.y = 14
bark32Mesh.position.x = -60
bark32Mesh.position.z = -190
  //LEAVES
let leaves32Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves32Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves32Mesh = new THREE.Mesh(leaves32Geometry, leaves32Material);
this._scene.add(leaves32Mesh);

leaves32Mesh.position.y = 45
leaves32Mesh.position.x = -60
leaves32Mesh.position.z = -190

//TREE 33 (Pointy)
//BARK
let bark33Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark33Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark33Mesh = new THREE.Mesh(bark33Geometry, bark33Material);
this._scene.add(bark33Mesh);

bark33Mesh.position.y = 14
bark33Mesh.position.x = -60
bark33Mesh.position.z = -235
  //LEAVES
let leaves33Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves33Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves33Mesh = new THREE.Mesh(leaves33Geometry, leaves33Material);
this._scene.add(leaves33Mesh);

leaves33Mesh.position.y = 45
leaves33Mesh.position.x = -60
leaves33Mesh.position.z = -235

//TREE 36 (Pointy)
//BARK
let bark36Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark36Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark36Mesh = new THREE.Mesh(bark36Geometry, bark36Material);
this._scene.add(bark36Mesh);

bark36Mesh.position.y = 14
bark36Mesh.position.x = -60
bark36Mesh.position.z = -280
  //LEAVES
let leaves36Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves36Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves36Mesh = new THREE.Mesh(leaves36Geometry, leaves36Material);
this._scene.add(leaves36Mesh);

leaves36Mesh.position.y = 45
leaves36Mesh.position.x = -60
leaves36Mesh.position.z = -280

//TREE 37 (Pointy)
//BARK
let bark37Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark37Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark37Mesh = new THREE.Mesh(bark37Geometry, bark37Material);
this._scene.add(bark37Mesh);

bark37Mesh.position.y = 14
bark37Mesh.position.x = -60
bark37Mesh.position.z = -325
  //LEAVES
let leaves37Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves37Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves37Mesh = new THREE.Mesh(leaves37Geometry, leaves37Material);
this._scene.add(leaves37Mesh);

leaves37Mesh.position.y = 45
leaves37Mesh.position.x = -60
leaves37Mesh.position.z = -325

//TREE 38 (Pointy)
//BARK
let bark38Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark38Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark38Mesh = new THREE.Mesh(bark38Geometry, bark38Material);
this._scene.add(bark38Mesh);

bark38Mesh.position.y = 14
bark38Mesh.position.x = 60
bark38Mesh.position.z = -370
  //LEAVES
let leaves38Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves38Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves38Mesh = new THREE.Mesh(leaves38Geometry, leaves38Material);
this._scene.add(leaves38Mesh);

leaves38Mesh.position.y = 45
leaves38Mesh.position.x = 60
leaves38Mesh.position.z = -370

//////////////////////////////////////////////////////////

///////////////////////LEFT SIDE//////////////////////////
//TREE 10 (Pointy)
//BARK
let bark10Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark10Mesh = new THREE.Mesh(bark10Geometry, bark10Material);
this._scene.add(bark10Mesh);

bark10Mesh.position.y = 14
bark10Mesh.position.x = 60
bark10Mesh.position.z = 35
  //LEAVES
let leaves10Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves10Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves10Mesh = new THREE.Mesh(leaves10Geometry, leaves10Material);
this._scene.add(leaves10Mesh);

leaves10Mesh.position.y = 45
leaves10Mesh.position.x = 60
leaves10Mesh.position.z = 35

//TREE 11 (Pointy)
//BARK
let bark11Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark11Mesh = new THREE.Mesh(bark11Geometry, bark11Material);
this._scene.add(bark11Mesh);

bark11Mesh.position.y = 14
bark11Mesh.position.x = 60
bark11Mesh.position.z = 80
  //LEAVES
let leaves11Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves11Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves11Mesh = new THREE.Mesh(leaves11Geometry, leaves11Material);
this._scene.add(leaves11Mesh);

leaves11Mesh.position.y = 45
leaves11Mesh.position.x = 60
leaves11Mesh.position.z = 80

//TREE 12 (Pointy)
//BARK
let bark12Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark12Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark12Mesh = new THREE.Mesh(bark12Geometry, bark12Material);
this._scene.add(bark12Mesh);

bark12Mesh.position.y = 14
bark12Mesh.position.x = 60
bark12Mesh.position.z = 125
  //LEAVES
let leaves12Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves12Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves12Mesh = new THREE.Mesh(leaves12Geometry, leaves12Material);
this._scene.add(leaves12Mesh);

leaves12Mesh.position.y = 45
leaves12Mesh.position.x = 60
leaves12Mesh.position.z = 125

//TREE 13 (Pointy)
//BARK
let bark13Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark13Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark13Mesh = new THREE.Mesh(bark13Geometry, bark13Material);
this._scene.add(bark13Mesh);

bark13Mesh.position.y = 14
bark13Mesh.position.x = 60
bark13Mesh.position.z = 170
  //LEAVES
let leaves13Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves13Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves13Mesh = new THREE.Mesh(leaves13Geometry, leaves13Material);
this._scene.add(leaves13Mesh);

leaves13Mesh.position.y = 45
leaves13Mesh.position.x = 60
leaves13Mesh.position.z = 170

//TREE 14 (Pointy)
//BARK
let bark14Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark14Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark14Mesh = new THREE.Mesh(bark14Geometry, bark14Material);
this._scene.add(bark14Mesh);

bark14Mesh.position.y = 14
bark14Mesh.position.x = 60
bark14Mesh.position.z = 215
  //LEAVES
let leaves14Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves14Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves14Mesh = new THREE.Mesh(leaves14Geometry, leaves14Material);
this._scene.add(leaves14Mesh);

leaves14Mesh.position.y = 45
leaves14Mesh.position.x = 60
leaves14Mesh.position.z = 215

//TREE 15 (Pointy)
//BARK
let bark15Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark15Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark15Mesh = new THREE.Mesh(bark15Geometry, bark15Material);
this._scene.add(bark15Mesh);

bark15Mesh.position.y = 14
bark15Mesh.position.x = 60
bark15Mesh.position.z = 260
  //LEAVES
let leaves15Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves15Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves15Mesh = new THREE.Mesh(leaves15Geometry, leaves15Material);
this._scene.add(leaves15Mesh);

leaves15Mesh.position.y = 45
leaves15Mesh.position.x = 60
leaves15Mesh.position.z = 260

//TREE 16 (Pointy)
//BARK
let bark16Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark16Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark16Mesh = new THREE.Mesh(bark16Geometry, bark16Material);
this._scene.add(bark16Mesh);

bark16Mesh.position.y = 14
bark16Mesh.position.x = 60
bark16Mesh.position.z = 305
  //LEAVES
let leaves16Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves16Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves16Mesh = new THREE.Mesh(leaves16Geometry, leaves16Material);
this._scene.add(leaves16Mesh);

leaves16Mesh.position.y = 45
leaves16Mesh.position.x = 60
leaves16Mesh.position.z = 350

//TREE 17 (Pointy)
//BARK
let bark17Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark17Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark17Mesh = new THREE.Mesh(bark17Geometry, bark17Material);
this._scene.add(bark17Mesh);

bark17Mesh.position.y = 14
bark17Mesh.position.x = 60
bark17Mesh.position.z = 350
  //LEAVES
let leaves17Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves17Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves17Mesh = new THREE.Mesh(leaves17Geometry, leaves17Material);
this._scene.add(leaves17Mesh);

leaves17Mesh.position.y = 45
leaves17Mesh.position.x = 60
leaves17Mesh.position.z = 305

//TREE 18 (Pointy)
//BARK
let bark18Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark18Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark18Mesh = new THREE.Mesh(bark18Geometry, bark18Material);
this._scene.add(bark18Mesh);

bark18Mesh.position.y = 14
bark18Mesh.position.x = 60
bark18Mesh.position.z = 395
  //LEAVES
let leaves18Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves18Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves18Mesh = new THREE.Mesh(leaves18Geometry, leaves18Material);
this._scene.add(leaves18Mesh);

leaves18Mesh.position.y = 45
leaves18Mesh.position.x = 60
leaves18Mesh.position.z = 395

//TREE 19 (Pointy)
//BARK
let bark19Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark19Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark19Mesh = new THREE.Mesh(bark19Geometry, bark19Material);
this._scene.add(bark19Mesh);

bark19Mesh.position.y = 14
bark19Mesh.position.x = 60
bark19Mesh.position.z = -10
  //LEAVES
let leaves19Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves19Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves19Mesh = new THREE.Mesh(leaves19Geometry, leaves19Material);
this._scene.add(leaves19Mesh);

leaves19Mesh.position.y = 45
leaves19Mesh.position.x = 60
leaves19Mesh.position.z = -10

//TREE 20 (Pointy)
//BARK
let bark20Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark20Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark20Mesh = new THREE.Mesh(bark20Geometry, bark20Material);
this._scene.add(bark20Mesh);

bark20Mesh.position.y = 14
bark20Mesh.position.x = 60
bark20Mesh.position.z = -55
  //LEAVES
let leaves20Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves20Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves20Mesh = new THREE.Mesh(leaves20Geometry, leaves20Material);
this._scene.add(leaves20Mesh);

leaves20Mesh.position.y = 45
leaves20Mesh.position.x = 60
leaves20Mesh.position.z = -55

//TREE 21 (Pointy)
//BARK
let bark21Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark21Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark21Mesh = new THREE.Mesh(bark21Geometry, bark21Material);
this._scene.add(bark21Mesh);

bark21Mesh.position.y = 14
bark21Mesh.position.x = 60
bark21Mesh.position.z = -100
  //LEAVES
let leaves21Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves21Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves21Mesh = new THREE.Mesh(leaves21Geometry, leaves21Material);
this._scene.add(leaves21Mesh);

leaves21Mesh.position.y = 45
leaves21Mesh.position.x = 60
leaves21Mesh.position.z = -100

//TREE 22 (Pointy)
//BARK
let bark22Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark22Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark22Mesh = new THREE.Mesh(bark22Geometry, bark22Material);
this._scene.add(bark22Mesh);

bark22Mesh.position.y = 14
bark22Mesh.position.x = 60
bark22Mesh.position.z = -145
  //LEAVES
let leaves22Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves22Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves22Mesh = new THREE.Mesh(leaves22Geometry, leaves22Material);
this._scene.add(leaves22Mesh);

leaves22Mesh.position.y = 45
leaves22Mesh.position.x = 60
leaves22Mesh.position.z = -145

//TREE 23 (Pointy)
//BARK
let bark23Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark23Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark23Mesh = new THREE.Mesh(bark23Geometry, bark23Material);
this._scene.add(bark23Mesh);

bark23Mesh.position.y = 14
bark23Mesh.position.x = 60
bark23Mesh.position.z = -190
  //LEAVES
let leaves23Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves23Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves23Mesh = new THREE.Mesh(leaves23Geometry, leaves23Material);
this._scene.add(leaves23Mesh);

leaves23Mesh.position.y = 45
leaves23Mesh.position.x = 60
leaves23Mesh.position.z = -190

//TREE 24 (Pointy)
//BARK
let bark24Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark24Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark24Mesh = new THREE.Mesh(bark24Geometry, bark24Material);
this._scene.add(bark24Mesh);

bark24Mesh.position.y = 14
bark24Mesh.position.x = 60
bark24Mesh.position.z = -235
  //LEAVES
let leaves24Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves24Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves24Mesh = new THREE.Mesh(leaves24Geometry, leaves24Material);
this._scene.add(leaves24Mesh);

leaves24Mesh.position.y = 45
leaves24Mesh.position.x = 60
leaves24Mesh.position.z = -235

//TREE 25 (Pointy)
//BARK
let bark25Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark25Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark25Mesh = new THREE.Mesh(bark25Geometry, bark25Material);
this._scene.add(bark25Mesh);

bark25Mesh.position.y = 14
bark25Mesh.position.x = 60
bark25Mesh.position.z = -280
  //LEAVES
let leaves25Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves25Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves25Mesh = new THREE.Mesh(leaves25Geometry, leaves25Material);
this._scene.add(leaves25Mesh);

leaves25Mesh.position.y = 45
leaves25Mesh.position.x = 60
leaves25Mesh.position.z = -280

//TREE 26 (Pointy)
//BARK
let bark26Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark26Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark26Mesh = new THREE.Mesh(bark26Geometry, bark26Material);
this._scene.add(bark26Mesh);

bark26Mesh.position.y = 14
bark26Mesh.position.x = 60
bark26Mesh.position.z = -325
  //LEAVES
let leaves26Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves26Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves26Mesh = new THREE.Mesh(leaves26Geometry, leaves26Material);
this._scene.add(leaves26Mesh);

leaves26Mesh.position.y = 45
leaves26Mesh.position.x = 60
leaves26Mesh.position.z = -325

//TREE 27 (Pointy)
//BARK
let bark27Geometry = new THREE.CylinderGeometry(3.5,5,40,32);
let bark27Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/barkTexture.png'), side: THREE.DoubleSide} );
let bark27Mesh = new THREE.Mesh(bark27Geometry, bark27Material);
this._scene.add(bark27Mesh);

bark27Mesh.position.y = 14
bark27Mesh.position.x = 60
bark27Mesh.position.z = -370
  //LEAVES
let leaves27Geometry = new THREE.CylinderGeometry(0.10,15 , 55, 32, 64);
let leaves27Material = new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('images/pointyleavesTexture.png'), side: THREE.DoubleSide});
let leaves27Mesh = new THREE.Mesh(leaves27Geometry, leaves27Material);
this._scene.add(leaves27Mesh);

leaves27Mesh.position.y = 45
leaves27Mesh.position.x = 60
leaves27Mesh.position.z = -370

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
let stageGeometry = new THREE.BoxBufferGeometry(200,100,1000);
let stageGround = 
[
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/backgroundTexture.png'), side: THREE.DoubleSide}),
  new THREE.MeshBasicMaterial ({map: new THREE.TextureLoader().load('images/grassTexture.jpg'), side: THREE.DoubleSide}),
];
let stageMaterials = new THREE.MeshFaceMaterial(stageGround);
let stageCube = new THREE.Mesh(stageGeometry, stageMaterials);
this._scene.add(stageCube);
stageCube.position.x=0
stageCube.position.y=45
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
