import SwiftUI

struct AutocompleteDropdownView: View {
    let suggestions: [ContactSuggestion]
    let query: String
    let onSelect: (ContactSuggestion) -> Void
    let onAddNew: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(suggestions) { suggestion in
                ContactRowView(suggestion: suggestion)
                    .contentShape(Rectangle())
                    .onTapGesture { onSelect(suggestion) }
                Divider()
            }
            if !query.isEmpty {
                HStack(spacing: BrandSpacing.s2) {
                    Circle()
                        .fill(BrandColor.Brand._100)
                        .frame(width: 28, height: 28)
                        .overlay(Text("+").font(brandFont(13, weight: .semibold)).foregroundColor(Color.brand))
                    Text("Add \"\(query)\"")
                        .font(brandFont(14))
                        .foregroundColor(Color.brand)
                    Spacer()
                }
                .padding(.horizontal, BrandSpacing.s3)
                .padding(.vertical, BrandSpacing.s2)
                .contentShape(Rectangle())
                .onTapGesture { onAddNew(query) }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(BrandRadius.md)
        .shadow(color: .black.opacity(0.08), radius: 12, y: 2)
    }
}

struct ContactRowView: View {
    let suggestion: ContactSuggestion

    var body: some View {
        HStack(spacing: BrandSpacing.s2) {
            Circle()
                .fill(BrandColor.Brand._100)
                .frame(width: 28, height: 28)
                .overlay(Text(suggestion.avatarInitials).font(brandFont(11, weight: .semibold)).foregroundColor(Color.brand))
            VStack(alignment: .leading, spacing: 2) {
                Text(suggestion.resolvedName).font(brandFont(14))
                if let date = suggestion.lastQuotedAt {
                    Text("last quoted \(daysAgo(date)) days ago").font(brandFont(11)).foregroundColor(BrandColor.Neutral._400)
                }
            }
            Spacer()
        }
        .padding(.horizontal, BrandSpacing.s3)
        .padding(.vertical, BrandSpacing.s2)
    }

    private func daysAgo(_ date: Date) -> Int {
        max(0, Calendar.current.dateComponents([.day], from: date, to: Date()).day ?? 0)
    }
}
