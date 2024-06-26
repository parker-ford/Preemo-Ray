
import { Sphere } from './Sphere.js';
import { Material } from './Material.js';

export class Scene {

    constructor() {
        this.objects = [];
        this.parameters_updated = false;

        //Spheres
        this.spheres = [];
        this.spheres_count = 0;
        this.spheres_data = new ArrayBuffer(0);
        this.sphere_size = 32;

        //Triangles
        this.triangles = [];
        this.triangles_count = 0;
        this.triangles_data = new ArrayBuffer(0);
        this.triangle_size = 32;

        //Materials
        this.materials = [];
        this.materials_count = 0;
        this.materials_data = new ArrayBuffer(0);
        this.material_size = 32;
        
        //Debug
        this.print = false;
    }

    add(object) {
        this.objects.push(object);
        if(object instanceof Sphere){
            this.spheres.push(object);
            this.spheres_data = new ArrayBuffer(this.spheres_data.byteLength + this.sphere_size);
            this.spheres_count++;
        }
        if(object instanceof Material){
            this.materials.push(object);
            this.materials_data = new ArrayBuffer(this.materials_data.byteLength + this.material_size);
            this.materials_count++;
        }
    }

    remove(object) {
        
    }

    //TODO: I bet this doesn't work but I don't think I'll care until later
    clear() {
        this.objects = [];
        this.object_count = 0;
    }

    update(){
        this.parameters_updated = false;
        this.objects.forEach(element => {
            
            if(typeof element.update === 'function'){
                element.update();
            }

            //Update Spheres
            //TODO: This does not need to happen each frame
            var sphere_offset = 0;
            this.spheres.forEach(sphere => {
                const SphereDataValues = new ArrayBuffer(this.sphere_size);
                const SphereDataViews = {
                    pos: new Float32Array(SphereDataValues, 0, 3),
                    radius: new Float32Array(SphereDataValues, 12, 1),
                    material_index: new Uint32Array(SphereDataValues, 16, 1),
                };
                SphereDataViews.pos.set(sphere.position);
                SphereDataViews.radius[0] = sphere.radius;
                SphereDataViews.material_index[0] = sphere.material_id;

                const sphereView = new Uint8Array(SphereDataValues);
                const allLightsView = new Uint8Array(this.spheres_data, sphere_offset * this.sphere_size, this.sphere_size);
                allLightsView.set(sphereView);
                sphere_offset++;
            });

            //Update Materials
            var material_offset = 0;
            this.materials.forEach(material => {
                const MaterialValues = new ArrayBuffer(this.material_size);
                const MaterialViews = {
                    attenuation: new Float32Array(MaterialValues, 0, 3),
                    metalic_fuzz: new Float32Array(MaterialValues, 12, 1),
                    material_flag: new Uint32Array(MaterialValues, 16, 1),
                }
                MaterialViews.attenuation.set(material.attenuation);
                MaterialViews.metalic_fuzz[0] = material.metalic_fuzz;
                MaterialViews.material_flag[0] = material.material_flag;

                const materialView = new Uint8Array(MaterialValues);
                const allMaterialsView = new Uint8Array(this.materials_data, material_offset * this.material_size, this.material_size);
                allMaterialsView.set(materialView);
                material_offset++;
            });
        });
    }
}