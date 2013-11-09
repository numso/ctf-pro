/* global angular */
angular.module('nko-adalden').directive('header',
  function () {
    'use strict';
    return {
      restrict: 'A',
      controller: 'headerCtrl',
      templateUrl: 'tmpl/header.html'
    };
  }
);
