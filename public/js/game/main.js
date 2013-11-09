/* global PIXI, $, requestAnimationFrame, TESTMAP */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var SPEED = 10;

var assets = ['resources/player.json', 'img/bottom.png', 'img/middle.png'];
var loader = new PIXI.AssetLoader(assets);
loader.onComplete = function () {
  loadGame();
};
loader.load();


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

  requestAnimationFrame(animate);
}

function createPlayer() {
  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(i));
  }
  var player = new PIXI.MovieClip(playerList);
  player.pivot.x = 12;
  player.pivot.y = 12;
  player.position.x += 700;
  player.position.y += 300;
  player._width = 40;
  player._height = 40;
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
}

function playerMovement(inputs) {
  var moved = false;
  if (inputs[37] && move(1, 0))  moved = true;
  if (inputs[39] && move(-1, 0)) moved = true;
  if (inputs[38] && move(0, 1))  moved = true;
  if (inputs[40] && move(0, -1)) moved = true;

  var fn = moved ? 'play' : 'stop';
  player[fn]();
  rotate(0);
}

function move(x, y) {
  if (detectCollision(map.position.x + x, map.position.y + y)){
   return false; 
  }
  map.position.x += x * SPEED;
  map.position.y += y * SPEED;
  return true;
}

function detectCollision(x, y) {
  // console.log((x- player.position.x) * -1 - player._width, (y-player.position.y) * -1 - player._height);
  _.each(obstacles, function(obs) {
    if (collides(obs, player, x, y)) return true;
  });
  return false;
}
  
function collides(obj, player, offsetX, offsetY) {
  if(((offsetX - player.position.x) * -1) - player._width > obj.x && offsetX - player.position.x < obj.position.x + obj._width) {
    console.log('inside the first group');
    if(((offsetY - player.position.y) * -1) - player._height  > obj.position.y && offsetY - player.position.y < obj.position.y + obj._height) {
      console.log('inside the second group');
      return true;
    }
  }
  return false;
};

function rotate(desiredRot) {
  player.rotation = desiredRot;
}

window.addEventListener('keydown', function (e) {
  inputs[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  inputs[e.keyCode] = false;
});
