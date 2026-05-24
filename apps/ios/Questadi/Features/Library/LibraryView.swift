import SwiftUI

struct LibraryView: View {
    @StateObject private var viewModel = LibraryViewModel()
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                List {
                    ForEach(viewModel.groups) { group in
                        NavigationLink(destination: PersonDetailView(group: group, viewModel: viewModel)) {
                            PersonRowView(group: group)
                        }
                    }
                    if !viewModel.unattributed.isEmpty {
                        Section("Unattributed") {
                            ForEach(viewModel.unattributed) { quote in
                                QuoteRowView(quote: quote, viewModel: viewModel)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .navigationTitle("Questadi")
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button(action: { appState.openCapture = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                }
                .task { await viewModel.load() }
                .refreshable { await viewModel.load() }

                if viewModel.pendingDeleteId != nil {
                    UndoToastView(onUndo: viewModel.undoDelete)
                        .padding(BrandSpacing.s5)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.2), value: viewModel.pendingDeleteId)
        }
    }
}

struct PersonRowView: View {
    let group: LibraryPersonGroupView

    var body: some View {
        HStack(spacing: BrandSpacing.s3) {
            Circle()
                .fill(BrandColor.Brand._100)
                .frame(width: 40, height: 40)
                .overlay(
                    Text(group.person.avatarInitials)
                        .font(brandFont(13, weight: .semibold))
                        .foregroundColor(Color.brand)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(group.person.resolvedName).font(brandFont(15, weight: .semibold))
                Text(group.quotes.first?.text.prefix(60).description ?? "")
                    .font(brandFont(13))
                    .foregroundColor(BrandColor.Neutral._500)
                    .lineLimit(1)
            }
            Spacer()
            Text("\(group.quotes.count)")
                .font(brandFont(13, weight: .medium))
                .foregroundColor(BrandColor.Neutral._400)
        }
        .padding(.vertical, BrandSpacing.s1)
    }
}

struct UndoToastView: View {
    let onUndo: () -> Void

    var body: some View {
        HStack {
            Text("Quote deleted").font(brandFont(14))
            Spacer()
            Button("Undo", action: onUndo)
                .font(brandFont(14, weight: .semibold))
                .foregroundColor(Color.brand)
        }
        .padding(BrandSpacing.s4)
        .background(.ultraThinMaterial)
        .cornerRadius(BrandRadius.lg)
    }
}
