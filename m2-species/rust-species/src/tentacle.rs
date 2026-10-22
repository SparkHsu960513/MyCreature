use crate::math::{FastRng, Vec2, TWO_PI};
use wasm_bindgen::JsValue;
use web_sys::CanvasRenderingContext2d;

#[derive(Clone, Debug)]
pub struct GroundSpark {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f64,
}

#[derive(Clone, Debug)]
pub struct SlimeTentacle {
    pub mount_angle: f64,
    pub foot_pos: Vec2,
    pub step_start: Vec2,
    pub step_target: Vec2,
    pub is_stepping: bool,
    pub step_progress: f64,
    pub step_duration: f64,
    pub reach: f64,
    pub wave_phase: f64,
    pub electric_pulse_t: f64, // 沿著脊柱奔流的生化電脈衝
    pub ground_sparks: Vec<GroundSpark>,
}

impl SlimeTentacle {
    pub fn new(mount_angle: f64, reach: f64) -> Self {
        let init_foot = Vec2::new(mount_angle.cos() * reach, mount_angle.sin() * reach);
        Self {
            mount_angle,
            foot_pos: init_foot,
            step_start: init_foot,
            step_target: init_foot,
            is_stepping: false,
            step_progress: 0.0,
            step_duration: 20.0,
            reach,
            wave_phase: mount_angle * 2.5,
            electric_pulse_t: 0.0,
            ground_sparks: Vec::new(),
        }
    }

    pub fn update(
        &mut self,
        root_pos: Vec2,
        vel: Vec2,
        is_hunting: bool,
        rng: &mut FastRng,
        body_radius: f64,
    ) {
        self.wave_phase += 0.09;
        self.electric_pulse_t = (self.electric_pulse_t + 0.05) % 1.0;

        let speed = vel.length();
        let heading = vel.heading();
        let angle_diff = self.mount_angle - heading;
        let forward_dot = angle_diff.cos();

        // 朝前方的觸手獲得強烈加成（超長跨距強抓地面）
        let stride_reach = if forward_dot > 0.25 {
            self.reach * (1.18 + forward_dot * 0.55)
        } else {
            self.reach * 0.92
        };

        let ideal_foot = root_pos + Vec2::new(
            self.mount_angle.cos() * stride_reach,
            self.mount_angle.sin() * stride_reach,
        );

        let dist_to_foot = self.foot_pos.dist(root_pos);

        // 步態判定
        if !self.is_stepping {
            let max_allow = if forward_dot > 0.25 { self.reach * 1.45 } else { self.reach * 1.15 };
            let min_allow = body_radius * 0.65;

            if dist_to_foot > max_allow || dist_to_foot < min_allow {
                self.is_stepping = true;
                self.step_progress = 0.0;
                self.step_start = self.foot_pos;
                self.step_duration = if is_hunting { 12.0 } else { 18.0 };

                let forward_bias = vel.normalize() * (speed * 14.0);
                let jitter = Vec2::new(rng.gen_range(-14.0, 14.0), rng.gen_range(-14.0, 14.0));
                self.step_target = ideal_foot + forward_bias + jitter;
            }
        } else {
            self.step_progress += 1.0;
            let t = (self.step_progress / self.step_duration).clamp(0.0, 1.0);

            if t >= 1.0 {
                self.is_stepping = false;
                self.foot_pos = self.step_target;

                // 特效：觸手著地扎根瞬間爆發電弧火花與地面衝擊 (Grounding Spark Burst!)
                for _ in 0..5 {
                    let spk_ang = rng.gen_range(0.0, TWO_PI);
                    let spk_spd = rng.gen_range(2.0, 5.5);
                    self.ground_sparks.push(GroundSpark {
                        pos: self.foot_pos,
                        vel: Vec2::new(spk_ang.cos() * spk_spd, spk_ang.sin() * spk_spd * 0.7),
                        life: 12.0,
                    });
                }
            } else {
                // 有機觸手凌空跨步時的蛇形波動拉伸
                let wave = (t * std::f64::consts::PI).sin();
                let lift = wave * (self.reach * 0.42);
                let soft_drift = (t * std::f64::consts::PI * 2.0 + self.wave_phase).sin() * 12.0;

                let direct = self.step_start.lerp(self.step_target, t);
                self.foot_pos = Vec2::new(direct.x + soft_drift * 0.35, direct.y - lift);
            }
        }

        // 更新著地放電火花
        self.ground_sparks.retain_mut(|s| {
            s.pos = s.pos + s.vel;
            s.vel = s.vel * 0.88;
            s.life -= 1.0;
            s.life > 0.0
        });
    }

    pub fn render(&self, ctx: &CanvasRenderingContext2d, root_pos: Vec2, body_radius: f64) -> Result<(), JsValue> {
        let root_dir = Vec2::from_angle(self.mount_angle);
        // 觸手根部併入身體本體，讓身體與觸手呈現「一團東西」的黏膩感
        let root = root_pos + root_dir * (body_radius * 0.5);
        let tip = self.foot_pos;

        let mid = (root + tip) * 0.5;
        let knee_dist = body_radius * 0.75;
        let knee = mid + root_dir * knee_dist;

        let node_count = 14;
        let mut nodes = Vec::with_capacity(node_count);
        for i in 0..node_count {
            let t = (i as f64) / ((node_count - 1) as f64);
            let p1 = root.lerp(knee, t);
            let p2 = knee.lerp(tip, t);
            let spine_pt = p1.lerp(p2, t);

            let undulation = (t * 5.0 - self.wave_phase).sin() * (3.5 * (1.0 - t));
            let perp = Vec2::new(-root_dir.y, root_dir.x) * undulation;
            nodes.push(spine_pt + perp);
        }

        // 大幅加粗：基底渾厚強烈 (body_radius * 0.8)，且根部併入身體內部，讓身體與觸手融合為一團
        let root_thick = body_radius * 0.8;
        let tip_thick = 5.0;

        let mut left_contour = Vec::with_capacity(node_count);
        let mut right_contour = Vec::with_capacity(node_count);

        for i in 0..node_count {
            let t = (i as f64) / ((node_count - 1) as f64);
            let thick = root_thick + (tip_thick - root_thick) * t.powf(0.68);

            let prev = if i == 0 { nodes[0] } else { nodes[i - 1] };
            let next = if i == node_count - 1 { nodes[node_count - 1] } else { nodes[i + 1] };
            let mut tangent = next - prev;
            if tangent.length() < 0.001 {
                tangent = root_dir;
            }
            let norm = Vec2::new(-tangent.y, tangent.x).normalize();

            left_contour.push(nodes[i] + norm * (thick * 0.5));
            right_contour.push(nodes[i] - norm * (thick * 0.5));
        }

        ctx.save();

        // 1. 繪製渾厚深黑有機質肉身 (高飽和外緣與強烈存在感)
        ctx.begin_path();
        ctx.move_to(left_contour[0].x, left_contour[0].y);
        for pt in left_contour.iter().skip(1) {
            ctx.line_to(pt.x, pt.y);
        }
        ctx.arc(nodes[node_count - 1].x, nodes[node_count - 1].y, tip_thick * 0.5, 0.0, TWO_PI)?;
        for pt in right_contour.iter().rev() {
            ctx.line_to(pt.x, pt.y);
        }
        ctx.close_path();

        ctx.set_fill_style_str("rgba(8, 10, 14, 0.98)");
        ctx.fill();
        ctx.set_stroke_style_str("rgba(65, 88, 110, 0.95)");
        ctx.set_line_width(3.0);
        ctx.stroke();

        // 2. 特效：觸手兩側螢光發光吸盤／感覺器官 (Bio-luminescent Sensory Pores)
        for i in 2..(node_count - 2) {
            if i % 2 == 0 {
                let l_pore = left_contour[i];
                let r_pore = right_contour[i];

                ctx.begin_path();
                ctx.arc(l_pore.x, l_pore.y, 2.2, 0.0, TWO_PI)?;
                ctx.arc(r_pore.x, r_pore.y, 2.2, 0.0, TWO_PI)?;
                ctx.set_fill_style_str("rgba(0, 255, 200, 0.85)");
                ctx.fill();
            }
        }

        // 3. 特效：沿著觸手脊柱奔流的高壓生物電脈衝光流 (High-Voltage Electric Pulse Packet)
        ctx.begin_path();
        ctx.move_to(nodes[0].x, nodes[0].y);
        for pt in nodes.iter().skip(1) {
            ctx.line_to(pt.x, pt.y);
        }
        ctx.set_stroke_style_str("rgba(0, 220, 240, 0.45)");
        ctx.set_line_width(2.6);
        ctx.stroke();

        // 在觸手脈衝位置畫出熾熱光核
        let pulse_idx = ((self.electric_pulse_t * (node_count as f64 - 1.0)) as usize).min(node_count - 1);
        let pulse_pt = nodes[pulse_idx];
        ctx.begin_path();
        ctx.arc(pulse_pt.x, pulse_pt.y, 4.2, 0.0, TWO_PI)?;
        ctx.set_fill_style_str("#00ffff");
        ctx.fill();
        ctx.begin_path();
        ctx.arc(pulse_pt.x, pulse_pt.y, 2.0, 0.0, TWO_PI)?;
        ctx.set_fill_style_str("#ffffff");
        ctx.fill();

        // 4. 尖端著地放電火花特效
        for spk in &self.ground_sparks {
            let p = spk.life / 12.0;
            ctx.begin_path();
            ctx.arc(spk.pos.x, spk.pos.y, 2.2 * p, 0.0, TWO_PI)?;
            ctx.set_fill_style_str(&format!("rgba(0, 255, 230, {})", p));
            ctx.fill();
        }

        // 5. 觸手尖端發光錨定感知頭
        let tip_pt = nodes[node_count - 1];
        ctx.begin_path();
        ctx.arc(tip_pt.x, tip_pt.y, 4.0, 0.0, TWO_PI)?;
        ctx.set_fill_style_str("#ff8811");
        ctx.fill();

        ctx.restore();
        Ok(())
    }
}
