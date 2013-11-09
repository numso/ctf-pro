/* global PIXI, requestAnimationFrame */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

// You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
var renderer = new PIXI.WebGLRenderer(800, 600);

document.body.appendChild(renderer.view);

var stage = new PIXI.Stage;

// var bunnyTexture = PIXI.Texture.fromImage('/img/player.png');
// var bunny = new PIXI.Sprite(bunnyTexture);

var spriteSheet = new PIXI.SpriteSheetLoader('/resources/player.json');
spriteSheet.addEventListener('loaded', function(player){
  var playerList = [];
  for (var n = 0; n < 3; ++n) {
    playerList.push(PIXI.Texture.fromFrame(n));
  }
  var player = new PIXI.MovieClip(playerList);
  stage.addChild(player);
  player.animationSpeed = .1;
  player.play();
});

spriteSheet.load();

requestAnimationFrame(animate);

function animate() {
  renderer.render(stage);

  requestAnimationFrame(animate);
}
