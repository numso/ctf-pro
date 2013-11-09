/* global angular */
angular.module('nko-adalden').directive('footer',
  function () {
    'use strict';
    return {
      restrict: 'A',
      controller: 'footerCtrl',
      templateUrl: 'tmpl/footer.html'
    };
  }
);
