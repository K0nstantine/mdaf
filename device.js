var shortId = require('shortid');

var Device = function(id, owner, type){
	this.id = id;
	this.name = 'device-' + this.id;
	this.status = 1;
	this.type = type ? type : null;
	this.owner = owner ? owner : null;
	this.user = this.owner;
	this.lease = 0; 
};

Device.prototype.setName = function(name){
	this.name = name;
};
module.exports = Device;