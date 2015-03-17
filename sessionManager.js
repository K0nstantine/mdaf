var sockjs = require('sockjs');
var shortId = require('shortid');
var cryptojs = require('crypto-js');
var fs = require('fs');
var CircularJSON = require('circular-json')
var mdaf = require('./mdaf');

var SessionManager = function(){
	this.authentication = null;
	this.longTermSessionList = this.getFromStorage();
	this.multiDeviceSessionList = [];
	this.socket = null;
	this.server = null;
};

/** Starts the sessionManager
 * server - the instance of the application web server;
 * options - options of the SockJS server. See this.createSocket function;
 * authentication - type of the authentication mechanism which has to be implemented;
 * users - data of the users, which could be authenticated.
 */

SessionManager.prototype.start = function(server, options, authentication, users){
	this.createSocket(options);
	this.server = server;
	if (authentication){
		this.setAuthenticationMechanism(authentication, users);
	};
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
		'challenge' : null,
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

/** Sets the authentication handlers to the SockJS connection object,
 creates the session object after successfull authentication.
 */

SessionManager.prototype.setConnectionHandlers = function (){
	this.socket.on("connection", function(conn){
		var ltsID = shortId.generate();
    	conn.write("{\"ltsID\" : \""+ ltsID + "\"}");
    	conn.on('data', function(string){
    		var message = JSON.parse(string);
			if (message.mdaf === 'ltsID') {   			
					if (message.ltsID !== ltsID) {
		    			var storedLts = this.getLongTermSession(message.ltsID);
		    			console.log(storedLts);
		    			if (storedLts){
		    				var lts = new (require('./longTermSession'))(storedLts.id, conn);
		    				conn.write("{\"authenticated\" : \"success\"}");
		    				mdaf.emit('authenticated', lts);		    				
		    				return;
		    			}
		    			conn.write("{\"authenticated\" : \"failure\"}");
		    		} else {
		    			var lts = this.createLongTermSession(ltsID, conn);
		    			switch (this.authentication.type) {
		    				case 'challenge':
		    					conn.write("{\"challenge\" : \"" + this.authentication.challenge + "\"}");
		    					break;
		    				default:
		    					conn.write("{\"authenticated\" : \"success\"}");
		    					mdaf.emit('authenticated', lts);
		    			};
		    		};
		    	};
		  	if (message.mdaf === 'logout'){
		  		var lts = this.getLTSByConnection(conn.id);
		  		mdaf.emit('logout', lts)
		   		fs.truncateSync('storage/sessions.json', 0)
		    };
    	}.bind(this));
    }.bind(this));
    this.socket.installHandlers(this.server, {prefix: '/socket'});
}


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
		        var auth = message.auth;
		        var users = _this.authentication.users;
		        users.forEach(function(user){
		            if (user.username === auth.username){
		                var pass = '' + cryptojs.SHA256(user.password);
		                var hmac = cryptojs.algo.HMAC.create(cryptojs.algo.SHA256, pass);
						hmac.update(_this.authentication.challenge);
		                var hash = cryptojs.enc.Hex.stringify(hmac.finalize());
		                if (hash === auth.hmac){
		                    conn.write("{\"authenticated\" : \"success\"}");
		                    var lts = _this.getLTSByConnection(conn.id);
		                  	mdaf.emit('authenticated', lts, user.username);
		                };
		            };
		        });
		    };
		});
	});
};

/** Creates longTermSession
 * ltsID - the id of the longTermSession
 * conn - SockJS connection object
 * return - lts - longTermSession object
 */

SessionManager.prototype.createLongTermSession = function(ltsID, conn){
	var lts = new (require('./longTermSession'))(ltsID, conn);
    this.addLongTermSession(lts);
    return lts;
};

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
SessionManager.prototype.getLTSByConnection = function (conn){
	for (var i = 0; i < this.longTermSessionList.length; i++){
		if (this.longTermSessionList[i].currentBasicSession.id === conn){
			return(this.longTermSessionList[i]);
		}
	}
	console.log('No session found');
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

/** 
 	Removes the longTermSession object
 * lts - object to be removed or its id 
 */

SessionManager.prototype.removeLongTermSession = function(lts){
	if (typeof lts === 'object'){
		for (var i = 0; i < this.longTermSessionList.length; i++){
			if (this.longTermSessionList[i].id === lts.id){
				this.longTermSessionList.splice(i, 1);
				lts = null;
				return;
			}
		} 
	} else if (typeof lts === 'string'){
		for (var i = 0; i < this.longTermSessionList.length; i++){
			if (this.longTermSessionList[i].id === lts){
				this.longTermSessionList.splice(i, 1);
				return;
			}
		} 
	} else {
		console.error('Incorrect argument!')
	}
}


module.exports = SessionManager