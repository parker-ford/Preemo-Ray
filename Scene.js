
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
                const MaterialDataValues = new ArrayBuffer(this.material_size);
                const MaterialDataViews = {
                    color: new Float32Array(MaterialDataValues, 0, 3),
                    emissive_strength: new Float32Array(MaterialDataValues, 12, 1),
                    emissive_color: new Float32Array(MaterialDataValues, 16, 3),
                }
                MaterialDataViews.color.set(material.color);
                MaterialDataViews.emissive_strength[0] = material.emissive_strength;
                MaterialDataViews.emissive_color.set(material.emissive_color);

                const materialView = new Uint8Array(MaterialDataValues);
                const allMaterialsView = new Uint8Array(this.materials_data, material_offset * this.material_size, this.material_size);
                allMaterialsView.set(materialView);
                material_offset++;
            });
        });
    }
}