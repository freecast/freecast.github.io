// Anonymous namespace
(function(global) {

'use strict';

User.READY = true;
User.UNREADY = false;
User.TYPE = {
        	UNAVAILABLE: 'unavailable',
        	NOBODY: 'nobody',
        	HUMAN: 'human',
        	COMPUTER: 'computer',
        };

function User(type, isready, name, senderID) {
	this.type = type;
	this.isready = isready;
	if (type == User.TYPE.UNAVAILABLE) {
        name = "Closed";
		senderID = undefined;
	} else if (type == User.TYPE.COMPUTER)
        senderID = name = "AI";
    else if (type == User.TYPE.NOBODY) {
		name = "Please Join";
		senderID = undefined;
	}

	this.name = name;
	this.senderID = senderID;
	this.ishost = false;
	this.isDisconnected = false;
	this.isUnderDisconnection = false;
	this.players = {};
};

User.checkUserType = function (type) {
	if (type == User.TYPE.COMPUTER ||
			type == User.TYPE.UNAVAILABLE ||
			type == User.TYPE.HUMAN ||
			type == User.TYPE.NOBODY)
		return true;
	return false;
};

User.prototype.setready = function() {
	this.isready = true;
};

User.prototype.addPlayer = function(player) {
	this.players[player.color] = player;
};
User.prototype.removePlayer = function(player) {
	delete this.players[player.color];
};

global.User = User;
})(this);
