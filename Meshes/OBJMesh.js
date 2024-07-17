import { Triangle } from "../Triangle.js";
import { Mesh } from "./Mesh.js";

export class OBJMesh extends Mesh {
    constructor(options){
        super(options);

        this.filePath = options.filePath || "";
        
        //Number of vertices
        this.width = options.width || 1;
        this.height = options.height || 1;
        this.depth = options.depth || 1; 
        
        this.loadedPromise = this.init();
    }

    // async init() {
    //     await this.calculateVertices();
    // }

    // loaded() {
    //     return this.loadedPromise;
    // }

    // async calculateVertices(){
    //     await this.calculateVertexCoordinates();
    //     this.constructTriangles();
    // }


    async calculateVertexCoordinates(){
        try {
            const response = await fetch(this.filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();

            this.vertexCoordinates = [];
            this.uvCoordinates = [];
            this.normalCoordinates = [];
            this.faces = [];

            const lines = data.split('\n');
            
            lines.forEach((line) => {
                const tokens = line.split(' ');
                if(tokens[0] === 'v'){
                    this.vertexCoordinates.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);
                }
                if(tokens[0] === 'vt'){
                    this.uvCoordinates.push([parseFloat(tokens[1]), parseFloat(tokens[2])]);
                }
                if(tokens[0] === 'vn'){
                    this.normalCoordinates.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);
                }
                if(tokens[0] === 'f'){
                    const face = [];
                    for(let i = 1; i < tokens.length; i++){
                        const faceTokens = tokens[i].split('/');
                        face.push([parseInt(faceTokens[0]) - 1, parseInt(faceTokens[1]) - 1, parseInt(faceTokens[2]) - 1]);
                    }
                    this.faces.push(face);
                }
            });

            if(this.faces[0].length === 3){
                this.quadFace = false;
            }
            else{
                this.quadFace = true;
            }


        } catch (e) {
            console.log('There has been a problem with your fetch operation: ' + e.message);
        }
    }

    constructTriangles(){
        this.triangleCoordinates = [];
        this.uvs = [];
        this.normals = [];

        for(let i = 0; i < this.faces.length; i++){
            const face = this.faces[i];
            if(face.length === 3){
                this.addTriangleFace(face);
            }
            else{
                this.addQuadFace(face);
            }
        }
    }

    addTriangleFace(face){

        const triangle = new Triangle({
            pos_a: this.vertexCoordinates[face[0][0]],
            pos_b: this.vertexCoordinates[face[1][0]],
            pos_c: this.vertexCoordinates[face[2][0]],
            uv_a: this.uvCoordinates[face[0][1]],
            uv_b: this.uvCoordinates[face[1][1]],
            uv_c: this.uvCoordinates[face[2][1]],
            normal_a: this.normalCoordinates[face[0][2]],
            normal_b: this.normalCoordinates[face[1][2]],
            normal_c: this.normalCoordinates[face[2][2]],
        });

        this.triangles.push(triangle);
        this.triangle_count++;
    }

    addQuadFace(face){
        this.addTriangleFace([face[0], face[1], face[2]]);
        this.addTriangleFace([face[0], face[2], face[3]]);
    }


}