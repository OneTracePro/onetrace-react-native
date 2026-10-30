#import "RNOneTrace.h"

// The generated Swift header uses these frameworks; Objective-C++ does not import them by itself.
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>

#if __has_include(<onetrace_react_native/onetrace_react_native-Swift.h>)
#import <onetrace_react_native/onetrace_react_native-Swift.h>
#else
#import "onetrace_react_native-Swift.h"
#endif

/// The `OneTrace` TurboModule; the Swift `RNOneTraceBridge` calls the native OneTrace SDK.
@implementation RNOneTrace

- (void)setup:(NSDictionary *)config
{
  [RNOneTraceBridge setup:config];
}

- (void)track:(NSString *)event properties:(NSDictionary *)properties
{
  [RNOneTraceBridge track:event properties:properties];
}

- (void)screen:(NSString *)name properties:(NSDictionary *)properties
{
  [RNOneTraceBridge screen:name properties:properties];
}

- (void)identify:(NSString *_Nullable)userId traits:(NSDictionary *)traits
{
  [RNOneTraceBridge identify:userId traits:traits];
}

- (void)alias:(NSString *)userId
{
  [RNOneTraceBridge alias:userId];
}

- (void)reset
{
  [RNOneTraceBridge reset];
}

- (void)flush
{
  [RNOneTraceBridge flush];
}

- (void)setPushToken:(NSString *_Nullable)token provider:(NSString *)provider
{
  [RNOneTraceBridge setPushToken:token provider:provider];
}

- (void)notificationPermissionChanged
{
  [RNOneTraceBridge notificationPermissionChanged];
}

- (void)notificationReceived:(NSDictionary *)data
{
  [RNOneTraceBridge notificationReceived:data];
}

- (void)notificationOpened:(NSDictionary *)data
{
  [RNOneTraceBridge notificationOpened:data];
}

- (void)pauseInAppMessages:(BOOL)paused
{
  [RNOneTraceBridge pauseInAppMessages:paused];
}

- (void)fetchInAppMessages
{
  [RNOneTraceBridge fetchInAppMessages];
}

- (void)anonymousId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([RNOneTraceBridge anonymousId]);
}

- (void)userId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([RNOneTraceBridge userId]);
}

- (void)installationId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([RNOneTraceBridge installationId]);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeOneTraceSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"OneTrace";
}

@end
