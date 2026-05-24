import SwiftUI

struct CaptureView: View {
    @StateObject private var viewModel = CaptureViewModel()
    @FocusState private var focused: Bool
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.saveState == .saved {
                savedView
            } else {
                captureForm
            }
        }
        .onChange(of: viewModel.saveState) { newState in
            guard newState == .saved else { return }
            Task {
                try? await Task.sleep(for: .milliseconds(900))
                dismiss()
                try? await Task.sleep(for: .milliseconds(80))
                viewModel.backgroundApp()
            }
        }
    }

    private var savedView: some View {
        VStack(spacing: BrandSpacing.s4) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 52))
                .foregroundColor(Color.brand)
            Text("Captured")
                .font(brandFont(20, weight: .bold))
            Text("Thanks for sharing.")
                .font(brandFont(15))
                .foregroundColor(BrandColor.Neutral._500)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var captureForm: some View {
        VStack(alignment: .leading, spacing: BrandSpacing.s5) {

            // Quote input area
            VStack(alignment: .leading, spacing: 0) {
                Text("\u{201C}")
                    .font(brandFont(56, weight: .bold))
                    .foregroundColor(Color.brand)
                    .frame(height: 44)
                    .padding(.leading, BrandSpacing.s1)

                TextEditor(text: $viewModel.quoteText)
                    .focused($focused)
                    .font(brandFont(20))
                    .scrollContentBackground(.hidden)
                    .background(Color.clear)
                    .frame(minHeight: 100, maxHeight: 200)
                    .padding(.horizontal, BrandSpacing.s1)
                    .onChange(of: viewModel.quoteText) { _ in
                        if viewModel.quoteText.count > 499 {
                            viewModel.quoteText = String(viewModel.quoteText.prefix(499))
                        }
                    }

                HStack {
                    Spacer()
                    Text("\u{201D}")
                        .font(brandFont(56, weight: .bold))
                        .foregroundColor(Color.brand)
                        .frame(height: 44)
                        .padding(.trailing, BrandSpacing.s1)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { focused = true }

            // Who chip
            WhoChipView(
                chipState: $viewModel.chipState,
                searchQuery: $viewModel.searchQuery,
                onSearch: { viewModel.search(query: $0) },
                onSelect: { viewModel.selectSuggestion($0) },
                onAddNew: { viewModel.addNew(name: $0) },
                onStartSearch: { viewModel.requestContactsPermissionIfNeeded() }
            )

            // Autocomplete
            if case .searching = viewModel.chipState {
                AutocompleteDropdownView(
                    suggestions: viewModel.suggestions,
                    query: viewModel.searchQuery,
                    onSelect: { viewModel.selectSuggestion($0) },
                    onAddNew: { viewModel.addNew(name: $0) }
                )
            }

            // Error
            if case .failed(let msg) = viewModel.saveState {
                HStack {
                    Text(msg).foregroundColor(BrandColor.Semantic.error).font(brandFont(13))
                    Spacer()
                    Button("Retry") { Task { await viewModel.save() } }
                        .font(brandFont(13, weight: .semibold))
                }
            }

            Spacer()

            Button(action: { Task { await viewModel.save() } }) {
                Group {
                    if case .saving = viewModel.saveState {
                        ProgressView().tint(.white)
                    } else {
                        Text("Save").font(brandFont(16, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, BrandSpacing.s4)
                .background(isSaveEnabled ? Color.brand : Color(.systemFill))
                .foregroundColor(isSaveEnabled ? .white : Color(.secondaryLabel))
                .cornerRadius(BrandRadius.md)
            }
            .disabled(!isSaveEnabled || viewModel.saveState == .saving)
        }
        .padding(BrandSpacing.s5)
        .onAppear { focused = true }
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }.font(brandFont(16))
            }
        }
    }

    private var isSaveEnabled: Bool {
        !viewModel.quoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
