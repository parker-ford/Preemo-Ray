import { vec3 } from "gl-matrix";

export class BoundingBox {

    static size = 32

    constructor(){
        this.min = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        this.max = vec3.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    }

    addPoint(point){
        this.min = vec3.min(vec3.create(), this.min, point);
        this.max = vec3.max(vec3.create(), this.max, point);
    }

    addTriangle(triangle){
        this.addPoint(triangle.pos_a);
        this.addPoint(triangle.pos_b);
        this.addPoint(triangle.pos_c);
    }
}