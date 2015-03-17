var sockjs = require('sockjs');
var util = require ('util');
var EventEmitter =  require('events').EventEmitter;

/**     EMITTED EVENTS:
 message - message received from the client. Returns with a single parameter - JSON message.

 */

var LongTermSession = function (id, conn){
	this.id = id;
	this.server = {};
	this.currentBasicSession = new (require ('./basicSession'));
	this.currentBasicSession.initialize(conn, this);
};

util.inherits(LongTermSession, EventEmitter);

LongTermSession.prototype.startBasicSession = function(conn){
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
						console.error ('The device is probably offline. Try again later.');
					}
				}.bind(this), 2000)
			}
		}.bind(this), 2000)
	};
};

module.exports = LongTermSession;