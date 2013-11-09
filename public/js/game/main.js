/* global PIXI, $, requestAnimationFrame, TESTMAP, io, console, _ */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var names = ['Donut', 'Penguin', 'Stumpy', 'Whicker', 'Shadow', 'Howard', 'Wilshire', 'Darling', 'Disco', 'Jack', 'The Bear', 'Sneak', 'The Big L', 'Whisp', 'Wheezy', 'Crazy', 'Goat', 'Pirate', 'Saucy', 'Hambone', 'Butcher', 'Walla Walla', 'Snake', 'Caboose', 'Sleepy', 'Killer', 'Stompy', 'Mopey', 'Dopey', 'Weasel', 'Ghost', 'Dasher', 'Grumpy', 'Hollywood', 'Tooth', 'Noodle', 'King', 'Cupid', 'Prancer'];
var SPEED = 10;

var assets = ['resources/player.json', 'img/bottom.png', 'img/middle.png'];
var loader = new PIXI.AssetLoader(assets);
loader.onComplete = function () {
  loadGame();
};
loader.load();


var players = {};

var socket;
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
  stage.addChild(player);

  startIO();

  requestAnimationFrame(animate);
}

function createPlayer() {
  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(i));
  }
  var player = new PIXI.MovieClip(playerList);
  player.pivot.x = 10;
  player.pivot.y = 10;
  player.position.x = 700;
  player.position.y = 300;
  player._width = 20;
  player._height = 20;
  player.animationSpeed = 0.2;
  player.scale.x = 2;
  player.scale.y = 2;
  return player;
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
  playerMovement(inputs);
  networkUpdate();
}

function networkUpdate() {
  for (var key in players) {
    var player = players[key];

    if (player.deleted) {
      map.removeChild(player.sprite);
      delete players[key];
      continue;
    }

    if (!player.sprite) {
      player.sprite = createPlayer();
      map.addChild(player.sprite);
      player.sprite.play();
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
    player.play();
    rotate(desiredRot);
    sendCoords(player.position.x - map.position.x, player.position.y - map.position.y);
  } else {
    player.stop();
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
    if (collides(obs, player, x, y)) {
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

function rotate(desiredRot) {
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

  map.position.x = player.position.x - x;
  map.position.y = player.position.y - y;
  map.visible = true;

  sendCoords(x, y);

  if (isNew) {
    var nick = names[Math.floor(Math.random() * names.length)];
    socket.emit('chat', { msg: '/setNic ' + nick });
  }
}

function startIO() {
  socket = io.connect();

  socket.on('conn', function (data) {
    // console.log(data);
    // data.go -- BOOLEAN
    setStartCoords(data.team, true);
    // data.teams.a and .b
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
    console.log('count');
    console.log(data);
  });

  socket.on('go', function (data) {
    console.log('go');
    console.log(data);
  });

  socket.on('msg', function (data) {
    console.log('msg');
    console.log(data);
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
