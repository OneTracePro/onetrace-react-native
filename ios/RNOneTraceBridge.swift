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

        // A listener added before setup had no SDK to observe.
        DispatchQueue.main.async {
            if let handler = unreadHandler {
                unreadObservation?.cancel()
                unreadObservation = OneTrace.observeFeedUnread(handler)
            }
        }
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

    @objc public static func fetchFeed(_ completion: @escaping ([[String: Any]]) -> Void) {
        OneTrace.fetchFeed { cards in completion(cards.map(card)) }
    }

    @objc public static func feedCards() -> [[String: Any]] {
        OneTrace.feedCards.map(card)
    }

    @objc public static func feedUnreadCount() -> Int {
        OneTrace.feedUnreadCount
    }

    /// The unread count observer while JavaScript listens; only touched on the main thread.
    private static var unreadHandler: ((Int) -> Void)?
    private static var unreadObservation: OneTraceObservation?

    @objc public static func startFeedUnread(_ handler: @escaping (Int) -> Void) {
        DispatchQueue.main.async {
            unreadObservation?.cancel()
            unreadHandler = handler
            unreadObservation = OneTrace.observeFeedUnread(handler)
        }
    }

    @objc public static func stopFeedUnread() {
        DispatchQueue.main.async {
            unreadObservation?.cancel()
            unreadObservation = nil
            unreadHandler = nil
        }
    }

    /// Reports go by token: the card is looked up in the feed the SDK holds.
    @objc public static func feedCardShown(_ token: String) {
        if let card = feedCard(token) { OneTrace.feedCardShown(card) }
    }

    @objc public static func feedCardClicked(_ token: String) {
        if let card = feedCard(token) { OneTrace.feedCardClicked(card) }
    }

    @objc public static func feedCardDismissed(_ token: String) {
        if let card = feedCard(token) { OneTrace.feedCardDismissed(card) }
    }

    /// The ready-made feed screen, modal over the top view controller.
    @objc public static func openFeed(_ language: String?) {
        Task { @MainActor in
            OneTrace.presentFeed(language: language)
        }
    }

    private static func feedCard(_ token: String) -> OneTraceFeedCard? {
        OneTrace.feedCards.first { $0.token == token }
    }

    /// A card for JavaScript: dates as ISO 8601 strings in UTC, missing values as `NSNull`.
    private static func card(_ card: OneTraceFeedCard) -> [String: Any] {
        [
            "token": card.token,
            "layout": card.layout.rawValue,
            "title": card.title,
            "body": card.body ?? NSNull(),
            "imageUrl": card.imageURL?.absoluteString ?? NSNull(),
            "buttonText": card.buttonText ?? NSNull(),
            "buttonUrl": card.buttonURL?.absoluteString ?? NSNull(),
            "pinned": card.pinned,
            "read": card.read,
            "createdAt": card.createdAt.map(iso) ?? NSNull(),
            "expiresAt": card.expiresAt.map(iso) ?? NSNull(),
            "opensOnTap": card.opensOnTap,
        ]
    }

    private static func iso(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    /// Event properties and traits: `NSNull` from JavaScript becomes nil.
    private static func values(_ dictionary: [String: Any]) -> [String: Any?] {
        dictionary.mapValues { $0 is NSNull ? nil : $0 }
    }
}
