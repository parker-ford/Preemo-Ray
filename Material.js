import { vec3 } from "gl-matrix";

export default class Material {
    static count = 0;
    
    static size = 48;

    static TYPES = {
        LAMBERTIAN: 0,
        METAL: 1,
        DIELECTRIC: 2,
        EMISSIVE: 3,
    }

    constructor({
        metalic_fuzz = 0,
        attenuation = vec3.fromValues(1, 0, 1),
        material_flag = Material.TYPES.LAMBERTIAN,
        refractive_index = 1.0,
        emissive_color = vec3.fromValues(0, 0, 0),
        emissive_strength = 0

    }) {
        this.id = Material.count;
        Material.count += 1;
        this.metalic_fuzz = metalic_fuzz;
        this.attenuation = attenuation;
        this.material_flag = material_flag;
        this.refractive_index = refractive_index;
        this.emissive_color = emissive_color;
        this.emissive_strength = emissive_strength;
    }
}