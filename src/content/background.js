/*
 * This file is part of DAV-4-TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

// Mandatory import to be able to communicate with TbSync.
import { tbSync } from '/content/tbsync.js';
import { DavProvider } from './dav.js';
//import * as dav from './provider/sync.js';

async function init() {
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

    // Register with TbSync. Resolves after the first connection has been
    // established. There is no need to await this call. Just calling it will
    // setup all needed listeners to be able to (re-) establish the connection.
    tbSync.register(DavProvider);
}

init();
