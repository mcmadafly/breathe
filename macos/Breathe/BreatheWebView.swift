import AppKit
import SwiftUI
import WebKit

struct BreatheWebView: NSViewRepresentable {
    let url: URL
    var reloadTrigger: Int

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        context.coordinator.webView = webView
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        if context.coordinator.lastLoadedURL?.absoluteString != url.absoluteString {
            context.coordinator.lastLoadedURL = url
            webView.load(URLRequest(url: url))
        }
        if context.coordinator.lastReloadTrigger == nil {
            context.coordinator.lastReloadTrigger = reloadTrigger
        } else if context.coordinator.lastReloadTrigger != reloadTrigger {
            context.coordinator.lastReloadTrigger = reloadTrigger
            webView.reload()
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?
        var lastLoadedURL: URL?
        var lastReloadTrigger: Int?

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let requested = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if navigationAction.navigationType == .linkActivated {
                let currentHost = webView.url?.host
                let nextHost = requested.host
                if nextHost != nil, nextHost != currentHost {
                    NSWorkspace.shared.open(requested)
                    decisionHandler(.cancel)
                    return
                }
            }

            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil, let openURL = navigationAction.request.url {
                NSWorkspace.shared.open(openURL)
            }
            return nil
        }
    }
}
