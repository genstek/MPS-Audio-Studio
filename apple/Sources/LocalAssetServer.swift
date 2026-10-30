import Foundation
import Network

/// Serves bundled assets only, on loopback. No account backend, writes or media storage.
final class LocalAssetServer {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.genstek.mps.assets")
    private let root: URL
    private let token = UUID().uuidString
    private var connections: [UUID: NWConnection] = [:]

    init(root: URL) { self.root = root.standardizedFileURL }

    func start(completion: @escaping (Result<URL, Error>) -> Void) throws {
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
        let listener = try NWListener(using: parameters)
        self.listener = listener
        var reported = false
        listener.stateUpdateHandler = { [weak self] state in
            guard let self, !reported else { return }
            switch state {
            case .ready:
                guard let port = listener.port,
                      let url = URL(string: "http://127.0.0.1:\(port.rawValue)/\(self.token)/index.html") else { return }
                reported = true
                DispatchQueue.main.async { completion(.success(url)) }
            case .failed(let error):
                reported = true
                DispatchQueue.main.async { completion(.failure(error)) }
            default: break
            }
        }
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { connection.cancel(); return }
            guard self.connections.count < 64 else { connection.cancel(); return }
            let id = UUID()
            self.connections[id] = connection
            connection.stateUpdateHandler = { [weak self] state in
                switch state {
                case .cancelled, .failed: self?.connections.removeValue(forKey: id)
                default: break
                }
            }
            connection.start(queue: self.queue)
            self.receive(connection, accumulated: Data())
            self.queue.asyncAfter(deadline: .now() + 15) { connection.cancel() }
        }
        listener.start(queue: queue)
    }

    func stop() {
        queue.async { [self] in
            listener?.cancel()
            listener = nil
            for connection in connections.values { connection.cancel() }
            connections.removeAll()
        }
    }

    private func receive(_ connection: NWConnection, accumulated: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] data, _, done, error in
            guard let self else { connection.cancel(); return }
            var request = accumulated
            if let data { request.append(data) }
            guard request.count <= 32768 else { connection.cancel(); return }
            if request.range(of: Data("\r\n\r\n".utf8)) != nil {
                self.respond(connection, request: request)
            } else if done || error != nil { connection.cancel() }
            else { self.receive(connection, accumulated: request) }
        }
    }

    private func respond(_ connection: NWConnection, request: Data) {
        guard let text = String(data: request, encoding: .utf8),
              let line = text.components(separatedBy: "\r\n").first else { connection.cancel(); return }
        let parts = line.split(separator: " ")
        guard parts.count == 3, parts[0] == "GET" else {
            send(connection, status: "405 Method Not Allowed", body: Data()); return
        }
        let encoded = String(parts[1]).components(separatedBy: "?")[0]
        guard let path = encoded.removingPercentEncoding, path.hasPrefix("/\(token)/") else {
            send(connection, status: "404 Not Found", body: Data()); return
        }
        let relative = String(path.dropFirst(token.count + 2))
        let file = root.appendingPathComponent(relative).standardizedFileURL.resolvingSymlinksInPath()
        guard file.path.hasPrefix(root.resolvingSymlinksInPath().path + "/"),
              let bytes = try? Data(contentsOf: file) else {
            send(connection, status: "404 Not Found", body: Data()); return
        }
        let mime = ["html": "text/html; charset=utf-8", "js": "text/javascript", "css": "text/css",
                    "json": "application/json", "svg": "image/svg+xml", "png": "image/png",
                    "woff2": "font/woff2", "wasm": "application/wasm"][file.pathExtension] ?? "application/octet-stream"
        send(connection, status: "200 OK", body: bytes, mime: mime)
    }

    private func send(_ connection: NWConnection, status: String, body: Data, mime: String = "text/plain") {
        let csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'self'"
        let header = "HTTP/1.1 \(status)\r\nContent-Type: \(mime)\r\nContent-Length: \(body.count)\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: \(csp)\r\n\r\n"
        var response = Data(header.utf8)
        response.append(body)
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
}
