import Sphere from './Sphere';
import Material from './Material';
import Mesh from './Meshes/Mesh';
import { Renderable } from './Renderable';

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
		// this.material_size = 32;

		//Meshes
		this.meshes = [];
		this.meshes_count = 0;
		this.meshes_data = new ArrayBuffer(0);

		//Triangles
		this.triangle_count = 0;
		this.triangles_data = new ArrayBuffer(0);

		//Bounding Box
		this.bounding_box_data = new ArrayBuffer(0);

		//Renderables
		this.renderables = [];
		this.renderable_count = 0;
		this.renderables_data = new ArrayBuffer(0);

		//BVH
		this.bvhs = [];
		this.bvh_data = new ArrayBuffer(0);

		//Transforms
		this.transforms = [];
		this.transform_count = 0;
		this.trs_data = new ArrayBuffer(0);

		//DEBUG
		this.print = false;
		this.debug_data = new ArrayBuffer(64);
		this.debug_data_views = {
			DEBUG_0: new Float32Array(this.debug_data, 0, 1),
			DEBUG_1: new Float32Array(this.debug_data, 4, 1),
			DEBUG_2: new Float32Array(this.debug_data, 8, 1),
			DEBUG_3: new Float32Array(this.debug_data, 12, 1),
			DEBUG_4: new Float32Array(this.debug_data, 16, 1),
			DEBUG_5: new Float32Array(this.debug_data, 20, 1),
			DEBUG_6: new Float32Array(this.debug_data, 24, 1),
			DEBUG_7: new Float32Array(this.debug_data, 28, 1),
			DEBUG_8: new Float32Array(this.debug_data, 32, 1),
			DEBUG_9: new Float32Array(this.debug_data, 36, 1),
			DEBUG_10: new Float32Array(this.debug_data, 40, 1),
			DEBUG_11: new Float32Array(this.debug_data, 44, 1),
			DEBUG_12: new Float32Array(this.debug_data, 48, 1),
			DEBUG_13: new Float32Array(this.debug_data, 52, 1),
			DEBUG_14: new Float32Array(this.debug_data, 56, 1),
			DEBUG_15: new Float32Array(this.debug_data, 60, 1)
		};
	}

	add(object) {
		this.objects.push(object);
		if (object instanceof Sphere) {
			this.spheres.push(object);
			this.spheres_data = new ArrayBuffer(this.spheres_data.byteLength + this.sphere_size);
			this.spheres_count++;
		}

		if (object instanceof Renderable) {
			//Renderable
			this.renderables.push(object);
			this.renderable_count++;
			this.renderables_data = new ArrayBuffer(this.renderables_data.byteLength + Renderable.size);

			//Mesh
			if (!this.meshes.includes(object.mesh)) {
				this.meshes.push(object.mesh);
				this.meshes_data = new ArrayBuffer(this.meshes_data.byteLength + Mesh.mesh_size);
				this.meshes_count++;

				//BVH
				this.bvhs.push(object.mesh.bvh);
				this.bvh_data = new ArrayBuffer(this.bvh_data.byteLength + object.mesh.bvh.getSize());

				//Triangles
				this.triangle_count += object.mesh.triangle_count;
				this.triangles_data = new ArrayBuffer(
					this.triangles_data.byteLength + object.mesh.getSize()
				);
			}

			//Material
			if (!this.materials.includes(object.material)) {
				this.materials.push(object.material);
				this.materials_data = new ArrayBuffer(this.materials_data.byteLength + Material.size);
				this.materials_count++;
			}

			//Transform
			if (!this.transforms.includes(object.transform)) {
				this.transforms.push(object.transform);
				this.transform_count++;
			}
		}
	}

	remove(object) {}

	//TODO: I bet this doesn't work but I don't think I'll care until later
	clear() {
		this.objects = [];
		this.object_count = 0;
	}

	setupBuffers() {
		this.setupSphereBuffer();
		this.setupTransformBuffer();
		this.setupBVHBuffer();
		this.setupTriangleBuffer();
		this.setupRenderableBuffer();
		this.setupMaterialBuffer();
		this.setupMeshBuffer();
		this.has_setup_buffers = true;
	}

	setupSphereBuffer() {
		var sphere_offset = 0;
		this.spheres.forEach((sphere) => {
			const SphereDataValues = new ArrayBuffer(this.sphere_size);
			const SphereDataViews = {
				pos: new Float32Array(SphereDataValues, 0, 3),
				radius: new Float32Array(SphereDataValues, 12, 1),
				material_index: new Uint32Array(SphereDataValues, 16, 1)
			};
			SphereDataViews.pos.set(sphere.position);
			SphereDataViews.radius[0] = sphere.radius;
			SphereDataViews.material_index[0] = sphere.material_id;

			const sphereView = new Uint8Array(SphereDataValues);
			const allLightsView = new Uint8Array(
				this.spheres_data,
				sphere_offset * this.sphere_size,
				this.sphere_size
			);
			allLightsView.set(sphereView);
			sphere_offset++;
		});
	}

	setupMaterialBuffer() {
		var material_offset = 0;
		this.materials.forEach((material) => {
			const MaterialValues = new ArrayBuffer(Material.size);
			const MaterialViews = {
				attenuation: new Float32Array(MaterialValues, 0, 3),
				metalic_fuzz: new Float32Array(MaterialValues, 12, 1),
				emissive_color: new Float32Array(MaterialValues, 16, 3),
				emissive_strength: new Float32Array(MaterialValues, 28, 1),
				material_flag: new Uint32Array(MaterialValues, 32, 1),
				refractive_index: new Float32Array(MaterialValues, 36, 1)
			};
			MaterialViews.attenuation.set(material.attenuation);
			MaterialViews.metalic_fuzz[0] = material.metalic_fuzz;
			MaterialViews.material_flag[0] = material.material_flag;
			MaterialViews.refractive_index[0] = material.refractive_index;
			MaterialViews.emissive_color.set(material.emissive_color);
			MaterialViews.emissive_strength[0] = material.emissive_strength;

			const materialView = new Uint8Array(MaterialValues);
			const allMaterialsView = new Uint8Array(
				this.materials_data,
				material_offset * Material.size,
				Material.size
			);
			allMaterialsView.set(materialView);
			material_offset++;
		});
	}

	setupRenderableBuffer() {
		var renderable_offset = 0;
		this.renderables.forEach((object) => {
			const ObjectValues = new ArrayBuffer(Renderable.size);
			const ObjectViews = {
				mesh_index: new Uint32Array(ObjectValues, 0, 1),
				material_index: new Uint32Array(ObjectValues, 4, 1),
				transform_index: new Uint32Array(ObjectValues, 8, 1)
			};
			ObjectViews.mesh_index[0] = object.mesh_id;
			ObjectViews.material_index[0] = object.material_id;
			ObjectViews.transform_index[0] = object.transform_id;

			const objectView = new Uint8Array(ObjectValues);
			const allObjectView = new Uint8Array(
				this.renderables_data,
				renderable_offset * Renderable.size,
				Renderable.size
			);
			allObjectView.set(objectView);
			renderable_offset++;
		});
	}

	setupTransformBuffer() {
		console.log(this.transform_count);
		this.trs_data = new Float32Array(this.transform_count * 16);
		var transform_offset = 0;
		this.transforms.forEach((transform) => {
			for (var i = 0; i < 16; i++) {
				this.trs_data[16 * transform_offset + i] = transform.TRS.at(i);
			}
			transform_offset++;
		});

		//THis is fucked
		this.trs_data = new ArrayBuffer(this.trs_data.buffer);
	}

	setupBVHBuffer() {
		var bvh_offset = 0;
		this.bvhs.forEach((bvh) => {
			bvh.nodes.forEach((node) => {
				const BVHNodeValues = new ArrayBuffer(48);
				const BVHNodeViews = {
					min: new Float32Array(BVHNodeValues, 0, 3),
					max: new Float32Array(BVHNodeValues, 16, 3),
					left_index: new Uint32Array(BVHNodeValues, 28, 1),
					first_triangle_index: new Uint32Array(BVHNodeValues, 32, 1),
					triangle_count: new Uint32Array(BVHNodeValues, 36, 1)
				};
				BVHNodeViews.min.set(node.min);
				BVHNodeViews.max.set(node.max);
				BVHNodeViews.left_index[0] = node.child_left_node;
				BVHNodeViews.first_triangle_index[0] = node.first_triangle_index;
				BVHNodeViews.triangle_count[0] = node.triangle_count;

				const bvhView = new Uint8Array(BVHNodeValues);
				const allBVHView = new Uint8Array(this.bvh_data, bvh_offset * 48, 48);
				allBVHView.set(bvhView);
				bvh_offset++;
			});
		});
	}

	setupTriangleBuffer() {
		var triangle_offset = 0;
		this.meshes.forEach((mesh) => {
			mesh.triangles.forEach((triangle) => {
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
					uv_c: new Float32Array(TriangleValues, 112, 2)
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
				const allTrianglesView = new Uint8Array(
					this.triangles_data,
					triangle_offset * Mesh.triangle_size,
					Mesh.triangle_size
				);
				allTrianglesView.set(triangleView);
				triangle_offset++;
			});
		});
	}

	setupMeshBuffer() {
		var triangle_offset = 0;
		var mesh_offset = 0;
		var bounding_box_offset = 0;
		var bvh_offset = 0;

		this.meshes.forEach((mesh) => {
			const MeshValues = new ArrayBuffer(Mesh.mesh_size);
			const MeshViews = {
				bounding_box_index: new Uint32Array(MeshValues, 0, 1),
				first_triangle_index: new Uint32Array(MeshValues, 4, 1),
				triangle_count: new Uint32Array(MeshValues, 8, 1),
				first_bvh_index: new Uint32Array(MeshValues, 12, 1),
				bvh_node_count: new Uint32Array(MeshValues, 16, 1)
			};
			MeshViews.bounding_box_index[0] = bounding_box_offset;
			MeshViews.first_triangle_index[0] = triangle_offset;
			MeshViews.triangle_count[0] = mesh.triangle_count;
			MeshViews.first_bvh_index[0] = bvh_offset;
			MeshViews.bvh_node_count[0] = mesh.bvh.node_count;
		});
	}

	//Note to self: I'm not sure how useful an update loop really is for this project. I will keep it for now.
	update() {
		this.parameters_updated = false;
		this.objects.forEach((element) => {
			if (typeof element.update === 'function') {
				element.update();
			}
		});
	}
}
