/*
 * This file is part of DAV-4-TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

// Mandatory import to be able to communicate with TbSync.
import { TbSync } from './includes/tbsync/tbsync.js';
import * as dav from './includes/sync.js';

/**
 * Implementing the Provider interface for TbSync provider extensions.
 */
var Provider = class {
    constructor(shortName, addon) {
        this.shortName = shortName;
        this.addon = addon;
        this.tbSync = new TbSync(this);
    }

  /**
     * Called after connection to TbSync has been established.
     */
    async onConnect() {
        console.log(`TbSync established connection to ${this.addon.id}`);

        // openWindows is state data and needs to be managed in a central background message hub
        this.openWindows = {};
    }

    /**
     * Called after connection to TbSync has been terminated.
     */
    async onDisconnect() {                
        console.log(`TbSync terminated connection to ${this.addon.id}`);

        // Close all open windows of this provider.
        for (let id in this.openWindows) {
          if (this.openWindows.hasOwnProperty(id)) {
            try {
                this.openWindows[id].close();
            } catch (e) {
                //NOOP
            }
          }
        }
    }

    /**
     * Returns string for the name of provider for the add account menu.
     */
    async getProviderName() {
        return await this.tbSync.getString("menu.name");
    }


    /**
     * Returns version of the TbSync API this provider is using
     */
    async getApiVersion() { return "3.0"; }


    /**
     * Returns location of a provider icon.
     */
    async getProviderIcon(size, accountID = null) {
        let root = "sabredav";
        if (accountID) {
            let serviceprovider = await this.tbSync.getAccountProperty(accountID, "serviceprovider");
            if (dav.sync.serviceproviders.hasOwnProperty(serviceprovider)) {
                root = dav.sync.serviceproviders[serviceprovider].icon;
            }
        }
        
        switch (size) {
            case 16:
                return messenger.runtime.getURL("content/skin/"+root+"16.png");
            case 32:
                return messenger.runtime.getURL("content/skin/"+root+"32.png");
            default :
                return messenger.runtime.getURL("content/skin/"+root+"48.png");
        }
    }


    /**
     * Returns a list of sponsors, they will be sorted by the index
     */
    async getSponsors() {
        return {
            "Thoben, Marc" : {name: "Marc Thoben", description: "Zimbra", icon: "", link: "" },
            "Biebl, Michael" : {name: "Michael Biebl", description: "Nextcloud", icon: "", link: "" },
            "László, Kovács" : {name: "Kovács László", description : "Radicale", icon: "", link: "" },
            "Lütticke, David" : {name: "David Lütticke", description : "", icon: "", link: "" },
        };
    }


    /**
     * Returns the url of a page with details about contributors (used in the manager UI)
     */
    async getContributorsUrl() {
        return "https://github.com/jobisoft/DAV-4-TbSync/blob/master/CONTRIBUTORS.md";
    }


    /**
     * Returns the email address of the maintainer (used for bug reports).
     */
    async getMaintainerEmail() {
        return "john.bieling@gmx.de";
    }


    /**
     * Returns URL of the new account window.
     *
     * The URL will be opened via openDialog(), when the user wants to create a
     * new account of this provider.
     */
    async getCreateAccountWindowUrl() {
        return messenger.runtime.getURL("content/manager/createAccount.xhtml");
    }


    /**
     * Returns overlay XUL URL of the edit account dialog
     * (chrome://tbsync/content/manager/editAccount.xhtml)
     */
    async getEditAccountOverlayUrl() {
        return messenger.runtime.getURL("content/manager/editAccountOverlay.xhtml");
    }


    /**
     * Return object which contains all possible fields of a row in the
     * accounts database with the default value if not yet stored in the 
     * database.
     */
    async getDefaultAccountEntries() {
        let row = {
            "useCalendarCache" : true,
            "calDavHost" : "",            
            "cardDavHost" : "",
            // these must return null if not defined
            "calDavPrincipal" : null,
            "cardDavPrincipal" : null,

            "calDavOptions" : [],
            "cardDavOptions" : [],
            
            "serviceprovider" : "",
            "serviceproviderRevision" : 0,

            "user" : "",
            "createdWithProviderVersion" : "0",
            "syncGroups" : false,
            }; 
        return row;
    }


    /**
     * Return object which contains all possible fields of a row in the folder 
     * database with the default value if not yet stored in the database.
     */
    async getDefaultFolderEntries() {
        let folder = {
            // different folders (caldav/carddav) can be stored on different 
            // servers (as with yahoo, icloud, gmx, ...), so we need to store
            // the fqdn information per folders
            "href" : "",
            "https" : true,
            "fqdn" : "",

            "url" : "", // used by calendar to store the full url of this cal
            
            "type" : "", //caldav, carddav or ics
            "shared": false, //identify shared resources
            "acl": "", //acl send from server
            "target" : "",
            "targetColor" : "",
            "targetName" : "",
            "ctag" : "",
            "token" : "",
            "createdWithProviderVersion" : "0",
            };
        return folder;
    }


    /**
     * Is called everytime an account of this provider is enabled in the
     * manager UI.
     */
    async onEnableAccount(accountID) {
        await this.tbSync.resetAccountProperties(accountID, [
            "calDavPrincipal",
            "cardDavPrincipal"
        ]);
    }


    /**
     * Is called everytime an account of this provider is disabled in the
     * manager UI.
     */
    async onDisableAccount(accountID) {
    }


    /**
     * Is called everytime an account of this provider is deleted in the
     * manager UI.
     */
    async onDeleteAccount(accountID) {
        //dav.network.getAuthData(accountID).removeLoginData();
    }


    /*static async abAutoComplete(accountID, currentQuery)  {
        function encodeABTermValue(aString) {
            return encodeURIComponent(aString)
                .replace(/\(/g, "%28")
                .replace(/\)/g, "%29");
        }        
        
        let modelQuery = "";
        for (let attr of ["NickName", "FirstName", "LastName", "DisplayName", "PrimaryEmail", "SecondEmail", "X-DAV-JSON-Emails","ListName"]) {
            modelQuery += "("+attr+",c,@V)"
        }
        modelQuery = "(or"+modelQuery+")";

        // Instead of using accountData.getAllFolders() to get all folders of this account
        // and then request and check the targets of each, we simply run over all address
        // books and check for the directory property "tbSyncAccountID".
        let entries = [];
        let allAddressBooks = MailServices.ab.directories;
        let fullString = currentQuery && currentQuery.trim().toLocaleLowerCase();

        // If the search string is empty, or contains a comma, then just return
        // no matches
        // The comma check is so that we don't autocomplete against the user
        // entering multiple addresses.
        if (!fullString || fullString.includes(",")) {
            return entries;
        }

        // Array of all the terms from the fullString search query
        // check 
        //   https://searchfox.org/comm-central/source/mailnews/addrbook/src/AbAutoCompleteSearch.jsm#460
        // for quoted terms in search
        let searchWords = fullString.split(" ");
        let searchQuery = "";
        searchWords.forEach(
            searchWord => (searchQuery += modelQuery.replace(/@V/g, encodeABTermValue(searchWord)))
        );

        // searchQuery has all the (or(...)) searches, link them up with (and(...)).
        searchQuery = "(and" + searchQuery + ")";
        
        while (allAddressBooks.hasMoreElements()) {
            let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
            if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
                if (TbSync.addressbook.getStringValue(abook, "tbSyncAccountID","") == accountData.accountID) {
                    let cards = await TbSync.addressbook.searchDirectory(abook.URI, searchQuery)
                    for (let card of cards) {                        
                        if (card.isMailList) {

                            entries.push({
                                value: card.getProperty("DisplayName", "") + " <"+ card.getProperty("DisplayName", "") +">", 
                                comment: "",
                                icon: provider.getProviderIcon(16, accountData),
                                // https://bugzilla.mozilla.org/show_bug.cgi?id=1653213
                                style: "dav4tbsync-abook",
                                popularityIndex: parseInt(card.getProperty("PopularityIndex", "0")),
                            });
                        
                        } else {                        
                        
                            let emailData = [];
                            try {
                                emailData = JSON.parse(card.getProperty("X-DAV-JSON-Emails","[]").trim());
                            } catch (e) {
                                //Components.utils.reportError(e);                
                            }
                            for (let i = 0; i < emailData.length; i++) { 
                                entries.push({
                                    value: card.getProperty("DisplayName", [card.getProperty("FirstName",""), card.getProperty("LastName","")].join(" ")) + " <"+emailData[i].value+">", 
                                    comment: emailData[i].meta
                                                        .filter(entry => ["PREF","HOME","WORK"].includes(entry))
                                                        .map(entry => entry.toUpperCase() != "PREF" ? entry.toUpperCase() : entry.toLowerCase()).sort()
                                                        .map(entry => messenger.i18n.getMessage("autocomplete." + entry.toUpperCase()))
                                                        .join(", "),
                                    icon: provider.getProviderIcon(16, accountData),
                                    // https://bugzilla.mozilla.org/show_bug.cgi?id=1653213
                                    style: "dav4tbsync-abook",				    
                                    popularityIndex: parseInt(card.getProperty("PopularityIndex", "0")),
                                });
                            }
                            
                        }
                    }
                }
            }
        }
        
        // Sort the results.
        entries.sort(function(a, b) {
          // Order by 1) descending popularity,
          // then 2) by value (DisplayName) sorted alphabetically.
          return (
            b.popularityIndex - a.popularityIndex ||
            a.value.localeCompare(b.value)
          );
        });

        return entries;
    }*/


    /**
     * Returns all folders of the account, sorted in the desired order including
     * all data needed for the FolderListView.
     */
    async getSortedFolders(accountObject) {       
        let folders = [];
        for (let folderID of Object.keys(accountObject.folders)) {
            let t = 100;
            switch (accountObject.folders[folderID].type) {
                case "carddav": 
                    t+=0; 
                    break;
                case "caldav": 
                    t+=1; 
                    break;
                case "ics": 
                    t+=2; 
                    break;
                default:
                    t+=9;
                    break;
            }

            if (accountObject.folders[folderID].shared) {
                t+=100;
            }
            
            folders.push({
                "key": t.toString() + accountObject.folders[folderID].foldername, 
                "folderID": folderID,
                "typeImage": await this.getTypeImage(accountObject, folderID),
                "folderDisplayName": await this.getFolderDisplayName(accountObject, folderID),
                "attributesRoAcl": await this.getAttributesRoAcl(accountObject, folderID),
                "attributesRwAcl": await this.getAttributesRwAcl(accountObject, folderID),
            });
        }
        
        //sort
        folders.sort(function(a,b) {
            return  a.key > b.key;
        });
        return folders;
    }


    /**
     * Return the connection timeout for an active sync, so TbSync can append
     * a countdown to the connection timeout, while waiting for an answer from
     * the server. Only syncstates which start with "send." will trigger this.
     */
    async getConnectionTimeout(accountID) {
        return localStorageHandler.getPref("timeout");
    }
    

    /**
     * Is called if TbSync needs to synchronize the folder list.
     */
    async syncFolderList(syncData, syncJob, syncRunNr) {        
        // Recommendation: Put the actual function call inside a try catch, to
        // ensure returning a proper StatusData object, regardless of what
        // happens inside that function. You may also throw custom errors
        // in that function, which have the StatusData obj attached, which
        // should be returned.
        return;
        
        try {
            await dav.sync.folderList(syncData);
        } catch (e) {
            if (e.name == "dav4tbsync") {
                return e.statusData;
            } else {
                console.err(e);
                // re-throw any other error and let TbSync handle it
                throw (e);
            }
        }

        // we fall through, if there was no error
        return new TbSync.StatusData();
    }
    

    /**
     * Is called if TbSync needs to synchronize a folder.
     */
    async syncFolder(syncData, syncJob, syncRunNr) {
        // Recommendation: Put the actual function call inside a try catch, to
        // ensure returning a proper StatusData object, regardless of what
        // happens inside that function. You may also throw custom errors
        // in that function, which have the StatusData obj attached, which
        // should be returned.
        return;
        
        // Limit auto sync rate, if google
        let isGoogle = (syncData.accountData.getAccountProperty("serviceprovider") == "google");
        let isDefaultGoogleApp = (Services.prefs.getDefaultBranch("extensions.dav4tbsync.").getCharPref("OAuth2_ClientID") == dav.sync.prefSettings.getCharPref("OAuth2_ClientID"));
        if (isGoogle && isDefaultGoogleApp && syncData.accountData.getAccountProperty("autosync") > 0 && syncData.accountData.getAccountProperty("autosync") < 30) {
            syncData.accountData.setAccountProperty("autosync", 30);
            TbSync.eventlog.add("warning", syncData.eventLogInfo, "Lowering sync interval to 30 minutes to reduce google request rate on standard TbSync Google APP (limited to 2.000.000 requests per day).");
        }

        // Process a single folder.
        try {
            await dav.sync.folder(syncData);
        } catch (e) {
            if (e.name == "dav4tbsync") {
                return e.statusData;
            } else {
                console.err(e);
                // re-throw any other error and let TbSync handle it
                throw (e);
            }
        }

        // we fall through, if there was no error
        return new TbSync.StatusData();
    }
    
    
    
    /*
     * FolderList (local, could be moved elsewhere)
     */
    
    /**
     * Is called before the context menu of the folderlist is shown, allows to
     * show/hide custom menu options based on selected folder. During an active
     * sync, folderData will be null.
     */
    async onContextMenuShowing(window, accountID, folderID) {
    }


    /**
     * Return the icon used in the folderlist to represent the different folder
     * types.
     */
    async getTypeImage(accountObject, folderID) {
        let src = "";
        let { type, shared } = accountObject.folders[folderID];

        switch (type) {
            case "carddav":
                if (shared) {
                    // Use relative URL to use icons provided by TbSync.
                    return "content/skin/contacts16_shared.png";
                } else {
                    // Use relative URL to use icons provided by TbSync.
                    return "content/skin/contacts16.png";
                }
            case "caldav":
                if (shared) {
                    // Use relative URL to use icons provided by TbSync.
                    return "content/skin/calendar16_shared.png";
                } else {
                    // Use relative URL to use icons provided by TbSync.
                    return "content/skin/calendar16.png";
                }
            case "ics":
                return messenger.runtime.getURL("content/skin/ics16.png");
        }
    }


    /**
     * Return the name of the folder shown in the folderlist.
     */ 
    async getFolderDisplayName(accountObject, folderID) {
        return accountObject.folders[folderID]["foldername"];
    }


    /**
     * Return the attributes for the ACL RO (readonly) menu element per folder.
     * (label, disabled, hidden, style, ...)
     *
     * Return a list of attributes and their values. If both (RO+RW) do
     * not return any attributes, the ACL menu is not displayed at all.
     */ 
    async getAttributesRoAcl(accountObject, folderID) {
        return {
            label: await this.tbSync.getString("acl.readonly"),
        };
    }
    

    /**
     * Return the attributes for the ACL RW (readwrite) menu element per folder.
     * (label, disabled, hidden, style, ...)
     *
     * Return a list of attributes and their values. If both (RO+RW) do
     * not return any attributes, the ACL menu is not displayed at all.
     */ 
    async getAttributesRwAcl(accountObject, folderID) {
        let acl = parseInt( accountObject.folders[folderID]["acl"]);
        let acls = [];
        if (acl & 0x2) acls.push(await this.tbSync.getString("acl.modify"));
        if (acl & 0x4) acls.push(await this.tbSync.getString("acl.add"));
        if (acl & 0x8) acls.push(await this.tbSync.getString("acl.delete"));
        if (acls.length == 0)  acls.push(await this.tbSync.getString("acl.none"));

        return {
            label: await this.tbSync.getString("acl.readwrite::"+acls.join(", ")),
            disabled: (acl & 0x7) != 0x7,
        }             
    }    
}

async function main() {
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

    // Create the Provider object.
    let addon = await messenger.management.getSelf();
    let provider = new Provider("dav", addon);
    
    // Connect to TbSync. Resolves after the first connection has been
    // established. There is no need to await this call. Just calling it will
    // setup all needed listeners to be able to (re-) establish the connection.
    // provider.onConnect() will be called after connection has been established.
    await provider.tbSync.connect();
}

main();
