import { vec3 } from "gl-matrix";

export class Material {
    static count = 0;

    static TYPES = {
        LAMBERTIAN: 0,
        METAL: 1,
        DIELECTRIC: 2,
    }

    constructor(options) {
        this.id = Material.count++;
        this.metalic_fuzz = options.metalic_fuzz ? options.metalic_fuzz : 0;
        this.attenuation = options.attenuation ? options.attenuation : vec3.fromValues(1, 0, 1);
        this.material_flag = options.material_flag ? options.material_flag : Material.TYPES.LAMBERTIAN;
    }
}