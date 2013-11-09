/* global PIXI, $, requestAnimationFrame */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

// You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
var renderer = new PIXI.WebGLRenderer(1400, 600);

$('#view').after(renderer.view);

var stage = new PIXI.Stage();

// var bunnyTexture = PIXI.Texture.fromImage('/img/player.png');
// var bunny = new PIXI.Sprite(bunnyTexture);

var spriteSheet = new PIXI.SpriteSheetLoader('/resources/player.json');
spriteSheet.addEventListener('loaded', function(player){
  var player = new PIXI.Sprite.fromFrame(player.content.json.frames[0].toString());
  stage.addChild(player);
});

spriteSheet.load();

requestAnimationFrame(animate);

function animate() {
  renderer.render(stage);

  requestAnimationFrame(animate);
}
