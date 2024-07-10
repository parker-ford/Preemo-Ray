import { Mesh } from "./Mesh.js";

export class PlaneMesh extends Mesh {
    constructor(options){
        super(options);

        //Number of vertices
        this.width = options.width || 1;
        this.height = options.height || 1; 

        this.calculateVertexCoordinates();
        this.constructTriangles();
    }

    calculateVertexCoordinates(){
        this.vertexCoordinates = [];
        this.uvCoordinates = [];
        this.normalCoordinates = [];
        const widthInterval = 1 / this.width;
        const heightInterval = 1 / this.height;
        for(let i = 0; i < this.width + 1; i++){
            for(let j = 0; j < this.height + 1; j++){
                this.vertexCoordinates.push([ -0.5 + i * widthInterval, -0.5 + j * heightInterval, 0]);
                this.uvCoordinates.push([i * widthInterval, j * heightInterval]);
                this.normalCoordinates.push([0, 0, -1]);
            }
        }
    }

    constructTriangles(){
        this.triangleCoordinates = [];
        this.uvs = [];
        this.normals = [];

        for(let i = 0; i < this.width; i++){
            for(let j = 0; j < this.height; j++){
            
                //Top Triangle
                const top_triangle = {};
                top_triangle.pos_a = this.vertexCoordinates[j + (i * (this.height + 1))];
                top_triangle.pos_b = this.vertexCoordinates[(j + 1) + (i * (this.height + 1))];
                top_triangle.pos_c = this.vertexCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];

                top_triangle.uv_a = this.uvCoordinates[j + (i * (this.height + 1))];
                top_triangle.uv_b = this.uvCoordinates[(j + 1) + (i * (this.height + 1))];
                top_triangle.uv_c = this.uvCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];

                top_triangle.normal_a = this.normalCoordinates[j + (i * (this.height + 1))];
                top_triangle.normal_b = this.normalCoordinates[(j + 1) + (i * (this.height + 1))];
                top_triangle.normal_c = this.normalCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];


                //Bottom Triangle
                const bottom_triangle = {};
                bottom_triangle.pos_a = this.vertexCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];
                bottom_triangle.pos_b = this.vertexCoordinates[j + ((i + 1) * (this.height + 1))];
                bottom_triangle.pos_c = this.vertexCoordinates[j + (i * (this.height + 1))];

                bottom_triangle.uv_a = this.uvCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];
                bottom_triangle.uv_b = this.uvCoordinates[j + ((i + 1) * (this.height + 1))];4
                bottom_triangle.uv_c = this.uvCoordinates[j + (i * (this.height + 1))];

                bottom_triangle.normal_a = this.normalCoordinates[(j + 1) + ((i + 1) * (this.height + 1))];
                bottom_triangle.normal_b = this.normalCoordinates[j + ((i + 1) * (this.height + 1))];
                bottom_triangle.normal_c = this.normalCoordinates[j + (i * (this.height + 1))];

                //Push the triangles
                this.triangles.push(top_triangle);
                this.triangles.push(bottom_triangle);
                this.triangle_count += 2;
            }
        }
    }
}