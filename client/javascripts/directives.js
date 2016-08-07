(function() {
  'use strict';

  angular
    .module('app')
    .component('hex', {
      controller: 'HexController',
      templateUrl: '/templates/hex.html',
      bindings: {
        model: '=',
        setup: '='
      }
    })
    .component('token', {
      bindings: {
        val: '@'
      },
      controller: 'TokenController',
      template: '{{$ctrl.val}}'
    })
    .component('controls', {
      bindings: {
        msg:'@',
        cities:'<'
      },
      templateUrl: '/templates/controls.html',
      controller: 'ControlsController',
    });
})()  