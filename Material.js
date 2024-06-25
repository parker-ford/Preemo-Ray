import { vec3 } from "gl-matrix";

export class Material {
    static count = 0;
    constructor(options) {
        this.id = Material.count++;
        this.color = options.color ? options.color : vec3.fromValues(1, 0, 0);
        this.emissive_color = options.emissive_color ? options.emissive_color : vec3.fromValues(0, 0, 0);
        this.emissive_strength = options.emissive_strength ? options.emissive_strength : 0;
    }
}