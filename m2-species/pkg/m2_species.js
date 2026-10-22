/* @ts-self-types="./m2_species.d.ts" */

export class WorldSimulation {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WorldSimulationFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_worldsimulation_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get_creature_count() {
        const ret = wasm.worldsimulation_get_creature_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_exp() {
        const ret = wasm.worldsimulation_get_exp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_exp_needed() {
        const ret = wasm.worldsimulation_get_exp_needed(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get_player_tier_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.worldsimulation_get_player_tier_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        const ret = wasm.worldsimulation_new(width, height);
        this.__wbg_ptr = ret;
        WorldSimulationFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const ret = wasm.worldsimulation_render(this.__wbg_ptr, ctx);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    reset_alpha() {
        wasm.worldsimulation_reset_alpha(this.__wbg_ptr);
    }
    /**
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        wasm.worldsimulation_resize(this.__wbg_ptr, width, height);
    }
    /**
     * @param {number} val
     */
    set_brightness(val) {
        wasm.worldsimulation_set_brightness(this.__wbg_ptr, val);
    }
    /**
     * @param {number} val
     */
    set_electric_freq(val) {
        wasm.worldsimulation_set_electric_freq(this.__wbg_ptr, val);
    }
    /**
     * @param {number} val
     */
    set_gear_speed(val) {
        wasm.worldsimulation_set_gear_speed(this.__wbg_ptr, val);
    }
    /**
     * @param {number} val
     */
    set_lightning_freq(val) {
        wasm.worldsimulation_set_lightning_freq(this.__wbg_ptr, val);
    }
    /**
     * @param {number} val
     */
    set_rain_intensity(val) {
        wasm.worldsimulation_set_rain_intensity(this.__wbg_ptr, val);
    }
    /**
     * @param {number} val
     */
    set_viscosity(val) {
        wasm.worldsimulation_set_viscosity(this.__wbg_ptr, val);
    }
    /**
     * @param {string} mode_str
     */
    set_weather(mode_str) {
        const ptr0 = passStringToWasm0(mode_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.worldsimulation_set_weather(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    spawn_food(x, y) {
        wasm.worldsimulation_spawn_food(this.__wbg_ptr, x, y);
    }
    spawn_random_food() {
        wasm.worldsimulation_spawn_random_food(this.__wbg_ptr);
    }
    /**
     * @param {number} target_x
     * @param {number} target_y
     */
    stimulate(target_x, target_y) {
        wasm.worldsimulation_stimulate(this.__wbg_ptr, target_x, target_y);
    }
    update() {
        wasm.worldsimulation_update(this.__wbg_ptr);
    }
}
if (Symbol.dispose) WorldSimulation.prototype[Symbol.dispose] = WorldSimulation.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_arc_03f7717b2e38682a: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.arc(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbg_beginPath_8598d895c13f1c86: function(arg0) {
            arg0.beginPath();
        },
        __wbg_closePath_355eb6da179dd9c2: function(arg0) {
            arg0.closePath();
        },
        __wbg_ellipse_59ddb84ea8ee8ce1: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            arg0.ellipse(arg1, arg2, arg3, arg4, arg5, arg6, arg7);
        }, arguments); },
        __wbg_fillRect_0ef59adb9acb7d06: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.fillRect(arg1, arg2, arg3, arg4);
        },
        __wbg_fill_fc5e02a06cc26e92: function(arg0) {
            arg0.fill();
        },
        __wbg_lineTo_63fac7d60279d95e: function(arg0, arg1, arg2) {
            arg0.lineTo(arg1, arg2);
        },
        __wbg_moveTo_037e3deefec91ae1: function(arg0, arg1, arg2) {
            arg0.moveTo(arg1, arg2);
        },
        __wbg_quadraticCurveTo_4f57843d21c4f90d: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.quadraticCurveTo(arg1, arg2, arg3, arg4);
        },
        __wbg_restore_c93ba7571816b182: function(arg0) {
            arg0.restore();
        },
        __wbg_rotate_5273f09fed0af920: function() { return handleError(function (arg0, arg1) {
            arg0.rotate(arg1);
        }, arguments); },
        __wbg_save_f32554f1747071d1: function(arg0) {
            arg0.save();
        },
        __wbg_set_fillStyle_27f88552f4d2ab31: function(arg0, arg1) {
            arg0.fillStyle = arg1;
        },
        __wbg_set_fillStyle_a2961b4d44e572af: function(arg0, arg1, arg2) {
            arg0.fillStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_lineWidth_cc15473552c60c9c: function(arg0, arg1) {
            arg0.lineWidth = arg1;
        },
        __wbg_set_strokeStyle_a36f39be93a6cebc: function(arg0, arg1) {
            arg0.strokeStyle = arg1;
        },
        __wbg_set_strokeStyle_d51608fa918b53d4: function(arg0, arg1, arg2) {
            arg0.strokeStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_stroke_385d731098398489: function(arg0) {
            arg0.stroke();
        },
        __wbg_translate_b75b7d842d89a889: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.translate(arg1, arg2);
        }, arguments); },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./m2_species_bg.js": import0,
    };
}

const WorldSimulationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_worldsimulation_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('m2_species_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
