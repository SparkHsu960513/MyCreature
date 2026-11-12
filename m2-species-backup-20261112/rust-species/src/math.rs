use std::f64::consts::PI;

pub const TWO_PI: f64 = PI * 2.0;

#[derive(Clone, Copy, Debug, Default)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn dist(self, other: Vec2) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn dist_sq(self, other: Vec2) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        dx * dx + dy * dy
    }

    pub fn length(self) -> f64 {
        (self.x * self.x + self.y * self.y).sqrt()
    }

    pub fn normalize(self) -> Self {
        let len = self.length();
        if len > 0.00001 {
            Self {
                x: self.x / len,
                y: self.y / len,
            }
        } else {
            Self { x: 0.0, y: 0.0 }
        }
    }

    pub fn heading(self) -> f64 {
        self.y.atan2(self.x)
    }

    pub fn from_angle(angle: f64) -> Self {
        Self {
            x: angle.cos(),
            y: angle.sin(),
        }
    }

    pub fn lerp(self, target: Vec2, t: f64) -> Self {
        Self {
            x: self.x + (target.x - self.x) * t,
            y: self.y + (target.y - self.y) * t,
        }
    }
}

impl std::ops::Add for Vec2 {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
        }
    }
}

impl std::ops::Sub for Vec2 {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
        }
    }
}

impl std::ops::Mul<f64> for Vec2 {
    type Output = Self;
    fn mul(self, rhs: f64) -> Self {
        Self {
            x: self.x * rhs,
            y: self.y * rhs,
        }
    }
}

/// 輕量快速偽隨機數生成器（Xorshift32）
pub struct FastRng {
    state: u32,
}

impl FastRng {
    pub fn new(seed: u32) -> Self {
        Self {
            state: if seed == 0 { 0x12345678 } else { seed },
        }
    }

    pub fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    pub fn gen_range(&mut self, min: f64, max: f64) -> f64 {
        let val = (self.next_u32() as f64) / (u32::MAX as f64);
        min + val * (max - min)
    }
}

/// 偽噪波（Smooth 1D/2D Sine-Hash Noise）以模擬 p5.js noise
pub fn pseudo_noise(x: f64, y: f64) -> f64 {
    let s = (x * 12.9898 + y * 78.233).sin() * 43758.5453;
    let fract = s - s.floor();
    // 疊加平滑低頻波形
    let wave1 = (x * 0.7 + y * 0.4).sin() * 0.5 + 0.5;
    let wave2 = (x * 1.8 - y * 1.2).cos() * 0.5 + 0.5;
    wave1 * 0.6 + wave2 * 0.3 + fract * 0.1
}
