var sockjs = require('sockjs');
var util = require ('util');
var EventEmitter =  require('events').EventEmitter;

/**     EMITTED EVENTS:
 message - message received from the client. Returns with a single parameter - JSON message.

 */

var LongTermSession = function (id, conn){
	this.id = id;
	this.server = {};
	this.continuous = false;
	this.currentBasicSession = null;

	this.pendingUpdates = [];
	
	this.startBasicSession(conn)
};

util.inherits(LongTermSession, EventEmitter);

LongTermSession.prototype.startBasicSession = function(conn){
	this.currentBasicSession = new (require('./basicSession'));
	this.currentBasicSession.initialize(conn, this);
}

/** 
 	Sends message to the client
 */

LongTermSession.prototype.send = function(message){
	if (this.currentBasicSession){
		this.currentBasicSession.send(message);
	} else {
		console.error ('No basic session is created. The message can\'t be sent');
		setTimeout(function(){
			if (this.currentBasicSession){
				this.currentBasicSession.send(message);
			} else {
				console.error ('No basic session is created. The message can\'t be sent');
				setTimeout(function(){
					if (this.currentBasicSession){
						this.currentBasicSession.send(message);
					} else {
						//if (this.continuous && message.mdaf.)
						console.error ('The device is probably offline. Try again later.');
					}
				}.bind(this), 2000)
			}
		}.bind(this), 2000)
	};
};

LongTermSession.prototype.endBasicSession = function(){
	this.currentBasicSession = null;
};

LongTermSession.prototype.isConnected = function(){
	if (this.currentBasicSession) {
		return true;
	} else {
		return false;
	};
};



module.exports = LongTermSession;