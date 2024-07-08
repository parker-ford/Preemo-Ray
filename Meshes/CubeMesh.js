import { Mesh } from "./Mesh.js";

export class CubeMesh extends Mesh {
    constructor(options){
        super(options);

        //Number of vertices
        this.width = options.width || 1;
        this.height = options.height || 1;
        this.depth = options.depth || 1; 

        //Triangles
        this.triangles = [];

        this.calculateVertexCoordinates();
        this.constructTriangles();
    }

    calculateVertexCoordinates(){
        this.vertexCoordinates = [];
        this.uvCoordinates = [];
        this.normalCoordinates = [];
        const widthInterval = 1 / this.width;
        const heightInterval = 1 / this.height;
        const depthInterval = 1 / this.depth;
        
        //Front Face
        for(let i = 0; i < this.width + 1; i++){
            for(let j = 0; j < this.height + 1; j++){
                this.vertexCoordinates.push([ -0.5 + i * widthInterval, -0.5 + j * heightInterval, -0.5]);
                this.uvCoordinates.push([i * widthInterval, j * heightInterval]);
                this.normalCoordinates.push([0, 0, -1]);
            }
        }

        //Back Face
        for(let i = this.width; i >= 0; i--){
            for(let j = 0; j < this.height + 1; j++){
                this.vertexCoordinates.push([ -0.5 + i * widthInterval, -0.5 + j * heightInterval, 0.5]);
                this.uvCoordinates.push([1 - (i * widthInterval), j * heightInterval]);
                this.normalCoordinates.push([0, 0, 1]);
            }
        }
        
        //Right Face
        for(let i = 0; i < this.height + 1; i++){
            for(let j = 0; j < this.depth + 1; j++){
                this.vertexCoordinates.push([ 0.5, -0.5 + i * heightInterval, -0.5 + j * depthInterval]);
                this.uvCoordinates.push([ j * heightInterval, i * widthInterval]);
                this.normalCoordinates.push([1, 0, 0]);
            }
        }
        
        //Left Face
        for(let i = this.height; i >= 0; i--){
            for(let j = 0; j < this.depth + 1; j++){
                this.vertexCoordinates.push([ -0.5, -0.5 + i * heightInterval, -0.5 + j * depthInterval]);
                this.uvCoordinates.push([1 - (j * heightInterval), i * widthInterval]);
                this.normalCoordinates.push([-1, 0, 0]);
            }
        }
        
        //Top Face
        for(let i = 0; i < this.width + 1; i++){
            for(let j = 0; j < this.depth + 1; j++){
                this.vertexCoordinates.push([ -0.5 + i * widthInterval, 0.5, -0.5 + j * depthInterval]);
                this.uvCoordinates.push([i * widthInterval, j * heightInterval]);
                this.normalCoordinates.push([0, 1, 0]);
            }
        }

        //Bottom Face
        for(let i = this.width; i >= 0; i--){
            for(let j = 0; j < this.depth + 1; j++){
                this.vertexCoordinates.push([ -0.5 + i * widthInterval, -0.5, -0.5 + j * depthInterval]);
                this.uvCoordinates.push([i * widthInterval, 1 - (j * heightInterval)]);
                this.normalCoordinates.push([0, -1, 0]);
            }
        }
    }

    calculateFaceVertices(x, y, offset){
        for(let i = 0; i < x; i++){
            for(let j = 0; j < y; j++){
            
                //Top Triangle
                const top_triangle = {};
                top_triangle.pos_a = this.vertexCoordinates[(j + (i * (y + 1)) + offset)];
                top_triangle.pos_b = this.vertexCoordinates[((j + 1) + (i * (y + 1))) + offset];
                top_triangle.pos_c = this.vertexCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset];

                top_triangle.uv_a = this.uvCoordinates[(j + (i * (y + 1)) + offset)];
                top_triangle.uv_b = this.uvCoordinates[((j + 1) + (i * (y + 1))) + offset];
                top_triangle.uv_c = this.uvCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset];

                top_triangle.normal_a = this.normalCoordinates[(j + (i * (y + 1)) + offset)];
                top_triangle.normal_b = this.normalCoordinates[((j + 1) + (i * (y + 1))) + offset];
                top_triangle.normal_c = this.normalCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset];


                //Bottom Triangle

                const bottom_triangle = {};
                bottom_triangle.pos_a = this.vertexCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset];
                bottom_triangle.pos_b = this.vertexCoordinates[(j + ((i + 1) * (y + 1))) + offset];
                bottom_triangle.pos_c = this.vertexCoordinates[(j + (i * (y + 1))) + offset];

                bottom_triangle.uv_a = this.uvCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset];
                bottom_triangle.uv_b = this.uvCoordinates[(j + ((i + 1) * (y + 1))) + offset];
                bottom_triangle.uv_c = this.uvCoordinates[(j + (i * (y + 1))) + offset];

                bottom_triangle.normal_a = this.normalCoordinates[((j + 1) + ((i + 1) * (y + 1))) + offset]
                bottom_triangle.normal_b = this.normalCoordinates[(j + ((i + 1) * (y + 1))) + offset];
                bottom_triangle.normal_c = this.normalCoordinates[(j + (i * (y + 1))) + offset];
            
            
                this.triangles.push(top_triangle);
                this.triangles.push(bottom_triangle);
                this.triangle_count += 2;
            }
        }
    }

    constructTriangles(){
        this.triangleCoordinates = [];
        this.uvs = [];
        this.normals = [];

        let offset = 0;

        //Front Face
        this.calculateFaceVertices(this.width, this.height, offset);
        offset += (this.width + 1) * (this.height + 1);

        //Back Face
        this.calculateFaceVertices(this.width, this.height, offset);
        offset += (this.width + 1) * (this.height + 1);

        //Right Face
        this.calculateFaceVertices(this.height, this.depth, offset);
        offset += (this.height + 1) * (this.depth + 1);

        //Left Face
        this.calculateFaceVertices(this.height, this.depth, offset);
        offset += (this.height + 1) * (this.depth + 1);

        //Top Face
        this.calculateFaceVertices(this.width, this.depth, offset);
        offset += (this.width + 1) * (this.depth + 1);

        //Bottom Face
        this.calculateFaceVertices(this.width, this.depth,offset);

    }
}