/*
 * This file is part of DAV-4-TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

// Mandatory import to be able to communicate with TbSync.
import { TbSync } from '/content/tbsync.js';

// Import the provider class.
import { DavProvider } from '/content/dav.js';

// Setup local storage for our own preferences.
localStorageHandler.init({
    maxitems: 50,
    timeout: 90000,
    "clientID.type": "TbSync",
    "clientID.useragent": "Thunderbird CalDAV/CardDAV",
    enforceUniqueCalendarUrls: false
});

// Enable listeners for messaging based storage access, which
// takes care of default handling.
localStorageHandler.enableListeners();

// Register with TbSync.
TbSync.register(DavProvider);
