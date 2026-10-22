use crate::gear::Gear;
use crate::math::{pseudo_noise, FastRng, Vec2, TWO_PI};
use crate::tentacle::SlimeTentacle;
use crate::wire::BioWire;
use wasm_bindgen::JsValue;
use web_sys::CanvasRenderingContext2d;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum CreatureState {
    Idle,
    Exploring,
    Hunting,
    Stimulated,
}

#[derive(Clone, Debug)]
pub struct BodyFilament {
    pub points: Vec<Vec2>,
    pub is_cyan: bool,
    pub life: f64,
}

#[derive(Clone, Debug)]
pub struct SlimeDroplet {
    pub angle: f64,
    pub dist_factor: f64,
    pub radius: f64,
    pub orbit_speed: f64,
}

#[derive(Clone, Debug)]
pub struct NeonGland {
    pub offset_angle: f64,
    pub dist_r: f64,
    pub size: f64,
    pub is_cyan: bool,
}

#[derive(Clone, Debug)]
pub struct SlimeCreature {
    pub pos: Vec2,
    pub vel: Vec2,
    pub target: Vec2,
    pub base_radius: f64,
    pub tier: usize,
    pub exp: usize,
    pub state: CreatureState,
    pub state_timer: f64,
    pub tentacles: Vec<SlimeTentacle>,
    pub gears: Vec<Gear>,
    pub wires: Vec<BioWire>,
    pub filaments: Vec<BodyFilament>,
    pub droplets: Vec<SlimeDroplet>,
    pub glands: Vec<NeonGland>,
    pub pulse_phase: f64,
    pub is_alpha: bool,
    pub is_captured: bool,
    pub blackhole_anim: f64,
}

impl SlimeCreature {
    pub fn new(x: f64, y: f64, tier: usize, is_alpha: bool) -> Self {
        let (radius, tentacle_count) = Self::tier_attributes(tier);

        // 1. 初始化有機柔韌黏液觸手（極度強烈的粗度與生物感）
        let mut tentacles = Vec::new();
        let angle_step = TWO_PI / (tentacle_count as f64);
        for i in 0..tentacle_count {
            let angle = i as f64 * angle_step;
            let reach = radius * 2.1 + 40.0;
            tentacles.push(SlimeTentacle::new(angle, reach));
        }

        // 2. 初始化強烈錯位且外露的機械齒輪群
        let gears = Self::build_gears(radius, tier);

        // 3. 裸露生化電線
        let mut wires = Vec::new();
        let wire_count = (tier + 2).min(8);
        for i in 0..wire_count {
            let a = Vec2::from_angle(i as f64 * (TWO_PI / wire_count as f64)) * (radius * 0.45);
            let b = Vec2::from_angle((i as f64 + 1.6) * (TWO_PI / wire_count as f64)) * (radius * 0.75);
            wires.push(BioWire::new(a, b, 10.0));
        }

        // 4. 周圍微小懸浮黏液珠 (Droplets)
        let mut droplets = Vec::new();
        let mut rng = FastRng::new(54321 + tier as u32);
        for _ in 0..((radius * 0.16) as usize).max(4) {
            droplets.push(SlimeDroplet {
                angle: rng.gen_range(0.0, TWO_PI),
                dist_factor: rng.gen_range(0.9, 1.35),
                radius: rng.gen_range(radius * 0.12, radius * 0.26),
                orbit_speed: rng.gen_range(-0.015, 0.015),
            });
        }

        // 5. 體內發光腺體 (Neon Glands)
        let glands = vec![
            NeonGland { offset_angle: 0.5, dist_r: radius * 0.44, size: radius * 0.28, is_cyan: true },
            NeonGland { offset_angle: 2.6, dist_r: radius * 0.40, size: radius * 0.22, is_cyan: false },
            NeonGland { offset_angle: -1.8, dist_r: radius * 0.50, size: radius * 0.30, is_cyan: true },
        ];

        Self {
            pos: Vec2::new(x, y),
            vel: Vec2::default(),
            target: Vec2::new(x, y),
            base_radius: radius,
            tier,
            exp: 0,
            state: CreatureState::Idle,
            state_timer: 0.0,
            tentacles,
            gears,
            wires,
            filaments: Vec::new(),
            droplets,
            glands,
            pulse_phase: 0.0,
            is_alpha,
            is_captured: false,
            blackhole_anim: 0.0,
        }
    }

    pub fn build_gears(radius: f64, tier: usize) -> Vec<Gear> {
        let gear_defs = [
            (-0.25, 0.15, 0.46, 6, 0.055, "#9a8559", false),
            (1.15, -0.55, 0.38, 5, -0.095, "#6b727b", true),  // 外露右上
            (0.22, 1.10, 0.32, 4, 0.130, "#855742", true),   // 外露下方
            (-0.95, -0.50, 0.30, 5, -0.170, "#5a7366", true), // 外露左上
            (-0.65, 0.60, 0.26, 5, 0.190, "#786882", true),  // 外露左下
            (0.60, 0.75, 0.24, 4, -0.120, "#9a8559", true),  // 側邊
            (-1.05, 0.35, 0.22, 4, 0.160, "#6b727b", true),  // 極左端
        ];

        let max_gears = (tier + 2).min(gear_defs.len());
        let mut gears = Vec::with_capacity(max_gears);

        for (dx, dy, r_ratio, teeth, speed, col, exposed) in gear_defs.iter().take(max_gears) {
            let offset = Vec2::new(radius * dx, radius * dy);
            let g_r = (radius * r_ratio).max(8.0);
            gears.push(Gear::new(offset, g_r, *teeth, *speed, col, *exposed));
        }

        gears
    }

    pub fn tier_attributes(tier: usize) -> (f64, usize) {
        let clamped = tier.clamp(1, 10);
        let radius = 26.0 + (clamped as f64 - 1.0) * 13.0;
        let tentacle_count = match clamped {
            1 => 3,
            2 => 4,
            3 => 5,
            4 => 6,
            5 => 7,
            6 => 8,
            7 => 9,
            8 => 10,
            9 => 11,
            _ => 12,
        };
        (radius, tentacle_count)
    }

    pub fn tier_name(&self) -> String {
        let titles = [
            "Tier 1 微型幼體 (3 爪)",
            "Tier 2 小型聚合物 (4 爪)",
            "Tier 3 巨獸成體 (5 爪)",
            "Tier 4 強化掠食者 (6 爪)",
            "Tier 5 鋼骨重構體 (7 爪)",
            "Tier 6 深槽異形 (8 爪)",
            "Tier 7 高壓突觸獸 (9 爪)",
            "Tier 8 暴食聚合體 (10 爪)",
            "Tier 9 災厄巨械 (11 爪)",
            "Tier 10 巨構天災 (12 爪)",
        ];
        titles[self.tier.saturating_sub(1).min(9)].to_string()
    }

    pub fn exp_needed(&self) -> usize {
        (self.tier * 2 + 1).min(20)
    }

    pub fn stimulate(&mut self, target_x: f64, target_y: f64) {
        self.target = Vec2::new(target_x, target_y);
        self.state = CreatureState::Stimulated;
        self.state_timer = 180.0;
    }

    pub fn update(
        &mut self,
        rng: &mut FastRng,
        gear_speed: f64,
        viscosity: f64,
        prey_list: &mut [SlimeCreature],
    ) {
        if self.is_captured {
            return;
        }

        self.pulse_phase += 0.055 * viscosity;

        // 狀態機
        self.state_timer -= 1.0;
        if self.state_timer <= 0.0 {
            if self.is_alpha {
                let p = rng.gen_range(0.0, 1.0);
                if p < 0.35 {
                    self.state = CreatureState::Idle;
                    self.state_timer = rng.gen_range(70.0, 150.0);
                } else {
                    self.state = CreatureState::Exploring;
                    self.state_timer = rng.gen_range(120.0, 240.0);
                    let angle = rng.gen_range(0.0, TWO_PI);
                    let dist = rng.gen_range(120.0, 320.0);
                    self.target = self.pos + Vec2::new(angle.cos() * dist, angle.sin() * dist);
                }
            } else {
                self.state = CreatureState::Exploring;
                self.state_timer = rng.gen_range(90.0, 200.0);
                let angle = rng.gen_range(0.0, TWO_PI);
                let dist = rng.gen_range(50.0, 160.0);
                self.target = self.pos + Vec2::new(angle.cos() * dist, angle.sin() * dist);
            }
        }

        // 母體索敵
        if self.is_alpha {
            let mut nearest_dist = 600.0;
            let mut hunt_target = None;
            for other in prey_list.iter() {
                if other.is_captured || other.tier >= self.tier {
                    continue;
                }
                let d = self.pos.dist(other.pos);
                if d < nearest_dist {
                    nearest_dist = d;
                    hunt_target = Some(other.pos);
                }
            }
            if let Some(target_pos) = hunt_target {
                self.target = target_pos;
                self.state = CreatureState::Hunting;
            }
        }

        // 推進移動
        let to_target = self.target - self.pos;
        let dist = to_target.length();
        let is_hunting = self.state == CreatureState::Hunting;
        let max_speed = if is_hunting { 2.8 } else if self.state == CreatureState::Stimulated { 3.6 } else { 1.6 };

        if dist > 15.0 {
            let desired = to_target.normalize() * max_speed;
            self.vel = self.vel * 0.93 + desired * 0.07;
            self.pos = self.pos + self.vel;
        } else {
            self.vel = self.vel * 0.88;
        }

        // 觸手更新
        for t in &mut self.tentacles {
            t.update(self.pos, self.vel, is_hunting, rng, self.base_radius);
        }

        // 齒輪更新
        for g in &mut self.gears {
            g.update(gear_speed, rng);
        }

        // 裸線更新
        for w in &mut self.wires {
            w.update(rng, self.pos, self.state == CreatureState::Stimulated);
        }

        // 體表高頻竄動電絲 (Crawling Body Electrical Filaments)
        if rng.gen_range(0.0, 1.0) < 0.35 {
            let center_ang = rng.gen_range(0.0, TWO_PI);
            let start_r = self.base_radius * rng.gen_range(0.2, 0.95);
            let mut pts = Vec::new();
            let mut cur = Vec2::new(center_ang.cos() * start_r, center_ang.sin() * start_r);
            pts.push(cur);

            for _ in 0..5 {
                let j_ang = rng.gen_range(0.0, TWO_PI);
                let j_dist = rng.gen_range(8.0, 24.0);
                cur = cur + Vec2::new(j_ang.cos() * j_dist, j_ang.sin() * j_dist);
                pts.push(cur);
            }

            self.filaments.push(BodyFilament {
                points: pts,
                is_cyan: rng.gen_range(0.0, 1.0) > 0.4,
                life: rng.gen_range(5.0, 11.0),
            });
        }

        self.filaments.retain_mut(|f| {
            f.life -= 1.0;
            f.life > 0.0
        });

        // 黏液珠旋轉更新
        for d in &mut self.droplets {
            d.angle += d.orbit_speed;
        }

        // 黑洞引力吞食
        if self.is_alpha {
            let capture_reach = self.base_radius * 2.8;
            for other in prey_list.iter_mut() {
                if other.is_captured || other.tier >= self.tier {
                    continue;
                }
                let d = self.pos.dist(other.pos);
                if d < capture_reach {
                    let pull = (self.pos - other.pos).normalize() * 4.2;
                    other.pos = other.pos + pull;
                    other.blackhole_anim = (other.blackhole_anim + 0.05).min(1.0);

                    if d < self.base_radius * 0.85 {
                        other.is_captured = true;
                        self.exp += 1;
                        if self.exp >= self.exp_needed() && self.tier < 10 {
                            self.upgrade();
                        }
                    }
                }
            }
        }
    }

    pub fn upgrade(&mut self) {
        self.tier = (self.tier + 1).min(10);
        self.exp = 0;
        let (new_r, new_t_count) = Self::tier_attributes(self.tier);
        self.base_radius = new_r;

        let angle_step = TWO_PI / (new_t_count as f64);
        self.tentacles.clear();
        for i in 0..new_t_count {
            let angle = i as f64 * angle_step;
            let reach = new_r * 2.1 + 40.0;
            self.tentacles.push(SlimeTentacle::new(angle, reach));
        }

        self.gears = Self::build_gears(new_r, self.tier);
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d, viscosity: f64) -> Result<(), JsValue> {
        if self.is_captured {
            return Ok(());
        }

        ctx.save();

        // 1. 底層渾厚強韌有機觸手
        for t in &self.tentacles {
            t.render(ctx, self.pos, self.base_radius)?;
        }

        // 2. 懸掛外露齒輪的肉質黏液蹼 (Slime Webbing)
        self.render_gear_slime_webbing(ctx)?;

        // 3. 獵捕光罩
        if self.is_alpha && self.state == CreatureState::Hunting {
            let glow_r = self.base_radius * 2.6;
            ctx.begin_path();
            ctx.arc(self.pos.x, self.pos.y, glow_r, 0.0, TWO_PI)?;
            ctx.set_stroke_style_str("rgba(255, 120, 20, 0.38)");
            ctx.set_line_width(2.5);
            ctx.stroke();
        }

        // 4. 極強烈真實液態史萊姆本體 (大幅增強行進波浪、黏稠起伏與果凍邊緣)
        self.render_slime_body(ctx, viscosity)?;

        // 5. 體內發光腺體 (Neon Glands)
        self.render_neon_glands(ctx)?;

        // 6. 齒輪
        for g in &self.gears {
            g.render(ctx, self.pos)?;
        }

        // 7. 外露電線
        for w in &self.wires {
            w.render(ctx, self.pos)?;
        }

        // 8. 體表游走電絲 (Crawling Body Electrical Filaments)
        self.render_filaments(ctx)?;

        // 9. 體周邊水感黏液珠 (Droplets)
        self.render_droplets(ctx)?;

        // 10. 厚重水光高光 (Specular Highlights - 呈現真實史萊姆液態反光)
        self.render_specular_highlights(ctx)?;

        ctx.restore();
        Ok(())
    }

    fn render_gear_slime_webbing(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        let r = self.base_radius;
        ctx.save();
        ctx.set_fill_style_str("rgba(8, 10, 14, 0.96)");
        ctx.set_stroke_style_str("rgba(55, 75, 95, 0.85)");
        ctx.set_line_width(2.0);

        for g in &self.gears {
            if g.is_exposed {
                let gx = self.pos.x + g.offset.x;
                let gy = self.pos.y + g.offset.y;
                let root_angle = g.offset.y.atan2(g.offset.x);

                let p1 = self.pos + Vec2::from_angle(root_angle - 0.5) * (r * 0.85);
                let p2 = self.pos + Vec2::from_angle(root_angle + 0.5) * (r * 0.85);

                ctx.begin_path();
                ctx.move_to(p1.x, p1.y);
                ctx.quadratic_curve_to(self.pos.x + g.offset.x * 0.5, self.pos.y + g.offset.y * 0.5, gx, gy);
                ctx.quadratic_curve_to(self.pos.x + g.offset.x * 0.5, self.pos.y + g.offset.y * 0.5, p2.x, p2.y);
                ctx.close_path();
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();
        Ok(())
    }

    fn render_slime_body(&self, ctx: &CanvasRenderingContext2d, viscosity: f64) -> Result<(), JsValue> {
        let vert_count = 32;
        let angle_step = TWO_PI / (vert_count as f64);
        let pulse = self.pulse_phase.sin() * (5.5 * viscosity);
        let r = (self.base_radius + pulse) * (1.0 - self.blackhole_anim * 0.85);

        let spd = self.vel.length();
        let heading = self.vel.heading();

        // 1. 外層厚重液態黏液輪廓（魔浮斗篷行進波浪 + 表面張力拉扯）
        ctx.begin_path();
        for i in 0..vert_count {
            let a = i as f64 * angle_step;
            let diff = a - heading;
            let cos_diff = diff.cos();

            // 後方大幅度行進波 (Undulating traveling waves)
            let mut wave = 0.0;
            if spd > 0.15 {
                let wave_val = (a * 4.0 - self.pulse_phase * 2.2 + spd * 2.8).sin();
                wave = wave_val * (spd * 14.0) * (-cos_diff).max(0.0);
            }

            // 前端行進方向水滴狀有機拉伸
            let mut stretch = 0.0;
            if spd > 0.15 {
                stretch = cos_diff * (spd * 12.0);
            }

            // 有機不規則黏液凸泡 (Fluid Lobes)
            let noise_val = pseudo_noise(a.cos() * 1.8, a.sin() * 1.8 + self.pulse_phase * 0.4);
            let vr = r + wave + stretch + (noise_val - 0.5) * (24.0 * viscosity);

            let px = self.pos.x + a.cos() * vr;
            let py = self.pos.y + a.sin() * vr;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();

        // 深黑曜質厚重史萊姆主體
        ctx.set_fill_style_str("rgba(8, 10, 14, 0.98)");
        ctx.fill();
        ctx.set_stroke_style_str("rgba(70, 95, 125, 0.95)");
        ctx.set_line_width(3.2);
        ctx.stroke();

        // 2. 內層半透明果凍膠質層 (Jelly Membrane)
        ctx.begin_path();
        let mid_r = r * 0.82;
        for i in 0..vert_count {
            let a = i as f64 * angle_step;
            let vr = mid_r + (pseudo_noise(a.cos() * 2.2, self.pulse_phase * 0.3) - 0.5) * 10.0;
            let px = self.pos.x + a.cos() * vr;
            let py = self.pos.y + a.sin() * vr;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();
        ctx.set_fill_style_str("rgba(16, 22, 30, 0.65)");
        ctx.fill();

        // 3. 內核深黑黑洞核心
        ctx.begin_path();
        let inner_r = r * 0.58;
        for i in 0..vert_count {
            let a = i as f64 * angle_step;
            let vr = inner_r + (pseudo_noise(a.sin() * 2.5, self.pulse_phase * 0.4) - 0.5) * 7.0;
            let px = self.pos.x + a.cos() * vr;
            let py = self.pos.y + a.sin() * vr;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();
        ctx.set_fill_style_str("#030406");
        ctx.fill();

        Ok(())
    }

    fn render_neon_glands(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        ctx.save();
        let breath = (self.pulse_phase * 1.5).sin() * 3.5;

        for g in &self.glands {
            let gx = self.pos.x + g.offset_angle.cos() * g.dist_r;
            let gy = self.pos.y + g.offset_angle.sin() * g.dist_r;
            let gr = (g.size + breath).max(4.0);

            // 多層強烈螢光發光光暈
            ctx.begin_path();
            ctx.arc(gx, gy, gr * 1.4, 0.0, TWO_PI)?;
            if g.is_cyan {
                ctx.set_fill_style_str("rgba(0, 255, 220, 0.35)");
            } else {
                ctx.set_fill_style_str("rgba(255, 130, 20, 0.35)");
            }
            ctx.fill();

            ctx.begin_path();
            ctx.arc(gx, gy, gr, 0.0, TWO_PI)?;
            if g.is_cyan {
                ctx.set_fill_style_str("rgba(0, 255, 200, 0.85)");
            } else {
                ctx.set_fill_style_str("rgba(255, 120, 20, 0.85)");
            }
            ctx.fill();

            // 中心亮核
            ctx.begin_path();
            ctx.arc(gx, gy, gr * 0.45, 0.0, TWO_PI)?;
            ctx.set_fill_style_str("#ffffff");
            ctx.fill();
        }
        ctx.restore();
        Ok(())
    }

    fn render_filaments(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        ctx.save();

        for f in &self.filaments {
            if f.points.len() < 2 {
                continue;
            }
            ctx.begin_path();
            let p0 = self.pos + f.points[0];
            ctx.move_to(p0.x, p0.y);
            for pt in f.points.iter().skip(1) {
                let p = self.pos + *pt;
                ctx.line_to(p.x, p.y);
            }

            let alpha = (f.life / 10.0).clamp(0.0, 1.0);
            if f.is_cyan {
                ctx.set_stroke_style_str(&format!("rgba(0, 255, 240, {})", alpha));
            } else {
                ctx.set_stroke_style_str(&format!("rgba(255, 170, 40, {})", alpha));
            }
            ctx.set_line_width(2.0);
            ctx.stroke();
        }
        ctx.restore();
        Ok(())
    }

    fn render_droplets(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        ctx.save();
        let r = self.base_radius;

        for d in &self.droplets {
            let dist = r * d.dist_factor;
            let dx = self.pos.x + d.angle.cos() * dist;
            let dy = self.pos.y + d.angle.sin() * dist;

            ctx.begin_path();
            ctx.arc(dx, dy, d.radius, 0.0, TWO_PI)?;
            ctx.set_fill_style_str("rgba(10, 12, 16, 0.95)");
            ctx.fill();
            ctx.set_stroke_style_str("rgba(80, 110, 140, 0.85)");
            ctx.set_line_width(1.8);
            ctx.stroke();

            // 小水珠高光
            ctx.begin_path();
            ctx.arc(dx - d.radius * 0.35, dy - d.radius * 0.35, d.radius * 0.25, 0.0, TWO_PI)?;
            ctx.set_fill_style_str("rgba(255, 255, 255, 0.75)");
            ctx.fill();
        }
        ctx.restore();
        Ok(())
    }

    fn render_specular_highlights(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        let r = self.base_radius;
        let breath = self.pulse_phase.sin() * 2.5;

        ctx.save();

        // 頂部大型液態水光穹頂光暈（極度濕潤反光）
        ctx.begin_path();
        ctx.ellipse(
            self.pos.x - r * 0.36,
            self.pos.y - r * 0.36,
            (r * 0.42 + breath).max(5.0),
            (r * 0.24 + breath * 0.5).max(3.0),
            -0.38,
            0.0,
            TWO_PI,
        )?;
        ctx.set_fill_style_str("rgba(200, 235, 255, 0.55)");
        ctx.fill();

        // 核心最亮點水珠高光
        ctx.begin_path();
        ctx.ellipse(
            self.pos.x - r * 0.42,
            self.pos.y - r * 0.42,
            (r * 0.15).max(3.0),
            (r * 0.10).max(2.0),
            -0.38,
            0.0,
            TWO_PI,
        )?;
        ctx.set_fill_style_str("#ffffff");
        ctx.fill();

        // 邊緣強烈水光弧痕
        ctx.begin_path();
        ctx.arc(self.pos.x, self.pos.y, r * 0.88, std::f64::consts::PI * 0.82, std::f64::consts::PI * 1.35)?;
        ctx.set_stroke_style_str("rgba(220, 245, 255, 0.65)");
        ctx.set_line_width(2.8);
        ctx.stroke();

        ctx.restore();
        Ok(())
    }
}
