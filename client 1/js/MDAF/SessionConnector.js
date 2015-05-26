function SessionConnector(){
	this.server = null;
	this.sock = null;
	this.session = {
		'id' : null,
		'authState': 0
	};

  this.device = {
    'id' : null,
    'name' : null,
    'type' : null
  };

  this.pendingSharedMessages = [];

	this.user = '';
	this.password = '';
	this.authState = {'NOT_AUTHENTICATED' : 0, 'AUTHENTICATED' : 1, 'ERROR' : 2};

  this.context = [];

	this.onConnected = null;
	this.onDisconnected = null;
	this.onNoConnection = null;
  this.onSessionRestored = null;
	this.onLoggedIn = null;
	this.onLoggedOut = null;
	this.onLoginError = null;
	this.externalMessageHandler = null;

	this.storageManager = new StorageManager();
};

SessionConnector.prototype.initialize = function(server, options, name, password) {
  this.server = server;
  if (name && password){
    this.user = name;
    this.password = password;
  } else {
    this.session.authState = this.authState.AUTHENTICATED;
  }
  if (options) {
    this.onConnected = options.onConnected;
    this.onDisconnected = options.onDisconnected;
    this.onNoConnection = options.onNoConnection;
    this.onSessionRestored = options.onSessionRestored;
    this.onLoggedIn = options.onLoggedIn;
    this.onLoggedOut = options.onLoggedOut;
    this.onLoginError = options.onLoginError;
    this.externalMessageHandler = options.externalMessageHandler;
  }
  this.connect();
};

SessionConnector.prototype.setUserCredentials = function(name, pass){
  this.user = name;
  this.password = pass;
};

SessionConnector.prototype.setOnConnectedHandler = function(handler){
  this.onConnected = handler;
};

SessionConnector.prototype.setOnDisconnectedHandler = function(handler){
  this.onDisconnected = handler;
};

SessionConnector.prototype.setOnNoConnectionHandler = function(handler){
  this.onNoConnection = handler;
};

SessionConnector.prototype.setOnSessionRestored = function(handler){
  this.onSessionRestored = handler;
};

SessionConnector.prototype.setOnLoggedInHandler = function(handler){
  this.onLoggedIn = handler;
};

SessionConnector.prototype.setOnLoggedOutHandler = function(handler){
  this.onLoggedOut = handler;
};

SessionConnector.prototype.setOnLoginErrorHandler = function(handler){
  this.onLoginError = handler;
};

SessionConnector.prototype.setExternalMessageHandler = function(handler){
  this.externalMessageHandler = handler;
};

  // send arbitrary object o to server if a connection exists
SessionConnector.prototype.send = function(o, onError) {
  if (this.sock){
    console.log("[SEND] " + JSON.stringify(o));
    this.sock.send(JSON.stringify(o));
  } else if (typeof onError === 'function') {
      onError(o);
  }
};

SessionConnector.prototype.isAuthenticated = function() {
  return (this.session.authState === this.authState.AUTHENTICATED);
};

SessionConnector.prototype.isConnected = function() {
  return this.sock ? true : false;
};

SessionConnector.prototype.breakSession = function() {
  this.send({
    'mdaf' : 'logout'
  })
  this.session.authState = this.authState.NOT_AUTHENTICATED;
  try { this.sock.close(); } 
  catch(error) { console.warn('connection already closed'); }
  this.sock = null;
  this.user = '';
  this.password = '';
  if (typeof this.onLoggedOut === 'function') {
    this.onLoggedOut();
  } else {
    console.error('unable to call "ConnectionManager.onLoggedOut"');
  }
};

/// MDS!!!

// timeout property should be tested!!!
SessionConnector.prototype.updateShared = function(message, timeout){
  var envelopedMessage = {};
  if (!message.hasOwnProperty('mdaf')){
    var time = (Date.now) ? Date.now() : new Date.getTime(); 
    envelopedMessage = {
      'mdaf' : 'sharedUpdate',
      'timestamp' : time,
      'message' : message
    };
  } else {
    envelopedMessage = message;
  }
  if (timeout){
    envelopedMessage.timeout = timeout;
  }
  this.send(envelopedMessage, function(mes){
    this.pendingSharedMessages.push(mes);
    if (mes.timeout){
        var _this = this;
        setTimeout(function(){
          var index = _this.pendingSharedMessages.indexOf(mes);
          if (index > -1){
            _this.pendingSharedMessages.slice(index, 1)
          }
        }, mes.timeout);
      }
  });
}

SessionConnector.prototype.sendCommand = function(message, target){
  var envelopedMessage = {
    'mdaf' : 'command',
    'message' : message
  }
  if (target) envelopedMessage.sendTo = target;
  this.send(envelopedMessage);
}

/* Adds data to the context of the session and 
 sends update to the server
 * key - key of the data to be added.
 * value - value of the data to be added
 */

SessionConnector.prototype.addToContext = function(key, value){
  this.context.push({key: value});
  // sync with the server !!!!
}

/* Removes data from the context of the session and 
 sends update to the server
 * key - key of the data to be removed.
 */

SessionConnector.prototype.removeFromContext = function(key){
  for (var i = 0; i < this.context.length; i++){
    if (this.context[i][key] !== undefined){
        this.context.slice(i, 1);
        // sync with the server !!!!
        return;
      }
  }
};

/* Returns the context of the session
 */

SessionConnector.prototype.getContext = function(){
  return this.context;
}

/* Clears the context of the session and sends update to the server.
 */

SessionConnector.prototype.clearContext = function(){
  this.context = [];
  // sync with the server
}

//// !!!!!!!! DeviceManagement

SessionConnector.prototype.getDeviceInfo = function (){
  return this.device;
}

SessionConnector.prototype.getUser = function(){
  return this.user;
}

SessionConnector.prototype.setDeviceType = function(type){
  this.device.type = type;
  this.send({
    'mdaf' : 'device',
    'type' : type
  })
}

SessionConnector.prototype.setDeviceName = function(name){
  this.device.name = name;
  this.send({
    'mdaf' : 'device',
    'name' : name
  })
}

/* Sets the current device as an enterprise owned.
 * @param type - one of the types of enterprise-owned devices, defined on the server-side.
 */

SessionConnector.prototype.setEnterpriseDevice = function(type){
  this.storageManager.cache('enterprise', type)
  this.storageManager.removeField('ltsID');
}

/*
      FOR INNER USE ONLY!!!!!!!!!!!
 */

// Creating a socket and setting basic handlers for it.
SessionConnector.prototype.connect = function() {
  var _this = this;
  this.sock = new SockJS(this.server + '/socket', null, { heartbeatTimeout: 6100 });

  this.sock.onopen = function() {
    console.log('connection to ' + _this.server + '/socket opened', _this.sock);

    // call callback if there is any
    if (typeof _this.onConnected === 'function') {
      _this.onConnected();  
    }

  };

  this.sock.onmessage = function(msg) {
    var aMessageObject = null;
    try {
      aMessageObject = JSON.parse(msg.data);
    } catch (err) {
      console.error('Error parsing incoming JSON message ' + msg.data, err);
    }
    if (aMessageObject) {
      //console.log ('Processing Message', JSON.stringify(o));
      _this.handleMessage(aMessageObject);
    } else {
      console.log('no message handler or null message ', JSON.stringify(aMessageObject));
      //statusFeedback('Can't handle message','No message handler or null message for: '+JSON.stringify(o));
    }
  };

  this.sock.onclose = function() {
    if (_this.sock) _this.sock = null;
    console.log('connection to ' + _this.server + 'closed');
    if (typeof _this.onDisconnected === 'function') {
      _this.onDisconnected(); 
    }
    if (_this.session.authState === _this.authState.AUTHENTICATED) {
      // logged in, but lost connection
      // try to reconnect after 1000ms
      setTimeout(function() {_this.connect();}, 1000);
    } else if (_this.session.authState === _this.authState.ERROR) {
      console.log('wrong username or password');
      if (typeof _this.onLoginError === 'function') {
        _this.onLoginError();
        _this.session.authState = _this.authState.NOT_AUTHENTICATED;
      } else {
        console.error('unable to call "onLoginError" handler');
      }
    } else if (_this.session.authState === _this.authState.AUTHENTICATED && _this.session.id){
      if (typeof _this.onNoConnection === 'function') {
        _this.onNoConnection(); 
        _this.session.authState = _this.authState.NOT_AUTHENTICATED;
      } else {
        console.error('unable to call "onNoConnection" handler');
      }
    }
  };

};

/**
 * handle messages that are relevant to the connection and authentication
 * and pass everything else on to the message parser
 */
SessionConnector.prototype.handleMessage = function(message) {
  var _this = this;
  if (message.hasOwnProperty('mdaf')){
    if (message.mdaf === 'ltsID'){

      _this.storageManager.get('ltsID').then(function onResolve(ltsID){
        _this.send({
          "mdaf" : 'ltsID',
          "ltsID" : ltsID})
        _this.session.id = ltsID;
      }, function onReject(){
        _this.storageManager.cache('ltsID', message.ltsID)
        var toSend = {
              "mdaf" : 'ltsID',
              "ltsID" : message.ltsID};
        _this.session.id = message.ltsID;
 
        _this.storageManager.get('enterprise').then(function onResolve(type){
          toSend.enterprise = type;
          _this.send(toSend);
        }, function onReject(){
          _this.send(toSend);
        })
      })

      //challenge authentication
    } else if (message.mdaf === 'challenge') {
      this.challengeAuthenticate(message.challenge);
      //that's all what client needs for challenge authentication

    } else if (message.mdaf === 'device'){
      this.device.id = message.id;
      this.device.owner = message.owner;
      this.device.name = message.name;
    } else if (message.mdaf === 'authenticated'){
      if (message.authenticated === 'success'){
        this.session.authState = this.authState.AUTHENTICATED;
        console.log('Authentication successfull');
        this.send
        // fire event handler for successfull login
        if (this.onLoggedIn)
          this.onLoggedIn();
      } else {
        this.session.authState = this.authState.NOT_AUTHENTICATED;
        this.sock.close();
      }
    } else if (message.mdaf === 'sessionRestored') {
      if (message.sessionRestored === 'success'){
        if (typeof this.onSessionRestored === 'function')
          this.onSessionRestored();
      } else {
        this.session.authState = this.authState.ERROR;
        this.sock.close();
      }
    } else if (message.mdaf === 'synchronization'){
      if (message.synchronization === 'clientFirst') {
        this.clientFirstSynchronization()
      }
    }
  } else {
  //hand things over to the general message parser
    this.externalMessageHandler(message);
  }
};

SessionConnector.prototype.challengeAuthenticate = function(challenge) {
  // we use the pwdHash as secret key, as this is slightly more secure than using the (known) challenge
  // initialize with our secret
  var pass = '' + CryptoJS.SHA256(this.password);
  var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, pass);
  // superimpose the message
  hmac.update(challenge);
      this.send({
        'mdaf':'authenticate',
      'auth':{
        'username':this.user,
        'hmac': CryptoJS.enc.Hex.stringify(hmac.finalize()),
      //  'device': this.device.description
      }
  });
};

//message loss handling is nasty and dumm, but partially implemented:
// if the message can't be sent - it is put into the queu again
// function is recursively called, as long as all the pending messages
// are not sent.
SessionConnector.prototype.clientFirstSynchronization = function (){
  if (this.pendingSharedMessages.length > 0) {
    for (var i = this.pendingSharedMessages.length-1; i > -1; i--){
      this.updateShared(this.pendingSharedMessages[i]);
      this.pendingSharedMessages.slice(i, 1);
    };
    if (this.sock){
      this.clientFirstSynchronization()
    }
  } else {
    this.send ({
      'mdaf' : 'synchronize'
    });
  };
};