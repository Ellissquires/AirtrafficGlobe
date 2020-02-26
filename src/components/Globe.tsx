import * as React from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';
var OrbitControls = require('three-orbitcontrols');
var TrackballControls = require('three-trackballcontrols');
var d3 = require('d3-geo');

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
    private radius: number;

    constructor(props: Props){
        super(props);
        this.state = { 
            currentDetail: props.detail || 1,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        this.radius = 6.371;
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
    locationToSphereCoord(location: Location, altitude: number = 0){
        const DEGREE_TO_RADIAN = Math.PI/180

        const lat = location.lat;
        const lng = location.lng
        const r = this.radius + altitude;
        const phi = (90 - lat) * DEGREE_TO_RADIAN;
        const theta = (lng + 180) * DEGREE_TO_RADIAN;
      
        let point = new THREE.Vector3(
          - r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );

        return point
    }

    clamp(num: number, min: number, max: number) {
        return num <= min ? min : (num >= max ? max : num);
    }

    getSplineFromLocations(start: Location, end: Location){
        const CURVE_MIN_ALTITUDE = 2;
        const CURVE_MAX_ALTITUDE = 20;

        const startPoint = this.locationToSphereCoord(start);
        const endPoint = this.locationToSphereCoord(end);

        // altitude
        const altitude = this.clamp(startPoint.distanceTo(endPoint) * .75, CURVE_MIN_ALTITUDE, CURVE_MAX_ALTITUDE);

        // 2 control points
        const interpolate = d3.geoInterpolate([start.lng, start.lat], [end.lng, end.lat]);
        let midCoord1: Location = this.d3ToLocation(interpolate(0.25));
        let midCoord2: Location = this.d3ToLocation(interpolate(0.75));

        console.log(midCoord1);

        const mid1 = this.locationToSphereCoord(midCoord1, altitude);
        const mid2 = this.locationToSphereCoord(midCoord2, altitude);

        return {
            startPoint,
            endPoint,
            spline: new THREE.CubicBezierCurve3(startPoint, mid1, mid2, endPoint)
        };
    }

    d3ToLocation(d3Coord: any){
        const location: Location = {
            lat: d3Coord[1],
            lng: d3Coord[0],
            altitude: 0
        };
        return location 
    }



    genModel(){
        const geometry = new THREE.SphereGeometry(this.radius, 50, 50,0, Math.PI * 2, 0, Math.PI * 2);       
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


        camera.position.z = 12;


        const curve = this.getSplineFromLocations(center, london);

        var points = curve.spline.getPoints( 50 );
        var geometry = new THREE.BufferGeometry().setFromPoints( points );

        var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

        // Create the final object to add to the scene
        var curveObject = new THREE.Line( geometry, material );
        scene.add(curveObject);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true
        controls.dampingFactor = 0.25

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
            globe.rotation.y += 1;
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
