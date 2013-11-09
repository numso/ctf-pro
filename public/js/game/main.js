/* global PIXI, $, requestAnimationFrame */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var inputs = [];
var player;

// You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
var renderer = new PIXI.WebGLRenderer(1400, 600);

$('#view').after(renderer.view);

var stage = new PIXI.Stage();

// var bunnyTexture = PIXI.Texture.fromImage('/img/player.png');
// var bunny = new PIXI.Sprite(bunnyTexture);

var spriteSheet = new PIXI.SpriteSheetLoader('/resources/player.json');
spriteSheet.onLoaded = function () {
  var playerList = [];
  for (var i = 0; i < 3; ++i) {
    playerList.push(new PIXI.Texture.fromFrame(i));
  }
  player = new PIXI.MovieClip(playerList);
  player.pivot.x = 12;
  player.pivot.y = 12;
  player.position.x += 12;
  player.position.y += 12;

  player.animationSpeed = 0.2;
  stage.addChild(player);
};

spriteSheet.load();
requestAnimationFrame(animate);

function animate() {
  renderer.render(stage);
  requestAnimationFrame(animate);
  playerMovement(inputs);
}

function playerMovement(inputs) {
  if (inputs[39]) {
    player.position.x += 2;
    player.rotation = 0;
    player.play();
  } else if(inputs[37]) {
    player.position.x -= 2;
    player.rotation = Math.PI;
    player.play();
  } else if(inputs[38]) {
    player.position.y -= 2;
    if (player.rotation > -1.5) {
      player.rotation -= .08;
    }
    player.play();
  } else if (inputs[40]) {
    player.position.y += 2;

    if (player.rotation < 1.7) {
      player.rotation += .08;
    }
    player.play();
  } else {
    player.stop();
  }
}

window.addEventListener('keydown', function (e) {
  inputs[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  inputs[e.keyCode] = false;
});
