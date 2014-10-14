var BoardSTD = function (id) {
    this.$elem = $('#' + id);
	document.getElementById('board_style').href="css/style_std.css";
	this.arrow = $('.arrow');
	this.arrowColor = undefined;
	this.countdownColor = undefined;

	this.pawnPixels = 36;

    this.fields = [];
    this.path = [
        [4, 14], [4, 13], [4, 12], [4, 11],
		[3, 10], [2, 10], [1, 10], [0, 10],
		[0, 9],  [0, 8],  [0, 7],  [0, 6], [0, 5],
		[0, 4],  [1, 4],  [2, 4],  [3, 4],
		[4, 3],  [4, 2],  [4, 1],  [4, 0],
        [5, 0],  [6, 0],  [7, 0],  [8, 0], [9, 0],
		[10, 0], [10, 1], [10, 2], [10, 3],
		[11, 4], [12, 4], [13, 4], [14, 4],
		[14, 5], [14, 6], [14, 7], [14, 8], [14, 9],
		[14,10], [13,10], [12,10], [11, 10],
		[10,11], [10,12], [10,13], [10, 14],
		[9, 14], [8, 14], [7, 14], [6, 14], [5, 14]
    ];
	this.startPositions = {};
    this.startPositions[RED] = 0;
    this.startPositions[YELLOW] = 13;
    this.startPositions[BLUE] = 26;
    this.startPositions[GREEN] = 39;

	this.startCordinate = {};
	this.startCordinate[RED] = [3, 14];
	this.startCordinate[YELLOW] = [0,  3];
	this.startCordinate[BLUE] = [11, 0];
	this.startCordinate[GREEN] = [14,11];

    this.loadFields();
	this.initBases();
	this.initDestinations();

    $('#content').append('<div id="click-hint"></div>');
    $('#content').append('<div id="slide-hint"></div>');

    this.$elem.append('<div id="game_over_info"><ul>Game Over</ul></div>');
	$('#game_over_info').hide();

	this.$elem.append('<div class="player-stat" id="player-stat-red"></div>');
	this.$elem.append('<div class="player-stat" id="player-stat-yellow"></div>');
	this.$elem.append('<div class="player-stat" id="player-stat-blue"></div>');
	this.$elem.append('<div class="player-stat" id="player-stat-green"></div>');

	this.$elem.append('<div class="base_mask" id="base_mask_red"></div>');
	this.$elem.append('<div class="base_mask" id="base_mask_yellow"></div>');
	this.$elem.append('<div class="base_mask" id="base_mask_blue"></div>');
	this.$elem.append('<div class="base_mask" id="base_mask_green"></div>');
};

BoardSTD.prototype.showBase = function(color) {
	$('#base_mask_'+color).hide();
};

BoardSTD.prototype.hideBase = function(color) {
	$('#base_mask_'+color).show();
};

BoardSTD.prototype.showGameOver = function() {
	$('#game_over_info').show();
};

BoardSTD.prototype.hideGameOver = function() {
	$('#game_over_info').hide();
};

BoardSTD.prototype.colorToPlayerIndex = function(color) {
	if (color === RED)
		return 0;
	if (color === YELLOW)
		return 1;
	if (color === BLUE)
		return 2;
	if (color === GREEN)
		return 3;
	return undefined;
};

BoardSTD.prototype.showCountDown = function(count, color) {
	//console.log("showCountDown: " + count);
	if (count < 10)
		$('#countdown').html('0'+count);
	else
		$('#countdown').html(''+count);

	if (color === GREEN) {
		$('#countdown').css('background-color', '#13d213');
		$('#countdown').css('top',  '275px');
		$('#countdown').css('left', '845px');
	} else if (color === RED) {
		$('#countdown').css('background-color', '#f65624');
		$('#countdown').css('top',  '275px');
		$('#countdown').css('left', '70px');
	} else if (color === YELLOW) {
		$('#countdown').css('background-color', '#fed807');
		$('#countdown').css('top',  '275px');
		$('#countdown').css('left', '70px');
	} else if (color === BLUE) {
		$('#countdown').css('background-color', '#0f8ad0');
		$('#countdown').css('top',  '275px');
		$('#countdown').css('left', '845px');
	}

	this.countdownColor = color;

	$('#countdown').addClass('countdown-' + this.countdownColor);
	$('#countdown').show();
};

BoardSTD.prototype.hideCountDown = function() {
	console.log('hideCountDown');
	$('#countdown').hide();
	$('#countdown').removeClass('countdown-' + this.countdownColor);
};

BoardSTD.prototype.resetArrow = function() {
	this.arrow.hide();
	this.arrow.removeClass('arrow-' + this.arrowColor);
	this.arrowColor = undefined;
};

BoardSTD.prototype.hideArrow = function() {
	this.arrow.hide();
	this.arrow.removeClass('arrow-' + this.arrowColor);
};

BoardSTD.prototype.showArrow = function(color) {
	if (color !== this.arrowColor) {
		this.arrow.hide();
		this.arrow.removeClass('arrow-' + this.arrowColor);
		this.arrowColor = color;
		this.arrow.addClass('arrow-' + this.arrowColor);
	}
	this.arrow.show();
};

BoardSTD.prototype.addPlayerInfo = function(color, name) {
	var info_parent;
	var id = 'id="ul-' + color + '"';
	var player_name;
	var css_class = 'class="player-info player-info-' + color + '"';

	if (color === RED || color === YELLOW) {
		info_parent = $('#player-info-left');
	}
	if (color === BLUE || color === GREEN) {
		info_parent = $('#player-info-right');
	}

	if (name)
		player_name = '<ul ' + id + ' ' + css_class + '>' + name + '</ul>';
	else
		player_name = '<ul ' + id + ' ' + css_class + '></ul>';

	var player_info_block =
		'<div class="player-info player-info-' + color + '">' +
		player_name + '</div>';
    info_parent.append(player_name);
	info_parent.append('<div id="rank-' + color + '" class="rank-info">');
};

BoardSTD.prototype.showUserOpHint = function (op, color) {
	/*
	 * op = click or slide
	 */
	var e = $('#' + op + '-hint');
	e.addClass(op + '-' + color);
	e.show();
};

BoardSTD.prototype.hideUserOpHint = function (color) {
	$('#click-hint').removeClass('click-red');
	$('#click-hint').removeClass('click-yellow');
	$('#click-hint').removeClass('click-blue');
	$('#click-hint').removeClass('click-green');
	$('#click-hint').hide();

	$('#slide-hint').removeClass('slide-red');
	$('#slide-hint').removeClass('slide-yellow');
	$('#slide-hint').removeClass('slide-blue');
	$('#slide-hint').removeClass('slide-green');
	$('#slide-hint').hide();
};

BoardSTD.prototype.updatePlayerInfo = function(color, name, stat) {
	var e = $('#ul-' + color);
	if (e.length) {
		e.html(name);
	} else {
		this.addPlayerInfo(color, name);
	}
	e = $('#player-stat-' + color);
	e.html('');
	if (stat) {
		if (stat === 'notready')
			e.html('not ready');
		else if (stat === 'disconnected')
			e.html('disconnected');
		e.removeClass(color+'-notready');
		e.removeClass(color+'-disconnected');
		e.addClass('' + color + '-' + stat);
	}
};

BoardSTD.prototype.showRank = function(color, rank) {
	console.log("" + color + " got rank " + rank);
    $("#rank-" + color).css("background",
			"url('images/standard/ranking_" + rank + ".png')");
};

BoardSTD.prototype.hideRank = function(color) {
    $("#rank-" + color).css("background", "");
};

BoardSTD.prototype.getPawnClass = function(color, pawnIndex) {
	return 'pawn pawn-'+color + ' pawn-'+pawnIndex;
};

BoardSTD.prototype.getPath = function(color) {
	var startPos = this.startPositions[color],
		startCordinate = this.startCordinate[color],
	    p = this.path,
		size = p.length;

    ret = startPos > 0 ?
		p.slice(startPos, size).concat(p.slice(0, startPos)) :
		[].concat(p);
	ret = ret.splice(0,size-2);
    ret = ret.concat(this.dests[color].getPath());
	ret = [startCordinate].concat(ret);
	return ret;
};

BoardSTD.prototype.getArrivePosition = function () {
	return 56;
};

BoardSTD.prototype.getJUMPdelta = function(field) {
	return 4;
};

BoardSTD.prototype.getFLIGHTdelta = function(field) {
	return 12;
};

BoardSTD.prototype.initBases = function() {
	this.bases = {};
	this.bases[RED]    = new Base('start', RED, this,
			[[0,13], [1,13], [0,14], [1,14]]);
	this.bases[GREEN]  = new Base('start', GREEN, this,
			[[13,13], [14,13], [13,14], [14,14]]);
	this.bases[YELLOW] = new Base('start', YELLOW, this,
			[[0,0], [1,0], [0,1], [1,1]]);
	this.bases[BLUE]   = new Base('start', BLUE, this,
			[[13,0], [14,0], [13,1], [14,1]]);
};

BoardSTD.prototype.initDestinations = function() {
	this.dests = {};
	this.dests[RED]    = new Base('end', RED, this,
			[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8],
			 [7,9], [7,10],[7,11],[7,12],[7,13]]);
	this.dests[GREEN]  = new Base('end', GREEN, this,
			[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],
			 [9,7], [10,7],[11,7],[12,7],[13,7]]);
	this.dests[YELLOW] = new Base('end', YELLOW, this,
			[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],
			 [5,7],[4,7],[3,7],[2,7],[1,7]]);
	this.dests[BLUE]   = new Base('end', BLUE, this,
			[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],
			 [7,5],[7,4],[7,3],[7,2],[7,1]]);
};

BoardSTD.prototype.loadFields = function () {
    var x = 0, y = 0;

	var X = undefined;
	var color = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[YELLOW,YELLOW,     X,     X, GREEN,   RED,YELLOW,  BLUE, GREEN,   RED,YELLOW,  BLUE,     X,  BLUE,  BLUE],/*    0*/
	/*    1*/[YELLOW,YELLOW,     X,     X,  BLUE,     X,     X,  BLUE,     X,     X,  BLUE,     X,     X,  BLUE,  BLUE],/*    1*/
	/*    2*/[     X,     X,     X,     X,YELLOW,     X,     X,  BLUE,     X,     X, GREEN,     X,     X,     X,     X],/*    2*/
	/*    3*/[YELLOW,     X,     X,     X,   RED,     X,     X,  BLUE,     X,     X,   RED,     X,     X,     X,     X],/*    3*/
	/*    4*/[   RED,YELLOW,  BLUE, GREEN,     X,     X,     X,  BLUE,     X,     X,     X,YELLOW,  BLUE, GREEN,   RED],/*    4*/
	/*    5*/[ GREEN,     X,     X,     X,     X,     X,     X,  BLUE,     X,     X,     X,     X,     X,     X,YELLOW],/*    5*/
	/*    6*/[  BLUE,     X,     X,     X,     X,     X,     X,  BLUE,     X,     X,     X,     X,     X,     X,  BLUE],/*    6*/
	/*    7*/[YELLOW,YELLOW,YELLOW,YELLOW,YELLOW,YELLOW,YELLOW,     X, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],/*    7*/
	/*    8*/[   RED,     X,     X,     X,     X,     X,     X,   RED,     X,     X,     X,     X,     X,     X,   RED],/*    8*/
	/*    9*/[ GREEN,     X,     X,     X,     X,     X,     X,   RED,     X,     X,     X,     X,     X,     X,YELLOW],/*    9*/
	/*   10*/[  BLUE,YELLOW,   RED, GREEN,     X,     X,     X,   RED,     X,     X,     X,YELLOW,   RED, GREEN,  BLUE],/*   10*/
	/*   11*/[     X,     X,     X,     X,  BLUE,     X,     X,   RED,     X,     X,  BLUE,     X,     X,     X, GREEN],/*   11*/
	/*   12*/[     X,     X,     X,     X,YELLOW,     X,     X,   RED,     X,     X, GREEN,     X,     X,     X,     X],/*   12*/
	/*   13*/[   RED,   RED,     X,     X,   RED,     X,     X,   RED,     X,     X,   RED,     X,     X, GREEN, GREEN],/*   13*/
	/*   14*/[   RED,   RED,     X,   RED, GREEN,  BLUE,YELLOW,   RED, GREEN,  BLUE,YELLOW,     X,     X, GREEN, GREEN],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	var NO     = ACTION.NORMAL,
		JUMP   = ACTION.JUMP,
		FLIGHT = ACTION.FLIGHT,
		ARRIVE = ACTION.ARRIVE,
		RIGHT  = ACTION.TURNRIGHT;
	var action = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[    NO,    NO,     X,     X,  JUMP,  JUMP,  JUMP, RIGHT,  JUMP,  JUMP,  JUMP,    NO,     X,  JUMP,  JUMP],/*    0*/
	/*    1*/[    NO,    NO,     X,     X,  JUMP,     X,     X,    NO,     X,     X,  JUMP,     X,     X,  JUMP,  JUMP],/*    1*/
	/*    2*/[     X,     X,     X,     X,  JUMP,     X,     X,    NO,     X,     X,  JUMP,     X,     X,     X,     X],/*    2*/
	/*    3*/[    NO,     X,     X,     X,FLIGHT,     X,     X,    NO,     X,     X,  JUMP,     X,     X,     X,     X],/*    3*/
	/*    4*/[  JUMP,  JUMP,  JUMP,  JUMP,     X,     X,     X,    NO,     X,     X,     X,FLIGHT,  JUMP,  JUMP,  JUMP],/*    4*/
	/*    5*/[  JUMP,     X,     X,     X,     X,     X,     X,    NO,     X,     X,     X,     X,     X,     X,  JUMP],/*    5*/
	/*    6*/[  JUMP,     X,     X,     X,     X,     X,     X,ARRIVE,     X,     X,     X,     X,     X,     X,  JUMP],/*    6*/
	/*    7*/[ RIGHT,    NO,    NO,    NO,    NO,    NO,ARRIVE,     X,ARRIVE,    NO,    NO,    NO,    NO,    NO, RIGHT],/*    7*/
	/*    8*/[  JUMP,     X,     X,     X,     X,     X,     X,ARRIVE,     X,     X,     X,     X,     X,     X,  JUMP],/*    8*/
	/*    9*/[  JUMP,     X,     X,     X,     X,     X,     X,    NO,     X,     X,     X,     X,     X,     X,  JUMP],/*    9*/
	/*   10*/[  JUMP,  JUMP,  JUMP,FLIGHT,     X,     X,     X,    NO,     X,     X,     X,  JUMP,  JUMP,  JUMP,  JUMP],/*   10*/
	/*   11*/[     X,     X,     X,     X,  JUMP,     X,     X,    NO,     X,     X,FLIGHT,     X,     X,     X,    NO],/*   11*/
	/*   12*/[     X,     X,     X,     X,  JUMP,     X,     X,    NO,     X,     X,  JUMP,     X,     X,     X,     X],/*   12*/
	/*   13*/[    NO,    NO,     X,     X,  JUMP,     X,     X,    NO,     X,     X,  JUMP,     X,     X,    NO,    NO],/*   13*/
	/*   14*/[    NO,    NO,     X,    NO,  JUMP,  JUMP,  JUMP, RIGHT,  JUMP,  JUMP,  JUMP,     X,     X,    NO,    NO],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	var pixelX = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[    20,    96,     X,     X,   190,   227,   265,   303,   341,   379,   416,   454,     X,   510,   586],/*    0*/
	/*    1*/[    20,    96,     X,     X,   171,     X,     X,   303,     X,     X,   435,     X,     X,   510,   586],/*    1*/
	/*    2*/[     X,     X,     X,     X,   171,     X,     X,   303,     X,     X,   435,     X,     X,     X,     X],/*    2*/
	/*    3*/[     2,     X,     X,     X,   190,     X,     X,   303,     X,     X,   416,     X,     X,     X,     X],/*    3*/
	/*    4*/[    40,    77,   115,   153,     X,     X,     X,   303,     X,     X,     X,   454,   492,   529,   567],/*    4*/
	/*    5*/[    21,     X,     X,     X,     X,     X,     X,   303,     X,     X,     X,     X,     X,     X,   586],/*    5*/
	/*    6*/[    21,     X,     X,     X,     X,     X,     X,   303,     X,     X,     X,     X,     X,     X,   586],/*    6*/
	/*    7*/[    21,    77,   115,   153,   192,   227,   265,     X,   341,   379,   416,   454,   492,   529,   586],/*    7*/
	/*    8*/[    21,     X,     X,     X,     X,     X,     X,   303,     X,     X,     X,     X,     X,     X,   586],/*    8*/
	/*    9*/[    21,     X,     X,     X,     X,     X,     X,   303,     X,     X,     X,     X,     X,     X,   586],/*    9*/
	/*   10*/[    40,    77,   115,   153,     X,     X,     X,   303,     X,     X,     X,   454,   492,   529,   567],/*   10*/
	/*   11*/[     X,     X,     X,     X,   190,     X,     X,   303,     X,     X,   416,     X,     X,     X,   604],/*   11*/
	/*   12*/[     X,     X,     X,     X,   171,     X,     X,   303,     X,     X,   435,     X,     X,     X,     X],/*   12*/
	/*   13*/[    20,    96,     X,     X,   171,     X,     X,   303,     X,     X,   435,     X,     X,   510,   586],/*   13*/
	/*   14*/[    21,    96,     X,   153,   190,   227,   265,   303,   341,   379,   416,     X,     X,   510,   586],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	var pixelY = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[    19,    19,     X,     X,    37,    19,    19,    19,    19,    19,    37,     0,     X,    20,    20],/*    0*/
	/*    1*/[    94,    94,     X,     X,    77,     X,     X,    77,     X,     X,    76,     X,     X,    95,    95],/*    1*/
	/*    2*/[     X,     X,     X,     X,   114,     X,     X,   114,     X,     X,   113,     X,     X,     X,     X],/*    2*/
	/*    3*/[   151,     X,     X,     X,   151,     X,     X,   151,     X,     X,   151,     X,     X,     X,     X],/*    3*/
	/*    4*/[   189,   170,   170,   189,     X,     X,     X,   189,     X,     X,     X,   189,   170,   170,   188],/*    4*/
	/*    5*/[   226,     X,     X,     X,     X,     X,     X,   226,     X,     X,     X,     X,     X,     X,   226],/*    5*/
	/*    6*/[   264,     X,     X,     X,     X,     X,     X,   264,     X,     X,     X,     X,     X,     X,   264],/*    6*/
	/*    7*/[   301,   301,   301,   301,   301,   301,   301,     X,   301,   301,   301,   301,   301,   301,   301],/*    7*/
	/*    8*/[   339,     X,     X,     X,     X,     X,     X,   339,     X,     X,     X,     X,     X,     X,   339],/*    8*/
	/*    9*/[   377,     X,     X,     X,     X,     X,     X,   377,     X,     X,     X,     X,     X,     X,   377],/*    9*/
	/*   10*/[   415,   433,   433,   415,     X,     X,     X,   415,     X,     X,     X,   415,   433,   433,   415],/*   10*/
	/*   11*/[     X,     X,     X,     X,   452,     X,     X,   453,     X,     X,   452,     X,     X,     X,   452],/*   11*/
	/*   12*/[     X,     X,     X,     X,   490,     X,     X,   490,     X,     X,   490,     X,     X,     X,     X],/*   12*/
	/*   13*/[   508,   508,     X,     X,   527,     X,     X,   528,     X,     X,   527,     X,     X,   508,   508],/*   13*/
	/*   14*/[   584,   584,     X,   603,   565,   584,   584,   584,   584,   584,   565,     X,     X,   584,   584],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	// rotForPass rotForTakeOff rotForNormalStop rotForFlightStop
	var rotForPass = rotForNormalStop = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[   180,   180,     X,     X,    45,    90,    90,    90,    90,    90,   135,   225,     X,   270,   270],/*    0*/
	/*    1*/[   180,   180,     X,     X,     0,     X,     X,   180,     X,     X,   180,     X,     X,   270,   270],/*    1*/
	/*    2*/[     X,     X,     X,     X,     0,     X,     X,   180,     X,     X,   180,     X,     X,     X,     X],/*    2*/
	/*    3*/[   135,     X,     X,     X,     0,     X,     X,   180,     X,     X,   135,     X,     X,     X,     X],/*    3*/
	/*    4*/[    45,    90,    90,    45,     X,     X,     X,   180,     X,     X,     X,    90,    90,    90,   135],/*    4*/
	/*    5*/[     0,     X,     X,     X,     X,     X,     X,   180,     X,     X,     X,     X,     X,     X,   180],/*    5*/
	/*    6*/[     0,     X,     X,     X,     X,     X,     X,   180,     X,     X,     X,     X,     X,     X,   180],/*    6*/
	/*    7*/[     0,    90,    90,    90,    90,    90,    90,     X,   270,   270,   270,   270,   270,   270,   180],/*    7*/
	/*    8*/[     0,     X,     X,     X,     X,     X,     X,     0,     X,     X,     X,     X,     X,     X,   180],/*    8*/
	/*    9*/[     0,     X,     X,     X,     X,     X,     X,     0,     X,     X,     X,     X,     X,     X,   180],/*    9*/
	/*   10*/[   315,   270,   270,   270,     X,     X,     X,     0,     X,     X,     X,   225,   270,   270,   225],/*   10*/
	/*   11*/[     X,     X,     X,     X,   315,     X,     X,     0,     X,     X,   180,     X,     X,     X,   315],/*   11*/
	/*   12*/[     X,     X,     X,     X,     0,     X,     X,     0,     X,     X,   180,     X,     X,     X,     X],/*   12*/
	/*   13*/[    90,    90,     X,     X,     0,     X,     X,     0,     X,     X,   180,     X,     X,     0,     0],/*   13*/
	/*   14*/[    90,    90,     X,    45,   315,   270,   270,   270,   270,   270,   225,     X,     X,     0,     0],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	var rotForTakeOff = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    0*/
	/*    1*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    1*/
	/*    2*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    2*/
	/*    3*/[     X,     X,     X,     X,    90,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    3*/
	/*    4*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,   180,     X,     X,     X],/*    4*/
	/*    5*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    5*/
	/*    6*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    6*/
	/*    7*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    7*/
	/*    8*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    8*/
	/*    9*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    9*/
	/*   10*/[     X,     X,     X,     0,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   10*/
	/*   11*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,   270,     X,     X,     X,     X],/*   11*/
	/*   12*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   12*/
	/*   13*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   13*/
	/*   14*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];
	var rotForFlightStop = [
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
	/*    0*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    0*/
	/*    1*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    1*/
	/*    2*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    2*/
	/*    3*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,    90,     X,     X,     X,     X],/*    3*/
	/*    4*/[     X,     X,     X,     0,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    4*/
	/*    5*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    5*/
	/*    6*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    6*/
	/*    7*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    7*/
	/*    8*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    8*/
	/*    9*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*    9*/
	/*   10*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,   180,     X,     X,     X],/*   10*/
	/*   11*/[     X,     X,     X,     X,   270,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   11*/
	/*   12*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   12*/
	/*   13*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   13*/
	/*   14*/[     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X,     X],/*   14*/
		   //      0,     1,     2,     3,     4,     5,     6,     7,     8,     9,    10,    11,    12,    13,    14
		];

    delete this.fields;
    this.fields = [];
    while (color[y]) {
        this.fields[y] = [];
        while (x<=14) {
			var f = new Field(x, y,
					color[y][x], action[y][x],
					pixelX[y][x], pixelY[y][x],
					rotForPass[y][x], rotForTakeOff[y][x],
					rotForNormalStop[y][x], rotForFlightStop[y][x]);
            this.fields[y].push(f);
            x++;
        }
        x = 0;
        y++;
    }
};

BoardSTD.prototype.add = function (elem) {
    this.$elem.append(elem);
};

BoardSTD.prototype.getField = function (coords) {
    var x = coords[0],
        y = coords[1];
        
    return this.fields[y] ? this.fields[y][x] : null;
};

BoardSTD.prototype.getBaseFreeField = function (color) {
	var base = this.bases[color];
	return base.getFreeField();
};

BoardSTD.prototype.getFlyAcrossField = function (color) {
	var flyAcrossField = {};

	flyAcrossField[RED]    = [7, 3];
	flyAcrossField[GREEN]  = [3, 7];
	flyAcrossField[YELLOW] = [11, 7];
	flyAcrossField[BLUE]   = [7, 11];

	return this.getField(flyAcrossField[color]);
};
