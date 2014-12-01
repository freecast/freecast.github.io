var Player = function (name, color, board) {
    this.name = name;
    this.color = color;
    this.board = board;
    this.initPath();
    this.initPawns();
    this.isFocused = false;
    this.isFinished = false;
    this.numArrived = 0;
    this.isMoving = false;
	this.isTimeOut = false;
	this.autoAction = undefined;

    this.user = null;
};

Player.prototype.setTimeOutStat = function(isTimeOut) {
	console.log("setTimeOutStat player-" + this.color + 
			" " + this.isTimeOut + "->" + isTimeOut);
	this.isTimeOut = isTimeOut;
};

Player.prototype.getTimeOutStat = function() {
	return this.isTimeOut;
};

Player.prototype.setUser = function(user) {
	var old_type, new_type, stat;
	var username = user.name;

	if (this.user) {
		if (this.user.type === User.TYPE.HUMAN ||
				this.user.type === User.TYPE.COMPUTER) {
			old_type = 1;
		} else {
			old_type = 0;
		}
		this.user.removePlayer(this);
	} else {
		old_type = 0;
	}

	if (user.isready === false && user.type === User.TYPE.HUMAN)
		stat = 'notready';
	if (this.user) {
		if (this.user.type === User.TYPE.HUMAN &&
				user.type === User.TYPE.NOBODY) {
			if (game.stat === GAME_STATUS.WAIT_FOR_PAWN ||
					game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				stat = "disconnected";
				username = this.user.name;
			}
		}
	}
    this.user = user;
	user.addPlayer(this);
	this.board.updatePlayerInfo(this.color, username, stat);

	if (user.type === User.TYPE.HUMAN || user.type === User.TYPE.COMPUTER) {
		new_type = 1;
		this.showPawns();
	} else {
		new_type = 0;
		this.hidePawns();
	}
	if (user.type === User.TYPE.UNAVAILABLE) {
		this.board.hideBase(this.color);
	} else {
		this.board.showBase(this.color);
	}
	if (old_type === 0 && new_type === 1)
		game.numOfPlayer++;
	if (old_type === 1 && new_type === 0)
		game.numOfPlayer--;

	console.log("player-" + this.color +
			" is occupied by user '" + user.name + "'");
};

Player.prototype.getUser = function() {
	return this.user || null;
};

Player.prototype.initPath = function () {
	this.path = this.board.getPath(this.color);
	this.arrivePosition = this.board.getArrivePosition(this.color);
};

Player.prototype.initPawns = function () {
    var i = 0, pawn;

    this.pawns = [];

    for (i = 0; i < 4; i++) {
        pawn = new Pawn(this, i);
        this.pawns[i] = pawn;
        this.board.add(pawn.$elem);
    }
    this.currentPawn = 0;
};

Player.prototype.hidePawns = function () {
	var i;
	for (i = 0; i < 4; i++) {
		var p;
		if (p = this.pawns[i])
			p.$elem.hide();
	}
};

Player.prototype.showPawns = function () {
	var i;
	for (i = 0; i < 4; i++) {
		var p;
		if (p = this.pawns[i])
			p.$elem.show();
	}
};

Player.prototype.getCurrentPawn = function () {
    return this.pawns[this.currentPawn] || null;
}

Player.prototype.getNextAvailPawnIndex = function (diceValue) {
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 3) {
            current = 0;
        } else {
            current++;
        }        
        
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
        	if (diceValue) {
				// diceValue is also a consideration for pawn pickup
		        if(this.pawns[current].position === -1 &&
						diceValue !== 6) {
		        	i++;
		        	continue;
		        }
			}
            break;
        }
    }
    return current;
}

Player.prototype.nextPawn = function () {
    var prev = this.currentPawn;

    this.pawns[prev].blur();
    this.currentPawn = this.getNextAvailPawnIndex(game.board.dice.getValue());
    this.pawns[this.currentPawn].focus();

	if (prev === this.currentPawn)
		return false;
	return true;
}
Player.prototype.prevPawn = function () {
    var prev = this.currentPawn;
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 0) {
            current = 3;
        } else {
            current--;
        }      
        
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
		        if(game.board.dice.getValue() !== 6 && this.pawns[current].position === -1 ){
		        	i++;
		        	continue;
		        }           	
        	
            break;
        }
        
        
    }
    this.pawns[prev].blur();
    this.currentPawn = current;
    this.pawns[this.currentPawn].focus();

	if (prev === this.currentPawn)
		return false;
	return true;
}

function getNextPos(pos, diceValue, arrivePos) {
	var nextPos = pos + diceValue;
	if (nextPos > arrivePos)
		nextPos = arrivePos - (nextPos - arrivePos);
	return nextPos;
}

Player.prototype.selectPawnAndMove = function(diceValue) {
	if (this.isTimeOut) {
		this.timeOutSelectAndMove(diceValue);
		return;
	}
	// 1. kill other player?
	var i = 0, p, nextPos, dstField;
	while (p = this.pawns[i]) {
		if (p.position >= 0 && p.isArrived === false) {
			nextPos = getNextPos(p.position, diceValue, this.arrivePosition);
			dstField = this.board.getField(this.path[nextPos]);
			if (checkKill(this, dstField)) {
				this.blur();
				this.currentPawn = i;
				this.focus();
				this.move(diceValue, p);
				console.log("selectPawnAndMove finished with kill-other");
				return;
			}
		}
		i++;
	}
	// 2. arrive home
	i = 0;
	while (p = this.pawns[i]) {
		if (p.position + diceValue === this.arrivePosition) {
			this.blur();
			this.currentPawn = i;
			this.focus();
			this.move(diceValue, p);
			console.log("selectPawnAndMove finished with arrive-home");
			return;
		}
		i++;
	}
	// 3. move out of base
	i = 0;
	if (diceValue === 6) {
		while (p = this.pawns[i]) {
			if (p.position === -1) {
				this.blur();
				this.currentPawn = i;
				this.focus();
				this.move(diceValue, p);
				console.log("selectPawnAndMove finished with out-of-base");
				return;
			}
			i++;
		}
	}
	// 4. fly or jump
	i = 0;
	while (p = this.pawns[i]) {
		if (p.position >= 0 && p.isArrived === false) {
			nextPos = getNextPos(p.position, diceValue, this.arrivePosition);
			dstField = this.board.getField(this.path[nextPos]);
			if (dstField.color === this.color &&
					(dstField.action === ACTION.JUMP ||
					 dstField.action === ACTION.FLIGHT)) {
				this.blur();
				this.currentPawn = i;
				this.focus();
				this.move(diceValue, p);
				console.log("selectPawnAndMove finished with fly/jump");
				return;
			}
		}
		i++;
	}
	// 5. move the current pawn
	i = 0;
	var index = this.currentPawn;
	while (i < 4) {
		p = this.pawns[index];
		if (p.position >= 0 && p.isArrived === false) {
			this.blur();
			this.currentPawn = i;
			this.focus();
			this.move(diceValue, p);
			console.log("selectPawnAndMove finished with %d", index);
			return;
		}
		i++;
		index++;
		if (index === 4)
			index = 0;
	}
}

Player.prototype.timeOutSelectAndMove = function(diceValue) {
	// simply select a pawn for diceValue in case of timeout.
	// If current pawn is OK to move with diceValue, that's it.
	// otherwise do some simple search

	// 1. current pawn out of base
	var pawn = this.pawns[this.currentPawn];
	if (pawn.position >= 0) {
		this.move(diceValue, pawn);
		return;
	}

	// 2. other pawns out of base
	var i = 0, pawn;
	while (pawn = this.pawns[i]) {
		if (pawn.isArrived == false && pawn.position >= 0) {
			this.blur();
			this.currentPawn = i;
			this.focus();
			this.move(diceValue, pawn);
			return;
		}
		i++;
	}

	// 3. pawns inside base
	if (diceValue == 6) {
		i = this.currentPawn;
		while (pawn = this.pawns[i]) {
			if (pawn.isArrived == false) {
				this.blur();
				this.currentPawn = i;
				this.focus();
				this.move(diceValue, pawn);
				return;
			}
			i++;
			if (i === this.pawns.length)
				i = 0;
		}
	} else {
		console.log("no pawn selected to move, currentPawn=" +
				this.currentPawn + " pos=" +
				this.pawns[this.currentPawn].position);
	}
};

Player.prototype.focus = function () {
    this.isFocused = true;
    this.getCurrentPawn().focus();
};

Player.prototype.blur = function () {
    this.isFocused = false;
    this.getCurrentPawn().blur();
};

Player.prototype.startCountDown = function(func) {
	this.autoAction = setInterval(func, 1000);
	console.log('startCountDown ' + this.autoAction +
			' player-' + this.color + ' ' + func.name);
	this.board.showCountDown(game.countDown, this.color);
};

Player.prototype.stopCountDown = function() {
	clearInterval(this.autoAction);
	console.log('stopCountDown ' + this.autoAction +
			' player-' + this.color);
};

Player.prototype.move = function (distance, pawn) {
    var steps = [],
        destPawns,
        nextPos,
        dest, destField,
		killFields = [],
        i,
        switchPlayer = false;

    if (!this.isFocused || !pawn) {
        return false;
    }

    if (this.isMoving) {
        log("avoid move reentrance for player " + this.color);
        return false;
    }

	if (game.countDownPlayer === this) {
		console.log('stop countDown this player-' + this.color);
		this.stopCountDown();
	} else {
		if (game.countDownPlayer) {
			console.log('stop countDown other player-' +
					game.countDownPlayer.color);
			game.countDownPlayer.stopCountDown();
		}
	}

    this.isMoving = true;
    // pawn is still inside base
    if (pawn.position < 0) {
        if (distance !== 6) {
            this.isMoving = false;
            return false;
        }
        // enter the board
        nextPos = 0;
		var f = this.board.getField(this.path[0]);
        steps.push({action: ACTION.OUTOFBASE, postAction: ACTION.NONE, field: f});
        switchPlayer = false;
    // pawn is moving on the board
    } else {
        nextPos = pawn.position + distance;
        var fields = this.path.slice(pawn.position + 1, nextPos + 1);
        if (fields.length) {
            i = 0;
            while (fields[i]) {
                steps.push({action: ACTION.NORMAL, postAction: ACTION.NORMAL,
					field: this.board.getField(fields[i])});
                i++;
            }
			steps[steps.length-1].postAction = ACTION.NONE;
        }
        if(distance == 6)
        {
        	switchPlayer = false;
        }else{
        switchPlayer = true;
      }
    }
	if (nextPos > this.arrivePosition)
		nextPos = this.arrivePosition -
					(nextPos - this.arrivePosition);
	dest = this.path[nextPos];
	destField = this.board.getField(dest);

	if (nextPos < this.arrivePosition) {
		if (checkKill(this, destField)) {
			steps[steps.length-1].action = ACTION.KILL;
			killFields.push(destField);
		}
	} else if (nextPos === this.arrivePosition) {
        var field = this.board.getBaseFreeField(this.color);
        if (field) {
			steps[steps.length-1].postAction = ACTION.ARRIVE;
            steps.push({action: ACTION.ARRIVE, postAction: ACTION.NONE,
				field: field});
        } else {
			this.isMoving = false;
            console.log('no field for pawn back to base');
			return false;
        }
		if (this.numArrived === 3) {
			console.log('player-'+this.color + ' ' +
					'the last pawn will be back home, ' +
					'force switchPlayer = true');
			switchPlayer = true;
		}
    } else {
        this.isMoving = false;
        console.log("out of range nextPos = " + nextPos);
        return false;
    }

	// considering JUMP/FLIGHT
	if (killFields.length === 0 && destField.color === this.color) {
		if (destField.action === ACTION.JUMP) {
			steps[steps.length-1].postAction = ACTION.JUMP;

			nextPos = nextPos + this.board.getJUMPdelta(destField);
			destField = this.board.getField(this.path[nextPos]);
			steps.push({action: ACTION.JUMP, postAction: ACTION.NONE,
				field: destField});

			if (checkKill(this, destField)) {
				steps[steps.length-1].action = ACTION.KILL;
				killFields.push(destField);
			}

			if (killFields.length === 0 && destField.action === ACTION.FLIGHT) {
				steps[steps.length-1].postAction=ACTION.FLIGHT;

				var flyAcrossField = this.board.getFlyAcrossField(this.color);
				nextPos = nextPos + this.board.getFLIGHTdelta(destField);
				destField = this.board.getField(this.path[nextPos]);

				if (checkKill(this, flyAcrossField)) {
					killFields.push(flyAcrossField);
					steps.push({action: ACTION.KILL, postAction: ACTION.FLIGHT,
						field: flyAcrossField});
				}
				steps.push({action: ACTION.FLIGHT, postAction: ACTION.NONE,
					field: destField});

				if (checkKill(this, destField)) {
					steps[steps.length-1].action = ACTION.KILL;
					killFields.push(destField);
				}
			}
		} else if (destField.action === ACTION.FLIGHT) {
			steps[steps.length-1].postAction=ACTION.FLIGHT;

			var flyAcrossField = this.board.getFlyAcrossField(this.color);
			var isKill1, isKill2;
			nextPos = nextPos + this.board.getFLIGHTdelta(destField);
			destField = this.board.getField(this.path[nextPos]);

			if (isKill1 = checkKill(this, flyAcrossField)) {
				killFields.push(flyAcrossField);
				steps.push({action: ACTION.KILL, postAction: ACTION.FLIGHT,
					field: flyAcrossField});
			}
			steps.push({action: ACTION.FLIGHT, postAction: ACTION.JUMP,
				field: destField});

			if (isKill2 = checkKill(this, destField)) {
				steps[steps.length-1].action = ACTION.KILL;
				steps[steps.length-1].postAction = ACTION.NONE;
				killFields.push(destField);
			}

			if (isKill1 === false && isKill2 === false) {
				nextPos = nextPos + this.board.getJUMPdelta(destField);
				destField = this.board.getField(this.path[nextPos]);
				steps.push({action: ACTION.JUMP, postAction: ACTION.NONE,
					field: destField});

				if (checkKill(this, destField)) {
					steps[steps.length-1].action = ACTION.KILL;
					killFields.push(destField);
				}
			}
		}
	}

    console.log("player " + this.color + " is moving to" +
            " path[" + nextPos + "] (" + this.path[nextPos] + ")");

    pawn.move(steps,
        function() {
            var player = pawn.player;

            /*if (killFields.length > 0) {
				for (var e in killFields)
					killFields[e].kill(player);
			}*/

            if (nextPos == player.arrivePosition) {
                player.numArrived++;
                if (player.numArrived == 4) {
					game.playerFinish(player.color);
					console.log("player-" + player.color +
						" finished");
                }
            }

            pawn.position = nextPos;
            console.log(pawn.getKey() + ' finished moving');

            if ((pawn.position === player.arrivePosition) &&
					(player.numArrived < 4)) {
                player.currentPawn = player.getNextAvailPawnIndex();
                log('player ' + player.color + ':' + pawn.pawnIndex +
                    ' arrived, pick up pawn ' + player.getCurrentPawn().pawnIndex);
            }

			if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
				if (switchPlayer) {
					game.nextPlayer();
				} else {
					console.log('player ' + player.color + ':' + pawn.pawnIndex +
							' is onboard, roll dice again');
					game.playAward();
				}
			}
            player.isMoving = false;

			if (game.stat === GAME_STATUS.RESET) {
				game.doReset();
				return;
			}

            if (game.isGameOver()) {
				game.gameOver();
                return;
            }

			player = game.getCurrentPlayer();
			if (!player)
				return;
			user = player.getUser();

			if (user.isDisconnected) {
				game.doDisconnect(user);
				return;
			}

			/* if it's time for computer to roll
			   do it automatically*/
			if (user.type != User.TYPE.COMPUTER &&
					player.getTimeOutStat() === false)
				return;
			if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
			} else
				console.log("game status error: " + game.stat);
        });

    return true;
};

Player.prototype.reset = function () {
	if (this.isMoving) {
		console.error("reset moving player-" + this.color);
		return;
	}

	this.blur();

    var i = 0, field, pawn;
    for (i = 0; i < this.pawns.length; i++) {
        pawn = this.pawns[i];
		pawn.reset();
    }
	this.currentPawn = 0;

	this.numArrived = 0;
};

function checkKill(player, destF) {
	var destP = destF.getPawns();
	if (destP.length > 0 && destP[0].player !== player)
		return true;
	return false
};
