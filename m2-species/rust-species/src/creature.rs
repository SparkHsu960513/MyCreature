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

#[derive(Clone, Copy, Debug)]
pub struct PreyResidue {
    pub pos: Vec2,
    pub radius: f64,
    pub life: f64,
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
    pub hunt_phase: f64,
    pub pull_vec: Vec2,
}

impl SlimeCreature {
    pub fn new(x: f64, y: f64, tier: usize, is_alpha: bool) -> Self {
        let (radius, tentacle_count) = Self::tier_attributes(tier);

        // 1. 初始化有機柔韌黏液觸手（極度強烈的粗度與生物感）
        let mut tentacles = Vec::new();
        let angle_step = TWO_PI / (tentacle_count as f64);
        for i in 0..tentacle_count {
            let angle = i as f64 * angle_step;
            let reach = radius * 2.1 + 28.0;
            tentacles.push(SlimeTentacle::new(angle, reach));
        }

        // 2. 初始化核心咬合齒輪群（整齊內嵌於果凍中心，告別雜亂外露）
        let gears = Self::build_gears(radius, tier);

        // 3. 體內生化電導管（結構性連結核心與偽足）
        let mut wires = Vec::new();
        let a1 = Vec2::new(-radius * 0.12, -radius * 0.08);
        let b1 = Vec2::new(radius * 0.28, -radius * 0.18);
        wires.push(BioWire::new(a1, b1, radius * 0.14));

        if tier >= 2 {
            let a2 = Vec2::new(radius * 0.14, radius * 0.10);
            let b2 = Vec2::new(-radius * 0.24, radius * 0.24);
            wires.push(BioWire::new(a2, b2, -radius * 0.12));
        }

        // 4. 體周微液泡（清空體外散落懸浮球，增強生物凝聚一體感）
        let droplets = Vec::new();

        // 5. 體內核心發光腺體 (Neon Glands - 柔和深嵌於中心)
        let glands = vec![
            NeonGland { offset_angle: 0.3, dist_r: radius * 0.20, size: radius * 0.18, is_cyan: true },
            NeonGland { offset_angle: 3.1, dist_r: radius * 0.16, size: radius * 0.14, is_cyan: false },
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
            hunt_phase: 0.0,
            pull_vec: Vec2::default(),
        }
    }

    pub fn build_gears(radius: f64, tier: usize) -> Vec<Gear> {
        // 清晰、豐富且精密咬合的核心機械鐘錶齒輪群（完整展現機械內核）
        let gear_defs = [
            (-0.06, -0.04, 0.52, 8, 0.045, "#64748b", false), // 主核心鈦鋼驅動大齒輪
            (0.32, 0.10, 0.38, 6, -0.060, "#94a3b8", false),  // 嚙合反向轉動副齒輪
            (-0.24, 0.22, 0.28, 5, 0.085, "#d97706", false),  // 暖金色調速機械齒輪
            (0.08, -0.28, 0.22, 4, -0.110, "#cbd5e1", false), // 頂部高轉速微型傳動齒輪
        ];

        let max_gears = match tier {
            1 => 2,
            2 => 3,
            _ => 4,
        };
        let mut gears = Vec::with_capacity(max_gears);

        for (dx, dy, r_ratio, teeth, speed, col, exposed) in gear_defs.iter().take(max_gears) {
            let offset = Vec2::new(radius * dx, radius * dy);
            let g_r = (radius * r_ratio).max(7.0);
            gears.push(Gear::new(offset, g_r, *teeth, *speed, col, *exposed));
        }

        gears
    }

    pub fn tier_attributes(tier: usize) -> (f64, usize) {
        let clamped = tier.clamp(1, 10);
        let radius = 17.0 + (clamped as f64 - 1.0) * 8.5;
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
            if self.state == CreatureState::Hunting {
                self.hunt_phase += 0.09;
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

        // 牽引力緩慢衰減
        self.pull_vec = self.pull_vec * 0.88;

        // 幽浮牽引光束與萬有引力吸食
        if self.is_alpha {
            let capture_reach = self.base_radius * 4.8;
            for other in prey_list.iter_mut() {
                if other.is_captured || other.tier >= self.tier {
                    continue;
                }
                let d = self.pos.dist(other.pos);
                if d < capture_reach {
                    // 強烈萬有引力牽引：越近吸力越強烈
                    let pull_ratio = ((capture_reach - d) / capture_reach).clamp(0.25, 1.0);
                    let pull = (self.pos - other.pos).normalize() * (3.6 + pull_ratio * 4.8);
                    other.pos = other.pos + pull;
                    other.pull_vec = (self.pos - other.pos).normalize() * (0.6 + pull_ratio * 0.8);
                    other.blackhole_anim = (other.blackhole_anim + 0.045).min(1.0);

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
            let reach = new_r * 2.1 + 28.0;
            self.tentacles.push(SlimeTentacle::new(angle, reach));
        }

        self.gears = Self::build_gears(new_r, self.tier);
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d, viscosity: f64) -> Result<(), JsValue> {
        if self.is_captured {
            return Ok(());
        }

        ctx.save();

        // 1. 底層有機觸手 (Pseudopods)
        for t in &self.tentacles {
            t.render(ctx, self.pos, self.base_radius)?;
        }

        // 2. 偽足黏液過渡蹼 (將所有肢體與身體基底自然平滑熔接為單一史萊姆有機體)
        self.render_pseudopod_webbing(ctx)?;

        // 3. 獵捕幽浮光罩 (UFO Tractor Forcefield Dome)
        if self.is_alpha && self.state == CreatureState::Hunting {
            let pulse = (self.pulse_phase * 2.0).sin() * 0.12 + 1.0;

            // 多層次漸層光暈光罩 (層次擴散幽藍微光)
            for k in (1..=5).rev() {
                let k_f = k as f64;
                let layer_r = (self.base_radius * (1.5 + k_f * 0.45)) * pulse;
                let alpha = (0.04 / k_f + 0.015 * (self.pulse_phase * 3.0).sin().abs()).clamp(0.01, 0.25);
                ctx.begin_path();
                ctx.arc(self.pos.x, self.pos.y, layer_r, 0.0, TWO_PI)?;
                ctx.set_fill_style_str(&format!("rgba(90, 220, 255, {:.3})", alpha));
                ctx.fill();
            }

            // 核心力場邊界環
            ctx.begin_path();
            ctx.arc(self.pos.x, self.pos.y, self.base_radius * 2.1 * pulse, 0.0, TWO_PI)?;
            ctx.set_stroke_style_str("rgba(130, 235, 255, 0.45)");
            ctx.set_line_width(1.5);
            ctx.stroke();

            // 幽浮強效牽引光束 (Powerful UFO Tractor Beam & Suction Vortex)
            let to_target = self.target - self.pos;
            let dist = to_target.length();
            if dist > 8.0 {
                let dir = to_target.normalize();
                let perp = Vec2::new(-dir.y, dir.x);
                let cone_spread = (self.base_radius * 0.9).min(dist * 0.42);

                // 牽引力場光錐
                ctx.begin_path();
                ctx.move_to(self.pos.x, self.pos.y);
                ctx.line_to(self.target.x + perp.x * cone_spread, self.target.y + perp.y * cone_spread);
                ctx.line_to(self.target.x - perp.x * cone_spread, self.target.y - perp.y * cone_spread);
                ctx.close_path();
                ctx.set_fill_style_str("rgba(56, 189, 248, 0.16)");
                ctx.fill();

                // 雙重螺旋牽引光流 (Helical Vortex Suction Stream - 牽引包裹獵物)
                for spiral in 0..2 {
                    ctx.begin_path();
                    let segs = 24;
                    for seg in 0..=segs {
                        let t = seg as f64 / segs as f64;
                        let base_pt = self.target.lerp(self.pos, t);
                        let wave = ((t * 8.5 - self.hunt_phase * 3.2 + spiral as f64 * std::f64::consts::PI).sin()) * (cone_spread * (1.0 - t * 0.55));
                        let pt = base_pt + perp * wave;
                        if seg == 0 { ctx.move_to(pt.x, pt.y); } else { ctx.line_to(pt.x, pt.y); }
                    }
                    ctx.set_stroke_style_str("rgba(130, 235, 255, 0.55)");
                    ctx.set_line_width(1.8);
                    ctx.stroke();
                }

                // 牽引吸附流光粒子 (高速向母體吸食逆流)
                for s in 0..6 {
                    let s_phase = (self.hunt_phase * 2.0 + s as f64 * 0.166) % 1.0;
                    let p_stream = self.target.lerp(self.pos, s_phase);
                    let spread_scale = (s as f64 - 2.5) / 2.5;
                    let pt = p_stream + perp * (spread_scale * cone_spread * (1.0 - s_phase * 0.8));
                    let p_size = 3.0 * (1.0 - s_phase * 0.55);
                    ctx.begin_path();
                    ctx.arc(pt.x, pt.y, p_size, 0.0, TWO_PI)?;
                    ctx.set_fill_style_str("rgba(180, 245, 255, 0.88)");
                    ctx.fill();
                }
            }
        }

        // 4. 體內核心咬合齒輪群 (位於膠質深層，被史萊姆凝膠完全包覆包裹)
        for g in &self.gears {
            g.render(ctx, self.pos)?;
        }

        // 5. 體內生化電導管 (深嵌於膠體內部，成為內在脈絡)
        for w in &self.wires {
            w.render(ctx, self.pos)?;
        }

        // 6. 體內核心發光腺體 (Neon Glands - 自膠體深處向外漫射柔光)
        self.render_neon_glands(ctx)?;

        // 7. 晶透厚重史萊姆主體果凍外包膜 (透明度約 50%，使內部豐富齒輪清晰可見)
        self.render_slime_body(ctx, viscosity)?;

        // 8. 體表微細游走電絲 (Crawling Body Electrical Filaments)
        self.render_filaments(ctx)?;

        // 9. 厚重水光高光與折射光 (Specular Highlights - 呈現真實史萊姆液態反光)
        self.render_specular_highlights(ctx)?;

        ctx.restore();
        Ok(())
    }

    fn render_pseudopod_webbing(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        let count = self.tentacles.len();
        if count < 2 {
            return Ok(());
        }
        ctx.save();
        ctx.set_fill_style_str("rgba(8, 12, 18, 0.94)");
        ctx.set_stroke_style_str("rgba(45, 70, 95, 0.65)");
        ctx.set_line_width(1.6);

        let r = self.base_radius;
        for i in 0..count {
            let next_i = (i + 1) % count;
            let a1 = self.tentacles[i].mount_angle;
            let mut a2 = self.tentacles[next_i].mount_angle;
            if a2 < a1 {
                a2 += TWO_PI;
            }
            let mid_a = (a1 + a2) * 0.5;

            let p1 = self.pos + Vec2::from_angle(a1) * (r * 0.88);
            let p2 = self.pos + Vec2::from_angle(a2) * (r * 0.88);
            let ctrl = self.pos + Vec2::from_angle(mid_a) * (r * 0.42);

            ctx.begin_path();
            ctx.move_to(p1.x, p1.y);
            ctx.quadratic_curve_to(ctrl.x, ctrl.y, p2.x, p2.y);
            ctx.line_to(self.pos.x, self.pos.y);
            ctx.close_path();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
        Ok(())
    }

    fn render_slime_body(&self, ctx: &CanvasRenderingContext2d, viscosity: f64) -> Result<(), JsValue> {
        let vert_count = 36;
        let angle_step = TWO_PI / (vert_count as f64);
        let breath = self.pulse_phase.sin() * (2.8 * viscosity);
        let r = (self.base_radius + breath) * (1.0 - self.blackhole_anim * 0.85);

        let spd = self.vel.length();
        let heading = self.vel.heading();

        // 1. 厚質晶透黑曜凝膠外包膜 (深質半透明流體果凍主體)
        ctx.begin_path();
        for i in 0..vert_count {
            let a = i as f64 * angle_step;
            let diff = a - heading;
            let cos_diff = diff.cos();

            // 前方行進方向水感拉伸
            let stretch = if spd > 0.1 { cos_diff * (spd * 6.5) } else { 0.0 };

            // 後方平滑拖曳
            let trail = if spd > 0.1 && cos_diff < 0.0 { -cos_diff * (spd * 4.5) } else { 0.0 };

            // 【被捕獲時的潮汐拉伸感 (Tidal Pull Deformation)】：朝向牽引力方向極度拉長
            let to_pt = Vec2::new(a.cos(), a.sin());
            let pull_dot = to_pt.x * self.pull_vec.x + to_pt.y * self.pull_vec.y;
            let pull_stretch = if pull_dot > 0.0 {
                pull_dot * (r * 2.2 * self.blackhole_anim)
            } else {
                -pull_dot.abs() * (r * 0.35 * self.blackhole_anim)
            };

            // 表面張力有機波動
            let wobble = (a * 3.0 + self.pulse_phase * 1.6).sin() * (1.8 * viscosity)
                       + (a * 2.0 - self.pulse_phase * 0.9).cos() * (1.2 * viscosity);

            let vr = (r + stretch + trail + wobble + pull_stretch).max(3.0);
            let px = self.pos.x + a.cos() * vr;
            let py = self.pos.y + a.sin() * vr;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();

        // 晶透水感深邃果凍色（透明度約 52%，讓內部的機械齒輪清楚透射出來！）
        ctx.set_fill_style_str("rgba(12, 20, 32, 0.50)");
        ctx.fill();
        ctx.set_stroke_style_str("rgba(80, 160, 220, 0.80)");
        ctx.set_line_width(2.2);
        ctx.stroke();

        // 2. 內層晶透水感折射層 (Jelly Refraction Layer)
        ctx.begin_path();
        let mid_r = r * 0.78;
        for i in 0..vert_count {
            let a = i as f64 * angle_step;
            let vr = mid_r + (a * 2.5 + self.pulse_phase).sin() * (1.2 * viscosity);
            let px = self.pos.x + a.cos() * vr;
            let py = self.pos.y + a.sin() * vr;
            if i == 0 {
                ctx.move_to(px, py);
            } else {
                ctx.line_to(px, py);
            }
        }
        ctx.close_path();
        ctx.set_fill_style_str("rgba(16, 32, 48, 0.35)");
        ctx.fill();

        Ok(())
    }

    fn render_neon_glands(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        ctx.save();
        let breath = (self.pulse_phase * 1.5).sin() * 2.5;

        for g in &self.glands {
            let gx = self.pos.x + g.offset_angle.cos() * g.dist_r;
            let gy = self.pos.y + g.offset_angle.sin() * g.dist_r;
            let gr = (g.size + breath).max(3.0);

            // 柔和果凍內部向外漫射暈光
            ctx.begin_path();
            ctx.arc(gx, gy, gr * 1.5, 0.0, TWO_PI)?;
            if g.is_cyan {
                ctx.set_fill_style_str("rgba(0, 255, 220, 0.25)");
            } else {
                ctx.set_fill_style_str("rgba(255, 140, 30, 0.25)");
            }
            ctx.fill();

            ctx.begin_path();
            ctx.arc(gx, gy, gr, 0.0, TWO_PI)?;
            if g.is_cyan {
                ctx.set_fill_style_str("rgba(0, 220, 200, 0.65)");
            } else {
                ctx.set_fill_style_str("rgba(255, 130, 30, 0.65)");
            }
            ctx.fill();

            // 中心柔和光亮核心
            ctx.begin_path();
            ctx.arc(gx, gy, gr * 0.40, 0.0, TWO_PI)?;
            ctx.set_fill_style_str("rgba(255, 255, 255, 0.85)");
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
                ctx.set_stroke_style_str(&format!("rgba(0, 255, 240, {:.2})", alpha * 0.8));
            } else {
                ctx.set_stroke_style_str(&format!("rgba(255, 170, 40, {:.2})", alpha * 0.8));
            }
            ctx.set_line_width(1.5);
            ctx.stroke();
        }
        ctx.restore();
        Ok(())
    }

    fn render_droplets(&self, _ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        // 清空外露碎散小球，集中維持史萊姆主體緊湊度
        Ok(())
    }

    fn render_specular_highlights(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        let r = self.base_radius;
        let breath = self.pulse_phase.sin() * 1.5;

        ctx.save();

        // 頂部大型半月狀濕潤水光穹頂（高反光果凍質感）
        ctx.begin_path();
        ctx.ellipse(
            self.pos.x - r * 0.30,
            self.pos.y - r * 0.30,
            (r * 0.38 + breath * 0.3).max(4.0),
            (r * 0.18 + breath * 0.15).max(2.5),
            -0.45,
            0.0,
            TWO_PI,
        )?;
        ctx.set_fill_style_str("rgba(215, 240, 255, 0.50)");
        ctx.fill();

        // 頂部焦點水珠熾白高光
        ctx.begin_path();
        ctx.ellipse(
            self.pos.x - r * 0.36,
            self.pos.y - r * 0.36,
            (r * 0.12).max(2.0),
            (r * 0.06).max(1.2),
            -0.45,
            0.0,
            TWO_PI,
        )?;
        ctx.set_fill_style_str("rgba(255, 255, 255, 0.88)");
        ctx.fill();

        // 邊緣果凍水感折射弧光 (Jelly Rim Refraction)
        ctx.begin_path();
        ctx.arc(self.pos.x, self.pos.y, r * 0.90, -2.5, -0.7)?;
        ctx.set_stroke_style_str("rgba(165, 230, 255, 0.50)");
        ctx.set_line_width(2.0);
        ctx.stroke();

        // 底部微弱次表面散射環境反光 (Subsurface Scattering Bounce)
        ctx.begin_path();
        ctx.arc(self.pos.x, self.pos.y, r * 0.84, 0.8, 2.3)?;
        ctx.set_stroke_style_str("rgba(56, 189, 248, 0.20)");
        ctx.set_line_width(1.6);
        ctx.stroke();

        ctx.restore();
        Ok(())
    }
}
