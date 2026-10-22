/* tslint:disable */
/* eslint-disable */

export class WorldSimulation {
    free(): void;
    [Symbol.dispose](): void;
    get_creature_count(): number;
    get_exp(): number;
    get_exp_needed(): number;
    get_player_tier_name(): string;
    constructor(width: number, height: number);
    render(ctx: CanvasRenderingContext2D): void;
    reset_alpha(): void;
    resize(width: number, height: number): void;
    set_brightness(val: number): void;
    set_electric_freq(val: number): void;
    set_gear_speed(val: number): void;
    set_lightning_freq(val: number): void;
    set_rain_intensity(val: number): void;
    set_viscosity(val: number): void;
    set_weather(mode_str: string): void;
    spawn_food(x: number, y: number): void;
    spawn_random_food(): void;
    stimulate(target_x: number, target_y: number): void;
    update(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_worldsimulation_free: (a: number, b: number) => void;
    readonly worldsimulation_get_creature_count: (a: number) => number;
    readonly worldsimulation_get_exp: (a: number) => number;
    readonly worldsimulation_get_exp_needed: (a: number) => number;
    readonly worldsimulation_get_player_tier_name: (a: number) => [number, number];
    readonly worldsimulation_new: (a: number, b: number) => number;
    readonly worldsimulation_render: (a: number, b: any) => [number, number];
    readonly worldsimulation_reset_alpha: (a: number) => void;
    readonly worldsimulation_resize: (a: number, b: number, c: number) => void;
    readonly worldsimulation_set_brightness: (a: number, b: number) => void;
    readonly worldsimulation_set_electric_freq: (a: number, b: number) => void;
    readonly worldsimulation_set_gear_speed: (a: number, b: number) => void;
    readonly worldsimulation_set_lightning_freq: (a: number, b: number) => void;
    readonly worldsimulation_set_rain_intensity: (a: number, b: number) => void;
    readonly worldsimulation_set_viscosity: (a: number, b: number) => void;
    readonly worldsimulation_set_weather: (a: number, b: number, c: number) => void;
    readonly worldsimulation_spawn_food: (a: number, b: number, c: number) => void;
    readonly worldsimulation_spawn_random_food: (a: number) => void;
    readonly worldsimulation_stimulate: (a: number, b: number, c: number) => void;
    readonly worldsimulation_update: (a: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
