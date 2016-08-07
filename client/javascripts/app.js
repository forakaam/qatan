(function() {

  angular
    .module("app",['ngRoute'])
    .config(config)
    .run(checkAuth)
    .$inject = ['ngRoute']


  function checkAuth($rootScope, $location, $window, PlayerService, SocketService) {
    $rootScope.$on('$routeChangeStart', function (event, next, current) {
      if (next.private && !$window.localStorage.getItem("token")) $location.path('login')
      if (next.preventWhenLoggedIn && $window.localStorage.getItem("token")) $location.path('/');
    });
  };

  function config ($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider
    .when('/login', {
      templateUrl: 'templates/login.html',
      controller: 'AuthController',
      controllerAs: "$ctrl",
      preventWhenLoggedIn: true
    })
    .when('/', {
      templateUrl: "templates/index.html",
      controller: "ChallengeController",
      controllerAs: "$ctrl",
      private: true,
      resolve: {
        currentPlayer: function(PlayerService) {
          var player = PlayerService.getCurrent();
          return PlayerService.get(player.id);
        }
      }
    }
    )
    .when('/game',{
      templateUrl: "templates/game.html",
      controller: "GameController",
      controllerAs: "$ctrl",
      private: true,
      resolve: {
        currentPlayer: function(PlayerService) {
          var player = PlayerService.getCurrent();
          return PlayerService.get(player.id);        
        },
        firstTurn: function(SocketService,PlayerService) {
          var current = PlayerService.getCurrent();
          return PlayerService.get(current.id)
            .then (res => SocketService.endTurn(res.data)); 
        }
      }
    })
    .when('/logout',{
      private: true,
      resolve: {
        app: function(PlayerService, $location){
          PlayerService.logout();
          $location.path("/");
        }
      }
    })
    .otherwise({redirectTo: '/login'});
    $locationProvider.html5Mode(true);
    $httpProvider.interceptors.push('AuthInterceptor');
  }

})();

//create initial components
function Sea(){} //6
function Harbor(){} //9
function ResourceCard(resource){
  this.resource = resource //brick,grain,lumber,ore
}
function DevelopmentCard(card){  //25
  this.card = card //knight, progress, victory point
}
function BuildingCostCards(){}  //2
function SpecialCards(card){
  this.card = card //longest road, largest army
} //2
function Road(){}
function City(){} //16
function Settlement(){} //20
function Die(){} //2
function Robber(){} //1

function setup(){
  //allow players to place two initial settlemenst  
}
