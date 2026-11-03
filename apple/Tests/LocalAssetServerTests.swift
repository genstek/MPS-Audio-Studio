import XCTest
import Foundation

final class LocalAssetServerTests: XCTestCase {
    func testBundledAssetsAndIsolation() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("<html>Studio</html>".utf8).write(to: directory.appendingPathComponent("index.html"))
        try Data("export default 1".utf8).write(to: directory.appendingPathComponent("app.js"))
        defer { try? FileManager.default.removeItem(at: directory) }
        let server = LocalAssetServer(root: directory)
        defer { server.stop() }
        let url: URL = try await withCheckedThrowingContinuation { continuation in
            do { try server.start { continuation.resume(with: $0) } }
            catch { continuation.resume(throwing: error) }
        }
        let (data, response) = try await URLSession.shared.data(from: url)
        XCTAssertEqual(String(data: data, encoding: .utf8), "<html>Studio</html>")
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
        XCTAssertNotNil((response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Security-Policy"))
        let script = url.deletingLastPathComponent().appendingPathComponent("app.js")
        let (_, scriptResponse) = try await URLSession.shared.data(from: script)
        XCTAssertEqual((scriptResponse as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type"), "text/javascript")
        let origin = URL(string: "http://127.0.0.1:\(url.port!)")!
        for path in ["/index.html", "/api/me", "/missing", "/wrong-token/index.html"] {
            let (_, denied) = try await URLSession.shared.data(from: URL(string: path, relativeTo: origin)!)
            XCTAssertEqual((denied as? HTTPURLResponse)?.statusCode, 404)
        }
        let traversal = url.deletingLastPathComponent().absoluteString + "%2e%2e/%2e%2e/etc/passwd"
        let (_, denied) = try await URLSession.shared.data(from: URL(string: traversal)!)
        XCTAssertEqual((denied as? HTTPURLResponse)?.statusCode, 404)
        var post = URLRequest(url: url)
        post.httpMethod = "POST"
        let (_, methodResponse) = try await URLSession.shared.data(for: post)
        XCTAssertEqual((methodResponse as? HTTPURLResponse)?.statusCode, 405)
    }
}
