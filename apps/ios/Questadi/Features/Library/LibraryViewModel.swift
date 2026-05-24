import Foundation

@MainActor
final class LibraryViewModel: ObservableObject {
    @Published var groups: [LibraryPersonGroupView] = []
    @Published var unattributed: [Quote] = []
    @Published var isLoading = false
    @Published var errorMessage: String? = nil
    @Published var pendingDeleteId: String? = nil

    private var deleteTask: Task<Void, Never>? = nil
    private var deletedQuoteSnapshot: Quote? = nil
    private var deletedFromGroupId: String? = nil

    private let quoteService = QuoteAPIService()

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response = try await quoteService.getLibrary()
            groups = response.people.map { $0.toViewGroup() }
            unattributed = response.unattributed
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func deleteQuote(_ id: String) {
        if let (groupIdx, quoteIdx) = findQuote(id: id, in: groups) {
            deletedQuoteSnapshot = groups[groupIdx].quotes[quoteIdx]
            deletedFromGroupId = groups[groupIdx].person.id
            groups[groupIdx].quotes.remove(at: quoteIdx)
            if groups[groupIdx].quotes.isEmpty { groups.remove(at: groupIdx) }
        } else if let idx = unattributed.firstIndex(where: { $0.id == id }) {
            deletedQuoteSnapshot = unattributed[idx]
            deletedFromGroupId = nil
            unattributed.remove(at: idx)
        }
        pendingDeleteId = id
        deleteTask = Task {
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            await commitDelete(id)
        }
    }

    func undoDelete() {
        deleteTask?.cancel()
        deleteTask = nil
        if let quote = deletedQuoteSnapshot {
            if let groupPersonId = deletedFromGroupId,
               let idx = groups.firstIndex(where: { $0.person.id == groupPersonId }) {
                groups[idx].quotes.append(quote)
                groups[idx].quotes.sort { $0.capturedAt > $1.capturedAt }
            } else {
                unattributed.append(quote)
                unattributed.sort { $0.capturedAt > $1.capturedAt }
            }
        }
        deletedQuoteSnapshot = nil
        deletedFromGroupId = nil
        pendingDeleteId = nil
    }

    private func commitDelete(_ id: String) async {
        do {
            try await quoteService.deleteQuote(id)
        } catch {
            // Best-effort; quote already removed from UI
        }
        deletedQuoteSnapshot = nil
        pendingDeleteId = nil
    }

    private func findQuote(id: String, in groups: [LibraryPersonGroupView]) -> (Int, Int)? {
        for (gi, group) in groups.enumerated() {
            if let qi = group.quotes.firstIndex(where: { $0.id == id }) {
                return (gi, qi)
            }
        }
        return nil
    }
}
