// eslint-disable-next-line no-unused-vars
import { vec2, vec3 } from 'gl-matrix';
import { BVH } from '../BVH';
import { Triangle } from '../Triangle';

/**
 * Abstract class to create a mesh object.
 * @abstract
 */
export class Mesh {
	/**
	 * Number of bytes per mesh struct in mesh buffer.
	 * @type {number}
	 */
	static MESH_SIZE = 20;

	/**
	 * Counter for mesh instances.
	 * @type {number}
	 */
	static count = 0;

	/**
	 * Creates a new Mesh instance.
	 */
	constructor() {
		/**
		 * Unique identifier for the mesh.
		 * @type {number}
		 */
		this.id = Mesh.count;
		Mesh.count += 1;

		/**
		 * Array of vertex coordinates.
		 * @type {vec3[]}
		 */
		this.vertex_positions = [];

		/**
		 * Array of UV coordinates.
		 * @type {vec2[]}
		 */
		this.vertex_uv_coordinates = [];

		/**
		 * Array of normal vectors.
		 * @type {vec3[]}
		 */
		this.vertex_normals = [];

		/**
		 * Number of triangles present in the mesh.
		 * @type {number}
		 */
		this.triangle_count = 0;

		/**
		 * Array of triangles that make up the mesh.
		 * @type {Triangle[]}
		 */
		this.triangles = [];

		/**
		 * Bounding Volume Hierarchy for the mesh.
		 * @type {BVH}
		 */
		this.bvh = new BVH();

		/**
		 * Promise that resolves when the mesh is loaded.
		 * @type {Promise<void>|undefined}
		 */
		this.loaded_promise = undefined;
	}

	/**
	 * Initializes the mesh by calculating vertices and constructing the BVH.
	 * This method is called by the child class.
	 * @returns {Promise<void>}
	 */
	async init() {
		await this.generateMeshGeometry();
		this.bvh.constructBVH(this.triangles);
	}

	/**
	 * Checks if the mesh has finished loading.
	 * @returns {Promise<void>|undefined}
	 */
	loaded() {
		return this.loaded_promise;
	}

	/**
	 * Generates the complete geometry of the mesh, including vertex coordinates and triangles.
	 * @returns {Promise<void>}
	 */
	async generateMeshGeometry() {
		await this.calculateVertexCoordinates();
		this.constructTriangles();
	}

	/**
	 * Calculates vertex coordinates.
	 * @returns {Promise<void>}
	 * @throws {Error} If not implemented by child class
	 */
	async calculateVertexCoordinates() {
		throw new Error('Method "calculateVertexCoordinates" must be implemented by child class');
	}

	/**
	 * Constructs triangles from calculated vertices.
	 * @throws {Error} If not implemented by child class
	 */
	constructTriangles() {
		throw new Error('Method "constructTriangles" must be implemented by child class');
	}

	/**
	 * Gets the size of the mesh in bytes.
	 * @returns {number}
	 */
	getSize() {
		return this.triangle_count * Triangle.TRIANGLE_SIZE;
	}

	// update() {
	//     this.transform.update();
	// }
}
