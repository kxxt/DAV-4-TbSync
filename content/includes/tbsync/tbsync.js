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
        
    async connect() {        
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
                            this.base.onDisconnect();
                        });
                        // Base.onConnect is initiated from TbSync
                        resolve();
                    }
                });

                // React on TbSync being enabled/installed to initiate connection.
                function introduction(addon) {
                    if (addon.id != TBSYNC_ID)
                        return;
                    messenger.runtime.sendMessage(TBSYNC_ID, { command: "InitiateConnect", provider: this.base.provider });
                }
                messenger.management.onInstalled.addListener(introduction.bind(this));
                messenger.management.onEnabled.addListener(introduction.bind(this));

                // Inform TbSync that we exists and initiate connections.
                messenger.management.get(TBSYNC_ID)
                    .then(tbSyncAddon => {
                        if (tbSyncAddon && tbSyncAddon.enabled) {
                            // Send a single ping to trigger a connection request.
                            messenger.runtime.sendMessage(TBSYNC_ID, { command: "InitiateConnect", provider: this.base.provider });
                        }
                    })
                    .catch((e) => {});
            });
        }        
        return this._connectPromise;
    }

    async processRequest(request) {
        switch (request.command) {
            case "Base.onConnect": 
                return await this.base.onConnect();
            case "Base.getProviderName":
                return await this.base.getProviderName();
            case "Base.getApiVersion":
                return await await this.base.getApiVersion();
            case "Base.getProviderIcon":
                return await this.base.getProviderIcon(request.size, request.accountData);
            case "Base.getSponsors":
                return await this.base.getSponsors();
            case "Base.getContributorsUrl":
                return await this.base.getContributorsUrl();
            case "Base.getMaintainerEmail":
                return await this.base.getMaintainerEmail();
            case "Base.getCreateAccountWindowUrl":
                return await this.base.getCreateAccountWindowUrl();
            case "Base.getEditAccountOverlayUrl":
                return await this.base.getEditAccountOverlayUrl();
            case "Base.getDefaultAccountEntries":
                return await this.base.getDefaultAccountEntries();
            case "Base.getDefaultFolderEntries":
                return await this.base.getDefaultFolderEntries();
            case "Base.onEnableAccount":
                return await this.base.onEnableAccount(request.accountID);
            case "Base.onDisableAccount":
                return await this.base.onDisableAccount(request.accountID);
            case "Base.onDeleteAccount":
                return await this.base.onDeleteAccount(request.accountID);
            case "Base.abAutoComplete":
                return await this.base.abAutoComplete(request.accountID, request.currentQuery);
            case "Base.getSortedFolders":
                return await this.base.getSortedFolders(request.accountID);
            case "Base.getConnectionTimeout":
                return await this.base.getConnectionTimeout(request.accountID);
            case "Base.syncFolderList":
                return await this.base.syncFolderList(request.syncData, request.syncJob, request.syncRunNr);
            case "Base.syncFolder":
                return await this.base.syncFolderList(request.syncData, request.syncJob, request.syncRunNr);
        }
    }
    
    async portReceiver(message, port) {
        // port.name should be "ProviderConnection"
        // We do not need to use this.port, as the port is part of the request.
        if (port.sender.id != TBSYNC_ID)
            return;
        
        const {origin, id, data} = message;
        if (origin == this.base.addon.id) {
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
        this.port.postMessage({origin: this.base.addon.id, id, data});
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