/*
 * This file is part of TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

const TBSYNC_ID = "tbsync@jobisoft.de";

export var TbSync = class {
    constructor(base) {
        this.port = null;
        this.connectPromise = null;
        this.portMap = new Map();
        this.portMessageId = 0;
        
        this.base = base;
    }
    
    get isConnected() {
        return (this.port != null);
    }
    
    async connect() {
        this.addon = await messenger.management.getSelf();
        
        if (!this._connectPromise) {
            this._connectPromise = new Promise(resolve => {
                // Wait for connections attempts from TbSync.
                messenger.runtime.onConnectExternal.addListener(port => {
                    // port.name should be "ProviderConnection"
                    if (port.sender.id != TBSYNC_ID)
                        return

                    if (port && !port.error) {
                        this.port = port;
                        this.port.onMessage.addListener(this.portReceiver.bind(this));
                        this.port.onDisconnect.addListener(() => {
                            this.port.onMessage.removeListener(this.portReceiver.bind(this));
                            this.port = null;
                        });
                        console.log(`${this.addon.name} established connection with TbSync`);
                        resolve(true);
                    }
                });

                // React on TbSync being enabled/installed to initiate connection.
                function introduction(addon) {
                    if (addon.id != TBSYNC_ID)
                        return;
                    messenger.runtime.sendMessage(TBSYNC_ID, "InitiateConnect");
                }
                messenger.management.onInstalled.addListener(introduction);
                messenger.management.onEnabled.addListener(introduction);

                // Inform TbSync that we exists and initiate connections.
                messenger.management.get(TBSYNC_ID).then(tbSyncAddon => {
                    if (tbSyncAddon && tbSyncAddon.enabled) {
                        // Send a single ping to trigger a connection request.
                        messenger.runtime.sendMessage(TBSYNC_ID, "InitiateConnect");
                    }
                });
            });
        }        
        return this._connectPromise;
    }

    async processRequest(request) {
        switch (request.command) {
            case "load": 
                return await this.base.load();
            case "unload":
                return await this.base.unload();
            case "getProviderName":
                return await this.base.getProviderName();
            case "getApiVersion":
                return await await this.base.getApiVersion();
            case "getProviderIcon":
                return await this.base.getProviderIcon(request.size, request.accountData);
            case "getSponsors":
                return await this.base.getSponsors();
            case "getContributorsUrl":
                return await this.base.getContributorsUrl();
            case "getMaintainerEmail":
                return await this.base.getMaintainerEmail();
            case "getCreateAccountWindowUrl":
                return await this.base.getCreateAccountWindowUrl();
            case "getEditAccountOverlayUrl":
                return await this.base.getEditAccountOverlayUrl();
            case "getDefaultAccountEntries":
                return await this.base.getDefaultAccountEntries();
            case "getDefaultFolderEntries":
                return await this.base.getDefaultFolderEntries();
            case "onEnableAccount":
                return await this.base.onEnableAccount(request.accountID);
            case "onDisableAccount":
                return await this.base.onDisableAccount(request.accountID);
            case "onDeleteAccount":
                return await this.base.onDeleteAccount(request.accountID);
            case "abAutoComplete":
                return await this.base.abAutoComplete(request.accountID, request.currentQuery);
            case "getSortedFolders":
                return await this.base.getSortedFolders(request.accountID);
            case "getConnectionTimeout":
                return await this.base.getConnectionTimeout(request.accountID);
            case "syncFolderList":
                return await this.base.syncFolderList(request.syncData, request.syncJob, request.syncRunNr);
            case "syncFolder":
                return await this.base.syncFolderList(request.syncData, request.syncJob, request.syncRunNr);
        }
    }
    
    async portReceiver(message, port) {
        // port.name should be "ProviderConnection"
        // We do not need to use this.port, as the port is part of the request.
        if (port.sender.id != TBSYNC_ID)
            return;
        
        const {origin, id, data} = message;
        if (origin == this.addon.id) {
            // This is an answer for one of our own requests.
            const resolve = this.portMap.get(id);
            this.portMap.delete(id);
            resolve(data);
        } else {
            // This is a request from TbSync, process.
            let rv = await this.processRequest(data);
            port.postMessage({origin, id, data: rv});
        }
    }    
    
    portSend(data) {
      return new Promise(resolve => {
        const id = ++this.portMessageId;
        this.portMap.set(id, resolve);
        this.port.postMessage({origin: this.addon.id, id, data});
      });
    }
    
    static getString(key, provider) {
      return messenger.runtime.sendMessage(TBSYNC_ID, {
          command: "getString",
          key,
          provider,
      });
    }
}