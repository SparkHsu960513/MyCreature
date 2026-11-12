use crate::math::{FastRng, Vec2, TWO_PI};
use wasm_bindgen::JsValue;
use web_sys::CanvasRenderingContext2d;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum WeatherMode {
    Normal,
    AmberRain,
    Freezing,
}

#[derive(Clone, Debug)]
pub struct RainDrop {
    pub x: f64,
    pub y: f64,
    pub target_y: f64,
    pub speed: f64,
    pub length: f64,
    pub is_alive: bool,
}

#[derive(Clone, Debug)]
pub struct SplashParticle {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f64,
    pub max_life: f64,
    pub size: f64,
}

#[derive(Clone, Debug)]
pub struct Ripple {
    pub pos: Vec2,
    pub radius: f64,
    pub max_radius: f64,
    pub alpha: f64,
}

#[derive(Clone, Debug)]
pub struct CloudShadow {
    pub x: f64,
    pub y: f64,
    pub rx: f64,
    pub ry: f64,
    pub speed_x: f64,
    pub speed_y: f64,
}

#[derive(Clone, Debug)]
pub struct SnowCrystal {
    pub pos: Vec2,
    pub angle: f64,
    pub rot_speed: f64,
    pub speed: f64,
    pub size: f64,
    pub target_y: f64,
}

#[derive(Clone, Debug)]
pub struct LandedSnow {
    pub pos: Vec2,
    pub size: f64,
    pub angle: f64,
    pub life: f64,
    pub max_life: f64,
}

#[derive(Clone, Debug)]
pub struct DustParticle {
    pub pos: Vec2,
    pub vel: Vec2,
    pub size: f64,
    pub alpha: f64,
}

#[derive(Clone, Debug)]
pub struct SurgeBranch {
    pub start: Vec2,
    pub end: Vec2,
}

#[derive(Clone, Debug)]
pub struct ElectricSurge {
    pub points: Vec<Vec2>,
    pub branches: Vec<SurgeBranch>,
    pub life: f64,
    pub max_life: f64,
    pub is_cyan: bool,
}

pub struct Environment {
    pub width: f64,
    pub height: f64,
    pub weather: WeatherMode,
    pub rain_drops: Vec<RainDrop>,
    pub splashes: Vec<SplashParticle>,
    pub ripples: Vec<Ripple>,
    pub cloud_shadows: Vec<CloudShadow>,
    pub snow_crystals: Vec<SnowCrystal>,
    pub landed_snow: Vec<LandedSnow>,
    pub dust_particles: Vec<DustParticle>,
    pub electric_surges: Vec<ElectricSurge>,
    pub electric_freq: usize,
    pub surge_timer: f64,
    pub lightning_timer: f64,
    pub lightning_flash: f64,
}

impl Environment {
    pub fn new(width: f64, height: f64) -> Self {
        let mut rng = FastRng::new(999);

        // 1. 巨型漫游雲朵陰影（加深透明度，確保肉眼極其明顯看出大草坪遮陽時暗時亮效果）
        let cloud_shadows = vec![
            CloudShadow { x: width * 0.1, y: height * 0.18, rx: width * 0.45, ry: height * 0.32, speed_x: 0.55, speed_y: 0.14 },
            CloudShadow { x: width * 0.55, y: height * 0.08, rx: width * 0.55, ry: height * 0.38, speed_x: 0.46, speed_y: 0.12 },
            CloudShadow { x: width * 0.85, y: height * 0.45, rx: width * 0.48, ry: height * 0.34, speed_x: 0.58, speed_y: 0.16 },
            CloudShadow { x: -width * 0.18, y: height * 0.65, rx: width * 0.52, ry: height * 0.36, speed_x: 0.50, speed_y: 0.13 },
            CloudShadow { x: width * 0.30, y: height * 0.85, rx: width * 0.50, ry: height * 0.35, speed_x: 0.48, speed_y: 0.11 },
        ];

        // 2. 乾燥廢土懸浮微塵
        let mut dust_particles = Vec::new();
        for _ in 0..50 {
            dust_particles.push(DustParticle {
                pos: Vec2::new(rng.gen_range(0.0, width), rng.gen_range(0.0, height)),
                vel: Vec2::new(rng.gen_range(-0.4, 0.4), rng.gen_range(-0.35, 0.2)),
                size: rng.gen_range(1.8, 4.5),
                alpha: rng.gen_range(0.25, 0.7),
            });
        }

        // 3. 極凍死電期冰晶雪花
        let mut snow_crystals = Vec::new();
        for _ in 0..70 {
            let land_y = rng.gen_range(height * 0.05, height * 0.98);
            snow_crystals.push(SnowCrystal {
                pos: Vec2::new(rng.gen_range(0.0, width), rng.gen_range(-180.0, land_y)),
                angle: rng.gen_range(0.0, TWO_PI),
                rot_speed: rng.gen_range(-0.03, 0.03),
                speed: rng.gen_range(1.6, 3.4),
                size: rng.gen_range(3.5, 7.5),
                target_y: land_y,
            });
        }

        Self {
            width,
            height,
            weather: WeatherMode::AmberRain,
            rain_drops: Vec::new(),
            splashes: Vec::new(),
            ripples: Vec::new(),
            cloud_shadows,
            snow_crystals,
            landed_snow: Vec::new(),
            dust_particles,
            electric_surges: Vec::new(),
            electric_freq: 1,
            surge_timer: 0.0,
            lightning_timer: 0.0,
            lightning_flash: 0.0,
        }
    }

    pub fn resize(&mut self, width: f64, height: f64) {
        self.width = width;
        self.height = height;
    }

    pub fn set_weather(&mut self, mode_str: &str) {
        self.weather = match mode_str {
            "normal" => WeatherMode::Normal,
            "freezing" => WeatherMode::Freezing,
            _ => WeatherMode::AmberRain,
        };
    }

    pub fn set_electric_freq(&mut self, val: usize) {
        self.electric_freq = val.min(3);
    }

    pub fn update(&mut self, rain_intensity: usize, lightning_freq: usize, rng: &mut FastRng) {
        // 1. 雲朵陰影平移更新（自左上緩慢漂向右下）
        for cs in &mut self.cloud_shadows {
            cs.x += cs.speed_x * 0.9;
            cs.y += cs.speed_y * 0.9;
            if cs.x - cs.rx > self.width {
                cs.x = -cs.rx;
            }
            if cs.y - cs.ry > self.height {
                cs.y = -cs.ry;
            }
        }

        // 2. 背景殘存電力竄動 (ElectricSurge)
        if self.electric_freq > 0 {
            self.surge_timer += 1.0;
            let trigger_interval = match self.electric_freq {
                1 => 90.0,
                2 => 45.0,
                _ => 18.0,
            };

            if self.surge_timer >= trigger_interval {
                self.surge_timer = 0.0;
                // 生成一條在電網或地表竄動的電弧
                let start = Vec2::new(rng.gen_range(self.width * 0.05, self.width * 0.95), rng.gen_range(self.height * 0.05, self.height * 0.95));
                let angle = rng.gen_range(0.0, TWO_PI);
                let main_dir = Vec2::from_angle(angle);

                let mut pts = Vec::new();
                let mut branches = Vec::new();
                let mut cur = start;
                pts.push(cur);

                let seg_count = rng.gen_range(5.0, 10.0) as usize;
                for _ in 0..seg_count {
                    let seg_len = rng.gen_range(25.0, 55.0);
                    let jitter_ang = angle + rng.gen_range(-0.7, 0.7);
                    cur = cur + Vec2::from_angle(jitter_ang) * seg_len;
                    pts.push(cur);

                    // 30% 機率分叉
                    if rng.gen_range(0.0, 1.0) < 0.35 {
                        let branch_ang = jitter_ang + rng.gen_range(-1.2, 1.2);
                        let b_end = cur + Vec2::from_angle(branch_ang) * rng.gen_range(20.0, 45.0);
                        branches.push(SurgeBranch { start: cur, end: b_end });
                    }
                }

                self.electric_surges.push(ElectricSurge {
                    points: pts,
                    branches,
                    life: 18.0,
                    max_life: 18.0,
                    is_cyan: rng.gen_range(0.0, 1.0) > 0.45,
                });
            }
        }

        self.electric_surges.retain_mut(|s| {
            s.life -= 1.0;
            s.life > 0.0
        });

        // 3. 天候更新（蹲下垂直俯視視角：雨滴從空中直落，在全畫面任意地面 (x, y) 著地！）
        match self.weather {
            WeatherMode::AmberRain => {
                let target_count = match rain_intensity {
                    0 => 0,
                    1 => 45,
                    2 => 95,
                    3 => 170,
                    _ => 260,
                };

                while self.rain_drops.len() < target_count {
                    // 雨滴在全螢幕任意 (x, y) 落下並命中該處地面
                    let land_x = rng.gen_range(-50.0, self.width + 50.0);
                    let land_y = rng.gen_range(0.0, self.height);
                    let drop_len = rng.gen_range(28.0, 52.0);
                    let start_y = land_y - rng.gen_range(200.0, 420.0);

                    self.rain_drops.push(RainDrop {
                        x: land_x,
                        y: start_y,
                        target_y: land_y,
                        speed: rng.gen_range(22.0, 38.0),
                        length: drop_len,
                        is_alive: true,
                    });
                }

                let mut hits = Vec::new();
                for drop in &mut self.rain_drops {
                    drop.y += drop.speed;
                    // 垂直俯視：微弱傾斜
                    drop.x -= drop.speed * 0.12;

                    // 當抵達或穿過 target_y 地面高度時，觸發撞擊！
                    if drop.y >= drop.target_y {
                        drop.is_alive = false;
                        hits.push(Vec2::new(drop.x, drop.target_y));

                        // 重置雨滴至新的天空起點
                        let land_x = rng.gen_range(-50.0, self.width + 50.0);
                        let land_y = rng.gen_range(0.0, self.height);
                        drop.x = land_x;
                        drop.target_y = land_y;
                        drop.y = land_y - rng.gen_range(250.0, 450.0);
                        drop.speed = rng.gen_range(22.0, 38.0);
                        drop.is_alive = true;
                    }
                }

                // 產生遍布全螢幕地面的強烈螢光水花與環形衝擊漣漪！
                for hit in hits {
                    if self.ripples.len() < 70 {
                        self.ripples.push(Ripple {
                            pos: hit,
                            radius: 2.0,
                            max_radius: rng.gen_range(24.0, 48.0),
                            alpha: 1.0,
                        });
                    }

                    // 濺起向上散射的生化螢光水花
                    for _ in 0..4 {
                        let ang = rng.gen_range(0.0, TWO_PI);
                        let spd = rng.gen_range(2.5, 6.5);
                        self.splashes.push(SplashParticle {
                            pos: hit,
                            vel: Vec2::new(ang.cos() * spd, ang.sin() * spd * 0.8),
                            life: 14.0,
                            max_life: 14.0,
                            size: rng.gen_range(2.0, 4.0),
                        });
                    }
                }

                // 漣漪擴散
                self.ripples.retain_mut(|r| {
                    r.radius += 1.8;
                    r.alpha -= 0.038;
                    r.alpha > 0.0 && r.radius < r.max_radius
                });

                // 水花粒子物理
                self.splashes.retain_mut(|s| {
                    s.pos = s.pos + s.vel;
                    s.vel = s.vel * 0.91;
                    s.life -= 1.0;
                    s.life > 0.0
                });
            }
            WeatherMode::Freezing => {
                let mut landed_hits = Vec::new();
                for snow in &mut self.snow_crystals {
                    snow.pos.y += snow.speed;
                    snow.pos.x -= snow.speed * 0.12;
                    snow.angle += snow.rot_speed;

                    // 當雪花飄落到達地面高度 target_y 時觸發落地積雪！
                    if snow.pos.y >= snow.target_y {
                        landed_hits.push((Vec2::new(snow.pos.x, snow.target_y), snow.size, snow.angle));

                        // 重設雪花至高空重新降落
                        let land_y = rng.gen_range(self.height * 0.05, self.height * 0.98);
                        snow.pos.x = rng.gen_range(-20.0, self.width + 50.0);
                        snow.pos.y = rng.gen_range(-160.0, -20.0);
                        snow.target_y = land_y;
                        snow.speed = rng.gen_range(1.6, 3.4);
                    }
                }

                // 產生落地積雪冰晶（落地後停留積雪並緩慢融化）
                for (pos, size, angle) in landed_hits {
                    if self.landed_snow.len() < 120 {
                        self.landed_snow.push(LandedSnow {
                            pos,
                            size: size * 0.85,
                            angle,
                            life: rng.gen_range(180.0, 300.0), // 停留約 3~5 秒
                            max_life: 240.0,
                        });
                    }
                }

                // 更新落地積雪壽命（慢慢融化）
                for ls in &mut self.landed_snow {
                    ls.life -= 1.0;
                }
                self.landed_snow.retain(|ls| ls.life > 0.0);
            }
            WeatherMode::Normal => {
                for d in &mut self.dust_particles {
                    d.pos = d.pos + d.vel;
                    if d.pos.x < 0.0 { d.pos.x = self.width; }
                    if d.pos.x > self.width { d.pos.x = 0.0; }
                    if d.pos.y < 0.0 { d.pos.y = self.height; }
                    if d.pos.y > self.height { d.pos.y = 0.0; }
                }
            }
        }

        // 閃電觸發邏輯
        if lightning_freq > 0 {
            self.lightning_timer += 1.0;
            let trigger_limit = match lightning_freq {
                1 => 380.0,
                2 => 180.0,
                _ => 75.0,
            };

            if self.lightning_timer > trigger_limit && rng.gen_range(0.0, 1.0) < 0.15 {
                self.lightning_flash = 1.0;
                self.lightning_timer = 0.0;
            }
        } else {
            self.lightning_flash = 0.0;
        }

        if self.lightning_flash > 0.0 {
            self.lightning_flash = (self.lightning_flash - 0.07).max(0.0);
        }
    }

    pub fn render_background(&self, ctx: &CanvasRenderingContext2d, brightness: f64) -> Result<(), JsValue> {
        // 1. 陽光照耀下的基礎廢土地面（底色明亮，以便與深黑雲影形成劇烈明暗對比）
        let (bg_r, bg_g, bg_b) = match self.weather {
            WeatherMode::Freezing => (22, 28, 38),
            WeatherMode::AmberRain => (34, 32, 38),
            WeatherMode::Normal => (38, 35, 40),
        };
        let mult = (brightness / 18.0).clamp(0.6, 2.2);
        let base_col = format!(
            "rgb({}, {}, {})",
            ((bg_r as f64) * mult) as u8,
            ((bg_g as f64) * mult) as u8,
            ((bg_b as f64) * mult) as u8
        );
        ctx.set_fill_style_str(&base_col);
        ctx.fill_rect(0.0, 0.0, self.width, self.height);

        // 2. 巨型漫游雲朵陰影（極清晰深色遮罩，透明度高達 0.55，重現大草坪雲影覆蓋的時暗時亮感！）
        ctx.save();
        for cs in &self.cloud_shadows {
            for k in (0..4).rev() {
                let scale = 1.0 + (k as f64) * 0.18;
                let alpha = match k {
                    0 => 0.55,
                    1 => 0.38,
                    2 => 0.22,
                    _ => 0.10,
                };
                let col = format!("rgba(6, 7, 10, {})", alpha);

                ctx.begin_path();
                ctx.ellipse(cs.x, cs.y, cs.rx * scale, cs.ry * scale, 0.15, 0.0, TWO_PI)?;
                ctx.set_fill_style_str(&col);
                ctx.fill();
            }
        }
        ctx.restore();

        // 3. 廢墟殘留電網網格（垂直俯視視角：正方均勻網格）
        ctx.save();
        let grid_col = match self.weather {
            WeatherMode::Freezing => "rgba(0, 200, 255, 0.22)",
            WeatherMode::AmberRain => "rgba(65, 75, 95, 0.38)",
            WeatherMode::Normal => "rgba(75, 70, 65, 0.35)",
        };
        ctx.set_stroke_style_str(grid_col);
        ctx.set_line_width(1.2);

        let grid_size = 55.0;
        let mut x = 0.0;
        while x < self.width {
            ctx.begin_path();
            ctx.move_to(x, 0.0);
            ctx.line_to(x, self.height);
            ctx.stroke();
            x += grid_size;
        }

        let mut y = 0.0;
        while y < self.height {
            ctx.begin_path();
            ctx.move_to(0.0, y);
            ctx.line_to(self.width, y);
            ctx.stroke();
            y += grid_size;
        }
        ctx.restore();

        // 4. 背景殘存高壓電力竄動 (ElectricSurge 實作！)
        if !self.electric_surges.is_empty() {
            ctx.save();
            for s in &self.electric_surges {
                let alpha = (s.life / s.max_life).clamp(0.0, 1.0);
                let (main_col, glow_col) = if s.is_cyan {
                    (format!("rgba(0, 255, 240, {})", alpha), format!("rgba(0, 220, 255, {})", alpha * 0.45))
                } else {
                    (format!("rgba(255, 170, 40, {})", alpha), format!("rgba(255, 120, 20, {})", alpha * 0.45))
                };

                // 外層電弧強光暈
                ctx.set_stroke_style_str(&glow_col);
                ctx.set_line_width(4.5);
                ctx.begin_path();
                if let Some(first) = s.points.first() {
                    ctx.move_to(first.x, first.y);
                    for p in s.points.iter().skip(1) {
                        ctx.line_to(p.x, p.y);
                    }
                }
                ctx.stroke();

                // 核心亮白高壓電芯
                ctx.set_stroke_style_str(&main_col);
                ctx.set_line_width(2.0);
                ctx.stroke();

                // 繪製分叉電弧
                for b in &s.branches {
                    ctx.begin_path();
                    ctx.move_to(b.start.x, b.start.y);
                    ctx.line_to(b.end.x, b.end.y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // 5. 乾燥常態微塵
        if self.weather == WeatherMode::Normal {
            ctx.save();
            for d in &self.dust_particles {
                ctx.begin_path();
                ctx.arc(d.pos.x, d.pos.y, d.size * 0.5, 0.0, TWO_PI)?;
                ctx.set_fill_style_str(&format!("rgba(235, 190, 110, {})", d.alpha * 0.65));
                ctx.fill();
            }
            ctx.restore();
        }

        Ok(())
    }

    pub fn render_weather(&self, ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        ctx.save();

        match self.weather {
            WeatherMode::AmberRain => {
                // 1. 全螢幕地面散佈的微黏稠螢光橘雨衝擊漣漪（無白點、透明感高於 65%）
                for r in &self.ripples {
                    let alpha = r.alpha.clamp(0.0, 1.0);

                    // 外層柔和半透明琥珀環
                    ctx.begin_path();
                    ctx.ellipse(r.pos.x, r.pos.y, r.radius, r.radius * 0.88, 0.0, 0.0, TWO_PI)?;
                    ctx.set_stroke_style_str(&format!("rgba(245, 140, 20, {:.3})", alpha * 0.26));
                    ctx.set_line_width(1.6);
                    ctx.stroke();

                    // 內層細微金橘色流光環
                    ctx.begin_path();
                    ctx.ellipse(r.pos.x, r.pos.y, r.radius * 0.55, r.radius * 0.48, 0.0, 0.0, TWO_PI)?;
                    ctx.set_stroke_style_str(&format!("rgba(251, 191, 36, {:.3})", alpha * 0.18));
                    ctx.set_line_width(0.9);
                    ctx.stroke();
                }

                // 2. 向上散射的微小半透明水花粒子
                for s in &self.splashes {
                    let p = (s.life / s.max_life).clamp(0.0, 1.0);
                    ctx.begin_path();
                    ctx.arc(s.pos.x, s.pos.y, s.size * p * 0.7, 0.0, TWO_PI)?;
                    ctx.set_fill_style_str(&format!("rgba(245, 158, 11, {:.3})", p * 0.28));
                    ctx.fill();
                }

                // 3. 空中疾馳墜下的半透明琥珀酸雨條痕（無白色尖端、透明度 > 65%）
                for drop in &self.rain_drops {
                    let head_x = drop.x - drop.length * 0.12;
                    let head_y = drop.y;
                    let tail_x = drop.x;
                    let tail_y = drop.y - drop.length;

                    // 外層柔和薄霧雨暈
                    ctx.set_stroke_style_str("rgba(245, 130, 15, 0.12)");
                    ctx.set_line_width(2.6);
                    ctx.begin_path();
                    ctx.move_to(tail_x, tail_y);
                    ctx.line_to(head_x, head_y);
                    ctx.stroke();

                    // 內層微細雨絲（半透明 68%）
                    ctx.set_stroke_style_str("rgba(251, 191, 36, 0.30)");
                    ctx.set_line_width(1.1);
                    ctx.begin_path();
                    ctx.move_to(tail_x, tail_y);
                    ctx.line_to(head_x, head_y);
                    ctx.stroke();
                }
            }
            WeatherMode::Freezing => {
                // 1. 落地積雪冰晶與緩慢融化消散 (Accumulating & Melting Snow Ground Patches)
                for ls in &self.landed_snow {
                    let progress = (ls.life / ls.max_life).clamp(0.0, 1.0);
                    // 隨時間平滑融化、縮小並變淡
                    let melt_alpha = progress.powf(0.85);
                    let melt_size = ls.size * (0.45 + 0.55 * progress);

                    ctx.save();
                    ctx.translate(ls.pos.x, ls.pos.y)?;
                    ctx.rotate(ls.angle)?;

                    // 地面微光融化水痕
                    ctx.begin_path();
                    ctx.ellipse(0.0, 0.0, melt_size * 1.3, melt_size * 0.65, 0.0, 0.0, TWO_PI)?;
                    ctx.set_fill_style_str(&format!("rgba(120, 210, 255, {:.3})", melt_alpha * 0.14));
                    ctx.fill();

                    // 沉積冰晶六角星本體
                    ctx.set_stroke_style_str(&format!("rgba(180, 240, 255, {:.3})", melt_alpha * 0.62));
                    ctx.set_line_width(1.3);
                    for a_idx in 0..3 {
                        let rot = (a_idx as f64) * (TWO_PI / 6.0);
                        let arm = melt_size;
                        ctx.begin_path();
                        ctx.move_to(-rot.cos() * arm, -rot.sin() * arm);
                        ctx.line_to(rot.cos() * arm, rot.sin() * arm);
                        ctx.stroke();
                    }

                    // 核心微細雪晶中心
                    ctx.begin_path();
                    ctx.arc(0.0, 0.0, melt_size * 0.22, 0.0, TWO_PI)?;
                    ctx.set_fill_style_str(&format!("rgba(240, 250, 255, {:.3})", melt_alpha * 0.70));
                    ctx.fill();

                    ctx.restore();
                }

                // 2. 空中飄落的冰晶雪花
                for snow in &self.snow_crystals {
                    ctx.save();
                    ctx.translate(snow.pos.x, snow.pos.y)?;
                    ctx.rotate(snow.angle)?;

                    ctx.set_stroke_style_str("rgba(140, 230, 255, 0.75)");
                    ctx.set_line_width(1.4);

                    for a_idx in 0..3 {
                        let rot = (a_idx as f64) * (TWO_PI / 6.0);
                        let arm = snow.size;
                        ctx.begin_path();
                        ctx.move_to(-rot.cos() * arm, -rot.sin() * arm);
                        ctx.line_to(rot.cos() * arm, rot.sin() * arm);
                        ctx.stroke();

                        let sub_arm = arm * 0.40;
                        let mid = arm * 0.55;
                        ctx.begin_path();
                        ctx.move_to(rot.cos() * mid, rot.sin() * mid);
                        ctx.line_to((rot + 0.6).cos() * (mid + sub_arm), (rot + 0.6).sin() * (mid + sub_arm));
                        ctx.stroke();
                    }

                    ctx.begin_path();
                    ctx.arc(0.0, 0.0, 1.4, 0.0, TWO_PI)?;
                    ctx.set_fill_style_str("rgba(220, 245, 255, 0.85)");
                    ctx.fill();

                    ctx.restore();
                }
            }
            WeatherMode::Normal => {}
        }

        // 全域閃電強光
        if self.lightning_flash > 0.01 {
            let flash_col = format!("rgba(200, 235, 255, {})", self.lightning_flash * 0.58);
            ctx.set_fill_style_str(&flash_col);
            ctx.fill_rect(0.0, 0.0, self.width, self.height);
        }

        ctx.restore();
        Ok(())
    }
}
