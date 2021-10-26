import * as THREE from '../../libs/three125/three.module.js';
import { BufferGeometryUtils } from '../../libs/three125/BufferGeometryUtils.js';
import { ARButton } from '../../libs/ARButton.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();

		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
        ambient.position.set( 0.5, 1, 0.25 );
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        light.position.set( 0.2, 1, 1);
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        
        const labelContainer = document.createElement('div');
        labelContainer.style.position = 'absolute';
        labelContainer.style.top = '0px';
        labelContainer.style.pointerEvents = 'none';
        labelContainer.setAttribute('id', 'container');
        container.appendChild(labelContainer);
        this.labelContainer = labelContainer;
        
        this.workingVec3 = new THREE.Vector3();
        this.labels = [];
        this.measurements = [];
        
        this.initScene();
        this.setupXR();
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
		
		window.addEventListener('resize', this.resize.bind(this));
        
	}
	
    resize(){ 
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }	
    
    getCenterPoint(points) {
        //�����Ӥ��P���I
        let line = new THREE.Line3(...points)
        //�Q��getCenter���覡�N���I���Ȧ^�ǵ�line
        return line.getCenter( new THREE.Vector3() );
    }

    initLine(point) {
        //�w�q�򥻪��u�A�C��A�e��
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 5,
            linecap: 'round' //�u�q���ݼW�[�ꨤ
        });

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([point, point]); //�ŧilineGeometry�A��m�Ӧ۩�point
        return new THREE.Line(lineGeometry, lineMaterial); //�ϥ�lineGeometry�MlineMaterial�Ыؽu�æ^��
    }

    updateLine(matrix, line) {
        //�ѩ�ϥ�buffergeometry,�䪺��m�x�s�bFloat32Array
        // Index[0] = start.x
        // Index[1] = start.y
        // Index[2] = start.z
        // Index[3] = end.x
        // Index[4] = end.y
        // Index[5] = end.z
        const positions = line.geometry.attributes.position.array;
        positions[3] = matrix.elements[12] //x
        positions[4] = matrix.elements[13] //y
        positions[5] = matrix.elements[14] //z
        line.geometry.attributes.position.needsUpdate = true; //��m�ݭn��s
        line.geometry.computeBoundingSphere(); //�ֳt���ճo���u�O�_�b�۾���������
    }

    initReticle() {
        let ring = new THREE.RingBufferGeometry(0.045, 0.05, 32).rotateX(- Math.PI / 2);
        let dot = new THREE.CircleBufferGeometry(0.005, 32).rotateX(- Math.PI / 2);
        const reticle = new THREE.Mesh(
            BufferGeometryUtils.mergeBufferGeometries([ring, dot]),
            new THREE.MeshBasicMaterial()
        ); //�ϥ�BufferGeometryUtils.mergeBufferGeometries�X��ring�Mdot
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        return reticle;
    }

    getDistance(points) {
        //��points ����2�ɡA�^�Ǳq�Ĥ@�Ӱ}�C�ƭȨ�ĤG�Ӱ}�C�ƭ�
        if (points.length == 2) return points[0].distanceTo(points[1]);
    }
    
    toScreenPosition(point, camera){
        const width = window.innerWidth;
        const height = window.innerHeight;
        const vec = this.workingVec3;
        
        vec.copy(point);
        vec.project(camera);

        vec.x = (vec.x + 1) * width /2;
        vec.y = (-vec.y + 1) * height/2;
        vec.z = 0;

        return vec

    }
    
    initScene(){
        this.reticle = this.initReticle();
  
        this.scene.add( this.reticle );
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        
        const btn = new ARButton( this.renderer, { sessionInit: { requiredFeatures: [ 'hit-test' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );
        
        const self = this;

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
        
        function onSelect() {
            if (self.reticle.visible){
                //Step 1 - add the reticle position to the measurments array
                //�B�J1 - �N�нu��m�[����q�}�C��

                const pt = new THREE.Vector3(); // �ŧipt���T���V�q
                pt.setFromMatrixPosition(self.reticle.matrix); //�q�ܴ��x�}(�нu)�����ڦ�m
                self.measurements.push(pt); //�N��ڦ�m�[�imeasurements�}�C��

                if (self.measurements.length == 2) {
                    //Step 2 - we have a completed line so get its length, create a label and reset the measurements array and currentLine
                    // �p�G�ڭ̦��@�����㪺�u�A�ڭ�����������׳Ыؼ��ҡA�í��mmeasurements�}�C�M��e�u�q

                    const distance = Math.round(self.getDistance(self.measurements) * 100); //�ϥδ��q�Z���A������u������

                    const text = document.createElement("div"); //�ŧitext�ܼƨæb�䤤��Jdiv����
                    text.className = "label"; //text�W�r
                    text.style.color = "rgb(255,255,255)"; //text�C��
                    text.textContent = distance + "cm"; //text���e
                    document.querySelector("#container").appendChild(text);

                    self.labels.push({ div: text, point: self.getCenterPoint(self.measurements) }); //�N�I�@�����Ҫ��@�����x�s�b���Ұ}�C��
                    self.measurements = [];
                    self.currentLine = null;

                } else {
                    //Step 3 - create a new line
                    //�B�J�T - �Ыؽu
                    self.currentLine = self.initLine(self.measurements[0]); //�ϥ�measurements�}�C���Ĥ@�ӭ�
                    self.scene.add(self.currentLine); //�Ыطs���u
                
                }
            }
        }

        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'select', onSelect );
        
        this.scene.add( this.controller );    
    }
    
    requestHitTestSource(){
        const self = this;
        
        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        if ( hitTestResults.length ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            this.reticle.visible = true;
            this.reticle.matrix.fromArray( pose.transform.matrix );
            
            //Step 4 - if we have an active line then position the end point of the line at the reticle
            //�B�J4 - �p�G�ڭ̦��@���i�H���ʪ��u�A�h�N�u�����I�w��b�нu�B
            if (this.currentLine) this.updateLine(this.reticle.matrix, this.currentLine);

        } else {

            this.reticle.visible = false;

        }

    }            

    render( timestamp, frame ) {

        const self = this;
        
        if ( frame ) {

            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );

        }
        
        //Step 5 - update the labels positions
        this.labels.forEach(label => {
            const pos = self.toScreenPosition(label.point, self.renderer.xr.getCamera(self.camera));
            label.div.style.transform = `translate(-50%, -50%) translate(${pos.x}px,${pos.y}px)`;

        })

        this.renderer.render( this.scene, this.camera );
    }
}

export { App };
