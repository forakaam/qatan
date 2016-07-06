(function() {

  angular
    .module("app",['ngRoute'])
    .config(config)
    .$inject = ['ngRoute'];

  function config ($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider
    .when('/',{
      templateUrl: "templates/index.html",
      controller: "MainController",
      controllerAs: "vm",
    })
    .otherwise({redirectTo: '/'});
    $locationProvider.html5Mode(true);
  }

})();

//create initial components
function Board(){}
function Player(){
  this.settlements = new Array(5).fill(new Settlement())
  this.cities = new Array(4).fill(new City())
  this.roads = new Array(15).fill(new Road())
}
function Hand(){}
function Deck(){} //maybe
function Tile(terrain,productivity){
  this.terrain = terrain // hills,forest,mountains,fields,pasture
  this.productivity = productivity
} //18
function Sea(){} //6
function Harbor(){} //9
function NumberToken(){} //18
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

function init(){
  //create board, place tiles, and create players
}
function setup(){
  //allow players to place two initial settlemenst  
}
