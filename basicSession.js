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
        } else if (message.mdaf === 'device'){
            lts.emit('deviceMessage', message)
        };
    }.bind(this));

    //this.connection.on('close', this.stop.bind(this));

    this.lts.on('continuous', function() {
        console.log('it is continuous!')
        console.log(this.id);
        this.connection.on('data', function(string){
            var message = JSON.parse(string);
            if (message.mdaf === 'sharedUpdate'){
                this.lts.emit('message', message.message);
                this.lts.emit ('sharedUpdate', message);
            }
            if (message.mdaf === 'command'){
                this.lts.emit ('command', message);
            } 

        }.bind(this));
    }.bind(this));

    if (this.lts.continuous){
        console.log('no, it\'s here');
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

module.exports = BasicSession;