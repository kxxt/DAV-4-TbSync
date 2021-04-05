
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
}






