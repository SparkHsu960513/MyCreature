mod creature;
mod environment;
mod gear;
mod math;
mod tentacle;
mod wire;

use creature::SlimeCreature;
use environment::Environment;
use math::FastRng;
use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

#[wasm_bindgen]
pub struct WorldSimulation {
    creatures: Vec<SlimeCreature>,
    env: Environment,
    rng: FastRng,
    rain_intensity: usize,
    lightning_freq: usize,
    gear_speed: f64,
    viscosity: f64,
    brightness: f64,
}

#[wasm_bindgen]
impl WorldSimulation {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Self {
        let mut rng = FastRng::new(12345);
        let mut creatures = Vec::new();

        // 建立中央母體（Tier 3 巨獸成體，5 爪）
        creatures.push(SlimeCreature::new(width * 0.5, height * 0.5, 3, true));

        // 散佈初始低階幼體食物（Tier 1）
        for _ in 0..4 {
            let rx = rng.gen_range(width * 0.15, width * 0.85);
            let ry = rng.gen_range(height * 0.15, height * 0.85);
            creatures.push(SlimeCreature::new(rx, ry, 1, false));
        }

        Self {
            creatures,
            env: Environment::new(width, height),
            rng,
            rain_intensity: 2,
            lightning_freq: 1,
            gear_speed: 1.0,
            viscosity: 1.4,
            brightness: 18.0,
        }
    }

    pub fn resize(&mut self, width: f64, height: f64) {
        self.env.resize(width, height);
    }

    pub fn set_weather(&mut self, mode_str: &str) {
        self.env.set_weather(mode_str);
    }

    pub fn set_rain_intensity(&mut self, val: usize) {
        self.rain_intensity = val.min(4);
    }

    pub fn set_lightning_freq(&mut self, val: usize) {
        self.lightning_freq = val.min(3);
    }

    pub fn set_electric_freq(&mut self, val: usize) {
        self.env.set_electric_freq(val);
    }

    pub fn set_gear_speed(&mut self, val: f64) {
        self.gear_speed = val.clamp(0.0, 5.0);
    }

    pub fn set_viscosity(&mut self, val: f64) {
        self.viscosity = val.clamp(0.2, 4.0);
    }

    pub fn set_brightness(&mut self, val: f64) {
        self.brightness = val.clamp(4.0, 60.0);
    }

    pub fn stimulate(&mut self, target_x: f64, target_y: f64) {
        if let Some(alpha) = self.creatures.first_mut() {
            alpha.stimulate(target_x, target_y);
        }
    }

    pub fn spawn_food(&mut self, x: f64, y: f64) {
        self.creatures.push(SlimeCreature::new(x, y, 1, false));
    }

    pub fn spawn_random_food(&mut self) {
        let x = self.rng.gen_range(self.env.width * 0.1, self.env.width * 0.9);
        let y = self.rng.gen_range(self.env.height * 0.1, self.env.height * 0.9);
        self.creatures.push(SlimeCreature::new(x, y, 1, false));
    }

    pub fn reset_alpha(&mut self) {
        let w = self.env.width;
        let h = self.env.height;
        self.creatures.retain(|c| !c.is_alpha);
        self.creatures.insert(0, SlimeCreature::new(w * 0.5, h * 0.5, 3, true));
    }

    pub fn update(&mut self) {
        // 更新大氣廢土環境（含雲影漂移、微觀角度螢光橘雨/冰晶/微塵）
        self.env
            .update(self.rain_intensity, self.lightning_freq, &mut self.rng);

        if self.creatures.is_empty() {
            return;
        }

        let (first, rest) = self.creatures.split_at_mut(1);
        let alpha = &mut first[0];

        // 更新母體
        alpha.update(
            &mut self.rng,
            self.gear_speed,
            self.viscosity,
            rest,
        );

        // 更新幼體食物
        let empty_prey: &mut [SlimeCreature] = &mut [];
        for c in rest.iter_mut() {
            c.update(&mut self.rng, self.gear_speed, self.viscosity, empty_prey);
        }

        // 移除被吞食並完成黑洞消滅的幼體
        self.creatures.retain(|c| !c.is_captured || c.blackhole_anim < 0.98);
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        // 1. 廢土電網背景與飄移雲影 (時暗時亮)
        self.env.render_background(ctx, self.brightness)?;

        // 2. 幼體個體繪製
        for c in self.creatures.iter().skip(1) {
            c.render(ctx, self.viscosity)?;
        }

        // 3. 母體個體繪製（置頂層）
        if let Some(alpha) = self.creatures.first() {
            alpha.render(ctx, self.viscosity)?;
        }

        // 4. 天候層（微觀斜視角度螢光酸雨、扁平漣漪、水花粒子、冰晶與閃電）
        self.env.render_weather(ctx)?;

        Ok(())
    }

    pub fn get_player_tier_name(&self) -> String {
        self.creatures
            .first()
            .map(|a| a.tier_name())
            .unwrap_or_else(|| "Unknown".to_string())
    }

    pub fn get_exp(&self) -> usize {
        self.creatures.first().map(|a| a.exp).unwrap_or(0)
    }

    pub fn get_exp_needed(&self) -> usize {
        self.creatures.first().map(|a| a.exp_needed()).unwrap_or(1)
    }

    pub fn get_creature_count(&self) -> usize {
        self.creatures.len()
    }
}
