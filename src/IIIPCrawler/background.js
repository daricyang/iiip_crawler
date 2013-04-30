// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Worker = require('./worker');
var worker = new Worker.Worker({parallel:5});
chrome.browserAction.onClicked.addListener(worker.onClick.bind(worker));
worker.onClick();
