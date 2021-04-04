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
    constructor(Base) {
        this.port = null;
        this.connectPromise = null;
        this.portMap = new Map();
        this.portMessageId = 0;
        
        this.Base = Base;
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
                            this.Base.onDisconnect();
                        });
                        // Base.onConnect is initiated from TbSync
                        resolve();
                    }
                });

                // React on TbSync being enabled/installed to initiate connection.
                function introduction(addon) {
                    if (addon.id != TBSYNC_ID)
                        return;
                    messenger.runtime.sendMessage(TBSYNC_ID, { command: "InitiateConnect", provider: this.Base.provider });
                }
                messenger.management.onInstalled.addListener(introduction.bind(this));
                messenger.management.onEnabled.addListener(introduction.bind(this));

                // Inform TbSync that we exists and initiate connections.
                messenger.management.get(TBSYNC_ID)
                    .then(tbSyncAddon => {
                        if (tbSyncAddon && tbSyncAddon.enabled) {
                            // Send a single ping to trigger a connection request.
                            messenger.runtime.sendMessage(TBSYNC_ID, { command: "InitiateConnect", provider: this.Base.provider });
                        }
                    })
                    .catch((e) => {});
            });
        }        
        return this._connectPromise;
    }
    
    async portReceiver(message, port) {
        // port.name should be "ProviderConnection"
        // We do not need to use this.port, as the port is part of the request.
        if (port.sender.id != TBSYNC_ID)
            return;
        
        const {origin, id, data} = message;
        if (origin == this.Base.addon.id) {
            // This is an answer for one of our own requests.
            const resolve = this.portMap.get(id);
            this.portMap.delete(id);
            resolve(data);
        } else {
            // This is a request from TbSync, process.
            let [mod,func] = data.command.split(".");
            let parameters = Array.isArray(data.parameters) ? data.parameters : [];
            let rv;
            if (["Base"].includes(mod)) {
                rv = await this[mod][func](...parameters);
            }
            port.postMessage({origin, id, data: rv});
        }
    }    
    
    portSend(data) {
      return new Promise(resolve => {
        const id = ++this.portMessageId;
        this.portMap.set(id, resolve);
        this.port.postMessage({origin: this.Base.addon.id, id, data});
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