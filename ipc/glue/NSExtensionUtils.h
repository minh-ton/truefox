/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_NSExtensionUtils_h
#define mozilla_ipc_NSExtensionUtils_h

#include <functional>
#include <xpc/xpc.h>
#include "mozilla/DarwinObjectPtr.h"
#include "mozilla/Result.h"
#include "mozilla/ResultVariant.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/ipc/LaunchError.h"

namespace mozilla::ipc {

class BEProcessCapabilityGrantDeleter {
 public:
  void operator()(void* _Nullable aGrant) const;
};

using UniqueBEProcessCapabilityGrant =
    mozilla::UniquePtr<void, BEProcessCapabilityGrantDeleter>;

class NSExtensionProcess {
 public:
  enum class Kind {
    WebContent,
    Networking,
    Rendering,
  };

  // Called to start the process. The `aCompletion` function may be executed on
  // a background libdispatch thread.
  static void StartProcess(
      Kind aKind,
      const std::function<void(Result<NSExtensionProcess, LaunchError>&&)>&
          aCompletion);

  // Get the kind of process being started.
  Kind GetKind() const { return mKind; }

  // Make an xpc_connection_t to this process. If an error is encountered,
  // `aError` will be populated with the error.
  //
  // Ownership over the newly created connection is returned to the caller.
  // The connection is returned in a suspended state, and must be resumed.
  DarwinObjectPtr<xpc_connection_t> MakeLibXPCConnection();

  UniqueBEProcessCapabilityGrant GrantForegroundCapability();

  // Invalidate the process, indicating that it should be cleaned up &
  // destroyed.
  void Invalidate();

  // Explicit copy constructors
  NSExtensionProcess(const NSExtensionProcess&);
  NSExtensionProcess& operator=(const NSExtensionProcess&);

  // Release the object when completed.
  ~NSExtensionProcess();

 private:
  NSExtensionProcess(Kind aKind, void* _Nullable aProcessObject)
      : mKind(aKind), mProcessObject(aProcessObject) {}

  // Type tag for `mProcessObject`.
  Kind mKind;

  // This is one of `BEWebContentProcess`, `BENetworkingProcess` or
  // `BERenderingProcess`. It has been type erased to be usable from C++ code.
  void* _Nullable mProcessObject;
};

enum class NSExtensionSandboxRevision {
  // RestrictedSandboxRevision.revision1
  Revision1,
};

// Call `applyRestrictedSandbox` on the current NSExtension process, if it
// supports the given sandbox revision.
void LockdownNSExtensionProcess(NSExtensionSandboxRevision aRevision);

}  // namespace mozilla::ipc

#endif  // mozilla_ipc_NSExtensionUtils_h
