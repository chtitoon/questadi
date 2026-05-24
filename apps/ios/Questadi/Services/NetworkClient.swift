import Foundation

final class NetworkClient {
    static let shared = NetworkClient()

    private let baseURL: URL
    private let session = URLSession.shared

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private init() {
        let base = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
            ?? "https://api.questadi.com"
        baseURL = URL(string: base)!
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: false)!
        components.queryItems = endpoint.queryItems
        var req = URLRequest(url: components.url!)
        req.httpMethod = endpoint.method
        if let body = endpoint.body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token = KeychainService.retrieve() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.network(error)
        }

        let http = response as! HTTPURLResponse
        switch http.statusCode {
        case 200...299:
            return try decoder.decode(T.self, from: data)
        case 401:
            KeychainService.delete()
            NotificationCenter.default.post(name: .questadaRequiresAuth, object: nil)
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 410:
            let err = (try? decoder.decode(ErrorResponse.self, from: data))?.code ?? "GONE"
            throw APIError.gone(err)
        case 429:
            throw APIError.rateLimited
        default:
            let msg = (try? decoder.decode(ErrorResponse.self, from: data))?.error ?? "Server error"
            throw APIError.server(msg)
        }
    }

    func requestVoid(_ endpoint: Endpoint) async throws {
        let _: EmptyResponse = try await request(endpoint)
    }
}

private struct EmptyResponse: Decodable {}
