import SwiftUI

func brandFont(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
    Font.custom(BrandFont.base, size: size).weight(weight)
}

extension Color {
    static let brand = BrandColor.Brand._500
    static let brandPressed = BrandColor.Brand._600
}
