/*
 * This file is part of TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

const TBSYNC_ID = "tbsync@jobisoft.de";

export var StatusData = class {
    /**
     * A StatusData instance must be used as return value by 
     * :class:`Base.syncFolderList` and :class:`Base.syncFolder`.
     * 
     * StatusData also defines the possible StatusDataTypes used by the
     * :ref:`TbSyncEventLog`.
     *
     * @param {StatusDataType} type  Status type (see const definitions below)
     * @param {string} message  ``Optional`` A message, which will be used as
     *                          sync status. If this is not a success, it will be
     *                          used also in the :ref:`TbSyncEventLog` as well.
     * @param {string} details  ``Optional``  If this is not a success, it will
     *                          be used as description in the
     *                          :ref:`TbSyncEventLog`.
     *
     */
    constructor(type = "success", message = "", details = "") {
        this.version = "3.0";
        this.type = type; //success, info, warning, error
        this.message = message;
        this.details = details;
    }
    /**
     * Successfull sync. 
     */
    static get SUCCESS() { return "success" };
    /**
     * Sync of the entire account will be aborted.
     */
    static get ERROR() { return "error" };
    /**
     * Sync of this resource will be aborted and continued with next resource.
     */
    static get WARNING() { return "warning" };
    /**
     * Successfull sync, but message and details
     * provided will be added to the event log.
     */
    static get INFO() { return "info" };
    /**
     * Sync of the entire account will be aborted and restarted completely.
     */
    static get ACCOUNT_RERUN() { return "account_rerun" };
    /**
     * Sync of the current folder/resource will be restarted.
     */
    static get FOLDER_RERUN() { return "folder_rerun" };
}

export var EventLogInfo = class {
    /**
     * An EventLogInfo instance is used when adding entries to the
     * :ref:`TbSyncEventLog`. The information given here will be added as a
     * header to the actual event.
     *
     * @param {string} provider     ``Optional`` A provider ID (also used as
     *                              provider namespace). 
     * @param {string} accountname  ``Optional`` An account name. Can be
     *                              arbitrary but should match the accountID
     *                              (if provided).
     * @param {string} accountID    ``Optional`` An account ID. Used to filter
     *                              events for a given account.
     * @param {string} foldername   ``Optional`` A folder name.
     *
     */
    constructor(provider, accountname = "", accountID = "", foldername = "") {
        this._provider = provider;
        this._accountname = accountname;
        this._accountID = accountID;
        this._foldername = foldername;
    }

    /**
     * Getter/Setter for the provider ID of this EventLogInfo.
     */
    get provider() { return this._provider };
    /**
     * Getter/Setter for the account ID of this EventLogInfo.
     */
    get accountname() { return this._accountname };
    /**
     * Getter/Setter for the account name of this EventLogInfo.
     */
    get accountID() { return this._accountID };
    /**
     * Getter/Setter for the folder name of this EventLogInfo.
     */
    get foldername() { return this._foldername };

    set provider(v) { this._provider = v };
    set accountname(v) { this._accountname = v };
    set accountID(v) { this._accountID = v };
    set foldername(v) { this._foldername = v };
}

/**
 * ProgressData to manage a ``done`` and a ``todo`` counter. 
 *
 * Each :class:`SyncData` instance has an associated ProgressData instance. See
 * :class:`SyncData.progressData`. The information of that ProgressData
 * instance is used, when the current syncstate is prefixed by ``send.``,
 * ``eval.`` or ``prepare.``. See :class:`SyncData.setSyncState`.
 *
 */
export var ProgressData = class {
    /**
     *
     */
    constructor() {
        this._todo = 0;
        this._done = 0;
    }

    /**
     * Reset ``done`` and ``todo`` counter.
     *
     * @param {integer} done  ``Optional`` Set a value for the ``done`` counter.
     * @param {integer} todo  ``Optional`` Set a value for the ``todo`` counter.
     *
     */
    reset(done = 0, todo = 0) {
        this._todo = todo;
        this._done = done;
    }

    /**
     * Increment the ``done`` counter.
     *
     * @param {integer} value  ``Optional`` Set incrementation value.
     *
     */
    inc(value = 1) {
        this._done += value;
    }

    /**
     * Getter for the ``todo`` counter.
     *
     */
    get todo() {
        return this._todo;
    }

    /**
     * Getter for the ``done`` counter.
     *
     */
    get done() {
        return this._done;
    }
}

/**
 * AccountData
 *
 */
var AccountData = class {
    /**
     *
     */
    constructor(accountID) {
        this._accountID = accountID;
        TbSync.db.getAllAccounts().then(accounts => {
            if (!accounts.includes(accountID)) {
                throw new Error("An account with ID <" + accountID + "> does not exist. Failed to create AccountData.");
            }    
        })
    }

    /**
     * Getter for an :class:`EventLogInfo` instance with all the information
     * regarding this AccountData instance.
     *
     */
    get eventLogInfo() {
        return new EventLogInfo(
            this.getAccountProperty("provider"),
            this.getAccountProperty("accountname"),
            this.accountID);
    }

    get accountID() {
        return this._accountID;
    }

    getAllFolders() {
        let allFolders = [];
        let folders = TbSync.db.findFolders({ "cached": false }, { "accountID": this.accountID });
        for (let i = 0; i < folders.length; i++) {
            allFolders.push(new FolderData(this, folders[i].folderID));
        }
        return allFolders;
    }

    getAllFoldersIncludingCache() {
        let allFolders = [];
        let folders = TbSync.db.findFolders({}, { "accountID": this.accountID });
        for (let i = 0; i < folders.length; i++) {
            allFolders.push(new FolderData(this, folders[i].folderID));
        }
        return allFolders;
    }

    getFolder(setting, value) {
        // ES6 supports variable keys by putting it into brackets
        let folders = TbSync.db.findFolders({ [setting]: value, "cached": false }, { "accountID": this.accountID });
        if (folders.length > 0) return new FolderData(this, folders[0].folderID);
        return null;
    }

    getFolderFromCache(setting, value) {
        // ES6 supports variable keys by putting it into brackets
        let folders = TbSync.db.findFolders({ [setting]: value, "cached": true }, { "accountID": this.accountID });
        if (folders.length > 0) return new FolderData(this, folders[0].folderID);
        return null;
    }

    createNewFolder() {
        return new FolderData(this, TbSync.db.addFolder(this.accountID));
    }

    get syncData() {
        return TbSync.core.getSyncDataObject(this.accountID); //TODO
    }

    isSyncing() {
        return TbSync.core.isSyncing(this.accountID); //TODO
    }

    isEnabled() {
        return TbSync.core.isEnabled(this.accountID); //TODO
    }

    isConnected() {
        return TbSync.core.isConnected(this.accountID); //TODO
    }


    getAccountProperty(field) {
        return TbSync.db.getAccountProperty(this.accountID, field);
    }

    setAccountProperty(field, value) {
        TbSync.db.setAccountProperty(this.accountID, field, value);
         //TODO : Services.obs.notifyObservers(null, "tbsync.observer.manager.reloadAccountSetting", JSON.stringify({ accountID: this.accountID, setting: field }));
    }

    resetAccountProperty(field) {
        TbSync.db.resetAccountProperty(this.accountID, field);
         //TODO : Services.obs.notifyObservers(null, "tbsync.observer.manager.reloadAccountSetting", JSON.stringify({ accountID: this.accountID, setting: field }));
    }
}

/**
 * FolderData
 *
 */
var FolderData = class {
    /**
     *
     */
    constructor(accountData, folderID) {
        this._accountData = accountData;
        this._folderID = folderID;
        this._target = null;

        if (!TbSync.db.folders[accountData.accountID].hasOwnProperty(folderID)) { //TODO
            throw new Error("A folder with ID <" + folderID + "> does not exist for the given account. Failed to create FolderData.");
        }
    }

    /**
     * Getter for an :class:`EventLogInfo` instance with all the information 
     * regarding this FolderData instance.
     *
     */
    get eventLogInfo() {
        return new EventLogInfo(
            this.accountData.getAccountProperty("provider"),
            this.accountData.getAccountProperty("accountname"),
            this.accountData.accountID,
            this.getFolderProperty("foldername"),
        );
    }

    get folderID() {
        return this._folderID;
    }

    get accountID() {
        return this._accountData.accountID;
    }

    getDefaultFolderEntries() {
        return TbSync.provider.getDefaultFolderEntries(this.accountID);
    }

    getFolderProperty(field) {
        return TbSync.db.getFolderProperty(this.accountID, this.folderID, field);
    }

    setFolderProperty(field, value) {
        TbSync.db.setFolderProperty(this.accountID, this.folderID, field, value);
    }

    resetFolderProperty(field) {
        TbSync.db.resetFolderProperty(this.accountID, this.folderID, field);
    }


    isSyncing() {
        let syncdata = this.accountData.syncData;
        return (syncdata.currentFolderData && syncdata.currentFolderData.folderID == this.folderID);
    }

    getFolderStatus() {
        let status = "";

        if (this.getFolderProperty("selected")) {
            //default
            status = TbSync.getString("status." + this.getFolderProperty("status"), this.accountData.getAccountProperty("provider")).split("||")[0];

            switch (this.getFolderProperty("status").split(".")[0]) { //the status may have a sub-decleration
                case "modified":
                    //trigger periodic sync (TbSync.syncTimer, tbsync.jsm)
                    if (!this.isSyncing()) {
                        this.accountData.setAccountProperty("lastsynctime", 0);
                    }
                case "success":
                    try {
                        status = status + ": " + this.targetData.targetName;
                    } catch (e) {
                        this.resetFolderProperty("target");
                        this.setFolderProperty("status", "notsyncronized");
                        return TbSync.getString("status.notsyncronized");
                    }
                    break;

                case "pending":
                    //add extra info if this folder is beeing synced
                    if (this.isSyncing()) {
                        let syncdata = this.accountData.syncData;
                        status = TbSync.getString("status.syncing", this.accountData.getAccountProperty("provider"));
                        if (["send", "eval", "prepare"].includes(syncdata.getSyncState().state.split(".")[0]) && (syncdata.progressData.todo + syncdata.progressData.done) > 0) {
                            //add progress information
                            status = status + " (" + syncdata.progressData.done + (syncdata.progressData.todo > 0 ? "/" + syncdata.progressData.todo : "") + ")";
                        }
                    }
                    break;
            }
        } else {
            //remain empty if not selected
        }
        return status;
    }

    // get data objects
    get accountData() {
        return this._accountData;
    }

    /**
     * Getter for the :class:`TargetData` instance associated with this
     * FolderData. See :ref:`TbSyncTargets` for more details.
     *
     * @returns {TargetData}
     *
     */
    get targetData() {
        // targetData is created on demand
        if (!this._target) {
            let provider = this.accountData.getAccountProperty("provider");
            let targetType = this.getFolderProperty("targetType");

            if (!targetType)
                throw new Error("Provider <" + provider + "> has not set a proper target type for this folder.");

            if (!TbSync.provider.hasOwnProperty("TargetData_" + targetType))
                throw new Error("Provider <" + provider + "> is missing a TargetData implementation for <" + targetType + ">.");

            this._target = new TbSync.provider["TargetData_" + targetType](this);

            if (!this._target)
                throw new Error("notargets");
        }

        return this._target;
    }

    // Removes the folder and its target. If the target should be 
    // kept  as a stale/unconnected item, provide a suffix, which
    // will be added to its name, to indicate, that it is no longer
    // managed by TbSync.
    remove(keepStaleTargetSuffix = "") {
        // hasTarget() can throw an error, ignore that here
        try {
            if (this.targetData.hasTarget()) {
                if (keepStaleTargetSuffix) {
                    let oldName = this.targetData.targetName;
                    this.targetData.targetName = TbSync.getString("target.orphaned") + ": " + oldName + " " + keepStaleTargetSuffix;
                    this.targetData.disconnectTarget();
                } else {
                    this.targetData.removeTarget();
                }
            }
        } catch (e) {
            Components.utils.reportError(e);
        }
        this.setFolderProperty("cached", true);
    }
}

/**
 * There is only one SyncData instance per account which contains all
 * relevant information regarding an ongoing sync. 
 *
 */
var SyncData = class {
    /**
     *
     */
    constructor(accountID) {

        //internal (private, not to be touched by provider)
        this._syncstate = {
            state: "accountdone",
            timestamp: Date.now(),
        }
        this._accountData = new AccountData(accountID);
        this._progressData = new ProgressData();
        this._currentFolderData = null;
    }

    //all functions provider should use should be in here
    //providers should not modify properties directly
    //when getSyncDataObj is used never change the folder id as a sync may be going on!

    _setCurrentFolderData(folderData) {
        this._currentFolderData = folderData;
    }
    _clearCurrentFolderData() {
        this._currentFolderData = null;
    }

    /**
     * Getter for an :class:`EventLogInfo` instance with all the information
     * regarding this SyncData instance.
     *
     */
    get eventLogInfo() {
        return new EventLogInfo(
            this.accountData.getAccountProperty("provider"),
            this.accountData.getAccountProperty("accountname"),
            this.accountData.accountID,
            this.currentFolderData ? this.currentFolderData.getFolderProperty("foldername") : "",
        );
    }

    /**
     * Getter for the :class:`FolderData` instance of the folder being currently
     * synced. Can be ``null`` if no folder is being synced.
     *
     */
    get currentFolderData() {
        return this._currentFolderData;
    }

    /**
     * Getter for the :class:`AccountData` instance of the account being
     * currently synced.
     *
     */
    get accountData() {
        return this._accountData;
    }

    /**
     * Getter for the :class:`ProgressData` instance of the ongoing sync.
     *
     */
    get progressData() {
        return this._progressData;
    }

    /**
     * Sets the syncstate of the ongoing sync, to provide feedback to the user.
     * The selected state can trigger special UI features, if it starts with one
     * of the following prefixes:
     *
     *   * ``send.``, ``eval.``, ``prepare.`` :
     *     The status message in the UI will be appended with the current progress
     *     stored in the :class:`ProgressData` associated with this SyncData
     *     instance. See :class:`SyncData.progressData`. 
     * 
     *   * ``send.`` : 
     *     The status message in the UI will be appended by a timeout countdown
     *     with the timeout being defined by :class:`Base.getConnectionTimeout`.
     *
     * @param {string} state      A short syncstate identifier. The actual
     *                            message to be displayed in the UI will be
     *                            looked up in the locales of the provider
     *                            by looking for ``syncstate.<state>``. 
     *                            The lookup is done via :func:`getString`,
     *                            so the same fallback rules apply. 
     *
     */
    setSyncState(state) {
        //set new syncstate
        let msg = "State: " + state + ", Account: " + this.accountData.getAccountProperty("accountname");
        if (this.currentFolderData) msg += ", Folder: " + this.currentFolderData.getFolderProperty("foldername");

        let syncstate = {};
        syncstate.state = state;
        syncstate.timestamp = Date.now();

        this._syncstate = syncstate;
        //TODO : TbSync.dump("setSyncState", msg);

        //TODO : Services.obs.notifyObservers(null, "tbsync.observer.manager.updateSyncstate", this.accountData.accountID);
    }

    /**
     * Gets the current syncstate and its timestamp of the ongoing sync. The
     * returned Object has the following attributes:
     *
     *   * ``state`` : the current syncstate
     *   * ``timestamp`` : its timestamp
     *
     * @returns {Object}  The syncstate and its timestamp.
     *
     */
    getSyncState() {
        return this._syncstate;
    }
}

let TbSyncClass = class {
    constructor() {
        this.port = null;
        this.provider = null;
        this.addon = null;
        this._connectionEstablished = false;
        this.numberOfPingRequests = 0;

        this.portMap = new Map();
        this.portMessageId = 0;

        this.sendPing = async () => {
            let info = {
                name: await this.provider.getProviderName(),
                icon16: await this.provider.getProviderIcon(16),
                apiVersion: await this.provider.getApiVersion(),
            };
            let currentPingRequest = ++this.numberOfPingRequests;

            // Ping TbSync until the port based connection has been established. Aborts if registration
            // has been canceled (which clears the provider). Only one active ping allowed.
            while (currentPingRequest == this.numberOfPingRequests && this.provider && !this._connectionEstablished) {
                console.log("Ping TbSync")
                messenger.runtime.sendMessage(TBSYNC_ID, {
                    command: "InitiateConnect",
                    info
                });
                await new Promise(resolve => window.setTimeout(resolve, 1000))
            }
        }

        this.addonListener = addon => {
            if (addon.id == TBSYNC_ID) {
                this.sendPing();
            }
        }

        this.portConnectionListener = port => {
            // port.name should be "ProviderConnection"
            if (this.port || port.sender.id != TBSYNC_ID)
                return

            if (port && !port.error) {
                this.port = port;
                let receiver = this.portReceiver.bind(this);
                this.port.onMessage.addListener(receiver);
                this.port.onDisconnect.addListener(() => {
                    this._connectionEstablished = false;
                    this.port.onMessage.removeListener(receiver);
                    this.port = null;
                    if (this.provider.onDisconnect) {
                        this.provider.onDisconnect();
                    } else {
                        console.log(`Incomplete provider implementation @ ${this.addon.id}: Missing onDisconnect()`);
                    }
                });
                this._connectionEstablished = true;
            }
        }
    }

    async unregister() {
        if (!this.provider) {
            console.log("Nothing to unregister.");
            return;
        }

        if (this.port) {
            this.port.disconnect();
        }

        this.port = null;
        this.provider = null;
        this.addon = null;

        messenger.runtime.onConnectExternal.removeListener(this.portConnectionListener);
        messenger.management.onInstalled.removeListener(this.addonListener);
        messenger.management.onEnabled.removeListener(this.addonListener);
    }

    async register(ProviderClass) {
        if (this.provider) {
            console.log("Register has already been called. Unregister first.");
            return;
        }

        this.provider = new ProviderClass();
        this.addon = await messenger.management.getSelf();

        // Wait for port based connections attempts from TbSync.
        messenger.runtime.onConnectExternal.addListener(this.portConnectionListener);

        // If TbSync is already installed and enabled, try to ping it.
        try {
            let tbSyncAddon = await messenger.management.get(TBSYNC_ID);
            if (tbSyncAddon && tbSyncAddon.enabled) {
                this.sendPing();
            }
        } catch (e) {
            // TbSync is not installed.
        }

        // Try to ping TbSync after it has been enabled or installed.
        messenger.management.onInstalled.addListener(this.addonListener);
        messenger.management.onEnabled.addListener(this.addonListener);
    }

    async portReceiver(message, port) {
        // port.name should be "ProviderConnection"
        // We do not need to use this.port, as the port is part of the request.
        if (port.sender.id != TBSYNC_ID)
            return;

        const { origin, id, data } = message;
        if (origin == this.addon.id) {
            // This is an answer for one of our own requests.
            const resolve = this.portMap.get(id);
            this.portMap.delete(id);
            resolve(data);
        } else {
            // This is a request from TbSync, process.
            let [mod, func] = data.command.split(".");
            let parameters = Array.isArray(data.parameters) ? data.parameters : [];
            let rv;
            if (["Base"].includes(mod)) {
                console.log(func);
                if (this.provider[func]) {
                    rv = await this.provider[func](...parameters);
                } else {
                    console.log(`Incomplete provider implementation @ ${this.addon.id}: Missing ${func}()`);
                }
            }
            port.postMessage({ origin, id, data: rv });
        }
    }

    async portSend(data) {
        console.log(data);
        return new Promise(resolve => {
            const id = ++this.portMessageId;
            this.portMap.set(id, resolve);
            this.port.postMessage({ origin: this.addon.id, id, data });
        });
    }

    /*
     * Wrapper functions to communicate with TbSync. These will move to the
     * local storage of the provider.
     */

    get db() {
        let self = this;
        return {
            getAccountProperty(accountID, property) {
                return self.portSend({
                    command: "getAccountProperty",
                    parameters: [...arguments]
                });
            },

            setAccountProperty(accountID, property, value) {
                return self.portSend({
                    command: "setAccountProperty",
                    parameters: [...arguments]
                });
            },

            resetAccountProperty(accountID, property) {
                return self.portSend({
                    command: "resetAccountProperty",
                    parameters: [...arguments]
                });
            },

            getAccountProperties(accountID, properties) {
                // Not specifying a properties array will return all props.
                return self.portSend({
                    command: "getAccountProperties",
                    parameters: [...arguments]
                });
            },

            setAccountProperties(accountID, properties) {
                if (!properties) {
                    return false;
                }
                return self.portSend({
                    command: "setAccountProperties",
                    parameters: [...arguments]
                });
            },

            resetAccountProperties(accountID, properties) {
                if (!properties) {
                    return false;
                }
                return self.portSend({
                    command: "resetAccountProperties",
                    parameters: [...arguments]
                });
            },

            getFolderProperty(accountID, folderID, property) {
                return self.portSend({
                    command: "getFolderProperty",
                    parameters: [...arguments]
                });
            },

            setFolderProperty(accountID, folderID, property, value) {
                return self.portSend({
                    command: "setFolderProperty",
                    parameters: [...arguments]
                });
            },

            resetFolderProperty(accountID, folderID, property) {
                return self.portSend({
                    command: "resetFolderProperty",
                    parameters: [...arguments]
                });
            },

            getFolderProperties(accountID, folderID, properties) {
                // Not specifying a properties array will return all props.
                return self.portSend({
                    command: "getFolderProperties",
                    parameters: [...arguments]
                });
            },

            setFolderProperties(accountID, folderID, properties) {
                if (!properties) {
                    return false;
                }
                return self.portSend({
                    command: "setFolderProperties",
                    parameters: [...arguments]
                });
            },

            resetFolderProperties(accountID, folderID, properties) {
                if (!properties) {
                    return false;
                }
                return self.portSend({
                    command: "resetFolderProperties",
                    parameters: [...arguments]
                });
            },


            createNewFolder(accountID, properties) {
                return self.portSend({
                    command: "createNewFolder",
                    parameters: [...arguments]
                });
            },

            addAccount(properties) {
                return self.portSend({
                    command: "addAccount",
                    parameters: [...arguments]
                });
            },

            getAllAccounts() {
                return self.portSend({
                    command: "getAllAccounts",
                    parameters: [...arguments]
                });
            },

            getAllFolders(accountID) {
                return self.portSend({
                    command: "getAllFolders",
                    parameters: [...arguments]
                });
            },

            findFolders(folderQuery, accountQuery) {
                return self.portSend({
                    command: "findFolders",
                    parameters: [...arguments]
                });
            }
        }
    }

    async getString(key) {
        //spezial treatment of strings with :: like status.httperror::403
        let parts = key.split("::");
        let localized = messenger.i18n.getMessage(parts[0]);

        if (!localized) {
            localized = await this.portSend({
                command: "getString",
                parameters: [parts[0]]
            });
        }

        if (!localized) {
            localized = key;
        } else {
            //replace placeholders in returned string
            for (let i = 0; i < parts.length; i++) {
                let regex = new RegExp("##replace\." + i + "##", "g");
                localized = localized.replace(regex, parts[i]);
            }
        }

        return localized;
    }
}

// Export an instance / singelton. Uppercase due to historical reasons.
export var TbSync = new TbSyncClass();
