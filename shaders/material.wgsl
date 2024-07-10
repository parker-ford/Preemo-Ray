const MATERIAL_LAMBERTIAN: u32 = 0u;
const MATERIAL_METAL: u32 = 1u;
const MATERIAL_DIELECTRIC: u32 = 2u;
const MATERIAL_EMISSIVE: u32 = 3u;


struct Material {
    attenuation: vec3<f32>,
    metalic_fuzz: f32,
    emissive_color: vec3<f32>,
    emissive_strength: f32,
    material_flag: u32,
    refractive_index: f32,
}

