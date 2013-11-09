/* global PIXI, $, requestAnimationFrame */
'use strict';

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) { window.setTimeout(cb, 1000 / 60); };

// You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
var renderer = new PIXI.WebGLRenderer(1400, 600);

$('#view').after(renderer.view);

var stage = new PIXI.Stage();

var bunnyTexture = PIXI.Texture.fromImage('img/top-down_kit.png');
var bunny = new PIXI.Sprite(bunnyTexture);

bunny.position.x = 400;
bunny.position.y = 300;

bunny.scale.x = 2;
bunny.scale.y = 2;

stage.addChild(bunny);

requestAnimationFrame(animate);

function animate() {
  bunny.rotation += 0.01;

  renderer.render(stage);

  requestAnimationFrame(animate);
}
