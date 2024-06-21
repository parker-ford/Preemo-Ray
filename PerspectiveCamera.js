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

        this.useControlls = true;
        this.speed = 5;
        this.rotateSpeed = 0.6;

        this.gui = null;
        this.rect = null;

        this.projectionMatrix = mat4.create();
        mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);

        this.viewMatrix = mat4.create();
    }

    update(){
        if(this.useControlls){
            this.controllsUpdate();
        }

        this.transform.update();
        let flipZ = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, -1));
        mat4.invert(this.viewMatrix, this.transform.TRS);
        mat4.multiply(this.viewMatrix, flipZ, this.viewMatrix);
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

        if(Input.isKeyDown('w')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.forward, this.speed * Time.deltaTime));
        }
        if(Input.isKeyDown('s')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.forward, -1 * this.speed * Time.deltaTime));
        }
        if(Input.isKeyDown('a')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.right, -1 * this.speed * Time.deltaTime));
        }
        if(Input.isKeyDown('d')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.right, this.speed * Time.deltaTime));
        }
        if(Input.isKeyDown('q')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.up, -1 * this.speed * Time.deltaTime));
        }
        if(Input.isKeyDown('e')){
            vec3.add(this.transform.position, this.transform.position, vec3.scale(vec3.create(), this.transform.up, this.speed * Time.deltaTime));
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
        }
    }
}

