/* global angular */
angular.module('nko-adalden').controller('footerCtrl',
  function ($scope) {
    'use strict';
    $scope.year = (new Date()).getFullYear();
  }
);
