import { vec3 } from "gl-matrix";

export class Material {
    static count = 0;
    static size = 48;

    static TYPES = {
        LAMBERTIAN: 0,
        METAL: 1,
        DIELECTRIC: 2,
        EMISSIVE: 3,
    }

    constructor(options) {
        this.id = Material.count++;
        this.metalic_fuzz = options.metalic_fuzz ? options.metalic_fuzz : 0;
        this.attenuation = options.attenuation ? options.attenuation : vec3.fromValues(1, 0, 1);
        this.material_flag = options.material_flag ? options.material_flag : Material.TYPES.LAMBERTIAN;
        this.refractive_index = options.refractive_index ? options.refractive_index : 1.0;
        this.emissive_color = options.emissive_color ? options.emissive_color : vec3.fromValues(0, 0, 0);
        this.emissive_strength = options.emissive_strength ? options.emissive_strength : 0;
    }
}