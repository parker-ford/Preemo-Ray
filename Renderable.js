import { Transform } from "./Transform";

export class Renderable {

    static count = 0;
    static size = 12;

    constructor(options){
        this.id = Renderable.count++;

        this.mesh = options.mesh;
        this.mesh_id = this.mesh.id;

        this.material = options.material;
        this.material_id = this.material.id;

        this.transform = options.transform || new Transform({});
        this.transform_id = this.transform.id;
    }
}