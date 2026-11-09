package pro.onetrace.reactnative

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import pro.onetrace.sdk.FeedCard
import pro.onetrace.sdk.FeedUnreadListener
import pro.onetrace.sdk.OneTrace
import pro.onetrace.sdk.OneTraceConfig
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * The `OneTrace` TurboModule over the native OneTrace SDK. The SDK starts when JavaScript calls `OneTrace.init()`,
 * after the React activity was created, so the activity is attached to it explicitly: its launch intent may carry a
 * tapped notification, and in-app messages are shown over it.
 */
class OneTraceModule(reactContext: ReactApplicationContext) : NativeOneTraceSpec(reactContext) {
    private val intents = object : BaseActivityEventListener() {
        override fun onNewIntent(intent: Intent) {
            OneTrace.handleIntent(reactApplicationContext.currentActivity ?: reactApplicationContext, intent)
        }
    }

    /** Passes the unread count of the feed to JavaScript while it listens (`startFeedUnread` … `stopFeedUnread`). */
    private val unread = FeedUnreadListener { count -> emitOnFeedUnread(count.toDouble()) }

    @Volatile
    private var observingUnread = false

    override fun setup(config: ReadableMap) {
        OneTrace.setWrapper(config.string("wrapper"), config.string("wrapperVersion"))
        OneTrace.init(
            reactApplicationContext,
            OneTraceConfig(
                writeKey = config.string("writeKey"),
                host = config.string("host"),
                flushAt = config.number("flushAt")?.toInt() ?: 20,
                flushIntervalSeconds = config.number("flushIntervalSeconds")?.toLong() ?: 30,
                maxQueueSize = config.number("maxQueueSize")?.toInt() ?: 1000,
                trackLifecycle = config.flag("trackLifecycle") ?: true,
                openPushLinks = config.flag("openPushLinks") ?: true,
                debug = config.flag("debug") ?: false,
            ),
        )
        reactApplicationContext.removeActivityEventListener(intents)
        reactApplicationContext.addActivityEventListener(intents)
        reactApplicationContext.currentActivity?.let { activity: Activity -> OneTrace.attachActivity(activity) }

        // A listener added before init had no SDK to observe.
        if (observingUnread) {
            OneTrace.removeFeedUnreadListener(unread)
            OneTrace.addFeedUnreadListener(unread)
        }
    }

    override fun track(event: String, properties: ReadableMap) = OneTrace.track(event, values(properties))

    override fun screen(name: String, properties: ReadableMap) = OneTrace.screen(name, values(properties))

    override fun identify(userId: String?, traits: ReadableMap, userHash: String?) = OneTrace.identify(userId, values(traits), userHash)

    override fun alias(userId: String, userHash: String?) = OneTrace.alias(userId, userHash)

    override fun reset() = OneTrace.reset()

    override fun flush() = OneTrace.flush()

    override fun setPushToken(token: String?, provider: String) =
        OneTrace.setPushToken(token, if (provider == "apns") OneTrace.PushProvider.APNS else OneTrace.PushProvider.FCM)

    override fun notificationPermissionChanged() = OneTrace.notificationPermissionChanged()

    override fun notificationReceived(data: ReadableMap) = OneTrace.notificationReceived(strings(data))

    override fun notificationOpened(data: ReadableMap) {
        OneTrace.notificationOpened(reactApplicationContext.currentActivity ?: reactApplicationContext, strings(data))
    }

    override fun pauseInAppMessages(paused: Boolean) = OneTrace.pauseInAppMessages(paused)

    override fun fetchInAppMessages() = OneTrace.fetchInAppMessages()

    override fun anonymousId(promise: Promise) = promise.resolve(OneTrace.anonymousId)

    override fun userId(promise: Promise) = promise.resolve(OneTrace.userId)

    override fun installationId(promise: Promise) = promise.resolve(OneTrace.installationId)

    override fun fetchFeed(promise: Promise) = OneTrace.fetchFeed { cards, _ -> promise.resolve(cards(cards)) }

    override fun feedCards(promise: Promise) = promise.resolve(cards(OneTrace.feedCards))

    override fun feedUnreadCount(promise: Promise) = promise.resolve(OneTrace.feedUnreadCount.toDouble())

    override fun startFeedUnread() {
        observingUnread = true
        OneTrace.addFeedUnreadListener(unread)
    }

    override fun stopFeedUnread() {
        observingUnread = false
        OneTrace.removeFeedUnreadListener(unread)
    }

    override fun feedCardShown(token: String) {
        feedCard(token)?.let { OneTrace.feedCardShown(it) }
    }

    override fun feedCardClicked(token: String) {
        feedCard(token)?.let { OneTrace.feedCardClicked(reactApplicationContext.currentActivity ?: reactApplicationContext, it) }
    }

    override fun feedCardDismissed(token: String) {
        feedCard(token)?.let { OneTrace.feedCardDismissed(it) }
    }

    /** The ready-made screen; its labels follow the app locale, so [language] (an iOS option) is not used. */
    override fun openFeed(language: String?) = OneTrace.openFeed(reactApplicationContext.currentActivity ?: reactApplicationContext)

    override fun invalidate() {
        if (observingUnread) {
            observingUnread = false
            OneTrace.removeFeedUnreadListener(unread)
        }
        super.invalidate()
    }

    /** Reports go by token: the card is looked up in the feed the SDK holds. */
    private fun feedCard(token: String): FeedCard? = OneTrace.feedCards.firstOrNull { it.token == token }

    private fun ReadableMap.string(key: String): String = if (hasKey(key) && !isNull(key)) getString(key).orEmpty() else ""

    private fun ReadableMap.number(key: String): Double? = if (hasKey(key) && !isNull(key)) getDouble(key) else null

    private fun ReadableMap.flag(key: String): Boolean? = if (hasKey(key) && !isNull(key)) getBoolean(key) else null

    private fun strings(map: ReadableMap): Map<String, String> = map.toHashMap().mapNotNull { (key, value) -> value?.let { key to it.toString() } }.toMap()

    companion object {
        const val NAME = NativeOneTraceSpec.NAME

        /** JavaScript numbers arrive as doubles: whole ones become longs, so `1` is not sent as `1.0`. */
        internal fun values(map: ReadableMap): Map<String, Any?> = map.toHashMap().mapValues { (_, item) -> normalize(item) }

        internal fun cards(cards: List<FeedCard>): WritableArray = Arguments.createArray().apply {
            cards.forEach { pushMap(card(it)) }
        }

        internal fun card(card: FeedCard): WritableMap = Arguments.createMap().apply {
            putString("token", card.token)
            putString("layout", card.layout.name.lowercase(Locale.ROOT))
            putString("title", card.title)
            putString("body", card.body)
            putString("imageUrl", card.imageUrl)
            putString("buttonText", card.buttonText)
            putString("buttonUrl", card.buttonUrl)
            putBoolean("pinned", card.pinned)
            putBoolean("read", card.read)
            putString("createdAt", card.createdAt?.let(::iso))
            putString("expiresAt", card.expiresAt?.let(::iso))
            putBoolean("opensOnTap", card.opensOnTap)
        }

        /** ISO 8601 in UTC, as JavaScript `new Date()` reads it. */
        internal fun iso(date: Date): String =
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(date)

        internal fun normalize(item: Any?): Any? = when (item) {
            is Double -> if (item % 1.0 == 0.0 && Math.abs(item) < 9.007199254740992E15) item.toLong() else item
            is Map<*, *> -> item.entries.associate { (key, nested) -> key.toString() to normalize(nested) }
            is List<*> -> item.map { normalize(it) }
            else -> item
        }
    }
}
