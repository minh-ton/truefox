/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* This source code is introduced during the work of an iOS 15+ browser
 * https://github.com/minh-ton/reynard-browser using the Gecko fork
 * https://github.com/minh-ton/truefox in Feb 2026. */

#include "UIKitCompositorWidget.h"

#include <algorithm>

#include "mozilla/layers/NativeLayer.h"
#include "mozilla/layers/NativeLayerRootRemoteMacChild.h"
#include "mozilla/widget/PlatformWidgetTypes.h"

namespace mozilla {
namespace widget {

UIKitCompositorWidget::UIKitCompositorWidget(
    const layers::CompositorOptions& aOptions)
    : CompositorWidget(aOptions) {}

UIKitCompositorWidget::~UIKitCompositorWidget() = default;

void UIKitCompositorWidget::Init(CompositorWidgetInitData&& aInitData) {
  MOZ_ASSERT(XRE_IsGPUProcess());

  CocoaCompositorWidgetInitData cocoaInitData(
      std::move((aInitData).get_CocoaCompositorWidgetInitData()));
  mClientSize = cocoaInitData.clientSize();
  mChildEndpoint = std::move(cocoaInitData.childEndpoint());
}

mozilla::layers::NativeLayerRoot* UIKitCompositorWidget::GetNativeLayerRoot() {
  if (!mNativeLayerRoot) {
    CreateNativeLayerRoot();
    MOZ_ASSERT(mNativeLayerRoot);
  }
  return mNativeLayerRoot;
}

LayoutDeviceIntSize UIKitCompositorWidget::GetClientSize() {
  return mClientSize;
}

void UIKitCompositorWidget::NotifyClientSizeChanged(
    const LayoutDeviceIntSize& aClientSize) {
  mClientSize =
      LayoutDeviceIntSize(std::min(aClientSize.width, MOZ_WIDGET_MAX_SIZE),
                          std::min(aClientSize.height, MOZ_WIDGET_MAX_SIZE));
}

void UIKitCompositorWidget::CreateNativeLayerRoot() {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_ASSERT(XRE_IsGPUProcess());

  auto root = MakeRefPtr<layers::NativeLayerRootRemoteMacChild>();
  auto remoteChild = root->GetRemoteChild();
  MOZ_ALWAYS_TRUE(mChildEndpoint.Bind(remoteChild));
  mNativeLayerRoot = std::move(root);
}

}  // namespace widget
}  // namespace mozilla
