import SwiftUI
import WebKit
#if os(iOS)
import AVFoundation
#endif

@main
struct MPSApp: App {
    @StateObject private var session = StudioSession()
    var body: some Scene {
        WindowGroup {
            VStack(spacing: 0) {
                Text("Local edition · Save exports and settings before closing. Cloud accounts are unavailable.")
                    .font(.caption).padding(8)
                if let url = session.url {
                    StudioWebView(url: url)
                } else if let error = session.error {
                    VStack {
                        Text("Studio could not start").font(.headline)
                        Text(error).textSelection(.enabled)
                        Button("Retry") { session.start() }
                    }.padding()
                } else { ProgressView("Opening studio…").padding() }
            }
            #if os(macOS)
            .frame(minWidth: 800, minHeight: 600)
            #endif
            .onAppear { if session.url == nil { session.start() } }
        }
    }
}

final class StudioSession: ObservableObject {
    @Published var url: URL?
    @Published var error: String?
    private var server: LocalAssetServer?
    private var starting = false
    func start() {
        guard !starting else { return }
        starting = true
        error = nil
        server?.stop()
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("WebAssets"),
              FileManager.default.fileExists(atPath: root.appendingPathComponent("index.html").path) else {
            error = "Bundled studio files are missing. Rebuild with scripts/apple/prepare.sh."
            starting = false
            return
        }
        do {
            #if os(iOS)
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            #endif
            let server = LocalAssetServer(root: root)
            self.server = server
            try server.start { [weak self] result in
                self?.starting = false
                switch result {
                case .success(let url): self?.url = url
                case .failure(let error): self?.error = error.localizedDescription
                }
            }
        } catch {
            self.error = error.localizedDescription
            starting = false
        }
    }
    deinit { server?.stop() }
}
