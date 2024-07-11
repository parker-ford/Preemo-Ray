import { vec3 } from "gl-matrix";

export class Triangle {
    constructor(options){
        this.pos_a = options.pos_a || [0, 0, 0];
        this.pos_b = options.pos_b || [0, 0, 0];
        this.pos_c = options.pos_c || [0, 0, 0];
        this.uv_a = options.uv_a || [0, 0];
        this.uv_b = options.uv_b || [0, 0];
        this.uv_c = options.uv_c || [0, 0];
        this.normal_a = options.normal_a || [0, 0, 0];
        this.normal_b = options.normal_b || [0, 0, 0];
        this.normal_c = options.normal_c || [0, 0, 0];
        this.centroid = this.calculateCenter();
    }

    calculateCenter(){
        let center = vec3.add(vec3.create(), this.pos_a, this.pos_b, this.pos_c);
        vec3.scale(center, center, 1/3);
        return center;
    }
}