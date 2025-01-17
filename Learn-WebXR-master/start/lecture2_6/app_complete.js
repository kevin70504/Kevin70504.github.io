import * as THREE from '../../libs/three/three.module.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { FBXLoader } from '../../libs/three/jsm/FBXLoader.js';
import { RGBELoader } from '../../libs/three/jsm/RGBELoader.js';
import { OrbitControls } from '../../libs/three/jsm/OrbitControls.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
//import { vector3ToString } from '../../libs/DebugUtils.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 4, 14 );
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xaaaaaa );

		const ambient = new THREE.HemisphereLight(0xffffff, 0x666666, 0.3);
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        light.position.set( 0.2, 1, 1.5);
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = true;
        container.appendChild( this.renderer.domElement );

        this.setEnvironment();

        this.loadingBar = new LoadingBar();
        this.loadGLTF();

        //Add code here
        
        
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set(0, 4, 0);
        this.controls.update();
        
        window.addEventListener('resize', this.resize.bind(this) );
	}	
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
    
    loadGLTF(){
        const loader = new GLTFLoader().setPath('../../assets/');
        const self = this;
        
        loader.load(
            'office-chair.glb',
            
            function(gltf){

                self.chair = gltf.scene; //將場景設定為椅子，我們可以用Render的方式將椅子旋轉
                self.scene.add(gltf.scene);  //將gtlf添加到場景內
                self.loadingBar.visible = false; //隱藏讀取條
                self.renderer.setAnimationLoop(self.render.bind(self)); //開始渲染場景
            },
            function(xhr){
                self.loadingBar.progress = (xhr.loaded / xhr.total); //得到0-1的讀取值，用來更新讀取條

            },
            function(err){
                console.log('An error happened'); //當錯誤回傳 An error happened訊息
            }
        )
    }
    
    loadFBX(){
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render( ) {   
        this.chair.rotateY( 0.01 );
        this.renderer.render( this.scene, this.camera );
    }
}

export { App };