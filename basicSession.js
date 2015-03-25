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
        var message = JSON.parse(string);
        if (!message.mdaf){
            lts.emit('message', message);
        };
    }.bind(this));

    this.connection.on('close', this.stop.bind(this));

    this.lts.on('continuous', function() {
        console.log('it is continuous!')
        this.connection.on('data', function(string){
            var message = JSON.parse(string);
            if (message.mdaf === 'sharedUpdate'){
                this.lts.emit ('sharedUpdate', message);
            }            
        }.bind(this));
    }.bind(this));

    if (this.lts.continuous){
        this.lts.emit('continuous');
    };
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

BasicSession.prototype.stop = function(){
    if (this.connection){
        this.connection.end();
    };
    this.lts.endBasicSession();
};

module.exports = BasicSession;