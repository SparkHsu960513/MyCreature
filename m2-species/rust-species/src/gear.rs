use crate::math::{FastRng, Vec2, TWO_PI};
use wasm_bindgen::JsValue;
use web_sys::CanvasRenderingContext2d;

#[derive(Clone, Debug)]
pub struct Gear {
    pub offset: Vec2,
    pub radius: f64,
    pub teeth: usize,
    pub angle: f64,
    pub speed: f64,
    pub color_hex: &'static str,
    pub is_exposed: bool,
    pub spark_timer: f64,
}

impl Gear {
    pub fn new(
        offset: Vec2,
        radius: f64,
        teeth: usize,
        speed: f64,
        color_hex: &'static str,
        is_exposed: bool,
    ) -> Self {
        Self {
            offset,
            radius,
            teeth,
            angle: 0.0,
            speed,
            color_hex,
            is_exposed,
            spark_timer: 0.0,
        }
    }

    pub fn update(&mut self, speed_multiplier: f64, rng: &mut FastRng) {
        self.angle = (self.angle + self.speed * speed_multiplier * 0.3) % TWO_PI;

        if self.spark_timer > 0.0 {
            self.spark_timer -= 1.0;
        } else if rng.gen_range(0.0, 1.0) < 0.035 {
            self.spark_timer = rng.gen_range(6.0, 16.0);
        }
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d, center: Vec2) -> Result<(), JsValue> {
        let gx = center.x + self.offset.x;
        let gy = center.y + self.offset.y;

        ctx.save();
        ctx.translate(gx, gy)?;
        ctx.rotate(self.angle)?;

        // 1. 齒輪齒牙外廓
        let total_points = (self.teeth * 4).max(12);
        let step = TWO_PI / (total_points as f64);
        let tooth_depth = self.radius * 0.22;

        ctx.begin_path();
        for i in 0..total_points {
            let a = i as f64 * step;
            let mod4 = i % 4;
            let r = if mod4 == 1 || mod4 == 2 {
                self.radius + tooth_depth
            } else {
                self.radius
            };
            let px = a.cos() * r;
            let py = a.sin() * r;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();

        ctx.set_fill_style_str(self.color_hex);
        ctx.fill();
        ctx.set_stroke_style_str("#14161a");
        ctx.set_line_width(1.5);
        ctx.stroke();

        // 2. 齒輪內凹槽環
        ctx.begin_path();
        ctx.arc(0.0, 0.0, self.radius * 0.55, 0.0, TWO_PI)?;
        ctx.set_fill_style_str("#18191d");
        ctx.fill();
        ctx.set_stroke_style_str("#2a2d35");
        ctx.set_line_width(1.0);
        ctx.stroke();

        // 3. 鏤空減重孔 (3 個對稱鉚釘/減重孔)
        ctx.set_fill_style_str("#0f1013");
        for i in 0..3 {
            let hole_angle = (TWO_PI / 3.0) * (i as f64);
            let hx = (self.radius * 0.36) * hole_angle.cos();
            let hy = (self.radius * 0.36) * hole_angle.sin();
            ctx.begin_path();
            ctx.arc(hx, hy, self.radius * 0.12, 0.0, TWO_PI)?;
            ctx.fill();
        }

        // 4. 中心青銅軸承心
        ctx.begin_path();
        ctx.arc(0.0, 0.0, self.radius * 0.18, 0.0, TWO_PI)?;
        ctx.set_fill_style_str("#d8b065");
        ctx.fill();

        // 5. 齒輪邊緣迸發微弱電火花
        if self.spark_timer > 0.0 {
            let spark_ang = (self.angle * 3.7).sin() * std::f64::consts::PI;
            let sx = spark_ang.cos() * (self.radius + tooth_depth);
            let sy = spark_ang.sin() * (self.radius + tooth_depth);
            ctx.begin_path();
            ctx.move_to(sx, sy);
            ctx.line_to(sx + spark_ang.cos() * 8.0, sy + spark_ang.sin() * 8.0);
            ctx.set_stroke_style_str("#00ffcc");
            ctx.set_line_width(1.6);
            ctx.stroke();
        }

        ctx.restore();
        Ok(())
    }
}
