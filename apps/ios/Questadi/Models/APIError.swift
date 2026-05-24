import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case notFound
    case gone(String)
    case rateLimited
    case validation(String)
    case network(Error)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:      return "Session expired. Please sign in again."
        case .notFound:          return "Not found."
        case .gone(let code):    return code == "TOKEN_EXPIRED" ? "This link has expired." : "This quote has been removed."
        case .rateLimited:       return "Too many requests. Please try again later."
        case .validation(let m): return m
        case .network(let e):    return "Network error: \(e.localizedDescription)"
        case .server(let m):     return m
        }
    }
}

struct ErrorResponse: Codable {
    let error: String
    let code: String
}
