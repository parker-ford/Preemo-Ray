import { Transform } from "../Transform.js";

export class Mesh {
    static triangle_size = 128
    constructor(options){
        this.triangle_count = 0;
        this.material_id = options.material_id || 0;
        this.transform = new Transform({});
    }

    getSize() {
        return this.triangle_count * Mesh.triangle_size;
    }

    update(){
        this.transform.update();
    }
}