import SwiftUI

struct PersonDetailView: View {
    let group: LibraryPersonGroupView
    @ObservedObject var viewModel: LibraryViewModel

    var body: some View {
        List {
            ForEach(group.quotes.sorted(by: { $0.capturedAt > $1.capturedAt })) { quote in
                QuoteRowView(quote: quote, viewModel: viewModel)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(group.person.resolvedName)
    }
}

struct QuoteRowView: View {
    let quote: Quote
    @ObservedObject var viewModel: LibraryViewModel
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium; f.timeStyle = .none
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: BrandSpacing.s2) {
            Text(quote.text)
                .font(brandFont(15))
            Text(Self.dateFormatter.string(from: quote.capturedAt))
                .font(brandFont(12))
                .foregroundColor(BrandColor.Neutral._400)
        }
        .padding(.vertical, BrandSpacing.s1)
        .contextMenu {
            Button(role: .destructive) {
                viewModel.deleteQuote(quote.id)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}
