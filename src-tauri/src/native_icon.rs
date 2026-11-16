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
            let qx = (px - 32.0).abs() - 16.0;
            let qy = (py - 32.0).abs() - 16.0;
            let edge = qx.max(0.0).hypot(qy.max(0.0)) + qx.max(qy).min(0.0) - 14.0;
            let alpha = (0.5 - edge).clamp(0.0, 1.0);
            let mut ink = 0.0_f32;
            for (bx, top, bottom) in bars {
                // Match icons/brand.svg: center the logo's visible bounds, then
                // scale uniformly to 75%, leaving equal opposing insets.
                let center = 32.0 + (bx - 15.75) * 1.5;
                let top = 32.0 + (top - 16.0) * 1.5;
                let bottom = 32.0 + (bottom - 16.0) * 1.5;
                let distance = (px - center).hypot(py - py.clamp(top, bottom));
                ink = ink.max((3.125 - distance).clamp(0.0, 1.0));
            }
            for channel in 0..3 {
                let base = 11.0;
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
        let bar = (24 * 64 + 17) * 4;
        assert_eq!(&image[bar..bar + 4], &[170, 187, 204, 255]);
        assert_ne!(image, pixels("#FF5F2E").unwrap());
        assert!(pixels("#wrong!").is_none());
        assert!(pixels("AA").is_none());
    }

    #[test]
    fn logo_has_balanced_padding_and_does_not_touch_the_tile() {
        let image = pixels("#FFFFFF").unwrap();
        let mut bounds = (64, 64, 0, 0);
        for y in 0..64 {
            for x in 0..64 {
                if image[(y * 64 + x) * 4] > 128 {
                    bounds.0 = bounds.0.min(x);
                    bounds.1 = bounds.1.min(y);
                    bounds.2 = bounds.2.max(x);
                    bounds.3 = bounds.3.max(y);
                }
            }
        }
        assert_eq!(bounds.0, 63 - bounds.2);
        assert_eq!(bounds.1, 63 - bounds.3);
        assert!(bounds.0 >= 12 && bounds.1 >= 12);
    }
}
