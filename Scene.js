
import { Sphere } from './Sphere.js';
import { Material } from './Material.js';
import { Mesh } from './Meshes/Mesh.js';
import { vec3, vec4 } from 'gl-matrix';

export class Scene {

    constructor() {
        this.objects = [];
        this.parameters_updated = false;
        this.has_setup_buffers = false;

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

        //Meshes
        this.meshes = [];
        this.meshes_count = 0;
        this.triangle_count = 0;
        this.meshes_data = new ArrayBuffer(0);
        
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
        if(object instanceof Mesh){
            this.meshes.push(object);
            this.meshes_data = new ArrayBuffer(this.meshes_data.byteLength + object.getSize());
            this.meshes_count++;
            this.triangle_count += object.triangle_count;
        }
    }

    remove(object) {
        
    }

    //TODO: I bet this doesn't work but I don't think I'll care until later
    clear() {
        this.objects = [];
        this.object_count = 0;
    }


    setupBuffers(){
        this.setupSphereBuffer();
        this.setupMaterialBuffer();
        this.setupMeshBuffer();
        this.has_setup_buffers = true;
    }

    setupSphereBuffer(){
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
    }

    setupMaterialBuffer(){
        var material_offset = 0;
        this.materials.forEach(material => {
            const MaterialValues = new ArrayBuffer(this.material_size);
            const MaterialViews = {
                attenuation: new Float32Array(MaterialValues, 0, 3),
                metalic_fuzz: new Float32Array(MaterialValues, 12, 1),
                material_flag: new Uint32Array(MaterialValues, 16, 1),
                refractive_index: new Float32Array(MaterialValues, 20, 1),
            }
            MaterialViews.attenuation.set(material.attenuation);
            MaterialViews.metalic_fuzz[0] = material.metalic_fuzz;
            MaterialViews.material_flag[0] = material.material_flag;
            MaterialViews.refractive_index[0] = material.refractive_index;

            const materialView = new Uint8Array(MaterialValues);
            const allMaterialsView = new Uint8Array(this.materials_data, material_offset * this.material_size, this.material_size);
            allMaterialsView.set(materialView);
            material_offset++;
        });
    }

    setupMeshBuffer(){
        var mesh_offset = 0;
        this.meshes.forEach(mesh => {
            mesh.triangles.forEach(triangle => {

                //Convert to world space. This is being done on CPU side because it simple and only will happen once for now. This prevents real-time animation. I will revisit this at a later time.
                //This should also be in its own function probably but....
                var world_pos_a = vec4.fromValues(triangle.pos_a[0], triangle.pos_a[1], triangle.pos_a[2], 1);
                world_pos_a = vec4.transformMat4(vec4.create(), world_pos_a, mesh.transform.TRS);
                triangle.pos_a = vec3.fromValues(world_pos_a[0], world_pos_a[1], world_pos_a[2]);

                let world_pos_b = vec4.fromValues(triangle.pos_b[0], triangle.pos_b[1], triangle.pos_b[2], 1);
                world_pos_b = vec4.transformMat4(vec4.create(), world_pos_b, mesh.transform.TRS);
                triangle.pos_b = vec3.fromValues(world_pos_b[0], world_pos_b[1], world_pos_b[2]);

                let world_pos_c = vec4.fromValues(triangle.pos_c[0], triangle.pos_c[1], triangle.pos_c[2], 1);
                world_pos_c = vec4.transformMat4(vec4.create(), world_pos_c, mesh.transform.TRS);
                triangle.pos_c = vec3.fromValues(world_pos_c[0], world_pos_c[1], world_pos_c[2]);

                var world_normal_a = vec4.fromValues(triangle.normal_a[0], triangle.normal_a[1], triangle.normal_a[2], 0);
                world_normal_a = vec4.transformMat4(vec4.create(), world_normal_a, mesh.transform.TRS_I_T);
                triangle.normal_a = vec3.fromValues(world_normal_a[0], world_normal_a[1], world_normal_a[2]);

                var world_normal_b = vec4.fromValues(triangle.normal_b[0], triangle.normal_b[1], triangle.normal_b[2], 0);
                world_normal_b = vec4.transformMat4(vec4.create(), world_normal_b, mesh.transform.TRS_I_T);
                triangle.normal_b = vec3.fromValues(world_normal_b[0], world_normal_b[1], world_normal_b[2]);

                var world_normal_c = vec4.fromValues(triangle.normal_c[0], triangle.normal_c[1], triangle.normal_c[2], 0);
                world_normal_c = vec4.transformMat4(vec4.create(), world_normal_c, mesh.transform.TRS_I_T);
                triangle.normal_c = vec3.fromValues(world_normal_c[0], world_normal_c[1], world_normal_c[2]);

                const TriangleValues = new ArrayBuffer(128);
                const TriangleViews = {
                    pos_a: new Float32Array(TriangleValues, 0, 3),
                    pos_b: new Float32Array(TriangleValues, 16, 3),
                    pos_c: new Float32Array(TriangleValues, 32, 3),
                    normal_a: new Float32Array(TriangleValues, 48, 3),
                    normal_b: new Float32Array(TriangleValues, 64, 3),
                    normal_c: new Float32Array(TriangleValues, 80, 3),
                    material_index: new Uint32Array(TriangleValues, 92, 1),
                    uv_a: new Float32Array(TriangleValues, 96, 2),
                    uv_b: new Float32Array(TriangleValues, 104, 2),
                    uv_c: new Float32Array(TriangleValues, 112, 2),
                };
                TriangleViews.pos_a.set(triangle.pos_a);
                TriangleViews.pos_b.set(triangle.pos_b);
                TriangleViews.pos_c.set(triangle.pos_c);
                TriangleViews.normal_a.set(triangle.normal_a);
                TriangleViews.normal_b.set(triangle.normal_b);
                TriangleViews.normal_c.set(triangle.normal_c);
                TriangleViews.material_index[0] = mesh.material_id;
                TriangleViews.uv_a.set(triangle.uv_a);
                TriangleViews.uv_b.set(triangle.uv_b);
                TriangleViews.uv_c.set(triangle.uv_c);

                const triangleView = new Uint8Array(TriangleValues);
                const allTrianglesView = new Uint8Array(this.meshes_data, mesh_offset * Mesh.triangle_size, Mesh.triangle_size);
                allTrianglesView.set(triangleView);
                mesh_offset++;
            })
        })
    }

    update(){
        this.parameters_updated = false;
        this.objects.forEach(element => { 
            if(typeof element.update === 'function'){
                element.update();
            }
        });
    }
}