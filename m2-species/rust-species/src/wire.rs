use crate::math::{FastRng, Vec2, TWO_PI};
use wasm_bindgen::JsValue;
use web_sys::CanvasRenderingContext2d;

#[derive(Clone, Debug)]
pub struct ElectricSpark {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f64,
    pub max_life: f64,
}

impl ElectricSpark {
    pub fn new(pos: Vec2, vel: Vec2, max_life: f64) -> Self {
        Self {
            pos,
            vel,
            life: max_life,
            max_life,
        }
    }

    pub fn update(&mut self) -> bool {
        self.pos = self.pos + self.vel;
        self.vel = self.vel * 0.92;
        self.life -= 1.0;
        self.life > 0.0
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        let alpha = (self.life / self.max_life).clamp(0.0, 1.0);
        ctx.save();
        ctx.begin_path();
        ctx.arc(self.pos.x, self.pos.y, 1.8, 0.0, TWO_PI)?;
        let color = format!("rgba(100, 210, 255, {})", alpha);
        ctx.set_fill_style(&JsValue::from_str(&color));
        ctx.fill();
        ctx.restore();
        Ok(())
    }
}

#[derive(Clone, Debug)]
pub struct BioWire {
    pub anchor_a: Vec2,
    pub anchor_b: Vec2,
    pub sag: f64,
    pub spark_timer: f64,
    pub sparks: Vec<ElectricSpark>,
}

impl BioWire {
    pub fn new(anchor_a: Vec2, anchor_b: Vec2, sag: f64) -> Self {
        Self {
            anchor_a,
            anchor_b,
            sag,
            spark_timer: 0.0,
            sparks: Vec::new(),
        }
    }

    pub fn update(&mut self, rng: &mut FastRng, center: Vec2, stimulated: bool) {
        self.spark_timer += 1.0;
        let chance = if stimulated { 0.35 } else { 0.06 };

        if rng.gen_range(0.0, 1.0) < chance {
            let spark_origin = center + self.anchor_b;
            let angle = rng.gen_range(0.0, TWO_PI);
            let speed = rng.gen_range(2.0, 5.5);
            let vel = Vec2::new(angle.cos() * speed, angle.sin() * speed);
            self.sparks
                .push(ElectricSpark::new(spark_origin, vel, rng.gen_range(10.0, 22.0)));
        }

        self.sparks.retain_mut(|s| s.update());
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d, center: Vec2) -> Result<(), JsValue> {
        let p1 = center + self.anchor_a;
        let p2 = center + self.anchor_b;
        let mid = (p1 + p2) * 0.5;
        let ctrl = Vec2::new(mid.x, mid.y + self.sag);

        ctx.save();
        ctx.begin_path();
        ctx.move_to(p1.x, p1.y);
        ctx.quadratic_curve_to(ctrl.x, ctrl.y, p2.x, p2.y);
        ctx.set_stroke_style(&JsValue::from_str("#ff8822"));
        ctx.set_line_width(2.0);
        ctx.stroke();

        // 內核高光細銅線
        ctx.begin_path();
        ctx.move_to(p1.x, p1.y);
        ctx.quadratic_curve_to(ctrl.x, ctrl.y, p2.x, p2.y);
        ctx.set_stroke_style(&JsValue::from_str("#ffdd88"));
        ctx.set_line_width(0.8);
        ctx.stroke();
        ctx.restore();

        // 渲染電火花
        for s in &self.sparks {
            s.render(ctx)?;
        }

        Ok(())
    }
}
