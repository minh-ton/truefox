/* -*- Mode: c++; c-basic-offset: 2; tab-width: 4; indent-tabs-mode: nil; -*-
 * vim: set sw=2 ts=4 expandtab:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NSExtensionUtils.h"
#include "LaunchError.h"

#import <Foundation/Foundation.h>
#import <os/log.h>
#import <objc/message.h>
#import <objc/runtime.h>
#include <stdarg.h>
#include <memory>

#import "mozilla/widget/GeckoViewSupport.h"

using namespace mozilla::widget;

NS_ASSUME_NONNULL_BEGIN

@interface NSExtension : NSObject
- (nullable instancetype)initWithIdentifier:(NSString*)identifier
                                      error:
                                          (NSError* _Nullable* _Nullable)error;
- (nullable NSUUID*)beginRequestWithInputItems:
    (NSArray<NSExtensionItem*>*)items;
- (void)setRequestInterruptionBlock:
    (void (^_Nonnull)(NSUUID* requestIdentifier))block;
- (pid_t)pidForRequestIdentifier:(NSUUID*)requestIdentifier;
- (void)_kill:(int)signal;
@end

@interface NSXPCConnection (Private)
- (xpc_connection_t _Nullable)_xpcConnection;
@end

@protocol ExtensionBootstrapPing
- (void)ping;
@end

@interface ExtensionBootstrapPingTarget : NSObject <ExtensionBootstrapPing>
@end

@implementation ExtensionBootstrapPingTarget
// REYNARD: Somehow the child must actively send an initial XPC call to trigget
// host listener acceptance. So the ping method here is called so that the 
// parent can receive and retain the NSXPC connection.
- (void)ping {}

@end

@interface ExtensionConnectionDelegate : NSObject <NSXPCListenerDelegate>
@property(copy, nullable) void (^connectionHandler)(NSXPCConnection* connection);
@end

@implementation ExtensionConnectionDelegate

- (BOOL)listener:(NSXPCListener*)listener
    shouldAcceptNewConnection:(NSXPCConnection*)newConnection {
  if (self.connectionHandler) {
    self.connectionHandler(newConnection);
  }
  [newConnection resume];
  return YES;
}

@end

static NSString* _Nonnull ProcessKindName(
    mozilla::ipc::NSExtensionProcess::Kind aKind) {
  switch (aKind) {
    case mozilla::ipc::NSExtensionProcess::Kind::WebContent:
      return @"WebContent";
    case mozilla::ipc::NSExtensionProcess::Kind::Networking:
      return @"Networking";
    case mozilla::ipc::NSExtensionProcess::Kind::Rendering:
      return @"Rendering";
  }
}

// REYNARD_DEBUG: Need cleanup later
static os_log_t ReynardLogger() {
  static os_log_t logger;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    logger = os_log_create("me.minh-ton.Reynard.E10S", "ParentBootstrap");
  });
  return logger;
}

static void ReynardLog(NSString* format, ...) {
  va_list args;
  va_start(args, format);
  NSString* message = [[[NSString alloc] initWithFormat:format
                                              arguments:args] autorelease];
  va_end(args);

  os_log_with_type(ReynardLogger(), OS_LOG_TYPE_DEFAULT, "%{public}s",
                   [message UTF8String]);
  NSLog(@"%@", message);
}

static dispatch_queue_t ExtensionLaunchQueue() {
  static dispatch_queue_t queue;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    queue = dispatch_queue_create("me.minh-ton.Reynard.ExtensionLaunchQueue",
                                  DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

static NSString* _Nullable ExtensionFallbackIdentifier(
    mozilla::ipc::NSExtensionProcess::Kind aKind) {
  NSString* bundleIdentifier = [[NSBundle mainBundle] bundleIdentifier];
  if (!bundleIdentifier) {
    return nil;
  }

  switch (aKind) {
    case mozilla::ipc::NSExtensionProcess::Kind::WebContent:
      return [bundleIdentifier stringByAppendingString:@".WebContentProcess"];
    case mozilla::ipc::NSExtensionProcess::Kind::Networking:
      return [bundleIdentifier stringByAppendingString:@".NetworkingProcess"];
    case mozilla::ipc::NSExtensionProcess::Kind::Rendering:
      return [bundleIdentifier stringByAppendingString:@".RenderingProcess"];
  }
}

static NSString* _Nullable FindExtensionIdentifier(
    mozilla::ipc::NSExtensionProcess::Kind aKind) {
  NSString* expectedKind = ProcessKindName(aKind);
  NSBundle* mainBundle = [NSBundle mainBundle];
  NSURL* plugInsURL = [mainBundle builtInPlugInsURL];
  if (!plugInsURL) {
    return ExtensionFallbackIdentifier(aKind);
  }

  NSError* listError = nil;
  NSArray<NSURL*>* items = [[NSFileManager defaultManager]
        contentsOfDirectoryAtURL:plugInsURL
      includingPropertiesForKeys:nil
                         options:NSDirectoryEnumerationSkipsHiddenFiles
                           error:&listError];
  if (!items) {
    NSLog(@"Failed to read PlugIns directory for Reynard extension lookup: %@",
          listError);
    return ExtensionFallbackIdentifier(aKind);
  }

  for (NSURL* itemURL in items) {
    if (![[itemURL pathExtension] isEqualToString:@"appex"]) {
      continue;
    }

    NSBundle* extensionBundle = [NSBundle bundleWithURL:itemURL];
    if (!extensionBundle) {
      continue;
    }

    NSDictionary* extensionInfo =
        [extensionBundle objectForInfoDictionaryKey:@"NSExtension"];
    NSDictionary* attributes =
        [extensionInfo objectForKey:@"NSExtensionAttributes"];
    NSString* kind = [attributes objectForKey:@"ReynardProcessKind"];
    if ([kind isEqualToString:expectedKind]) {
      return [extensionBundle bundleIdentifier];
    }
  }

  return ExtensionFallbackIdentifier(aKind);
}

static NSExtension* _Nullable CreateNSExtension(
    NSString* identifier, NSError* _Nullable* _Nullable error) {
  // REYNARD: Probe private NSExtension constructors at runtime so we can
  // support API shape differences across OS versions.
  Class extensionClass = NSClassFromString(@"NSExtension");
  if (!extensionClass) {
    NSLog(@"REYNARD_DEBUG: NSExtension class not found at runtime");
    return nil;
  }

  auto dumpSelectors = ^(Class clazz, NSString* label) {
    unsigned int count = 0;
    Method* methods = class_copyMethodList(clazz, &count);
    if (!methods) {
      NSLog(@"REYNARD_DEBUG: %@ has no discoverable methods", label);
      return;
    }

    NSMutableArray<NSString*>* names = [NSMutableArray array];
    for (unsigned int i = 0; i < count; ++i) {
      SEL sel = method_getName(methods[i]);
      [names addObject:NSStringFromSelector(sel)];
    }
    free(methods);
    NSLog(@"REYNARD_DEBUG: %@ methods: %@", label, names);
  };

  dumpSelectors(extensionClass, @"NSExtension instance");
  dumpSelectors(object_getClass(extensionClass), @"NSExtension class");

  // REYNARD: Preserve legacy instance-init constructor probing because some
  // iOS builds exposed these selectors but crash at invocation under
  // NSExtension process launch.
  /*
  id instance = [extensionClass alloc];

  SEL initWithIdentifierAndError =
      NSSelectorFromString(@"initWithIdentifier:error:");
  if ([instance respondsToSelector:initWithIdentifierAndError]) {
    using InitWithIdentifierAndError =
        id (*)(id, SEL, NSString*, NSError* _Nullable * _Nullable);
    return ((InitWithIdentifierAndError)objc_msgSend)(
        instance, initWithIdentifierAndError, identifier, error);
  }

  SEL initWithIdentifier = NSSelectorFromString(@"initWithIdentifier:");
  if ([instance respondsToSelector:initWithIdentifier]) {
    using InitWithIdentifier = id (*)(id, SEL, NSString*);
    return ((InitWithIdentifier)objc_msgSend)(instance, initWithIdentifier,
                                              identifier);
  }

  [instance release];
  */

  SEL classFactoryWithError =
      NSSelectorFromString(@"extensionWithIdentifier:error:");
  SEL classFactoryWithDisabledAndError = NSSelectorFromString(
      @"extensionWithIdentifier:excludingDisabledExtensions:error:");

  if (class_getClassMethod(extensionClass, classFactoryWithDisabledAndError)) {
    using ClassFactoryWithDisabledAndError =
        id (*)(id, SEL, NSString*, BOOL, NSError* _Nullable* _Nullable);
    id result = ((ClassFactoryWithDisabledAndError)objc_msgSend)(
        extensionClass, classFactoryWithDisabledAndError, identifier, NO,
        error);
    if (result) {
      NSLog(@"REYNARD_DEBUG: Created NSExtension via "
            @"extensionWithIdentifier:excludingDisabledExtensions:error:");
      return result;
    }

    NSLog(@"REYNARD_DEBUG: "
          @"extensionWithIdentifier:excludingDisabledExtensions:error: "
          @"returned nil for %@",
          identifier);

    if (error && *error) {
      NSLog(@"REYNARD_DEBUG: "
            @"extensionWithIdentifier:excludingDisabledExtensions:error: "
            @"failed for %@ with error=%@",
            identifier, *error);
    }
  }

  if (class_getClassMethod(extensionClass, classFactoryWithError)) {
    using ClassFactoryWithError =
        id (*)(id, SEL, NSString*, NSError* _Nullable* _Nullable);
    id result = ((ClassFactoryWithError)objc_msgSend)(
        extensionClass, classFactoryWithError, identifier, error);
    if (result) {
      NSLog(@"REYNARD_DEBUG: Created NSExtension via "
            @"extensionWithIdentifier:error:");
      return result;
    }

    NSLog(@"REYNARD_DEBUG: extensionWithIdentifier:error: returned nil for %@",
          identifier);

    if (error && *error) {
      NSLog(@"REYNARD_DEBUG: extensionWithIdentifier:error: failed for %@ "
            @"with error=%@",
            identifier, *error);
    }
  }

  SEL classFactory = NSSelectorFromString(@"extensionWithIdentifier:");
  if (class_getClassMethod(extensionClass, classFactory)) {
    using ClassFactory = id (*)(id, SEL, NSString*);
    id result =
        ((ClassFactory)objc_msgSend)(extensionClass, classFactory, identifier);
    if (result) {
      NSLog(@"REYNARD_DEBUG: Created NSExtension via extensionWithIdentifier:");
      return result;
    }

    NSLog(@"REYNARD_DEBUG: extensionWithIdentifier: returned nil for %@",
          identifier);
  }

  SEL extensionsWithMatchingPointName =
      NSSelectorFromString(@"extensionsWithMatchingPointName:completion:");
  SEL extensionsWithMatchingPointNameAndBaseIdentifier = NSSelectorFromString(
      @"extensionsWithMatchingPointName:baseIdentifier:completion:");

  if (class_getClassMethod(extensionClass, extensionsWithMatchingPointName) ||
      class_getClassMethod(extensionClass,
                           extensionsWithMatchingPointNameAndBaseIdentifier)) {
    using ExtensionsWithMatchingPointName = void (*)(id, SEL, NSString*, id);
    using ExtensionsWithMatchingPointNameAndBaseIdentifier =
        void (*)(id, SEL, NSString*, NSString*, id);

    NSArray<NSString*>* pointNames = @[
      @"com.apple.share-services",
      @"com.apple.appintents-extension",
    ];

    NSString* hostBundleId = [[NSBundle mainBundle] bundleIdentifier];
    NSString* expectedAppExtensionName = [NSString
        stringWithFormat:@"%@.appex",
                         [[identifier componentsSeparatedByString:@"."]
                             lastObject]];

    for (NSString* pointName in pointNames) {
      __block NSExtension* matched = nil;
      dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

      void (^completion)(NSArray* _Nullable) = ^(
          NSArray* _Nullable extensions) {
        NSLog(@"REYNARD_DEBUG: extensionsWithMatchingPointName(%@) -> %lu "
              @"entries",
              pointName, (unsigned long)[extensions count]);

        for (id candidate in extensions) {
          if (![candidate isKindOfClass:extensionClass]) {
            continue;
          }

          NSString* containingBundleId = nil;
          NSString* infoBundleId = nil;
          NSString* extensionURLPath = nil;

          SEL containingBundleIdentifier =
              NSSelectorFromString(@"containingBundleIdentifier");
          if ([candidate respondsToSelector:containingBundleIdentifier]) {
            using ContainingBundleIdentifier = id (*)(id, SEL);
            id value = ((ContainingBundleIdentifier)objc_msgSend)(
                candidate, containingBundleIdentifier);
            if ([value isKindOfClass:[NSString class]]) {
              containingBundleId = value;
            }
          }

          SEL objectForInfoDictionaryKey =
              NSSelectorFromString(@"objectForInfoDictionaryKey:");
          if ([candidate respondsToSelector:objectForInfoDictionaryKey]) {
            using ObjectForInfoDictionaryKey = id (*)(id, SEL, NSString*);
            id value = ((ObjectForInfoDictionaryKey)objc_msgSend)(
                candidate, objectForInfoDictionaryKey, @"CFBundleIdentifier");
            if ([value isKindOfClass:[NSString class]]) {
              infoBundleId = value;
            }
          }

          SEL urlSelector = NSSelectorFromString(@"URL");
          if ([candidate respondsToSelector:urlSelector]) {
            using URLSelector = id (*)(id, SEL);
            id value = ((URLSelector)objc_msgSend)(candidate, urlSelector);
            if ([value isKindOfClass:[NSURL class]]) {
              extensionURLPath = [((NSURL*)value) path];
            }
          }

          NSLog(@"REYNARD_DEBUG: candidate extension from point %@ bundle=%@ "
                @"infoBundle=%@ url=%@",
                pointName, containingBundleId, infoBundleId, extensionURLPath);

          bool isExpectedByInfoBundle =
              (infoBundleId && [infoBundleId isEqualToString:identifier]);
          bool isExpectedByContainingBundle =
              (containingBundleId && hostBundleId &&
               [containingBundleId isEqualToString:hostBundleId]);
          // FIXME: This is bad
          bool isExpectedByURL =
              (extensionURLPath &&
               [extensionURLPath containsString:@"/Reynard.app/PlugIns/"] &&
               [extensionURLPath hasSuffix:expectedAppExtensionName]);

          if (!matched && (isExpectedByInfoBundle ||
                           (isExpectedByContainingBundle && isExpectedByURL))) {
            matched = [candidate retain];
          }
        }

        dispatch_semaphore_signal(semaphore);
      };

      if (class_getClassMethod(
              extensionClass,
              extensionsWithMatchingPointNameAndBaseIdentifier) &&
          hostBundleId) {
        ((ExtensionsWithMatchingPointNameAndBaseIdentifier)objc_msgSend)(
            extensionClass, extensionsWithMatchingPointNameAndBaseIdentifier,
            pointName, hostBundleId, completion);
      } else if (class_getClassMethod(extensionClass,
                                      extensionsWithMatchingPointName)) {
        ((ExtensionsWithMatchingPointName)objc_msgSend)(
            extensionClass, extensionsWithMatchingPointName, pointName,
            completion);
      } else {
        continue;
      }

      long waitResult = dispatch_semaphore_wait(
          semaphore, dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC));
      if (waitResult == 0 && matched) {
        NSLog(@"REYNARD_DEBUG: Created NSExtension via "
              @"extensionsWithMatchingPointName fallback for %@",
              pointName);
        return [matched autorelease];
      }
    }
  }

  NSLog(@"REYNARD_DEBUG: No usable NSExtension constructor found for %@",
        identifier);

  return nil;
}

static NSUUID* _Nullable BeginExtensionRequest(
    NSExtension* extension, NSArray<NSExtensionItem*>* items) {
  SEL beginExtensionRequestWithError =
      NSSelectorFromString(@"beginExtensionRequestWithInputItems:error:");
  if ([extension respondsToSelector:beginExtensionRequestWithError]) {
    NSError* requestError = nil;
    using BeginExtensionRequestWithError = id (*)(
        id, SEL, NSArray<NSExtensionItem*>*, NSError* _Nullable* _Nullable);
    id requestId = ((BeginExtensionRequestWithError)objc_msgSend)(
        extension, beginExtensionRequestWithError, items, &requestError);
    if ([requestId isKindOfClass:[NSUUID class]]) {
      return requestId;
    }
    if (requestError) {
      NSLog(@"REYNARD_DEBUG: beginExtensionRequestWithInputItems:error: "
            @"failed with error=%@",
            requestError);
    }
  }

  SEL beginRequest = NSSelectorFromString(@"beginRequestWithInputItems:");
  if (![extension respondsToSelector:beginRequest]) {
    return nil;
  }

  using BeginRequest = id (*)(id, SEL, NSArray<NSExtensionItem*>*);
  id requestId = ((BeginRequest)objc_msgSend)(extension, beginRequest, items);
  if ([requestId isKindOfClass:[NSUUID class]]) {
    return requestId;
  }
  return nil;
}

@interface ExtensionProcess : NSObject {
 @private
  mozilla::ipc::NSExtensionProcess::Kind mKind;
  NSExtension* mExtension;
  NSXPCListener* mListener;
  ExtensionConnectionDelegate* mListenerDelegate;
  NSXPCConnection* mConnection;
  ExtensionBootstrapPingTarget* mExtensionBootstrapPingTarget;
  NSUUID* mRequestIdentifier;
  xpc_connection_t mLibXPCConnection;
  bool mStarted;
  bool mInvalidated;
}

- (nullable instancetype)initWithKind:
    (mozilla::ipc::NSExtensionProcess::Kind)aKind;
- (void)startWithCompletion:
    (void (^_Nonnull)(NSError* _Nullable error))aCompletion;
- (xpc_connection_t _Nullable)copyLibXPCConnection;
- (void)invalidate;

@end

@implementation ExtensionProcess

- (nullable instancetype)initWithKind:
    (mozilla::ipc::NSExtensionProcess::Kind)aKind {
  self = [super init];
  if (!self) {
    return nil;
  }

  mKind = aKind;
  mExtension = nil;
  mListener = nil;
  mListenerDelegate = nil;
  mConnection = nil;
  mExtensionBootstrapPingTarget = nil;
  mRequestIdentifier = nil;
  mLibXPCConnection = nullptr;
  mStarted = false;
  mInvalidated = false;
  return self;
}

- (void)startWithCompletion:
    (void (^_Nonnull)(NSError* _Nullable error))aCompletion {
  ReynardLog(@"REYNARD_DEBUG: ExtensionProcess startWithCompletion "
             @"called, kind=%@",
             ProcessKindName(mKind));

  void (^completion)(NSError* _Nullable) = [aCompletion copy];

  if (mStarted) {
    completion([NSError errorWithDomain:@"ReynardExtension"
                                   code:100
                               userInfo:@{
                                 NSLocalizedDescriptionKey :
                                     @"NSExtension process already started"
                               }]);
    [completion release];
    return;
  }
  mStarted = true;

  // REYNARD: Run launch bootstrap on a dedicated serial queue so callback and
  // timeout delivery never depend on the app main thread while Gecko performs
  // synchronous launch waits.
  dispatch_async(ExtensionLaunchQueue(), ^{
    ReynardLog(
        @"REYNARD_DEBUG: Executing extension launch setup inline, onMain=%@",
        [NSThread isMainThread] ? @"YES" : @"NO");

    __block bool completed = false;
    void (^completeOnce)(NSError* _Nullable) = ^(NSError* _Nullable error) {
      dispatch_async(ExtensionLaunchQueue(), ^{
        if (completed) {
          return;
        }
        completed = true;
        completion(error);
        [completion release];
      });
    };

    if (mInvalidated) {
      completeOnce([NSError
          errorWithDomain:@"ReynardExtension"
                     code:101
                 userInfo:@{
                   NSLocalizedDescriptionKey :
                       @"NSExtension process already invalidated"
                 }]);
      return;
    }

    mListenerDelegate = [[ExtensionConnectionDelegate alloc] init];
    mListener = [[NSXPCListener anonymousListener] retain];

    __block ExtensionProcess* process = self;
    [mListenerDelegate setConnectionHandler:^(NSXPCConnection* connection) {
      ReynardLog(
          @"REYNARD_DEBUG: Extension NSXPC connection accepted for kind=%@",
          ProcessKindName(process->mKind));

      if (process->mInvalidated || process->mConnection) {
        [connection invalidate];
        return;
      }

      process->mConnection = [connection retain];
      process->mExtensionBootstrapPingTarget =
          [[ExtensionBootstrapPingTarget alloc] init];
      [process->mConnection
          setExportedInterface:
              [NSXPCInterface
                  interfaceWithProtocol:@protocol(ExtensionBootstrapPing)]];
      [process->mConnection
          setExportedObject:process->mExtensionBootstrapPingTarget];
      [process->mConnection setInterruptionHandler:^{
        if (process->mLibXPCConnection) {
          xpc_connection_cancel(process->mLibXPCConnection);
        }
      }];
      [process->mConnection setInvalidationHandler:^{
        if (process->mLibXPCConnection) {
          xpc_connection_cancel(process->mLibXPCConnection);
        }
      }];

      SEL xpcSelector = @selector(_xpcConnection);
      if ([process->mConnection respondsToSelector:xpcSelector]) {
        xpc_connection_t libXPC = [process->mConnection _xpcConnection];
        if (libXPC) {
          process->mLibXPCConnection = xpc_retain(libXPC);
        }
      }

      if (!process->mLibXPCConnection) {
        completeOnce([NSError
            errorWithDomain:@"ReynardExtension"
                       code:102
                   userInfo:@{
                     NSLocalizedDescriptionKey :
                         @"Failed to get libxpc connection from NSXPCConnection"
                   }]);
        return;
      }

      completeOnce(nil);
    }];

    [mListener setDelegate:mListenerDelegate];
    [mListener resume];

    NSString* extensionIdentifier = FindExtensionIdentifier(mKind);
    if (!extensionIdentifier) {
      completeOnce([NSError
          errorWithDomain:@"ReynardExtension"
                     code:103
                 userInfo:@{
                   NSLocalizedDescriptionKey :
                       @"Unable to resolve extension bundle identifier"
                 }]);
      return;
    }

    ReynardLog(@"REYNARD_DEBUG: Resolved extension identifier=%@ for kind=%@",
               extensionIdentifier, ProcessKindName(mKind));

    NSError* extensionError = nil;
    mExtension =
        [CreateNSExtension(extensionIdentifier, &extensionError) retain];
    if (!mExtension) {
      completeOnce([NSError
          errorWithDomain:@"ReynardExtension"
                     code:104
                 userInfo:@{
                   NSLocalizedDescriptionKey : @"Failed to create NSExtension",
                   NSUnderlyingErrorKey : extensionError ?: [NSNull null],
                 }]);
      return;
    }

    if ([mExtension
            respondsToSelector:@selector(setRequestInterruptionBlock:)]) {
      [mExtension setRequestInterruptionBlock:^(NSUUID* requestIdentifier) {
        ReynardLog(@"REYNARD_DEBUG: NSExtension request interrupted for "
                   @"kind=%@ request=%@",
                   ProcessKindName(mKind), requestIdentifier);
        completeOnce([NSError
            errorWithDomain:@"ReynardExtension"
                       code:105
                   userInfo:@{
                     NSLocalizedDescriptionKey :
                         @"NSExtension request interrupted before bootstrap"
                   }]);
      }];
    }

    NSExtensionItem* input = [[[NSExtensionItem alloc] init] autorelease];
    NSMutableDictionary* userInfo =
        [NSMutableDictionary dictionaryWithObject:ProcessKindName(mKind)
                                           forKey:@"ReynardProcessKind"];
    [userInfo setObject:[mListener endpoint]
                 forKey:@"ReynardXPCListenerEndpoint"];
    [input setUserInfo:userInfo];

    /*
    SEL beginWithListenerAndCompletion = NSSelectorFromString(
        @"beginExtensionRequestWithInputItems:listenerEndpoint:completion:");
    if ([mExtension respondsToSelector:beginWithListenerAndCompletion]) {
      using BeginWithListenerAndCompletion =
          void (*)(id, SEL, NSArray<NSExtensionItem*>*, NSXPCListenerEndpoint*,
                   void (^ _Nonnull)(NSUUID* _Nullable, NSError* _Nullable));

      ((BeginWithListenerAndCompletion)objc_msgSend)(
          mExtension, beginWithListenerAndCompletion, @[ input ],
          [mListener endpoint],
          ^(NSUUID* _Nullable requestIdentifier, NSError* _Nullable
    requestError) { if (requestError) { NSLog(@"REYNARD_DEBUG:
    beginExtensionRequestWithInputItems:"
                    @"listenerEndpoint:completion: failed with error=%@",
                    requestError);
              completeOnce(requestError);
              return;
            }

            if ([requestIdentifier isKindOfClass:[NSUUID class]]) {
              mRequestIdentifier = [requestIdentifier retain];
            }

            NSLog(@"REYNARD_DEBUG: Began NSExtension request %@ for kind=%@ "
                  @"via listenerEndpoint completion path",
                  mRequestIdentifier, ProcessKindName(mKind));
          });
    } else {
      mRequestIdentifier =
          [BeginExtensionRequest(mExtension, @[ input ]) retain];
      NSLog(@"REYNARD_DEBUG: Began NSExtension request %@ for kind=%@",
            mRequestIdentifier, ProcessKindName(mKind));
    }
    */

    mRequestIdentifier = [BeginExtensionRequest(mExtension, @[ input ]) retain];
    if (mRequestIdentifier) {
      ReynardLog(@"REYNARD_DEBUG: Began NSExtension request %@ for kind=%@ "
                 @"via plain begin path",
                 mRequestIdentifier, ProcessKindName(mKind));
    } else {
      SEL beginWithListenerAndCompletion = NSSelectorFromString(
          @"beginExtensionRequestWithInputItems:listenerEndpoint:completion:");
      if ([mExtension respondsToSelector:beginWithListenerAndCompletion]) {
        using BeginWithListenerAndCompletion = void (*)(
            id, SEL, NSArray<NSExtensionItem*>*, NSXPCListenerEndpoint*,
            void (^_Nonnull)(NSUUID* _Nullable, NSError* _Nullable));

        ((BeginWithListenerAndCompletion)objc_msgSend)(
            mExtension, beginWithListenerAndCompletion, @[ input ],
            [mListener endpoint],
            ^(NSUUID* _Nullable requestIdentifier,
              NSError* _Nullable requestError) {
              if (requestError) {
                ReynardLog(
                    @"REYNARD_DEBUG: "
                    @"beginExtensionRequestWithInputItems:listenerEndpoint:"
                    @"completion: failed for kind=%@ error=%@",
                    ProcessKindName(mKind), requestError);
                completeOnce(requestError);
                return;
              }

              if ([requestIdentifier isKindOfClass:[NSUUID class]]) {
                mRequestIdentifier = [requestIdentifier retain];
              }

              ReynardLog(
                  @"REYNARD_DEBUG: Began NSExtension request %@ for kind=%@ "
                  @"via listenerEndpoint completion fallback",
                  mRequestIdentifier, ProcessKindName(mKind));
            });
      } else {
        completeOnce([NSError
            errorWithDomain:@"ReynardExtension"
                       code:107
                   userInfo:@{
                     NSLocalizedDescriptionKey :
                         @"Failed to start NSExtension request"
                   }]);
        return;
      }
    }

    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, 8 * NSEC_PER_SEC),
        ExtensionLaunchQueue(), ^{
          if (completed) {
            return;
          }

          completed = true;
          ReynardLog(@"REYNARD_DEBUG: Timed out waiting for child "
                     @"extension NSXPC connection for kind=%@ request=%@",
                     ProcessKindName(mKind), mRequestIdentifier);

          completion([NSError errorWithDomain:@"ReynardExtension"
                                         code:106
                                     userInfo:@{
                                       NSLocalizedDescriptionKey :
                                           @"Timed out waiting for child "
                                           @"extension NSXPC connection"
                                     }]);
          [completion release];
        });
  });
}

- (xpc_connection_t _Nullable)copyLibXPCConnection {
  if (!mLibXPCConnection) {
    return nullptr;
  }
  return xpc_retain(mLibXPCConnection);
}

- (void)invalidate {
  mInvalidated = true;

  if (mLibXPCConnection) {
    xpc_connection_cancel(mLibXPCConnection);
    xpc_release(mLibXPCConnection);
    mLibXPCConnection = nullptr;
  }

  if (mConnection) {
    [mConnection invalidate];
    [mConnection release];
    mConnection = nil;
  }

  if (mExtensionBootstrapPingTarget) {
    [mExtensionBootstrapPingTarget release];
    mExtensionBootstrapPingTarget = nil;
  }

  if (mExtension) {
    if (mRequestIdentifier &&
        [mExtension respondsToSelector:@selector(_kill:)]) {
      [mExtension _kill:9];
    }
    [mExtension release];
    mExtension = nil;
  }

  if (mRequestIdentifier) {
    [mRequestIdentifier release];
    mRequestIdentifier = nil;
  }

  if (mListener) {
    [mListener setDelegate:nil];
    [mListener invalidate];
    [mListener release];
    mListener = nil;
  }

  if (mListenerDelegate) {
    [mListenerDelegate setConnectionHandler:nil];
    [mListenerDelegate release];
    mListenerDelegate = nil;
  }
}

- (void)dealloc {
  [self invalidate];
  [super dealloc];
}

@end

NS_ASSUME_NONNULL_END

namespace mozilla::ipc {

void BEProcessCapabilityGrantDeleter::operator()(void* _Nullable aGrant) const {
}

void NSExtensionProcess::StartProcess(
    Kind aKind,
    const std::function<void(Result<NSExtensionProcess, LaunchError>&&)>&
        aCompletion) {
  // REYNARD: Launch child process via NSExtension and bridge its
  // NSXPCConnection to libxpc for Gecko child bootstrap.
  ReynardLog(
      @"REYNARD_DEBUG: NSExtensionProcess::StartProcess invoked for kind=%@",
      ProcessKindName(aKind));

  auto ownedCompletion = std::make_shared<
      std::function<void(Result<NSExtensionProcess, LaunchError>&&)>>(
      aCompletion);

  ExtensionProcess* process = [[ExtensionProcess alloc] initWithKind:aKind];
  if (!process) {
    (*ownedCompletion)(
        Err(LaunchError("NSExtensionProcess::StartProcess alloc")));
    return;
  }

  [process startWithCompletion:^(NSError* error) {
    if (error) {
      ReynardLog(@"REYNARD_DEBUG: Failed to launch Reynard extension "
                 @"process for kind=%@ error=%@",
                 ProcessKindName(aKind), [error localizedDescription]);
      [process release];
      (*ownedCompletion)(Err(LaunchError("NSExtensionProcess::StartProcess")));
      return;
    }

    ReynardLog(@"REYNARD_DEBUG: Extension process launch completed for kind=%@",
               ProcessKindName(aKind));

    (*ownedCompletion)(NSExtensionProcess(aKind, process));
  }];
}

template <typename F>
static void SwitchObject(NSExtensionProcess::Kind aKind,
                         void* _Nullable aProcessObject, F&& aMatcher) {
  switch (aKind) {
    case NSExtensionProcess::Kind::WebContent:
      aMatcher(static_cast<ExtensionProcess*>(aProcessObject));
      break;
    case NSExtensionProcess::Kind::Networking:
      aMatcher(static_cast<ExtensionProcess*>(aProcessObject));
      break;
    case NSExtensionProcess::Kind::Rendering:
      aMatcher(static_cast<ExtensionProcess*>(aProcessObject));
      break;
  }
}

DarwinObjectPtr<xpc_connection_t> NSExtensionProcess::MakeLibXPCConnection() {
  DarwinObjectPtr<xpc_connection_t> xpcConnection;
  SwitchObject(mKind, mProcessObject, [&](auto* aProcessObject) {
    xpcConnection = AdoptDarwinObject([aProcessObject copyLibXPCConnection]);
  });
  return xpcConnection;
}

void NSExtensionProcess::Invalidate() {
  SwitchObject(mKind, mProcessObject,
               [&](auto* aProcessObject) { [aProcessObject invalidate]; });
}

UniqueBEProcessCapabilityGrant
NSExtensionProcess::GrantForegroundCapability() {
  return UniqueBEProcessCapabilityGrant(nil);
}

NSExtensionProcess::NSExtensionProcess(const NSExtensionProcess& aOther)
    : mKind(aOther.mKind), mProcessObject(aOther.mProcessObject) {
  SwitchObject(mKind, mProcessObject,
               [&](auto* aProcessObject) { [aProcessObject retain]; });
}

NSExtensionProcess& NSExtensionProcess::operator=(
    const NSExtensionProcess& aOther) {
  Kind oldKind = std::exchange(mKind, aOther.mKind);
  void* oldProcessObject = std::exchange(mProcessObject, aOther.mProcessObject);
  SwitchObject(mKind, mProcessObject,
               [&](auto* aProcessObject) { [aProcessObject retain]; });
  SwitchObject(oldKind, oldProcessObject,
               [&](auto* aProcessObject) { [aProcessObject release]; });
  return *this;
}

NSExtensionProcess::~NSExtensionProcess() {
  SwitchObject(mKind, mProcessObject,
               [&](auto* aProcessObject) { [aProcessObject release]; });
}

void LockdownNSExtensionProcess(NSExtensionSandboxRevision aRevision) {
  if (id<GeckoProcessExtension> process = GetCurrentProcessExtension()) {
    switch (aRevision) {
      case NSExtensionSandboxRevision::Revision1:
        [process lockdownSandbox:@"1.0"];
        return;
      default:
        NSLog(@"Unknown NSExtension sandbox revision");
        return;
    }
  }
}

}  // namespace mozilla::ipc
