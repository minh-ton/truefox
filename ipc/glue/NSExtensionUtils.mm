/* -*- Mode: c++; c-basic-offset: 2; tab-width: 4; indent-tabs-mode: nil; -*-
 * vim: set sw=2 ts=4 expandtab:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NSExtensionUtils.h"
#include "LaunchError.h"

#import <Foundation/Foundation.h>
#import <objc/message.h>
#import <objc/runtime.h>
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
- (void)ping {
}

@end

@interface ExtensionConnectionDelegate : NSObject <NSXPCListenerDelegate>
@property(copy, nullable) void (^connectionHandler)(NSXPCConnection* connection)
    ;
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

static dispatch_queue_t ExtensionLaunchQueue() {
  static dispatch_queue_t queue;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    queue = dispatch_queue_create("me.minh-ton.Reynard.ExtensionLaunchQueue",
                                  DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

static NSString* _Nullable FindExtensionIdentifier(
    mozilla::ipc::NSExtensionProcess::Kind aKind) {
  NSString* expectedKind = ProcessKindName(aKind);
  NSBundle* mainBundle = [NSBundle mainBundle];
  NSURL* plugInsURL = [mainBundle builtInPlugInsURL];
  if (!plugInsURL) {
    return nil;
  }

  NSError* listError = nil;
  NSArray<NSURL*>* items = [[NSFileManager defaultManager]
        contentsOfDirectoryAtURL:plugInsURL
      includingPropertiesForKeys:nil
                         options:NSDirectoryEnumerationSkipsHiddenFiles
                           error:&listError];
  if (!items) {
    return nil;
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

  return nil;
}

static NSExtension* _Nullable CreateNSExtension(
    NSString* identifier, NSError* _Nullable* _Nullable error) {
  // REYNARD: Probe private NSExtension constructors at runtime so we can
  // support API shape differences across OS versions.
  Class extensionClass = NSClassFromString(@"NSExtension");
  if (!extensionClass) {
    return nil;
  }

  SEL classFactoryWithError =
      NSSelectorFromString(@"extensionWithIdentifier:error:");
  SEL classFactoryWithDisabledAndError = NSSelectorFromString(
      @"extensionWithIdentifier:excludingDisabledExtensions:error:");

  (void)classFactoryWithError;
  if (!class_getClassMethod(extensionClass, classFactoryWithDisabledAndError)) {
    return nil;
  }

  using ClassFactoryWithDisabledAndError =
      id (*)(id, SEL, NSString*, BOOL, NSError* _Nullable* _Nullable);
  return ((ClassFactoryWithDisabledAndError)objc_msgSend)(
      extensionClass, classFactoryWithDisabledAndError, identifier, NO, error);
}

static NSUUID* _Nullable BeginExtensionRequest(
    NSExtension* extension, NSArray<NSExtensionItem*>* items) {
  SEL beginExtensionRequestWithError =
      NSSelectorFromString(@"beginExtensionRequestWithInputItems:error:");
  if (![extension respondsToSelector:beginExtensionRequestWithError]) {
    return nil;
  }

  NSError* requestError = nil;
  using BeginExtensionRequestWithError = id (*)(
      id, SEL, NSArray<NSExtensionItem*>*, NSError* _Nullable* _Nullable);
  id requestId = ((BeginExtensionRequestWithError)objc_msgSend)(
      extension, beginExtensionRequestWithError, items, &requestError);
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

    mRequestIdentifier = [BeginExtensionRequest(mExtension, @[ input ]) retain];
    if (!mRequestIdentifier) {
      completeOnce([NSError errorWithDomain:@"ReynardExtension"
                                       code:107
                                   userInfo:@{
                                     NSLocalizedDescriptionKey :
                                         @"Failed to start NSExtension request"
                                   }]);
      return;
    }

    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, 8 * NSEC_PER_SEC),
        ExtensionLaunchQueue(), ^{
          if (completed) {
            return;
          }

          completed = true;
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
      [process release];
      (*ownedCompletion)(Err(LaunchError("NSExtensionProcess::StartProcess")));
      return;
    }

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

UniqueBEProcessCapabilityGrant NSExtensionProcess::GrantForegroundCapability() {
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
