import * as React from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';
var TrackballControls = require('three-trackballcontrols');


interface Props {
    color: string;
    detail: number;
}

interface State {
    currentDetail: number;
    windowWidth: number;
    windowHeight: number;
}

interface Location {
    lat: number;
    lng: number;
    altitude: number;
}

class Globe extends React.Component<Props, State> {
    private container: React.RefObject<HTMLDivElement>
    private globeModel: THREE.Mesh;

    constructor(props: Props){
        super(props);
        this.state = { 
            currentDetail: props.detail || 1,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        this.globeModel = this.genModel();
        this.container = React.createRef();
    }

    render() {
        return (
            <div className="globe">
                <div className="container" ref={this.container}/>
            </div>
          );

    }  

    /* Takes a location (lat, lng) and converts it to a Spherical coord

        param: location Location, lat, lng and altitute
        returns: point SpherePoint, x, y, z
    */
    locationToSphereCoord(location: Location){
        // TODO Some maths stuff
        let r: number = 6.371;
        const lat = this.degree2rad(location.lat);
        const lng = this.degree2rad(location.lng)
        const x = r * Math.cos(lng) * Math.cos(lat);
        const y = r * Math.cos(lng) * Math.sin(lat);
        const z = r * Math.sin(lng);
        let point = new THREE.Vector3(x, y, z);

        return point
    }

    degree2rad(val: number){
        return Math.PI/180 * val;
    }

    genModel(){
        const geometry = new THREE.SphereGeometry(6.371, 50, 50,0, Math.PI * 2, 0, Math.PI * 2);       
        var material = new THREE.MeshNormalMaterial();
        const edges = new THREE.EdgesGeometry(geometry);
        // new THREE.LineBasicMaterial( { color: 0xBF616A });
        return new THREE.Mesh(geometry, material);
        
    }

    handleResize = (e: Event) => {
        console.log("Window resize detected");
        this.setState({ 
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
    }

    componentDidMount() {
        // TODO : Add WebGL detection
        console.log("Component mounted");
        // Handle resize events
        window.addEventListener('resize', this.handleResize);

        // Grab the container dom ref
        let container = this.container.current;
        // Check if the container is present
        if(!container){
            throw Error("Globe container not found");
        }

        // Getting the component width and height from the state
        const width = this.state.windowWidth;
        const height = this.state.windowHeight;

        // Scene creation
        let scene = new THREE.Scene();
        // Camera definition
        let camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        // Renderer definition
        let renderer = new THREE.WebGLRenderer();
        let bgColor = new THREE.Color("#3B4252");
        renderer.setClearColor(bgColor, 1)

        // Add the container to the renderer element
        container.appendChild(renderer.domElement);

        let globe = this.globeModel;
        // Add the globe model to the scene
        scene.add(globe);

        // Point plotting test
        const testLocation: Location = {
            lat: 10,
            lng: 10,
            altitude: 0
        }

        const center: Location = {
            lat: 0,
            lng: 0,
            altitude: 0
        }

        const london: Location = {
            lat: 51.5074,
            lng: 0.1278,
            altitude: 0
        }


        const testPoint = this.locationToSphereCoord(testLocation);
        const testPoint1 = this.locationToSphereCoord(london);

        console.log("Sphere point:" + JSON.stringify(testPoint));
        camera.position.z = 12;

        var dotGeometry = new THREE.Geometry();
        dotGeometry.vertices.push(testPoint);
        dotGeometry.vertices.push(testPoint1);

        var dotMaterial = new THREE.PointsMaterial( { size: 10, sizeAttenuation: false } );
        var dot = new THREE.Points( dotGeometry, dotMaterial );
        scene.add(dot);


        const controls = new TrackballControls(camera);

        scene.add(new THREE.AmbientLight(0x333333));

        var light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5,3,5);
        scene.add(light);

        /*
        Render Loop
            - Check for container size adjustments
            - Update camera based on current container size
            - Apply globe transformations
            - Render the scene
            - Animate (call render again)
        */
        var render = () => {
            // Check for resize
            controls.update();
            const width: number = this.state.windowWidth;
            const height: number = this.state.windowHeight;
            // Update camera aspect ratio
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            // Sphere rotation
            // globe.rotation.y += 0.001;
            // Update rederer size and render
            renderer.setSize(width, height);
            renderer.render( scene, camera );
            requestAnimationFrame(render);
        };

        // Initial render call
        render();

    }

}

export default Globe;
