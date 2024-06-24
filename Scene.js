import { Sphere } from './Sphere.js';

export class Scene {

    constructor() {
        this.objects = [];
        this.parameters_updated = false;

        //Spheres
        this.spheres = [];
        this.spheres_count = 0;
        this.spheres_data = new ArrayBuffer(0);
        this.sphere_size = 32;
        
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

            var sphere_offset = 0;
            this.spheres.forEach(sphere => {
                const SphereDataValues = new ArrayBuffer(this.sphere_size);
                const SphereDataViews = {
                    pos: new Float32Array(SphereDataValues, 0, 3),
                    radius: new Float32Array(SphereDataValues, 12, 1),
                    color: new Float32Array(SphereDataValues, 16, 3),
                };
                SphereDataViews.pos.set(sphere.position);
                SphereDataViews.radius[0] = sphere.radius;
                SphereDataViews.color.set(sphere.color);

                const sphereView = new Uint8Array(SphereDataValues);
                const allLightsView = new Uint8Array(this.spheres_data, sphere_offset * this.sphere_size, this.sphere_size);
                allLightsView.set(sphereView);
                sphere_offset++;
            });
        });
    }
}