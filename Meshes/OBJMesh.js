import { Triangle } from '../Triangle';
import { Mesh } from './Mesh';

/**
 * Class representing a mesh loaded from an OBJ file, extending the abstract Mesh class.
 * @extends Mesh
 */
export class OBJMesh extends Mesh {
	/**
	 * Create an OBJMesh.
	 * @param {Object} options - The options for creating the OBJ mesh.
	 * @param {string} [options.file_path=''] - The file path of the OBJ file to load.
	 */
	constructor({ file_path = '' }) {
		super();

		/**
		 * The file path of the OBJ file.
		 * @type {string}
		 */
		this.filePath = file_path;

		/**
		 * Array of faces from the OBJ file.
		 * @type {Array<Array<Array<number>>>}
		 */
		this.faces = [];

		/**
		 * Promise that resolves when the mesh is loaded.
		 * @type {Promise<void>}
		 */
		this.loadedPromise = this.init();
	}

	/**
	 * Calculate vertex coordinates, UV coordinates, and normal vectors from the OBJ file.
	 * @override
	 * @returns {Promise<void>}
	 * @throws {Error} If there's a problem fetching or parsing the OBJ file.
	 */
	async calculateVertexCoordinates() {
		try {
			const response = await fetch(this.filePath);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.text();

			const lines = data.split('\n');

			lines.forEach((line) => {
				const tokens = line.split(' ');
				if (tokens[0] === 'v') {
					this.vertex_positions.push([
						parseFloat(tokens[1]),
						parseFloat(tokens[2]),
						parseFloat(tokens[3])
					]);
				}
				if (tokens[0] === 'vt') {
					this.vertex_uv_coordinates.push([parseFloat(tokens[1]), parseFloat(tokens[2])]);
				}
				if (tokens[0] === 'vn') {
					this.vertex_normals.push([
						parseFloat(tokens[1]),
						parseFloat(tokens[2]),
						parseFloat(tokens[3])
					]);
				}
				if (tokens[0] === 'f') {
					const face = [];
					for (let i = 1; i < tokens.length; i += 1) {
						const faceTokens = tokens[i].split('/');
						face.push([
							parseInt(faceTokens[0], 10) - 1,
							parseInt(faceTokens[1], 10) - 1,
							parseInt(faceTokens[2], 10) - 1
						]);
					}
					this.faces.push(face);
				}
			});
		} catch (error) {
			// Rethrow the error with a more specific message
			// @ts-ignore
			throw new Error(`Failed to calculate vertex coordinates: ${error.message}`);
		}
	}

	/**
	 * Construct triangles from the loaded OBJ data.
	 * @override
	 */
	constructTriangles() {
		for (let i = 0; i < this.faces.length; i += 1) {
			const face = this.faces[i];
			if (face.length === 3) {
				this.addTriangleFace(face);
			} else {
				this.addQuadFace(face);
			}
		}
	}

	/**
	 * Add a triangle face to the mesh.
	 * @param {Array<Array<number>>} face - The face data for a triangle.
	 * @private
	 */
	addTriangleFace(face) {
		const triangle = new Triangle({
			pos_a: this.vertex_positions[face[0][0]],
			pos_b: this.vertex_positions[face[1][0]],
			pos_c: this.vertex_positions[face[2][0]],
			uv_a: this.vertex_uv_coordinates[face[0][1]],
			uv_b: this.vertex_uv_coordinates[face[1][1]],
			uv_c: this.vertex_uv_coordinates[face[2][1]],
			normal_a: this.vertex_normals[face[0][2]],
			normal_b: this.vertex_normals[face[1][2]],
			normal_c: this.vertex_normals[face[2][2]]
		});

		this.triangles.push(triangle);
		this.triangle_count += 1;
	}

	/**
	 * Add a quad face to the mesh by splitting it into two triangles.
	 * @param {Array<Array<number>>} face - The face data for a quad.
	 * @private
	 */
	addQuadFace(face) {
		this.addTriangleFace([face[0], face[1], face[2]]);
		this.addTriangleFace([face[0], face[2], face[3]]);
	}
}
