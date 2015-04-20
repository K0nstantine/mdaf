var shortId = require('shortid');

var Device = function(sess, owner, name, type){

	this.id = sess.id;
	this.setSession(sess);
	this.name = name ? name : 'device-' + this.id;
//	this.status = 1;
	this.type = type ? type : null;
	this.owner = owner ? owner : null;
	this.user = this.owner;
//	this.lease = 0; 
};

Device.prototype.handleDeviceMessage = function(message){
	if (message.hasOwnProperty('name')){
		this.setName(message.name);
	} else if (message.hasOwnProperty('type')){
		this.setType(message.type);
	}
};

Device.prototype.setName = function(name){
	this.name = name;
};


Device.prototype.setType = function(type){
	this.type = type;
};

Device.prototype.update = function(){

}

Device.prototype.send = function (message){
	this.longTermSession.send(message)
};


/// for inner use

Device.prototype.stopLTS = function (){
	this.longTermSession = null;
};
Device.prototype.setSession = function (lts){
	this.longTermSession = lts;
	this.longTermSession.on('deviceMessage', this.handleDeviceMessage.bind(this))
	this.longTermSession.on('stop', this.stopLTS.bind(this))
}
module.exports = Device;