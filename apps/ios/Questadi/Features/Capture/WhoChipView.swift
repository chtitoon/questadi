import SwiftUI

struct WhoChipView: View {
    @Binding var chipState: ChipState
    @Binding var searchQuery: String
    let onSearch: (String) -> Void
    let onSelect: (ContactSuggestion) -> Void
    let onAddNew: (String) -> Void
    let onStartSearch: () -> Void
    @FocusState private var searchFocused: Bool

    var body: some View {
        switch chipState {
        case .idle:
            Text("— who said this?")
                .font(brandFont(14))
                .foregroundColor(BrandColor.Neutral._400)
                .padding(.horizontal, BrandSpacing.s3)
                .padding(.vertical, BrandSpacing.s2)
                .overlay(RoundedRectangle(cornerRadius: BrandRadius.full).stroke(BrandColor.Neutral._300, lineWidth: 1.5))
                .onTapGesture { chipState = .searching; onStartSearch() }

        case .searching:
            HStack {
                Text("—").foregroundColor(BrandColor.Neutral._400).font(brandFont(14))
                TextField("Type a name...", text: $searchQuery)
                    .focused($searchFocused)
                    .font(brandFont(14))
                    .onChange(of: searchQuery) { onSearch($0) }
            }
            .padding(.horizontal, BrandSpacing.s3)
            .padding(.vertical, BrandSpacing.s2)
            .overlay(RoundedRectangle(cornerRadius: BrandRadius.full).stroke(Color.brand, lineWidth: 1.5))
            .onAppear { searchFocused = true }

        case .resolved(let account):
            Text("— \(account.resolvedName)")
                .font(brandFont(14, weight: .semibold))
                .foregroundColor(Color.brand)
                .padding(.horizontal, BrandSpacing.s3)
                .padding(.vertical, BrandSpacing.s2)
                .overlay(RoundedRectangle(cornerRadius: BrandRadius.full).stroke(Color.brand, lineWidth: 1.5))
                .onTapGesture { chipState = .searching; onStartSearch() }
        }
    }
}
