var sockjs = require('sockjs');
var shortId = require('shortid');
var cryptojs = require('crypto-js');
var fs = require('fs');
var CircularJSON = require('circular-json')
var mdaf = require('./mdaf');

var SessionManager = function(){
	this.authentication = null;
	this.synchronization = null;
	this.longTermSessionList = []//this.getFromStorage();
	this.multiDeviceSessionList = [];
	this.socket = null;
	this.server = null;
	this.synchronize = null;
};

/** Starts the sessionManager
 * server - the instance of the application web server;
 * options - options of the SockJS server. See this.createSocket function;
 * authentication - type of the authentication mechanism which has to be implemented;
 * users - data of the users, which could be authenticated.
 */

SessionManager.prototype.start = function(server, options, authentication, users, synchronization){
	this.createSocket(options);
	this.server = server;
	if (authentication){
		this.setAuthenticationMechanism(authentication, users);
	};
	console.log(synchronization);
	this.synchronize = this.setSynchronizationMechanism(synchronization);
	console.log(this.synchronize)
	this.setConnectionHandlers();
};

/** Creates a SockJS server
 * options - options of the SockJS server. See https://github.com/sockjs/sockjs-node
 */

SessionManager.prototype.createSocket = function(options){
	if (options === undefined) {
		options = {heartbeat_delay : 1000};
	};
	if (options.heartbeat_delay === undefined) {
    	options.heartbeat_delay = 1000;
    };
    options.sockjs_url = 'http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js';
	this.socket = sockjs.createServer(options);
};

/** Sets authentication properties for the server and calls the function
   to set that authentication mechanism.
 * authentication - type of the authentication mechanism which has to be implemented;
 * users - data of the users, which could be authenticated.
 */

SessionManager.prototype.setAuthenticationMechanism = function(authentication, users){
	this.authentication = {
		'type' : authentication,
		'users' : users
	}
    switch (authentication) {
		case 'challenge':
			var challenge = shortId.generate();
			this.authentication.challenge = challenge;
			this.setChallengeAuthentication();
			break;
	}
};

SessionManager.prototype.setSynchronizationMechanism = function(type){
	console.log(type);
	switch (type) {
		case 'clientFirst':
			console.log('It\'s client first!')
			return this.setClientFirstSynchronization;
		default: 
			return null;
	}
}

/** Sets the authentication handlers to the SockJS connection object,
 creates the session object after successfull authentication.
 */

SessionManager.prototype.setConnectionHandlers = function (){
	this.socket.on("connection", function(conn){
		var ltsID = shortId.generate();
    	conn.write("{\"mdaf\" : \"ltsID\", \"ltsID\" : \""+ ltsID + "\"}");
    	conn.on('data', function(string){
    		var message = JSON.parse(string);
			if (message.mdaf === 'ltsID') {   			
					if (message.ltsID !== ltsID) {
		    			var storedLts = this.getLongTermSession(message.ltsID);
		    			if (storedLts){
		    				if (storedLts.continuous && this.synchronize){
		    					this.synchronize(storedLts, conn)
		    				} else {
		    					this.onSynchronized(storedLts, conn);
			    			};
		    			} else {
		    				conn.write("{\"mdaf\" : \"sessionRestored\", \"sessionRestored\" : \"failure\"}");
		    			}
		    		} else {
		    			if (message.hasOwnProperty('enterprise')){
		    				var lts = this.createLongTermSession(ltsID, conn, message.enterprise)
		    			} else {
		    				var lts = this.createLongTermSession(ltsID, conn);
		    			} 
		    			mdaf.on ('device', function(){
		    				conn.write("{\"mdaf\" : \"authenticated\", \"authenticated\" : \"success\"}");
		    			}.bind(this));
		    			switch (this.authentication.type) {
		    				case 'challenge':
		    					conn.write("{\"mdaf\" : \"challenge\", \"challenge\" : \"" + this.authentication.challenge + "\"}");
		    					break;
		    				default:
		    					mdaf.emit('authenticated', lts);
		    			};
		    		};
		    	};
		  	if (message.mdaf === 'logout'){
		  		//var lts = this.getLTSByConnection(conn.id);
		  		mdaf.emit('logout')
		   		fs.truncateSync('storage/sessions.json', 0)
		    };
    	}.bind(this));
    }.bind(this));
    this.socket.installHandlers(this.server, {prefix: '/socket'});
};


/** Starts the sessionManager
  * lts - longTermSession object for which the authentication procedure is specified;
  * users - data of the users, which could be authenticated;
  * challenge - previously generated challenge for the authentication.
 */

SessionManager.prototype.setChallengeAuthentication = function(){
	var _this = this;
	this.socket.on('connection', function(conn){
		conn.on('data', function(string){
			var message = JSON.parse(string);			    					
		    if (message.mdaf == 'authenticate'){
		        var auth = message.auth;21,00
		        var users = _this.authentication.users;
		        users.forEach(function(user){
		            if (user.username === auth.username){
		                var pass = '' + cryptojs.SHA256(user.password);
		                var hmac = cryptojs.algo.HMAC.create(cryptojs.algo.SHA256, pass);
						hmac.update(_this.authentication.challenge);
		                var hash = cryptojs.enc.Hex.stringify(hmac.finalize());
		                if (hash === auth.hmac){
		                    var lts = _this.getLTSByConnection(conn.id);
		                  	mdaf.emit('authenticated', lts, user.username);
		                };
		            };
		        });
		    };
		});
	});
}
//no message loses handling is set yet!!!
SessionManager.prototype.setClientFirstSynchronization = function(lts, conn){
	conn.on('data', function(string){
		var message = JSON.parse(string);
		if (message.mdaf === "synchronize"){
			console.log('Client first synchronization is launched')
			if (lts.pendingUpdates.length > 0){
				for (var i = lts.pendingUpdates.length - 1; i > -1; i--){
					conn.write(lts.pendingUpdates[i]);
					lts.pendingUpdates.slice(i, 1);
				}
			}
			this.onSynchronized(lts, conn);
		};
	}.bind(this))
	conn.write ("{\"mdaf\" : \"synchronization\", \"synchronization\" : \"clientFirst\"}");
};

SessionManager.prototype.onSynchronized = function(lts, conn){
	conn.write("{\"mdaf\" : \"sessionRestored\", \"sessionRestored\" : \"success\"}");
	mdaf.emit('sessionRestored', lts);
	lts.initialize(conn);
}

/** Creates longTermSession
 * ltsID - the id of the longTermSession
 * conn - SockJS connection object
 * tempor - boolean - true if the session is created for the enterprise-owned device
 * return - lts - longTermSession object
 */

SessionManager.prototype.createLongTermSession = function(ltsID, conn, type){
	var lease = null;
	if (type) lease = mdaf.deviceManager.enterprise[type];
	var lts = new (require('./longTermSession'))(ltsID);
	lts.initialize(conn);
    this.addLongTermSession(lts);
    if (lease) {
    	setTimeout(function(){
    		this.stopLongTermSession(lts)
    	}.bind(this), lease);
    }
    return lts;
};

/** Create the continuous over multiple devices session (continuous MDS)
 * devices - array of the devices to be grouped or the deviceGroup object
 */

SessionManager.prototype.createMultiDeviceSession = function(devices){
	var mdSess = new (require('./multiDeviceSession'));
	var ltsList = [];
	if (!Array.isArray(devices)){
		devices.on('new', function(device){
			mdSess.addDevice(device);
		}.bind(this));
		devices = devices.devices;
	}
	devices.forEach(function(device){
		var session = this.getLongTermSession(device.id);
		ltsList.push(session);
	}, this)
	var id = mdSess.initialize(ltsList, devices);
	this.multiDeviceSessionList.push(mdSess)
	return id;
}

/** Adds lts object to the list and writes the list to the file
 * lts - longTermSession object to be added
 */

SessionManager.prototype.addLongTermSession = function(lts){
	this.longTermSessionList.push(lts);
	var json = {
		'longTermSessionList' : this.longTermSessionList
	};
	fs.writeFileSync('storage/sessions.json', CircularJSON.stringify(json))
};

/** Returns the longTermSessionList array, stored in the file
 * return - array of lts or an empty one
 */

SessionManager.prototype.getFromStorage = function(){
	var file = fs.readFileSync('storage/sessions.json', 'utf8');
	if (file){
		var list = CircularJSON.parse(file)
		console.log(list);
		return list['longTermSessionList'];
	};
	return [];
}

/** Returns the longTermSession object, that contains the specified connection object
 * conn - id of the SockJS connection object
 */
SessionManager.prototype.getLTSByConnection = function (connId){
	for (var i = 0; i < this.longTermSessionList.length; i++){
		var lts = this.longTermSessionList[i]
		if (lts.currentBasicSession && lts.currentBasicSession.id === connId){
			return(this.longTermSessionList[i]);
		}
	}
	console.log('No session found');
};

/** 
 	Returns the longTermSession object by its id
 */

SessionManager.prototype.getLongTermSession = function(id){
	for (var i = 0; i < this.longTermSessionList.length; i++){
		if (this.longTermSessionList[i].id === id){
			return(this.longTermSessionList[i]);
		}
	}
	console.log('No session found');
};

SessionManager.prototype.removeLongTermSession = function (id){
	for (var i = 0; i < this.longTermSessionList.length; i++){
			if (this.longTermSessionList[i].id === id){
				this.longTermSessionList.splice(i, 1);
				return;
		}
	} 
}

/** 
 	Stops and removes the longTermSession object
 * lts - object to be removed or its id 
 */

SessionManager.prototype.stopLongTermSession = function(lts){
	if (typeof lts === 'object'){
		lts.emit('stop')
		lts.endBasicSession();
		this.removeLongTermSession(lts.id)
	} else if (typeof lts === 'string'){
		var longTermSess = this.getLongTermSession(lts);
		longTermSess.emit('stop');
		longTermSess.endBasicSession();
		this.removeLongTermSession(lts)
	} else {
		console.error('Incorrect argument!')
	}
};

SessionManager.prototype.removeMultiDeviceSession = function(id){
	
	for (var i = 0; i < this.multiDeviceSessionList.length; i++){
		if (this.multiDeviceSessionList[i].id === id){
			this.multiDeviceSessionList[i].stop();
			this.multiDeviceSessionList[i] = null;
			multiDeviceSessionList.splice(i, 1);
			return;
		}
	}
	console.log('No session found')
};

/** 
 	Returns the list of the created longTermSessions
 */

SessionManager.prototype.getLongTermSessionsList = function(){
	return this.longTermSessionList;
};

/** 
 	Returns the list of the created multiDeviceSessions
 */

SessionManager.prototype.getMultiDeviceSessionsList = function(){
	return this.multiDeviceSessionList;
};

module.exports = new SessionManager();