import { mat4, vec3, vec2, quat } from "gl-matrix";
import { Transform } from "./Transform";
import { Input } from "./Input";
import { Time } from "./Time";

export class PerspectiveCamera {
    constructor(options) {

        this.transform = new Transform( {} );
        this.fov = options.fov * Math.PI / 180;
        this.aspect = options.aspect;
        this.near = options.near;
        this.far = options.far;
        this.fov_direction = 0;
        this.image_size = options.image_size;
        this.panini_distance = 0;
        this.panini_vertical_compression = 0;
        this.camera_fov_distance = 0;
        this.lens_focal_length = options.lens_focal_length;
        this.fstop = options.fstop;
        this.image_plane_distance = options.image_plane_distance;

        this.useControlls = true;
        this.speed = 5;
        this.rotateSpeed = 0.6;

        this.hasMoved = false;

        this.gui = null;
        this.rect = null;

        this.projectionMatrix = mat4.create();
        mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);

        this.viewMatrix = mat4.create();
        this.createCameraBuffer();
    }

    createCameraBuffer(){
        this.cameraBufferValues = new ArrayBuffer(112);
        this.cameraBufferViews = {
            camera_to_world_matrix: new Float32Array(this.cameraBufferValues, 0, 16),
            fov_angle: new Float32Array(this.cameraBufferValues, 64, 1),
            fov_direction: new Uint32Array(this.cameraBufferValues, 68, 1),
            image_size: new Float32Array(this.cameraBufferValues, 72, 2),
            panini_distance: new Float32Array(this.cameraBufferValues, 80, 1),
            panini_vertical_compression: new Float32Array(this.cameraBufferValues, 84, 1),
            camera_fov_distance: new Float32Array(this.cameraBufferValues, 88, 1),
            lens_focal_length: new Float32Array(this.cameraBufferValues, 92, 1),
            fstop: new Float32Array(this.cameraBufferValues, 96, 1),
            image_plane_distance: new Float32Array(this.cameraBufferValues, 100, 1),
        };
    }

    updateCameraBuffer(){
        let invertedMatrix = mat4.create();
        mat4.invert(invertedMatrix, this.viewMatrix);
        this.cameraBufferViews.camera_to_world_matrix.set(invertedMatrix);
        this.cameraBufferViews.fov_angle[0] = this.fov;
        this.cameraBufferViews.fov_direction[0] = this.fov_direction;
        //May need to change this..
        this.cameraBufferViews.image_size[0] = this.image_size[0];
        this.cameraBufferViews.image_size[1] = this.image_size[1];
        this.cameraBufferViews.panini_distance[0] = this.panini_distance;
        this.cameraBufferViews.panini_vertical_compression[0] = this.panini_vertical_compression;
        this.cameraBufferViews.camera_fov_distance[0] = this.camera_fov_distance;
        this.cameraBufferViews.lens_focal_length[0] = this.lens_focal_length;
        this.cameraBufferViews.fstop[0] = this.fstop;
        this.cameraBufferViews.image_plane_distance[0] = this.image_plane_distance;
    }

    update(){
        if(this.useControlls){
            this.controllsUpdate();
        }

        this.transform.update();
        let flipZ = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, -1));
        mat4.invert(this.viewMatrix, this.transform.TRS);
        mat4.multiply(this.viewMatrix, flipZ, this.viewMatrix);
        this.updateCameraBuffer();
    }

    setGui(gui){
        this.gui = gui;
        this.rect = gui.domElement.getBoundingClientRect();
    }

    isMouseOverGui(){
        if(this.rect){
            return (Input.mousePosition.x > this.rect.left && Input.mousePosition.x < this.rect.right && Input.mousePosition.y > this.rect.top && Input.mousePosition.y < this.rect.bottom);
        }
        return false;
    }


    controllsUpdate(){
        this.smoothDeltaMouse = this.smoothDeltaMouse || vec2.create();
        this.smoothingFactor = 0.16;
        this.hasMoved = false;

        if(Input.isKeyDown('w')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.forward, this.speed * Time.deltaTime));
            this.hasMoved = true;
        }
        if(Input.isKeyDown('s')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.forward, -1 * this.speed * Time.deltaTime));
            this.hasMoved = true;
        }
        if(Input.isKeyDown('a')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.right, -1 * this.speed * Time.deltaTime));
            this.hasMoved = true;
        }
        if(Input.isKeyDown('d')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.right, this.speed * Time.deltaTime));
            this.hasMoved = true;
        }
        if(Input.isKeyDown('q')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.up, -1 * this.speed * Time.deltaTime));
            this.hasMoved = true;
        }
        if(Input.isKeyDown('e')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.up, this.speed * Time.deltaTime));
            this.hasMoved = true;
        }

        if(Input.isMouseDown(0) && !this.isMouseOverGui()){
            const currentDeltaMouse = vec2.fromValues(Input.deltaMouse.x, Input.deltaMouse.y);
            vec2.lerp(this.smoothDeltaMouse, this.smoothDeltaMouse, currentDeltaMouse, this.smoothingFactor);
            const deltaMouse = this.smoothDeltaMouse;
            const qX = quat.setAxisAngle(quat.create(), vec3.fromValues(0,1,0), -deltaMouse[0] * Time.deltaTime * this.rotateSpeed);
            const qY = quat.setAxisAngle(quat.create(), this.transform.right , -deltaMouse[1] * Time.deltaTime * this.rotateSpeed);
            const q = quat.multiply(quat.create(), qX, qY);
            const R = mat4.fromQuat(mat4.create(), q);
            const invP = mat4.fromTranslation(mat4.create(), this.transform.position);
            mat4.multiply(R, invP, R);
            mat4.multiply(R, R, mat4.invert(mat4.create(), invP));
            vec3.transformMat4(this.transform.position, this.transform.position, R);
            quat.multiply(this.transform.rotation, q, this.transform.rotation);
            this.hasMoved = true;
        }
    }
}

