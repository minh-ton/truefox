/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* This source code is introduced during the work of an iOS 15+ browser
 * https://github.com/minh-ton/reynard-browser using the Gecko fork
 * https://github.com/minh-ton/truefox in Feb 2026. */

#include "CompositorWidgetParent.h"
#include "mozilla/widget/PlatformWidgetTypes.h"

namespace mozilla {
namespace widget {

CompositorWidgetParent::CompositorWidgetParent(
    const CompositorWidgetInitData& aInitData,
    const layers::CompositorOptions& aOptions)
    : UIKitCompositorWidget(aOptions) {
  MOZ_ASSERT(XRE_GetProcessType() == GeckoProcessType_GPU);
}

CompositorWidgetParent::~CompositorWidgetParent() = default;

nsIWidget* CompositorWidgetParent::RealWidget() { return nullptr; }

void CompositorWidgetParent::ObserveVsync(VsyncObserver* aObserver) {
  if (!CanSend()) {
    return;
  }

  if (aObserver) {
    (void)SendObserveVsync();
  } else {
    (void)SendUnobserveVsync();
  }
  mVsyncObserver = aObserver;
}

RefPtr<VsyncObserver> CompositorWidgetParent::GetVsyncObserver() const {
  MOZ_ASSERT(XRE_GetProcessType() == GeckoProcessType_GPU);
  return mVsyncObserver;
}

mozilla::ipc::IPCResult CompositorWidgetParent::RecvNotifyClientSizeChanged(
    const LayoutDeviceIntSize& aClientSize) {
  NotifyClientSizeChanged(aClientSize);
  return IPC_OK();
}

}  // namespace widget
}  // namespace mozilla
