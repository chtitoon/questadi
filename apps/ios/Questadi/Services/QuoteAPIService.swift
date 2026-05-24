import Foundation

struct AttributedToInput: Encodable {
    let existingId: String?
    let phone: String?
    let displayName: String?

    enum CodingKeys: String, CodingKey {
        case existingId, phone, displayName
    }
}

struct CreateQuoteRequest: Encodable {
    let text: String
    let attributedTo: AttributedToInput?

    enum CodingKeys: String, CodingKey {
        case text, attributedTo
    }
}

final class QuoteAPIService {
    private let client = NetworkClient.shared

    func getCaptures() async throws -> LibraryResponse {
        return try await client.request(.get("/user/captures"))
    }

    func createCapture(_ request: CreateQuoteRequest) async throws -> Quote {
        let endpoint = try Endpoint.post("/user/captures", body: request)
        return try await client.request(endpoint)
    }

    func deleteCapture(_ id: String) async throws {
        try await client.requestVoid(.delete("/user/captures/\(id)"))
    }
}
