/* global PIXI, $, requestAnimationFrame */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

var inputs = [];
var test;

// You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
var renderer = new PIXI.WebGLRenderer(1400, 600);

$('#view').after(renderer.view);

var stage = new PIXI.Stage();

// var bunnyTexture = PIXI.Texture.fromImage('/img/player.png');
// var bunny = new PIXI.Sprite(bunnyTexture);

var spriteSheet = new PIXI.SpriteSheetLoader('/resources/player.json');
spriteSheet.onLoaded = function () {
  var textures = [];
  for (var i = 0; i < 3; ++i) {
    textures.push(new PIXI.Texture.fromFrame(i));
  }
  test = new PIXI.MovieClip(textures);
  test.animationSpeed = 0.2;
  stage.addChild(test);
};

spriteSheet.load();

requestAnimationFrame(animate);

function animate() {
  renderer.render(stage);
  requestAnimationFrame(animate);

  if (inputs[39]) {
    test.position.x += 2;
    test.play();
  } else {
    test.stop();
  }
}

window.addEventListener('keydown', function (e) {
  inputs[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  inputs[e.keyCode] = false;
});
