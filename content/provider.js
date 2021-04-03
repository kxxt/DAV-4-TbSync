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

// Either include all other imports here, or use ES6 style dependencies and let
// each script include whatever it needs.
// import * as dav from './includes/sync.js';

/**
 * Implementing the TbSync interface for external provider extensions.
 */
var Base = class {
    constructor(provider, addon) {
        this.provider = provider;
        this.addon = addon;
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
        return messenger.i18n.getMessage("menu.name");
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
            let serviceprovider = TbSync.accounts.getAccountProperty(accountID, "serviceprovider");
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
        TbSync.accounts.resetAccountProperty(accountID, "calDavPrincipal");
        TbSync.accounts.resetAccountProperty(accountID, "cardDavPrincipal");
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
        dav.network.getAuthData(accountID).removeLoginData();
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
     * Returns all folders of the account, sorted in the desired order.
     * The most simple implementation is to return accountData.getAllFolders();
     */
    async getSortedFolders(accountID) {
        let folders = TbSync.folders.getAllFolders(accountID);

        // we can only sort arrays, so we create an array of objects which must
        // contain the sort key and the associated folder
        let toBeSorted = [];
        for (let folderID of folders) {
            let t = 100;
            switch (TbSync.folders.getFolderProperty(folderID, "type")) {
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

            if (TbSync.folders.getFolderProperty(folderID, "shared")) {
                t+=100;
            }
            
            toBeSorted.push({"key": t.toString() + TbSync.folders.getFolderProperty(folderID, "foldername"), "folderID": folderID});
        }
        
        //sort
        toBeSorted.sort(function(a,b) {
            return  a.key > b.key;
        });
        
        let sortedFolders = [];
        for (let sortObj of toBeSorted) {
            sortedFolders.push(sortObj.folder);
        }
        return sortedFolders;
    }


    /**
     * Return the connection timeout for an active sync, so TbSync can append
     * a countdown to the connection timeout, while waiting for an answer from
     * the server. Only syncstates which start with "send." will trigger this.
     */
    async getConnectionTimeout(accountID) {
        return dav.sync.prefSettings.getIntPref("timeout");
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
        
        try {
            await dav.sync.folderList(syncData);
        } catch (e) {
            if (e.name == "dav4tbsync") {
                return e.statusData;
            } else {
                Components.utils.reportError(e);
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
                Components.utils.reportError(e);
                // re-throw any other error and let TbSync handle it
                throw (e);
            }
        }

        // we fall through, if there was no error
        return new TbSync.StatusData();
    }
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * TargetData implementation
// * Using TbSyncs advanced address book TargetData 
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var TargetData_addressbook = class {
    constructor(folderData) {
        //super(folderData);
    }
  
    // define a card property, which should be used for the changelog
    // basically your primary key for the abItem properties
    // UID will be used, if nothing specified
    get primaryKeyField() {
        return "X-DAV-HREF"
    }

    generatePrimaryKey() {
        return this.folderData.getFolderProperty("href") + TbSync.generateUUID() + ".vcf";
    }
        
    // enable or disable changelog
    get logUserChanges() {
        return true;
    }

    directoryObserver(aTopic) {
        switch (aTopic) {
            case "addrbook-removed":
            case "addrbook-updated":
                //Services.console.logStringMessage("["+ aTopic + "] " + this.folderData.getFolderProperty("foldername"));
                break;
        }
    }
        
    cardObserver(aTopic, abCardItem) {
        switch (aTopic) {
            case "addrbook-contact-updated":
            case "addrbook-contact-removed":
                //Services.console.logStringMessage("["+ aTopic + "] " + abCardItem.getProperty("DisplayName"));
                break;

            case "addrbook-contact-created":
            {
                //Services.console.logStringMessage("["+ aTopic + "] Created new X-DAV-UID for Card <"+ abCardItem.getProperty("DisplayName")+">");
                abCardItem.setProperty("X-DAV-UID", TbSync.generateUUID());
                // the card is tagged with "_by_user" so it will not be changed to "_by_server" by the following modify
                abCardItem.abDirectory.modifyItem(abCardItem);
                break;
            }
        }
        dav.sync.onChange(abCardItem);
    }

    listObserver(aTopic, abListItem, abListMember) {
        switch (aTopic) {
            case "addrbook-list-member-added":
            case "addrbook-list-member-removed":
                //Services.console.logStringMessage("["+ aTopic + "] MemberName: " + abListMember.getProperty("DisplayName"));
                break;
            
            case "addrbook-list-removed":
            case "addrbook-list-updated":
                //Services.console.logStringMessage("["+ aTopic + "] ListName: " + abListItem.getProperty("ListName"));
                break;
            
            case "addrbook-list-created": 
                //Services.console.logStringMessage("["+ aTopic + "] Created new X-DAV-UID for List <"+abListItem.getProperty("ListName")+">");
                abListItem.setProperty("X-DAV-UID", TbSync.generateUUID());
                // custom props of lists get updated directly, no need to call .modify()            
                break;
        }
        dav.sync.onChange(abListItem);
    }

    async createAddressbook(newname) {
        // https://searchfox.org/comm-central/source/mailnews/addrbook/src/nsDirPrefs.h
        let dirPrefId = MailServices.ab.newAddressBook(newname, "", 101);
        let directory = MailServices.ab.getDirectoryFromId(dirPrefId);
      
        dav.sync.resetFolderSyncInfo(this.folderData);
        
        if (directory && directory instanceof Components.interfaces.nsIAbDirectory && directory.dirPrefId == dirPrefId) {
            let serviceprovider = this.folderData.accountData.getAccountProperty("serviceprovider");
            let icon = "custom";
            if (dav.sync.serviceproviders.hasOwnProperty(serviceprovider)) {
                icon = dav.sync.serviceproviders[serviceprovider].icon;
            }
            directory.setStringValue("tbSyncIcon", "dav" + icon);
            
            // Disable AutoComplete, so we can have full control over the auto completion of our own directories.
            // Implemented by me in https://bugzilla.mozilla.org/show_bug.cgi?id=1546425
            directory.setBoolValue("enable_autocomplete", false);
            
            return directory;
        }
        return null;
    }
}


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * TargetData implementation
// * Using TbSyncs advanced calendar TargetData 
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var TargetData_calendar = class {
    constructor(folderData) {
        //super(folderData);
    }       
    // The calendar target does not support a custom primaryKeyField, because
    // the lightning implementation only allows to search for items via UID.
    // Like the addressbook target, the calendar target item element has a
    // primaryKey getter/setter which - however - only works on the UID.
    
    // enable or disable changelog
    get logUserChanges(){
        return false;
    }

    calendarObserver(aTopic, tbCalendar, aPropertyName, aPropertyValue, aOldPropertyValue) {
        switch (aTopic) {
            case "onCalendarPropertyChanged":
            {
                //Services.console.logStringMessage("["+ aTopic + "] " + tbCalendar.calendar.name + " : " + aPropertyName);
                switch (aPropertyName) {
                    case "color":
                        if (aOldPropertyValue.toString().toUpperCase() != aPropertyValue.toString().toUpperCase()) {
                            //prepare connection data
                            let connection = new dav.network.ConnectionData(this.folderData);
                            //update color on server
                            dav.network.sendRequest("<d:propertyupdate "+dav.tools.xmlns(["d","apple"])+"><d:set><d:prop><apple:calendar-color>"+(aPropertyValue + "FFFFFFFF").slice(0,9)+"</apple:calendar-color></d:prop></d:set></d:propertyupdate>", this.folderData.getFolderProperty("href"), "PROPPATCH", connection);
                        }
                        break;
                }
            }
            break;
            
            case "onCalendarDeleted":
            case "onCalendarPropertyDeleted":
                //Services.console.logStringMessage("["+ aTopic + "] " +tbCalendar.calendar.name);
                break;
        }
    }

    itemObserver(aTopic, tbItem, tbOldItem) {
        switch (aTopic) {
            case "onAddItem":
            case "onModifyItem":
            case "onDeleteItem":
                //Services.console.logStringMessage("["+ aTopic + "] " + tbItem.nativeItem.title);
                break;
        }
    }

    async createCalendar(newname) {
        let calManager = TbSync.lightning.cal.getCalendarManager();
        let authData = dav.network.getAuthData(this.folderData.accountData);
      
        let caltype = this.folderData.getFolderProperty("type");
        let isGoogle = (this.folderData.accountData.getAccountProperty("serviceprovider") == "google");

        let baseUrl = "";
        if (isGoogle) {
            baseUrl =  "http" + (this.folderData.getFolderProperty("https") ? "s" : "") + "://" + this.folderData.accountID + "@" + this.folderData.getFolderProperty("fqdn");
        } else if (caltype == "caldav") {
            baseUrl =  "http" + (this.folderData.getFolderProperty("https") ? "s" : "") + "://" + this.folderData.getFolderProperty("fqdn");
        }

        let url = dav.tools.parseUri(baseUrl + this.folderData.getFolderProperty("href") + (dav.sync.prefSettings.getBoolPref("enforceUniqueCalendarUrls") ? "?" + this.folderData.accountID : ""));
        this.folderData.setFolderProperty("url", url.spec);

        //check if that calendar already exists
        let cals = calManager.getCalendars({});
        let newCalendar = null;
        let found = false;
        for (let calendar of calManager.getCalendars({})) {
            if (calendar.uri.spec == url.spec) {
                newCalendar = calendar;
                found = true;
                break;
            }
        }

        
        if (found) {
            newCalendar.setProperty("username", authData.username);
            newCalendar.setProperty("color", this.folderData.getFolderProperty("targetColor"));
            newCalendar.name = newname;                
        } else {
            newCalendar = calManager.createCalendar((isGoogle ? "tbSyncCalDav" : caltype), url); //tbSyncCalDav, caldav or ics
            newCalendar.id = TbSync.lightning.cal.getUUID();
            newCalendar.name = newname;

            newCalendar.setProperty("username", authData.username);
            newCalendar.setProperty("color", this.folderData.getFolderProperty("targetColor"));
            // removed in TB78, as it seems to not fully enable the calendar, if present before registering
            // https://searchfox.org/comm-central/source/calendar/base/content/calendar-management.js#385
            //newCalendar.setProperty("calendar-main-in-composite",true);
            newCalendar.setProperty("cache.enabled", this.folderData.accountData.getAccountProperty("useCalendarCache"));
        }

        if (this.folderData.getFolderProperty("downloadonly")) newCalendar.setProperty("readOnly", true);

        // Setup password for Lightning calendar, so users do not get prompted (ICS and google urls do not need a password)
        if (caltype == "caldav" && !isGoogle) {
            TbSync.dump("Searching CalDAV authRealm for", url.host);
            let connectionData = new dav.network.ConnectionData(this.folderData);
            let response = await dav.network.sendRequest("<d:propfind "+dav.tools.xmlns(["d"])+"><d:prop><d:resourcetype /><d:displayname /></d:prop></d:propfind>", url.spec , "PROPFIND", connectionData, {"Depth": "0", "Prefer": "return=minimal"}, {containerRealm: "setup", containerReset: true, passwordRetries: 0});
            
            let realm = connectionData.realm || "";
            if (realm !== "") {
                TbSync.dump("Adding Lightning password", "User <"+authData.username+">, Realm <"+realm+">");
                //manually create a lightning style entry in the password manager
                TbSync.passwordManager.updateLoginInfo(url.prePath, realm, /* old */ authData.username, /* new */ authData.username, authData.password);
            }
        }

        if (!found) {
            calManager.registerCalendar(newCalendar);
        }
        return newCalendar;
    }
}





/**
 * This provider is implementing the StandardFolderList class instead of
 * the FolderList class.
 */
var StandardFolderList = class {
    /**
     * Is called before the context menu of the folderlist is shown, allows to
     * show/hide custom menu options based on selected folder. During an active
     * sync, folderData will be null.
     */
    static onContextMenuShowing(window, folderData) {
    }


    /**
     * Return the icon used in the folderlist to represent the different folder
     * types.
     */
    static getTypeImage(folderData) {
        let src = "";
        switch (folderData.getFolderProperty("type")) {
            case "carddav":
                if (folderData.getFolderProperty("shared")) {
                    return "chrome://tbsync/content/skin/contacts16_shared.png";
                } else {
                    return "chrome://tbsync/content/skin/contacts16.png";
                }
            case "caldav":
                if (folderData.getFolderProperty("shared")) {
                    return "chrome://tbsync/content/skin/calendar16_shared.png";
                } else {
                    return "chrome://tbsync/content/skin/calendar16.png";
                }
            case "ics":
                return "chrome://dav4tbsync/content/skin/ics16.png";
        }
    }


    /**
     * Return the name of the folder shown in the folderlist.
     */ 
    static getFolderDisplayName(folderData) {
        return folderData.getFolderProperty("foldername");
    }


    /**
     * Return the attributes for the ACL RO (readonly) menu element per folder.
     * (label, disabled, hidden, style, ...)
     *
     * Return a list of attributes and their values. If both (RO+RW) do
     * not return any attributes, the ACL menu is not displayed at all.
     */ 
    static getAttributesRoAcl(folderData) {
        return {
            label: messenger.i18n.getMessage("acl.readonly"),
        };
    }
    

    /**
     * Return the attributes for the ACL RW (readwrite) menu element per folder.
     * (label, disabled, hidden, style, ...)
     *
     * Return a list of attributes and their values. If both (RO+RW) do
     * not return any attributes, the ACL menu is not displayed at all.
     */ 
    static getAttributesRwAcl(folderData) {
        let acl = parseInt(folderData.getFolderProperty("acl"));
        let acls = [];
        if (acl & 0x2) acls.push(messenger.i18n.getMessage("acl.modify"));
        if (acl & 0x4) acls.push(messenger.i18n.getMessage("acl.add"));
        if (acl & 0x8) acls.push(messenger.i18n.getMessage("acl.delete"));
        if (acls.length == 0)  acls.push(messenger.i18n.getMessage("acl.none"));

        return {
            label: messenger.i18n.getMessage("acl.readwrite::"+acls.join(", ")),
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
        googlesupport: false,
        enforceUniqueCalendarUrls: false,
        OAuth2_ClientID: "689460414096-e4nddn8tss5c59glidp4bc0qpeu3oper.apps.googleusercontent.com",
        OAuth2_ClientSecret: "LeTdF3UEpCvP1V3EBygjP-kl",
    });
    
    // Enable listeners for messaging based storage access, which
    // takes care of default handling.
    localStorageHandler.enableListeners();

    // Create the TbSync object.
    let addon = await messenger.management.getSelf();
    let tbSync = new TbSync(new Base("dav", addon));
    
    // Connect to TbSync. Resolves after the first connection has been
    // established. There is no need to await this call. Just calling it will
    // setup all needed listeners to be able to (re-) establish the connection.
    // Use tbSync.isConnected to check wether connection is active.
    await tbSync.connect();
    
    console.log(await tbSync.portSend("something"));
}

main();
