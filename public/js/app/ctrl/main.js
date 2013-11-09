/* global angular */
angular.module('nko-adalden').controller('mainCtrl',
  function ($scope, socket) {
    'use strict';
    $scope.msg = 'Here\'s the index. Publicly available to all. ';

    socket.forward('alert', $scope);
    $scope.$on('socket:alert', function (e, data) {
      $scope.msg += data.msg;
    });
  }
);
