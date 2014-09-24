/**
 * Class representing a single field of a game board
 * @param {Number} x               X-position
 * @param {Number} y               Y-position
 * @param {Number} pixelX          X coordinats(in pixel) for pawn
 * @param {Number} pixelY          Y coordinats(in pixel) for pawn
 * @param {String} color           color of the field
 * @param {Number} action          Action to take after a pawn gets to the field
 * @param {Number} rotForPass      will move/jump out of the field
 * @param {Number} rotForTakeOff   will takeoff from the field
 * @param {Number} rotForNormalStop   move/jump to stop
 * @param {Number} rotForFlightStop   flight to stop
 */
var Field =
function (x, y, color, action, pixelX, pixelY,
		rotForPass, rotForTakeOff,
		rotForNormalStop, rotForFlightStop) {
    this.x = x;
    this.y = y;
    this.pawn = null;
	this.pawns = {};
	this.numPawns = 0;

	this.color = color;
	this.action = action;
	this.pixelX = pixelX;
	this.pixelY = pixelY;

	this.rotForPass       = rotForPass;
	this.rotForTakeOff    = rotForTakeOff;
	this.rotForNormalStop = rotForNormalStop;
	this.rotForFlightStop = rotForFlightStop;
};

/**
 * Retrieve pawn standing on this field
 * @return {Object} Present pawn or null
 */
Field.prototype.getPawn = function () {
    return this.pawn;
};

/**
 * Set/unset pawn standing on this field
 * @param {Object} [pawn] Pawn
 */
Field.prototype.setPawn = function (pawn) {
    this.pawn = pawn || null;
};

Field.prototype.addPawn = function (pawn) {
	var key = pawn.getKey();
	if (this.pawns[key]) {
		console.log("pawn " + key + " is already added");
		return;
	}
	this.pawns[key] = pawn;
	this.numPawns++;

	pawn.field = this;
	pawn.x = this.x;
	pawn.y = this.y;
	pawn.$elem.css({
		left: (this.pixelX + (this.numPawns-1)*3) + 'px',
		 top: (this.pixelY + (this.numPawns-1)*3) + 'px',
	});
	pawn.$elem.css('z-index', '' + this.numPawns-1);
};

Field.prototype.removePawn = function (pawn) {
	var key = pawn.getKey();
	if (this.pawns[key]) {
		this.numPawns--;
		delete this.pawns[key];
		pawn.field = null;
	} else {
		console.log("pawn " + key + " is not inside "
				+ field.x + "," +field.y);
	}
};

Field.prototype.getPawns = function (pawn) {
	var pawns = [], p;
	for (p in this.pawns)
		pawns.push(this.pawns[p]);
	return pawns;
};

/**
 * kill pawns not belonging to newPlayer
 */
Field.prototype.kill = function (newPlayer) {
	var key, p, field;
	for (key in this.pawns) {
		p = this.pawns[key];
		if (p.player != newPlayer) {
			field =
				game.board.getBaseFreeField(p.player.color);
			p.kill(field);
		}
	}
};
