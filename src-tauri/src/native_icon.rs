/// Rasterize the same four rounded bars used by the sidebar and favicon.
pub fn pixels(accent: &str) -> Option<Vec<u8>> {
    let hex = accent.strip_prefix('#')?;
    if hex.len() != 6 {
        return None;
    }
    let color = [
        u8::from_str_radix(hex.get(0..2)?, 16).ok()?,
        u8::from_str_radix(hex.get(2..4)?, 16).ok()?,
        u8::from_str_radix(hex.get(4..6)?, 16).ok()?,
    ];
    let bars = [
        (6.0_f32, 9.0_f32, 23.0_f32),
        (12.5, 5.0, 27.0),
        (19.0, 9.0, 23.0),
        (25.5, 12.0, 20.0),
    ];
    let mut rgba = Vec::with_capacity(64 * 64 * 4);
    for y in 0..64 {
        for x in 0..64 {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;
            let qx = (px - 32.0).abs() - 18.0;
            let qy = (py - 32.0).abs() - 18.0;
            let edge = qx.max(0.0).hypot(qy.max(0.0)) + qx.max(qy).min(0.0) - 14.0;
            let alpha = (0.5 - edge).clamp(0.0, 1.0);
            let mut ink = 0.0_f32;
            for (bx, top, bottom) in bars {
                let distance = (px - bx * 2.0).hypot(py - py.clamp(top * 2.0, bottom * 2.0));
                ink = ink.max((4.0 - distance).clamp(0.0, 1.0));
            }
            for channel in 0..3 {
                let base = if channel == 2 { 18.0 } else { 17.0 };
                rgba.push((base + (color[channel] as f32 - base) * ink).round() as u8);
            }
            rgba.push((alpha * 255.0).round() as u8);
        }
    }
    Some(rgba)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn brand_tracks_the_accent_and_has_transparent_corners() {
        let image = pixels("#AABBCC").unwrap();
        assert_eq!(image.len(), 64 * 64 * 4);
        assert_eq!(image[3], 0);
        let bar = (20 * 64 + 12) * 4;
        assert_eq!(&image[bar..bar + 4], &[170, 187, 204, 255]);
        assert_ne!(image, pixels("#FF5F2E").unwrap());
        assert!(pixels("#wrong!").is_none());
        assert!(pixels("AA").is_none());
    }
}
