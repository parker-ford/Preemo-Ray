import raytracer_shader from './shaders/raytracer.wgsl?raw';
import random_shader from './shaders/random.wgsl?raw';
import compositer_shader from './shaders/compositer.wgsl?raw';
import common_shader from './shaders/common.wgsl?raw';
import material_shader from './shaders/material.wgsl?raw';
import hitinfo_shader from './shaders/hitinfo.wgsl?raw';

import { Time } from './Time.js';

export class Renderer {
    static instance;

    constructor(canvas) {
        if (Renderer.instance) {
            return Renderer.instance;
        }

        this.canvas = canvas;
        this.gpu = null;
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.commandBuffers = [];
        this.renderFunctions = [];

        this.frame_number = 0;

        //Assets
        this.color_buffer = null;
        this.color_buffer_view = null;
        this.sampler = null;

        //Pipeline Objects
        this.ray_tracing_pipeline = null;
        this.ray_tracing_bind_group = null;
        this.compositer_pipeline = null;
        this.compositer_bind_group = null;

        Renderer.instance = this;
    }

    async init() {

        if(!await this.setupDevice()){
            console.log("device setup failed");
            return false;
        }
        await this.createAssets();
        await this.createPipeline();

        return true;
    }

    async setupDevice() {
        //Checks to see if WebGPU is available
        if (!("gpu" in window.navigator)) {
            console.log("gpu not in navigator");
            return false;
        }
        this.gpu = navigator.gpu;
        console.log(window.navigator);
        //The adapter represents the physicsal gpu device.
        //This method can not fail but it may be null.
        this.adapter = await this.gpu.requestAdapter();
        if (!this.adapter) {
            console.log("no adapter");
            return false;
        }

        //This is the logical connection of the gpu. It allows you to create thins like buffers and textures.
        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            console.log("no device");
            return false;
        }

        this.context = this.canvas.getContext('webgpu');
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.presentationSize = [this.canvas.clientWidth * devicePixelRatio, this.canvas.clientHeight * devicePixelRatio];
        this.presentationFormat = this.gpu.getPreferredCanvasFormat();
        let configuration = {
            device: this.device,
            format: this.presentationFormat,
            size: this.presentationSize,
        };
        this.context.configure(configuration);

        return true;
    }

    async createAssets() {

        //Image Buffer
        this.image_buffer = this.device.createBuffer({
            label: 'image_buffer',
            size: Float32Array.BYTES_PER_ELEMENT * 4 * this.canvas.width * this.canvas.height,
            usage: GPUBufferUsage.STORAGE
        });

        //Image Sampler
        const samplerDescriptor = {
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
            minmapFilter: "nearest",
            maxAnisotropy: 1
        };
        this.sampler = this.device.createSampler(samplerDescriptor);

        //Camera Buffer
        this.camera_buffer = this.device.createBuffer({
            label: 'camera_buffer',
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        //Time Buffer
        this.time_values = new ArrayBuffer(8);
        this.time_views = {
            elapsed_time: new Float32Array(this.time_values, 0, 1),
            frame_number: new Uint32Array(this.time_values, 4, 1),
          };

        this.time_buffer = this.device.createBuffer({
            label: 'time_buffer',
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        //Scene Buffer
        this.scene_values = new ArrayBuffer(12);
        this.scene_views = {
            sphere_count: new Uint32Array(this.scene_values, 0, 1),
            mesh_count: new Uint32Array(this.scene_values, 4, 1),
            triangle_count: new Uint32Array(this.scene_values, 8, 1),
        }
        this.scene_buffer = this.device.createBuffer({
            label: 'scene_buffer',
            size: 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        //Sphere Buffer
        this.sphere_buffer = this.device.createBuffer({
            size: 32 * 1000, //Size of sphere * number of spheres
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        //Material Buffer
        this.material_buffer = this.device.createBuffer({
            size: 32 * 1000, //Size of material * number of spheres
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        //Triangle Buffer
        this.triangle_buffer = this.device.createBuffer({
            size: 128 * 1000, //Will def need to increase this at some point
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        //Mesh Buffer
        this.mesh_buffer = this.device.createBuffer({
            size: 16 * 100,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        //Bounding Box Buffer
        this.bounding_box_buffer = this.device.createBuffer({
            size: 32 * 100,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
    }

    getRayTracingShaderCode(){
        const shader_code = `
            ${common_shader}
            ${random_shader}
            ${material_shader}
            ${hitinfo_shader}
            ${raytracer_shader}
        `

        return shader_code;
    }

    getCompositerShaderCode(){
        const shader_code = `
            ${common_shader}
            ${compositer_shader}
        `

        return shader_code;
    }

    async createPipeline() {
        const ray_tracing_bind_group_layout = this.device.createBindGroupLayout({
            label: 'ray_tracing_bind_group_layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage',
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                }
            ]
        });

        this.ray_tracing_bind_group = this.device.createBindGroup({
            label: 'ray_tracing_bind_group',
            layout: ray_tracing_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.image_buffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.camera_buffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.time_buffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.scene_buffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.sphere_buffer
                    }
                },
                {
                    binding: 5,
                    resource: {
                        buffer: this.material_buffer
                    }
                },
                {
                    binding: 6,
                    resource: {
                        buffer: this.triangle_buffer
                    }
                },
                {
                    binding: 7,
                    resource: {
                        buffer: this.mesh_buffer
                    }
                },
                {
                    binding: 8,
                    resource: {
                        buffer: this.bounding_box_buffer
                    }
                }
            ]
        });

        const ray_tracing_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [ray_tracing_bind_group_layout]
        });

        this.ray_tracing_pipeline = this.device.createComputePipeline({
            label: 'ray_tracing_pipeline',
            layout: ray_tracing_pipeline_layout,
            compute: {
                module: this.device.createShaderModule({
                    code: this.getRayTracingShaderCode()
                }),
                entryPoint: 'main'
            }
        });

        const compositer_bind_group_layout = this.device.createBindGroupLayout({
            label: 'compositer_bind_group_layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'storage',
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform'
                    }
                },
            ]
        })

        this.compositer_bind_group = this.device.createBindGroup({
            label: 'compositer_bind_group',
            layout: compositer_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.image_buffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.camera_buffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.time_buffer
                    }
                }
            ]
        });

        const compositer_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [compositer_bind_group_layout]
        });

        this.compositer_pipeline = this.device.createRenderPipeline({
            label: 'compositer_pipeline',
            layout: compositer_pipeline_layout,
            vertex: {
                module: this.device.createShaderModule({
                    code: this.getCompositerShaderCode()
                }),
                entryPoint: 'vert_main'
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: this.getCompositerShaderCode()
                }),
                entryPoint: 'fragment_main',
                targets: [
                    {
                        format: 'bgra8unorm'
                    }
                ]
            },

            primitive: {
                topology: 'triangle-list'
            }
        });
    }

    render(scene, camera) {

        if(camera.hasMoved || scene.parameters_updated){
            this.frame_number = 0;
         }

        scene.update();
        //Should happen only once. Assumes that scenes will rarely be chaning in real-time. May come back to this later.
        if(scene.has_setup_buffers === false){
            scene.setupBuffers();
            //Sphere Data
            this.device.queue.writeBuffer(this.sphere_buffer, 0, scene.spheres_data, 0, scene.spheres_data.byteLength);
            
            //Triangle Data
            this.device.queue.writeBuffer(this.triangle_buffer, 0, scene.triangles_data, 0, scene.triangles_data.byteLength);
            
            //Material Data
            this.device.queue.writeBuffer(this.material_buffer, 0, scene.materials_data, 0, scene.materials_data.byteLength);
            
            //Mesh Data
            console.log(scene.meshes_data.byteLength)
            this.device.queue.writeBuffer(this.mesh_buffer, 0, scene.meshes_data, 0, scene.meshes_data.byteLength);
 
            //Bounding Box Data
            this.device.queue.writeBuffer(this.bounding_box_buffer, 0, scene.bounding_box_data, 0, scene.bounding_box_data.byteLength);

            //Scene Data
            this.scene_views.sphere_count[0] = scene.spheres_count;
            this.scene_views.triangle_count[0] = scene.triangle_count;
            this.scene_views.mesh_count[0] = scene.meshes_count;
            this.device.queue.writeBuffer(this.scene_buffer, 0, this.scene_values);
        }

        //Camera Data
        this.device.queue.writeBuffer(this.camera_buffer, 0, camera.cameraBufferValues);

        //Time Data
        this.time_views.elapsed_time[0] = Time.elapsedTime;
        this.time_views.frame_number[0] = this.frame_number;
        this.device.queue.writeBuffer(this.time_buffer, 0, this.time_values);

        const commandEncoder = this.device.createCommandEncoder();

        const ray_trace_pass = commandEncoder.beginComputePass();
        ray_trace_pass.setPipeline(this.ray_tracing_pipeline);
        ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group);
        ray_trace_pass.dispatchWorkgroups(this.canvas.width/8.0, this.canvas.height/8.0, 1);
        ray_trace_pass.end();

        const texture_view = this.context.getCurrentTexture().createView();
        const render_pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: texture_view,
                clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        render_pass.setPipeline(this.compositer_pipeline);
        render_pass.setBindGroup(0, this.compositer_bind_group);
        render_pass.draw(6, 1, 0, 0);

        render_pass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        this.frame_number++;
    }
}