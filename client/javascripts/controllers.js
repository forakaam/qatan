(function() {
  'use strict';

  angular
    .module('app')
    .controller('AuthController', AuthController)
    .controller('ChallengeController', ChallengeController)
    .controller('GameController', GameController)
    .controller('HexController',HexController)
    .controller('TokenController',TokenController)
    .controller('ControlsController',ControlsController);

  ChallengeController.$inject = ['SocketService','currentPlayer'];
  AuthController.$inject = ['PlayerService','$location'];
  GameController.$inject = ['GameService','HexService','SocketService','currentPlayer'];
  ControlsController.$inject = ['GameService','SocketService','PlayerService'];
  HexController.$inject = ['GameService','HexService','PlayerService','SocketService'];

  function ChallengeController(SocketService,currentPlayer){
    var player = currentPlayer.data;
    var $ctrl = this;
    $ctrl.inGame = false;
    $ctrl.openGames = []
    $ctrl.opponents = [];

    SocketService.challenge(player);
    SocketService.getOpenGames($ctrl.openGames);
    SocketService.getOpponents(player,$ctrl.openGames,$ctrl.opponents);

    $ctrl.newGame = function(name) {
      SocketService.createGame(player,name)
      $ctrl.inGame = true
    };
    
    $ctrl.joinGame = function(game){
      SocketService.joinGame(game,player,$ctrl.opponents);
      $ctrl.inGame = true
    };

  };

  function GameController(GameService,HexService, SocketService,currentPlayer){
    var $ctrl = this;
    $ctrl.roads =0;
    $ctrl.settlements =0;
    $ctrl.cities =0;
    $ctrl.player = currentPlayer.data;
    GameService.init($ctrl,$ctrl.player);
    SocketService.getRoads($ctrl);
    SocketService.getBuildings($ctrl);
    $ctrl.setup = 2;
  };

  function AuthController(PlayerService,$location){
    var $ctrl = this;
    $ctrl.error = ''
    $ctrl.login = function(player){
      PlayerService.login(player).then(res => {
        PlayerService.setCurrent(res.data);
        $location.path('/');
      }).catch(err => console.log(err));
    };
    $ctrl.register = function(newUser){
      PlayerService.register(newUser).then(res => {
        if (res.data.error) $ctrl.error = res.data.error;
        else  {
          $ctrl.error = '';
          PlayerService.setCurrent(res.data);
          $location.path('/');
        };
      }).catch(err => console.log(err));
    };
  };

  function ControlsController(GameService, SocketService,PlayerService){
    var $ctrl = this;
    $ctrl.roads = 0;
    $ctrl.settlements = 0;
    $ctrl.cities = 0;
    $ctrl.extra = 0;
    $ctrl.player = {}
    var current = PlayerService.getCurrent();
    PlayerService.get(current.id).then (data => {
      $ctrl.player = data.data;
      $ctrl.player.fields = 0;
      $ctrl.player.hills = 0;
      $ctrl.player.mountains = 0;
      $ctrl.player.forest = 0;
      $ctrl.player.pasture =0;
    });
    SocketService.getBuildings($ctrl);
    SocketService.getRoads($ctrl);
    SocketService.getTurn($ctrl);
    SocketService.getDiceVals($ctrl);
     
    var canvas1 = document.getElementById("die1");
    var canvas2 = document.getElementById("die2");
    $ctrl.die1 = GameService.createDice(canvas1);
    $ctrl.die2 = GameService.createDice(canvas2);
    $ctrl.rollDice = function(){
      if ($ctrl.turn.id === $ctrl.player.id) {
        var time1 = Math.floor(Math.random() * (1000)) + 1000;
        var time2 = Math.floor(Math.random() * (1000)) + 1000
        $ctrl.die1.roll(time1);
        $ctrl.die2.roll(time2);
        window.setTimeout(()=>{
          SocketService.rollDice({val1: $ctrl.die1.val,val2: $ctrl.die2.val},$ctrl.player);
        },time1 > time2 ? time1 : time2);
      }
    };
    $ctrl.endTurn = function(){
      SocketService.endTurn($ctrl.player);  
    };
  };

  function HexController(GameService,HexService,PlayerService,SocketService){
    var $ctrl = this;
    

    //arrange nodes
    $ctrl.nodes = $ctrl.model.edges.reduce((prev,cur) => prev.concat(cur.nodes),[]);
    if ($ctrl.nodes[1] !== $ctrl.nodes[2] && $ctrl.nodes[1] !== $ctrl.nodes[3]) swap($ctrl.nodes,0,1);
    for (var i = 1; i <  $ctrl.nodes.length -1; i +=2) {
      if ( $ctrl.nodes[i] !==  $ctrl.nodes[i +1]) swap( $ctrl.nodes,i +1, i+2);
    }
    function swap(arr,i,j) {
      var val = arr[i];
      arr[i] = arr[j]
      arr[j] = val;
    }
    $ctrl.nodes = $ctrl.nodes.filter((el,i,arr) => arr.indexOf(el) === i);

    var current = PlayerService.getCurrent();
    PlayerService.get(current.id).then (data => $ctrl.player = data.data);
    SocketService.getTurn($ctrl);


    $ctrl.buildRoad = function(edge){
      if ($ctrl.turn.id === $ctrl.player.id) {
        if ($ctrl.setup && !edge.road) {
          if (GameService.getRoads($ctrl.player.id) - GameService.getSettlements($ctrl.player.id) === 0) {
            SocketService.buildRoad(edge,$ctrl.player);
          }
        }
        else if (GameService.validRoad(edge,$ctrl.player.id) && GameService.hasResources($ctrl.player,'road')) {
          SocketService.buildRoad(edge,$ctrl.player); 
        } 
      } 
    };

    $ctrl.buildBuilding = function(node){
      if ($ctrl.turn.id === $ctrl.player.id) {
        if (GameService.validSettlement(node,$ctrl.player.id)){
          SocketService.buildSettlement(node,$ctrl.player);
          if ($ctrl.setup) {
            $ctrl.setup--;
            SocketService.endTurn($ctrl.player); 
          }
        }
        else if (node.building === 'settlement' && node.player_id === $ctrl.player.id) {
          SocketService.buildCity(node,$ctrl.player);
        }
      }
    };

    $ctrl.log = function(){
      console.log($ctrl.model.terrain);
    };
  };
 
  function TokenController(){
    var $ctrl = this;
  }

})()  