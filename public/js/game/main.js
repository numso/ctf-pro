/* global PIXI, $, requestAnimationFrame, TESTMAP, io, console, _ */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var names = ['Donut', 'Penguin', 'Stumpy', 'Whicker', 'Shadow', 'Howard', 'Wilshire', 'Darling', 'Disco', 'Jack', 'The Bear', 'Sneak', 'The Big L', 'Whisp', 'Wheezy', 'Crazy', 'Goat', 'Pirate', 'Saucy', 'Hambone', 'Butcher', 'Walla Walla', 'Snake', 'Caboose', 'Sleepy', 'Killer', 'Stompy', 'Mopey', 'Dopey', 'Weasel', 'Ghost', 'Dasher', 'Grumpy', 'Hollywood', 'Tooth', 'Noodle', 'King', 'Cupid', 'Prancer'];
var SPEED = 10;
var newNicks = {};

var assets = ['resources/player.json', 'img/bottom.png', 'img/middle.png'];
var loader = new PIXI.AssetLoader(assets);
loader.onComplete = function () {
  loadGame();
};
loader.load();


var players = {};
var socket;
var gameInProgress = false;
var yourTeam;

var renderer;
var stage;
var map;
var player;
var inputs = [];
var obstacles = [];

function loadGame() {
  renderer = new PIXI.autoDetectRenderer(1400, 600);
  $('#view').after(renderer.view);
  stage = new PIXI.Stage();

  loadMapTextures();
  map = createMap();
  stage.addChild(map);

  player = createPlayer();
  stage.addChild(player.sprite);

  startIO();

  requestAnimationFrame(animate);
}

function createPlayer() {
  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(i));
  }
  var player = new PIXI.DisplayObjectContainer();
  player.position.x = 700;
  player.position.y = 300;
  player._width = 20;
  player._height = 20;

  var playerSprite = new PIXI.MovieClip(playerList);
  playerSprite.pivot.x = 10;
  playerSprite.pivot.y = 10;
  playerSprite.animationSpeed = 0.2;
  playerSprite.scale.x = 2;
  playerSprite.scale.y = 2;
  player.addChild(playerSprite);

  var nickName = new PIXI.Text('');
  player.addChild(nickName);

  return {
    sprite: player,
    dude: playerSprite,
    nick: nickName
  };
}

function createMap() {
  var i, j, id, tempSprite;

  var map = new PIXI.DisplayObjectContainer();
  for (i = 0; i < TESTMAP.bottom.length; ++i) {
    for (j = 0; j < TESTMAP.bottom[i].length; ++j) {
      id = TESTMAP.bottom[i][j];
      tempSprite = PIXI.Sprite.fromFrame('bot-' + id);
      tempSprite.position.x = i * 40;
      tempSprite.position.y = j * 40;
      map.addChild(tempSprite);
    }
  }

  for (i = 0; i < TESTMAP.middle.length; ++i) {
    for (j = 0; j < TESTMAP.middle[i].length; ++j) {
      id = TESTMAP.middle[i][j];
      if (id === null) continue;
      tempSprite = PIXI.Sprite.fromFrame('mid-' + id);
      tempSprite.position.x = i * 40;
      tempSprite.position.y = j * 40;
      tempSprite._width = 40;
      tempSprite._height = 40;
      obstacles.push(tempSprite);
      map.addChild(tempSprite);
    }
  }

  map.visible = false;

  return map;
}

function loadMapTextures() {
  var i, j, tempTexture;
  var size = 40;
  var botTexture = new PIXI.Texture.fromImage('img/bottom.png');
  var midTexture = new PIXI.Texture.fromImage('img/middle.png');

  for (i = 0; i < 8; ++i) {
    // load bot
    for (j = 0; j < 6; ++j) {
      tempTexture = new PIXI.Texture(botTexture, { x: i * size, y: j * size, width: size, height: size });
      PIXI.TextureCache['bot-' + ((j * 8) + i)] = tempTexture;
    }

    // load mid
    for (j = 0; j < 7; ++j) {
      tempTexture = new PIXI.Texture(midTexture, { x: i * size, y: j * size, width: size, height: size });
      PIXI.TextureCache['mid-' + ((j * 8) + i)] = tempTexture;
    }
  }
}

function animate() {
  renderer.render(stage);
  requestAnimationFrame(animate);
  if (gameInProgress) {
    playerMovement(inputs);
  }
  networkUpdate();
}

function networkUpdate() {
  for (var key in players) {
    var player = players[key];

    if (player.deleted) {
      if (player.sprite)
        map.removeChild(player.sprite);
      delete players[key];
      continue;
    }

    if (!player.sprite) {
      var newP = createPlayer();
      player.sprite = newP.sprite;
      player.dude = newP.dude;
      player.nick = newP.nick;
      map.addChild(player.sprite);
      player.dude.play();
    }

    if (newNicks[key]) {
      setNick(newNicks[key], player);
      delete newNicks[key];
    }

    player.sprite.position.x = player.x;
    player.sprite.position.y = player.y;
  }
}

function playerMovement(inputs) {
  var moved = false;
  var desiredRot = 0;
  if (inputs[37] && move(1, 0, Math.PI)) {
    moved = true;
    desiredRot = Math.PI;
  }
  else if (inputs[39] && move(-1, 0, 0)) {
    moved = true;
    desiredRot = 2 * Math.PI;
  }

  if (inputs[38] && move(0, 1, Math.PI * 3 / 2)) {
    moved = true;
    if (!desiredRot)
      desiredRot = 3 * Math.PI / 2;
    else
      desiredRot = (desiredRot + 3 * Math.PI / 2) / 2;
  }
  else if (inputs[40] && move(0, -1, Math.PI / 2)) {
    moved = true;
    if (!desiredRot)
      desiredRot = Math.PI / 2;
    else {
      desiredRot += Math.PI / 2;
      desiredRot %= 2 * Math.PI;
      desiredRot /= 2;
    }
  }

  if (moved) {
    player.dude.play();
    rotate(player.dude, desiredRot);
    sendCoords(player.sprite.position.x - map.position.x, player.sprite.position.y - map.position.y);
  } else {
    player.dude.stop();
  }
}

function move(x, y) {
  if (detectCollision(map.position.x + (x * SPEED), map.position.y + (y * SPEED))) {
   return false;
  }
  map.position.x += x * SPEED;
  map.position.y += y * SPEED;
  return true;
}

function detectCollision(x, y) {
  // console.log((x- player.position.x) * -1 - player._width, (y-player.position.y) * -1 - player._height);
  var flag = false;
  _.each(obstacles, function(obs) {
    if (collides(obs, player.sprite, x, y)) {
      flag = true;
    }
  });
  return flag;
}

function collides(obj, player, offsetX, offsetY) {
  var myX = player.position.x - offsetX;
  var myY = player.position.y - offsetY;
  if (myX + player._width > obj.position.x && myX < obj.position.x + obj._width)
    if (myY + player._height  > obj.position.y && myY < obj.position.y + obj._height)
      return true;

  return false;
}

function rotate(player, desiredRot) {
  if (!desiredRot || desiredRot === player.rotation) return;

  var playRot = toDegrees(player.rotation);
  var desiRot = toDegrees(desiredRot);

  var diff = playRot - desiRot;
  var change = diff < 0 ? 1 : -1;
  if (Math.abs(diff) > 180) change = 0 - change;
  player.rotation += change * Math.PI / 40;
}

function toDegrees(rad) {
  var val = (rad * (180 / Math.PI)) % 360;
  return (val + 360) % 360;
}

window.addEventListener('keydown', function (e) {
  inputs[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  inputs[e.keyCode] = false;
});

function setStartCoords(team, isNew) {
  var startX = team === 'a' ? 40   : 7720;
  var endX   = team === 'a' ? 300  : 7940;
  var startY = team === 'a' ? 760  : 600;
  var endY   = team === 'a' ? 1500 : 1380;

  var x = Math.floor(Math.random() * (endX - startX) + startX);
  var y = Math.floor(Math.random() * (endY - startY) + startY);

  map.position.x = player.sprite.position.x - x;
  map.position.y = player.sprite.position.y - y;
  map.visible = true;

  sendCoords(x, y);

  if (isNew) {
    var nick = names[Math.floor(Math.random() * names.length)];
    socket.emit('chat', { msg: '/setNick ' + nick });
    setNick(nick, player);
  }
}

function setNick(nick, aPlayer) {
  if (!aPlayer || !aPlayer.sprite) return;
  var nickSprite = new PIXI.Text(nick);
  nickSprite.position.x = -nickSprite.width / 2;
  nickSprite.position.y = 35;
  aPlayer.sprite.removeChild(aPlayer.nick);
  aPlayer.nick = nickSprite;
  aPlayer.sprite.addChild(aPlayer.nick);
}

function startIO() {
  socket = io.connect();

  socket.on('conn', function (data) {
    console.log(data);
    gameInProgress = data.go;
    if (!gameInProgress) {
      $('#countdown').text('WAITING FOR PLAYERS');
    }
    var yourTeam = data.team;
    setStartCoords(yourTeam, true);

    for (var key in data.teams.a.users) {
      players[key] = data.teams.a.users[key];
      newNicks[key] = players[key].nickname;
    }
    for (key in data.teams.b.users) {
      players[key] = data.teams.b.users[key];
      newNicks[key] = players[key].nickname;
    }
  });

  socket.on('new', function (data) {
    players[data.id] = data;
  });

  socket.on('dis', function (data) {
    players[data.id].deleted = true;
  });

  socket.on('pos', function (data) {
    players[data.id] = players[data.id] || data;
    getCoords(data.id, data.x, data.y);
  });

  socket.on('countdown', function (data) {
    $('#countdown').text('Game in ' + data.sec);
  });

  socket.on('go', function () {
    $('#countdown').text('GO!!');
    setTimeout(function () {
      $('#countdown').text('');
    }, 1000);
    gameInProgress = true;
  });

  socket.on('stop', function () {
    gameInProgress = false;
    setStartCoords(yourTeam);
    $('#countdown').text('WAITING FOR PLAYERS');
    if (t) clearInterval(t);
    $('#timer').text('');
  });

  socket.on('togo', function (data) {
    setTimer(data.min);
  });

  socket.on('msg', function (data) {
    console.log('msg');
    console.log(data);
    if (data.nick) {
      newNicks[data.id] = data.nick;
    }
  });
}

function sendCoords(x, y) {
  if (!socket) return;
  // console.log(x,y);
  socket.emit('move', {
    x: x,
    y: y
  });
}

function getCoords(id, x, y) {
  players[id].x = x;
  players[id].y = y;
}


var t;
function setTimer(num) {
  var mins = num;
  var secs = 0;
  if (t) clearInterval(t);
  t = setInterval(function () {
    secs -= 1;
    if (secs < 0) {
      secs += 60;
      mins -= 1;
    }
    $('#timer').text(mins + ':' + secs);
  }, 1000);
}
