import SwiftUI
import WebKit
#if os(macOS)
import AppKit
#else
import UIKit
#endif

final class BrowserCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private let origin: URL
    private var files: [ObjectIdentifier: URL] = [:]
    private var activeDownloads: [ObjectIdentifier: WKDownload] = [:]
    init(origin: URL) { self.origin = origin }

    func makeWebView() -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        #if os(iOS)
        configuration.allowsInlineMediaPlayback = true
        #endif
        let web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.load(URLRequest(url: origin))
        return web
    }

    private func allowed(_ url: URL) -> Bool {
        url.scheme == origin.scheme && url.host == origin.host && url.port == origin.port
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if action.shouldPerformDownload && (allowed(url) || url.scheme == "blob") {
            decisionHandler(.download)
        } else if allowed(url) { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        register(download)
    }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        register(download)
    }
    private func register(_ download: WKDownload) {
        activeDownloads[ObjectIdentifier(download)] = download
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        // Always download to a new temporary directory; never overwrite an imported source.
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("MPS-" + UUID().uuidString)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let name = (suggestedFilename as NSString).lastPathComponent
            let destination = directory.appendingPathComponent(name.isEmpty || name == "." || name == ".." ? "MPS-export.wav" : name)
            files[ObjectIdentifier(download)] = destination
            completionHandler(destination)
        } catch { completionHandler(nil); showError(error.localizedDescription) }
    }

    func downloadDidFinish(_ download: WKDownload) {
        let id = ObjectIdentifier(download)
        activeDownloads.removeValue(forKey: id)
        guard let file = files.removeValue(forKey: id) else { return }
        #if os(macOS)
        let panel = NSSavePanel()
        panel.nameFieldStringValue = file.lastPathComponent
        panel.canCreateDirectories = true
        panel.begin { result in
            defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
            guard result == .OK, let destination = panel.url else { return }
            do {
                // Even after the native overwrite prompt, refuse replacement of existing media.
                guard !FileManager.default.fileExists(atPath: destination.path) else {
                    self.showError("Choose a new filename. Existing files are never overwritten.")
                    return
                }
                try FileManager.default.copyItem(at: file, to: destination)
            } catch { self.showError(error.localizedDescription) }
        }
        #else
        guard let presenter = presenter() else {
            showError("Export could not be shown. Return to the studio and save again.")
            try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
            return
        }
        let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        share.popoverPresentationController?.sourceView = presenter.view
        share.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
        share.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
        }
        presenter.present(share, animated: true)
        #endif
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        let id = ObjectIdentifier(download)
        activeDownloads.removeValue(forKey: id)
        if let file = files.removeValue(forKey: id) { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        showError("Export failed: " + error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showError("Studio could not load: " + error.localizedDescription)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        showError("The audio session stopped because the web process closed. Unsaved changes were lost. Reopen the app and import your original files.")
    }

    #if os(macOS)
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.begin { result in completionHandler(result == .OK ? panel.urls : nil) }
    }
    #else
    private func presenter() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var controller = scene?.windows.first { $0.isKeyWindow }?.rootViewController
        while let next = controller?.presentedViewController { controller = next }
        return controller
    }
    #endif

    private func showError(_ message: String) {
        DispatchQueue.main.async {
            #if os(macOS)
            let alert = NSAlert()
            alert.messageText = "MPS Audio Studio"
            alert.informativeText = message
            alert.runModal()
            #else
            let alert = UIAlertController(title: "MPS Audio Studio", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.presenter()?.present(alert, animated: true)
            #endif
        }
    }
}

#if os(macOS)
struct StudioWebView: NSViewRepresentable {
    let url: URL
    func makeCoordinator() -> BrowserCoordinator { BrowserCoordinator(origin: url) }
    func makeNSView(context: Context) -> WKWebView { context.coordinator.makeWebView() }
    func updateNSView(_ view: WKWebView, context: Context) {}
}
#else
struct StudioWebView: UIViewRepresentable {
    let url: URL
    func makeCoordinator() -> BrowserCoordinator { BrowserCoordinator(origin: url) }
    func makeUIView(context: Context) -> WKWebView { context.coordinator.makeWebView() }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
#endif
