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
    altitude?: number;
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
        this.container = React.createRef();
        this.globeModel = this.genModel();
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
      
        const point = new THREE.Vector3(
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
        const CURVE_MIN_ALTITUDE = 0.4;
        const CURVE_MAX_ALTITUDE = 1;

        const startPoint = this.locationToSphereCoord(start);
        const endPoint = this.locationToSphereCoord(end);

        // altitude
        const altitude = this.clamp(startPoint.distanceTo(endPoint) * .75, CURVE_MIN_ALTITUDE, CURVE_MAX_ALTITUDE);

        // 2 control points
        const interpolate = d3.geoInterpolate([start.lng, start.lat], [end.lng, end.lat]);
        const midCoord1: Location = this.d3ToLocation(interpolate(0.25));
        const midCoord2: Location = this.d3ToLocation(interpolate(0.75));

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
        var geometry   = new THREE.SphereGeometry(this.radius, 32, 32)
        var material  = new THREE.MeshPhongMaterial()
        material.map    = THREE.ImageUtils.loadTexture('/water_16k.png')
        material.bumpMap = THREE.ImageUtils.loadTexture('/elev_bump_16k.jpg')
        material.bumpScale = 16 * 0.05
        var mesh = new THREE.Mesh(geometry, material)
        return mesh;

    }

    handleResize(e: Event) {
        console.log(this);
        this.setState({ 
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
    }

    componentDidMount() {
        // TODO : Add WebGL detection
        console.log("Component mounted");
        // Handle resize events
        window.addEventListener('resize', this.handleResize.bind(this));

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
        const scene = new THREE.Scene();
        // Camera definition
        const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        camera.position.z = 12;
        // Renderer definition
        const renderer = new THREE.WebGLRenderer();
        const bgColor = new THREE.Color("#2E3440");
        renderer.setClearColor(bgColor, 1)

        // Add the container to the renderer element
        container.appendChild(renderer.domElement);

        const globe = this.globeModel;
        // Add the globe model to the scene
        scene.add(globe);
        
        const london: Location = {
            lat: 51.5074,
            lng: 0.1278
        }

        const madrid: Location = {
            lat: 40.4378,
            lng: -3.8196
        }

        const curve = this.getSplineFromLocations(london, madrid);

        const points = curve.spline.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial( { 
            color : 0xE5E9F0,
            linewidth: 4,
         } );

        // Create the final object to add to the scene
        const curveObject = new THREE.Line(geometry, material);
        scene.add(curveObject);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true
        controls.dampingFactor = 0.25

        // scene.add(new THREE.AmbientLight(0x333333));

        var light = new THREE.HemisphereLight( 0x81A1C1, 0x5E81AC, 1 );
        scene.add( light );

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
            // globe.rotation.y += 0.01;
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
