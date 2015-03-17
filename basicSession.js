var sockjs = require('sockjs');
var shortId = require('shortid');
var mdaf = require ('./mdaf')

var BasicSession = function () {
	this.connection = null;
	this.lts = null;
	this.id = null;
};

/** 
 	Assigns values to the Basic session parameters and sets handler
 * connection - SockJS connection object;
 * lts - longTermSession object.
 */

BasicSession.prototype.initialize = function(connection, lts){
	this.connection = connection;
    this.id = connection.id;
    this.lts = lts;
    this.connection.on('data', function(string){
        console.log('Works!')
        var message = JSON.parse(string);
        if (!message.mdaf){
            lts.emit('message', message);
        };
    }.bind(this));
};

/** 
 	Sends a message to the client
 */

BasicSession.prototype.send = function(message) {
    if (!!this.connection.write) {
        this.connection.write(message);
    } else {
        console.error ('No connection established. The message can\'t be sent.');
        return;
    };
};

/** 
 	Function to stop current session
 */

BasicSession.prototype.close = function(){
	this.connection.end();
};

module.exports = BasicSession;