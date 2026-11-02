import Foundation

/// Calls of the TurboModule to OneTrace for iOS (compiled into this pod from ios/OneTraceSDK), which is Swift-only.
@objc(RNOneTraceBridge)
public final class RNOneTraceBridge: NSObject {
    @objc public static func setup(_ config: [String: Any]) {
        OneTrace.setWrapper(name: config["wrapper"] as? String ?? "react-native", version: config["wrapperVersion"] as? String ?? "")
        OneTrace.setup(OneTraceConfig(
            writeKey: config["writeKey"] as? String ?? "",
            host: config["host"] as? String ?? "",
            flushAt: (config["flushAt"] as? NSNumber)?.intValue ?? 20,
            flushInterval: (config["flushIntervalSeconds"] as? NSNumber)?.doubleValue ?? 30,
            maxQueueSize: (config["maxQueueSize"] as? NSNumber)?.intValue ?? 1000,
            trackLifecycle: config["trackLifecycle"] as? Bool ?? true,
            openPushLinks: config["openPushLinks"] as? Bool ?? true,
            debug: config["debug"] as? Bool ?? false
        ))
    }

    @objc public static func track(_ event: String, properties: [String: Any]) {
        OneTrace.track(event, values(properties))
    }

    @objc public static func screen(_ name: String, properties: [String: Any]) {
        OneTrace.screen(name, values(properties))
    }

    @objc public static func identify(_ userId: String?, traits: [String: Any], userHash: String?) {
        OneTrace.identify(userId, traits: values(traits), userHash: userHash)
    }

    @objc public static func alias(_ userId: String, userHash: String?) {
        OneTrace.alias(userId, userHash: userHash)
    }

    @objc public static func reset() {
        OneTrace.reset()
    }

    @objc public static func flush() {
        OneTrace.flush()
    }

    @objc public static func setPushToken(_ token: String?, provider: String) {
        OneTrace.setPushToken(token, provider: provider == "fcm" ? .fcm : .apns)
    }

    @objc public static func notificationPermissionChanged() {
        OneTrace.notificationPermissionChanged()
    }

    @objc public static func notificationReceived(_ data: [String: Any]) {
        OneTrace.handleNotificationReceived(data)
    }

    @objc public static func notificationOpened(_ data: [String: Any]) {
        OneTrace.handleNotificationOpen(data)
    }

    @objc public static func pauseInAppMessages(_ paused: Bool) {
        OneTrace.pauseInAppMessages(paused)
    }

    @objc public static func fetchInAppMessages() {
        OneTrace.fetchInAppMessages()
    }

    @objc public static func anonymousId() -> String? {
        OneTrace.anonymousId
    }

    @objc public static func userId() -> String? {
        OneTrace.userId
    }

    @objc public static func installationId() -> String? {
        OneTrace.installationId
    }

    /// Event properties and traits: `NSNull` from JavaScript becomes nil.
    private static func values(_ dictionary: [String: Any]) -> [String: Any?] {
        dictionary.mapValues { $0 is NSNull ? nil : $0 }
    }
}
