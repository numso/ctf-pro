/* global angular */
angular.module('nko-adalden', ['ui.bootstrap', 'ui.router', 'btford.socket-io']).config(
  function ($stateProvider, $urlRouterProvider) {
    'use strict';

    $stateProvider.state('index', {
      templateUrl: 'tmpl/main.html',
      controller: 'mainCtrl',
      url: '/'
    });

    $urlRouterProvider.otherwise('/');
  }
).run(function (socket) {
  'use strict';
  socket.forward('error');
});
