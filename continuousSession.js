var mdaf = require('./mdaf')

var ContinuousSession = function(){
	this.ltsList = [];
	this.deviceList = [];
}

ContinuousSession.prototype.initialize = function (sessions, devices){
	this.ltsList = sessions;
	this.deviceList = devices;
	this.ltsList.forEach(function(lts){
		lts.continuous = true;
		lts.emit('continuous');
		lts.on('sharedUpdate', function(data){
			console.log('shared update event is emitted')
			this.ltsList.forEach(function(anotherLts){
				if (lts.id !== anotherLts.id){
					this.sendSharedUpdate (anotherLts, JSON.stringify(data.message));
				};
			}, this)
		}.bind(this));
	}, this);
};

ContinuousSession.prototype.sendSharedUpdate = function (lts, message){
	if (lts.isConnected()){
		lts.send(message);
	} else {
		lts.pendingUpdates.push(message);
	};
};

ContinuousSession.prototype.removeDevice = function (device){
	var lts = mdaf.sessionManager.getLongTermSession(device.id);
	lts.continuous = false;
};

module.exports = ContinuousSession;

