var AI_LEVEL = {
	difficult: 'difficult',
	medium:    'medium',
	easy:      'easy',
};

var GAME_STATUS = {
	WAIT_FOR_CONNECTION: 'wait_for_connection',
	WAIT_FOR_READY:      'wait_for_ready',
	WAIT_FOR_DICE:       'wait_for_rolling_dice',
	WAIT_FOR_PAWN:       'wait_for_moving_pawn',
	RESET:               'reset',
	GAME_OVER:           'game_over',
};

	/* CSS are hard coded following these colors*/
var RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    BLUE = 'blue';

var ACTION = {
	NONE       : "none",

	OUTOFBASE  : "outOfBase",
	NORMAL     : "move",

	JUMP       : "jump",
	FLIGHT     : "flight",
	ARRIVE     : "arrive",

	KILL       : "kill",
	FALL       : "fall",
	RESET      : "reset",
	TURNRIGHT  : "turnright",
};

function Game() {
	this.board = null;
	this.current = -1;
	this.players = [];
	this.playersColorIndex = {};
	this.playerList = null;
	this.numOfPlayer = 0;

	this.USER_OP_TIMEOUT = 20;
	this.countDown = this.USER_OP_TIMEOUT;
	this.countDownPlayer = null;

	this.proto = new LudoProtocol();

	this.level = AI_LEVEL.medium;

	this.numDone = 0;
	this.num_user = 0;
	this.users = {};

	this.user_computer =
		new User(User.TYPE.COMPUTER, User.READY);
	this.user_unavailable =
		new User(User.TYPE.UNAVAILABLE, User.UNREADY);
	this.user_nobody =
		new User(User.TYPE.NOBODY, User.UNREADY);

	this.user_host = null;

	ua = navigator.userAgent.toLowerCase();
	console.log(ua);
	if (ua.indexOf('windows') >= 0) {
		this.isChromeCast = false;
	} else {
		this.isChromeCast = true;
	}

	// UI element
	this.uiWelcome = $('#welcome');
	this.uiContent = $('#content');

	// for test only
	this.user_test = null;
	this.pickupIndex = 0;
}

Game.prototype = {
	showUI_waitForConnection: function () {
		this.uiWelcome.show();
		this.uiContent.hide();
	},

	showUI_waitForStartOfGame: function() {
		this.uiWelcome.hide();
		this.uiContent.show();
	},

	waitForStartOfGame: function() {
		if (this.stat === GAME_STATUS.WAIT_FOR_READY)
			return;
		this.stat = GAME_STATUS.WAIT_FOR_READY;
		this.showUI_waitForStartOfGame();
	},

	getCurrentPlayer : function () {
		return this.players[this.current];
	},
	getPlayerFromIndex : function (index) {
		return this.players[index] || null;
	},
	getPlayerFromColor : function (color) {
		return this.playersColorIndex[color] || null;
	},

	pickupAvailColor: function() {
		var i = 0, p, u;
		while (p = this.players[i]) {
			u = p.getUser();
			if (u.type === User.TYPE.NOBODY) {
				return p.color;
			}
			i++;
		}
		return undefined;
	},

    playAward : function () {
        this.board.dice.focus();
        this.countDown += 5;

		var player = this.getCurrentPlayer();
		var user = player.getUser();

		if (user.type === User.TYPE.HUMAN &&
				player.getTimeOutStat() === false)
			player.startCountDown(autoActionForRollDice);

        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

	isGameOver: function() {
		var i = 0, p, u;
		while (p = this.players[i]) {
			u = p.getUser();
			if (u) {
				if ((u.type === User.TYPE.HUMAN ||
						u.type === User.TYPE.COMPUTER) &&
						p.isFinished === false)
					return false;
			}
			i++;
		}
		return true;
	},
	gameOver: function() {
        this.getCurrentPlayer().blur();
        this.board.hideArrow();
        this.board.dice.hide();
        this.board.hideCountDown();
        this.current = -1;
        console.log('all players are done, need to restart the game');

        this.stat = GAME_STATUS.GAME_OVER;
        this.board.showGameOver();
        this.proto.broadcastEndOfGame();
	},
	playerFinish: function(color) {
		this.numDone++;
		this.board.showRank(color, this.numDone);
	},
    nextPlayer : function () {
        var next = this.current,
            i = 0;

        while (this.players[i]) {
            this.players[i].blur();
            i++;
        }

		var c, user;
		for (c in this.users) {
			user = this.users[c];
			if (user.isDisconnected)
				this.doDisconnect(user);
		}

		if (this.stat === GAME_STATUS.RESET)
			return;

        i = 0;
        while (i < 4) {
            if (next == 3) {
                next = 0;
            } else {
                next++;
            }
			user = this.players[next].getUser();
			if (user.type === User.TYPE.UNAVAILABLE ||
					user.type === User.TYPE.NOBODY) {
				console.log("skip player-" + this.players[next].color +
						' user_type:' + user.type);
				i++;
				continue;
			}
            if (this.players[next].numArrived == 4) {
				console.log("skip finished player-" + this.players[next].color);
                i++;
                continue;
            }
            break;
        }
        if (this.numDone === this.numOfPlayer-1) {
            this.gameOver();
            return;
        }
		// due to disconnection, there's possibly no player available to move
		if (i === 4) {
			console.log("no available player for nextPlayer()");
			return;
		}

		var player = this.getCurrentPlayer();
		if (player) {
			// TODO need to refine human-player or
			// disconnected human-player
			player.setTimeOutStat(false);
			this.board.hideCountDown();
		}

		var next_player = this.getPlayerFromIndex(next);
		if (next_player.getUser().type === User.TYPE.HUMAN) {
			game.countDownPlayer = next_player;
			next_player.setTimeOutStat(false);
		} else {
			game.countDownPlayer = null;
		}

        if (player)
            console.log("player switch from " +
				this.getCurrentPlayer().color + " " +
				"to " + next_player.color);
        else
            console.log("player " + next_player.color + " starts");
        this.current = next;

		this.board.showArrow(this.getCurrentPlayer().color);
        //game.players[game.current].focus();
		this.board.dice.hide();
        this.board.dice.focus();
        this.board.dice.setPlayer(this.getCurrentPlayer());
		this.board.dice.show();

		this.countDown = this.USER_OP_TIMEOUT;
		console.log("init countDown=" + this.countDown);

		if (next_player.getUser().type === User.TYPE.HUMAN) {
			next_player.startCountDown(autoActionForRollDice);

			this.proto.notify_itsyourturn(next_player.getUser().senderID, next_player.color);
		}

        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

	addPlayer: function (name, color, user) {
    	var player = new Player(name, color, this.board);

		var i = this.board.colorToPlayerIndex(color);
        this.players[i] = player;
		this.playersColorIndex[color] = player;

        player.setUser(user);
    },

    addUser: function (user) {
		if (this.users[user.senderID]) {
			console.error("error: user " + user.senderID + " already added");
			return {val: false, detail: "already added"};
		}
		if (this.num_user == 4) {
			console.error("error: already 4 users");
			return {val: false, detail: "exceed maximum connections"};
		}
		this.users[user.senderID] = user;
		this.num_user++;
		if (this.num_user == 1) {
			user.ishost = true;
			this.user_host = user;
			console.log("user " + user.name + " is chosen to be the host");
		}
		return {val: true, detail: ""};
	},

	getUserFromSenderID : function (senderID) {
		return this.users[senderID] || null;
	},

	doDisconnect: function(user) {
		var c, p;
		var notify={}, player_status={};

		if (user.isUnderDisconnection === true)
			return;
		user.isUnderDisconnection = true;

		for (c in user.players) {
			p = user.players[c];
			p.setUser(this.user_nobody);
			//p.reset();

			notify.command = LudoProtocol.COMMAND.pickup + '_notify';
			player_status.color     = p.color;
			player_status.user_type = p.getUser().type;
			player_status.isready   = p.getUser().isready;
			player_status.username  = p.getUser().name;
			notify.player_status = player_status;

			this.proto.broadcast(notify);
		}

		delete this.users[user.senderID];
		this.num_user--;

		if (this.user_host === user) {
			var new_host = null;
			for (var id in this.users) {
				new_host = this.users[id];
				new_host.ishost = true;
				console.log("pickup a new host: " + new_host.name);
				this.proto.setAsHost(new_host.senderID);
				break;
			}
			this.user_host = new_host;
		}

		if (this.num_user === 0) {
			this.reset();
			game.playersColorIndex[RED].setUser(game.user_nobody);
			game.playersColorIndex[GREEN].setUser(game.user_nobody);
			game.playersColorIndex[YELLOW].setUser(game.user_nobody);
			game.playersColorIndex[BLUE].setUser(game.user_nobody);
			return;
		}
	},

	onDisconnect: function(senderId) {
		var user = this.users[senderId];
		if (user === undefined) {
			console.log('user senderId:' + senderId + ' is not connected');
			return;
		}
		console.log('senderId:' + senderId + 'name:' + user.name + ' disconnected');
		user.isDisconnected = true;

		if (this.stat !== GAME_STATUS.WAIT_FOR_PAWN &&
				this.stat !== GAME_STATUS.WAIT_FOR_DICE)
			this.doDisconnect(user);
		// TODO update player name in the list
	},

	isReady: function() {
		var i = 0, p, u;
		while (p = game.players[i]) {
			u = p.getUser();
			if (u.type == User.TYPE.NOBODY) {
				console.log('player ' + p.color +
						' is not allocated a user do NOT start game');
				return false;
			}
			if (u.type == User.TYPE.HUMAN && u.isready == false) {
				console.log('player ' + p.color + ' user ' + u.name +
						' is not ready, do NOT start game');
				return false;
			}
			i++;
		}
		return true;
	},

	start: function() {
		// pickup a player
		this.nextPlayer();

		if (this.stat !== GAME_STATUS.WAIT_FOR_DICE)
			return;

		var player = this.getCurrentPlayer();
		var user = player.getUser();

		if (user.type === User.TYPE.COMPUTER)
			this.board.dice.roll(rollDoneHandler,
					rollDoneHandler_outofbusy);
	},

	doReset: function() {
		// game over information
		this.board.hideGameOver();

		// rank
		this.board.hideRank(RED);
		this.board.hideRank(YELLOW);
		this.board.hideRank(BLUE);
		this.board.hideRank(GREEN);

		// arrow
		this.board.resetArrow();

		// dice
		this.board.dice.busy = false;
		this.board.dice.hide();

		// count down
		if (this.countDownPlayer) {
			this.countDownPlayer.stopCountDown();
			this.board.hideCountDown();
		}

		// player and pawns
		var i = 0;
		while (p = this.players[i]) {
			p.reset();
			i++;
		}
		this.current = -1;
		this.numDone = 0;

		// user
		for (var e in this.users) {
			var u = this.users[e];
			if (u.type === User.TYPE.HUMAN)
				u.isready = false;
		}
	},

	reset: function() {
		if (this.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				this.stat !== GAME_STATUS.WAIT_FOR_PAWN &&
				this.stat !== GAME_STATUS.GAME_OVER)
			return;
		this.stat = GAME_STATUS.RESET;

		var p = this.getCurrentPlayer();
		if (p) {
			if (p.isMoving)
				return;
		}

		this.doReset();
		this.stat = GAME_STATUS.WAIT_FOR_READY;
	},
}; // end of game.prototype


(function (global) {
	function initChromecast() {
		if (game.isChromeCast === false) {
			console.log('skip chromecast initialization');
			return;
		}

        console.log('init chrome cast handler');
        cast.receiver.logger.setLevelValue(0);
        game.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        console.log('Starting Receiver Manager');

        // handler for the 'ready' event
        game.castReceiverManager.onReady = function(event) {
          console.log('Received Ready event: ' + JSON.stringify(event.data));
          game.castReceiverManager.setApplicationState("Application status is ready...");
        };

        // handler for 'senderconnected' event
        game.castReceiverManager.onSenderConnected = function(event) {
          console.log('Received Sender Connected event: ' + event.data);
          console.log(game.castReceiverManager.getSender(event.data).userAgent);
        };

        // handler for 'senderdisconnected' event
        game.castReceiverManager.onSenderDisconnected = function(event) {
          console.log('Received Sender Disconnected event: ' + event.data +
				  ' from ' + event.senderId);
		  game.onDisconnect(event.senderId);
          if (game.castReceiverManager.getSenders().length == 0) {
            window.close();
          }
        };

        // handler for 'systemvolumechanged' event
        game.castReceiverManager.onSystemVolumeChanged = function(event) {
          console.log('Received System Volume Changed event: ' + event.data['level'] + ' ' +
              event.data['muted']);
        };

        // create a CastMessageBus to handle messages for a custom namespace
        game.messageBus =
          game.castReceiverManager.getCastMessageBus(
              'urn:x-cast:com.google.cast.sample.helloworld');

        // handler for the CastMessageBus message event
        game.messageBus.onMessage = function(event) {
          console.log('RecvMsg[' + event.senderId + '] ' + event.data);
          // display the message from the sender
          //displayText(event.data);
          // inform all senders on the CastMessageBus of the incoming message event
          // sender message listener will be invoked
          //game.messageBus.send(event.senderId, event.data+"_test");

          handlemsg(event.senderId, event.data);
        }

        // initialize the CastReceiverManager with an application status message
        game.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');
	};

    function onload() {
		var game = new Game();

		global.game = game;
        game.playerList = $('#players-list');

        console.log('init game');

        game.board = new BoardSTD('board');
        game.board.dice = new Dice('content');

        game.addPlayer('Player 1', RED,    game.user_nobody);
        game.addPlayer('Player 3', YELLOW, game.user_nobody);
        game.addPlayer('Player 4', BLUE,   game.user_nobody);
        game.addPlayer('Player 2', GREEN,  game.user_nobody);

        game.stat = GAME_STATUS.WAIT_FOR_CONNECTION;

		initChromecast();

		game.showUI_waitForConnection();
    }

	function autoActionForRollDice() {
		var player = game.countDownPlayer;
		if (!player)
			return;

		if (game.stat !== GAME_STATUS.WAIT_FOR_DICE ||
				game.board.dice.busy === true) {
            player.stopCountDown();
			return;
		}

		var user = player.getUser();
		if (user.isDisconnected) {
			player.stopCountDown();
			game.doDisconnect(user);
            game.nextPlayer();

            var player = game.getCurrentPlayer();
            if (player) {
                var user = player.getUser();
                if (user.type === User.TYPE.COMPUTER)
                    game.board.dice.roll(rollDoneHandler,
                                    rollDoneHandler_outofbusy);
            }

			return;
		}

		game.countDown--;
		game.board.showCountDown(game.countDown, player.color);

		if (game.countDown === 0) {
			player.setTimeOutStat(true);
			game.board.dice.roll(rollDoneHandler,
					rollDoneHandler_outofbusy);
		}
	}

	function autoActionForMovePawn() {
		var player = game.countDownPlayer;
		if (!player)
			return;

		if ((game.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				game.stat !== GAME_STATUS.WAIT_FOR_PAWN) ||
				game.board.dice.busy === true ||
				player.isMoving === true) {
            player.stopCountDown();
			return;
		}

		var user = player.getUser();
		if (user.isDisconnected) {
			player.stopCountDown();
			game.doDisconnect(user);
			game.nextPlayer();

            var player = game.getCurrentPlayer();
            if (player) {
                var user = player.getUser();
                if (user.type === User.TYPE.COMPUTER)
                    game.board.dice.roll(rollDoneHandler,
                                    rollDoneHandler_outofbusy);
            }

			return;
		}

		game.countDown--;
		game.board.showCountDown(game.countDown, player.color);

		if (game.countDown === 0) {
			player.setTimeOutStat(true);
			if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
			} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
				player.selectPawnAndMove(game.board.dice.getValue());
			}
		}
	}

    function rollDoneHandler(newValue) {
        var player = game.getCurrentPlayer();

		if (!player)
			return;

		if (game.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				game.stat !== GAME_STATUS.WAIT_FOR_PAWN)
			return;

        console.log('rollDoneHandler inbusy: currentPlayer=' + player.color +
				' dice=' + newValue);

        if ((game.board.getBaseFreeField(player.color) === null) &&
                (newValue !== 6)) {
            game.nextPlayer();
        } else {
			var user = player.getUser();
			if (user.type === User.TYPE.HUMAN &&
					player.getTimeOutStat() === false)
				player.startCountDown(autoActionForMovePawn);

			// TODO: select a pawn before focus the player
            player.focus();
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
        }
    }
	function rollDoneHandler_outofbusy(diceValue) {
        var player = game.getCurrentPlayer();

		if (!player)
			return;

		if (game.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				game.stat !== GAME_STATUS.WAIT_FOR_PAWN)
			return;

		var user = player.getUser();

        console.log('rollDoneHandler_outofbusy: currentPlayer=' + player.color +
				' dice=' + diceValue);

		if (user.type !== User.TYPE.COMPUTER &&
				player.getTimeOutStat() === false)
			return;

		if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
		} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
			player.selectPawnAndMove(diceValue);
		}
	};

    function handlemsg_prehistoric(channel, msg) {
        var player = game.getCurrentPlayer();

        if (msg === 'join') {
            var i = game.pickupIndex;
            if (i <= 1) {
                game.players[2*i].channel = channel;
                game.players[2*i+1].channel = channel;
                console.log('player ' + 2*i + ' and ' + 2*i+1 +
                    ' are allocated to channel ' + channel);
                i++;
                game.pickupIndex = i;
            } else {
                console.log('no more players could be allocated');
            }
            return;
        }

		if (!player) {
			console.log("handlemsg_prehistoric no current player, game.stat=" +
					game.stat);
			return;
		}

		var currentChannel = player.getUser().senderID;
        if (currentChannel != channel) {
            console.log("" + channel + ", it's not your turn, but for " +
					currentChannel);
            return;
        }

		if (player.getTimeOutStat() === true) {
			console.log("player-"+player.color + " timed out, ignore user op");
			return;
		}

        if (msg === 'click') {
            if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
                game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
				game.proto.replyClick(channel);
            } else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.move(game.board.dice.getValue(),
						player.getCurrentPawn());
				game.proto.replyClick(channel);
            }
        } else if (msg === 'next') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                if (player.nextPawn())
					game.proto.replyNext(channel);
            }
        } else if (msg === 'prev') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                if (player.prevPawn())
					game.proto.replyPrev(channel);
            }
        }
    }

    function handlemsg(channel, msg) {
        if (typeof msg === "string") {
            var msgObj = null;
            try {
                var msgObj = JSON.parse(msg);
                game.proto.parseMsg(channel, msgObj);
            } catch(err) {
                console.log('not a json string, try prehistoric way');
                handlemsg_prehistoric(channel, msg);
            }
        } else if (typeof msg === "object") {
            game.proto.parseMsg(channel, msg);
        } else {
        	console.log("not supported 'typeof msg': " + typeof msg);
        }
    }

    document.onkeydown = function(event) {
		var keyCode = event.keyCode;
		var ch = "default", name = "test";

		console.log('key ' + keyCode + ' pressed!');

		/*           | connect   disconnect    ready    click       next        prev
		 * -------------------------------------------------------------------------
		 * keyboard1 |   up 38    down 40      ' 222    enter 13   right 39    left 37
		 * keyboard2 |    i 73      k  75      h  72       o  79     l   76     j   74
		 *
		 * add a computer user:    a
		 * add a unavailable user: x
		 * pickup:                 p
		 * reset:                  s
		 */
		if (keyCode === 38 || keyCode === 40 || keyCode === 222 ||
				keyCode === 13 || keyCode === 39 || keyCode === 37) {
			ch = "keyboard1";
			name = "test1";
		} else if (keyCode === 73 || keyCode === 75 || keyCode === 72 ||
				keyCode === 79 || keyCode === 76 || keyCode === 74) {
			ch = "keyboard2";
			name = "test2";
		}

        if (keyCode === 38 /* 'up' */ || keyCode === 73 /*i*/) {
			console.log('key Connect pressed!');
			handlemsg(ch,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"connect",' +
				' "username":"' + name +'"}');
		} else if (keyCode === 40 /* 'down' */|| keyCode === 75 /*k*/) {
			console.log('key Disconnect pressed!');
			handlemsg(ch,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"disconnect"}');
		} else if (keyCode === 222 /* ' */|| keyCode === 72/*h*/) {
			console.log('key getReady pressed!');
			handlemsg(ch,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"getready"}');
		} else if (keyCode === 13 /*'enter'*/ || keyCode === 79 /*o*/) {
			console.log('key Enter pressed!');
            handlemsg(ch, 'click');
        } else if (keyCode === 39 /*right*/|| keyCode === 76/*l*/) {
			console.log('key Right/next-pawn pressed!');
            handlemsg(ch, 'next');
        } else if (keyCode === 37 /*left*/|| keyCode === 74/*j*/) {
			console.log('key Left/prev-pawn pressed!');
            handlemsg(ch, 'prev');
        } else if (keyCode === 65 /*'a'*/) {
			console.log('key Ai pressed!');

			var i = 0, p, u;
			while (p = game.players[i]) {
				u = p.getUser();
				if (u.type === User.TYPE.NOBODY) {
					p.setUser(game.user_computer);
					break;
				}
				i++;
			}
			game.waitForStartOfGame();
			if (game.isReady())
				game.start();
        } else if (keyCode === 88 /*'x'*/) {
			var i = 0, p, u;
			while (p = game.players[i]) {
				u = p.getUser();
				if (u.type === User.TYPE.NOBODY) {
					p.setUser(game.user_unavailable);
					break;
				}
				i++;
			}
			if (game.isReady())
				game.start();
		} else if (keyCode === 80 /* 'p'*/) {
			console.log('key Pickup pressed!');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"red", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"green", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"yellow", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"blue", "user_type":"human"}');
		} else if (keyCode === 83 /* 's' reSet*/) {
			console.log('key reSet pressed!');
			handlemsg(game.user_host.senderID,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"reset"}');
		} else {
			console.log('key ' + keyCode + ' pressed, ignore!');
		}
    }

    global.addEventListener('load', function () {
        onload();
    });

	//TODO export as less as possible
	global.rollDoneHandler = rollDoneHandler;
	global.rollDoneHandler_outofbusy = rollDoneHandler_outofbusy;
	global.autoActionForMovePawn = autoActionForMovePawn;
	global.autoActionForRollDice = autoActionForRollDice;
}(this));
