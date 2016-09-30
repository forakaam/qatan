(function(){
  angular
    .module('app')
    .service('GameService',GameService)
    .service('PlayerService',PlayerService)
    .service('HexService',HexService)
    .service('SocketService',SocketService)
    .service('AuthInterceptor',AuthInterceptor)

  AuthInterceptor.$inject = ['$window','$location'];
  SocketService.$inject = ['$rootScope','GameService','$location'];
  PlayerService.$inject = ['$http', '$window'];
  GameService.$inject = ['$http','PlayerService'];

  function AuthInterceptor($window,$location){
    
    function request(config) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      var token = $window.localStorage.getItem("token");
      if(token)
        config.headers.Authorization = "Bearer " + token;
      return Promise.resolve(config);
    }

    function responseError(error){
      if(error.data === "invalid token" || error.data === "invalid signature" || error.data === "jwt malformed"){
        $location.path("/logout");
        return Promise.reject(error);
      }
      return Promise.reject(error)
    }

    return {request,responseError}
  }  
  //for help in integrating socket.io with angular, thanks to brian ford's guide
  // at http://briantford.com/blog/angular-socket-io

  //REFACTOR -- move most methods to more modular service
  function SocketService($rootScope,GameService,$location){
    var socket = io.connect('http://localhost:3000/');

      //private methods
      function on(e,cb) {
        socket.on(e,data => {
          $rootScope.$apply(() => {
            cb.call(socket,data);
          });
        })
      }
      function emit(e,data,cb) {
        socket.emit(e,data,() => {
          var args = arguments;
          $rootScope.$apply(()=> {
            if (cb) cb.apply(socket,args);
          });
        });
      }

    return {

      //public methods

      challenge(player) {
        player.socket = socket.id;
        emit('update player',{player, public:true});
      },
      createGame(player,name) {
        emit('new game',{name,open:true});
        on('game created',game => {
          player.game_id = game.id;
          emit('update player', {player, public:true});
          emit('joining game', player); 
        });  
      },
      getOpenGames(openGames) {
        GameService.get('open').then(res => {
          res.data.forEach(arr => openGames.push(arr[0]));
        });        
        on('new game',game => openGames.push(game));
        on('starting game', game => {
          var i = openGames.indexOf(game);
          openGames.splice(i,1);
        });
      },
      getOpponents(player,openGames,opponents) {
        on('joining game', opponent =>  {
          if (player.id !== opponent.id) {
            if (opponent.game_id === player.game_id) {
              opponents.push(opponent);
            }
            else  {
              var game = openGames.find(game => game.id === opponent.game_id)
              game.players.push(opponent);
            }
          }
        });
        on('starting game', game => {
          $location.path('/game')
        });
      },
      joinGame(game,player,opponents) {
        player.game_id = game.id
        emit('update player', {player, public:true});
        emit('joining game',player); 
        GameService.get(game.id).then (res => {
          res.data.players.forEach(opponent => {
            if (opponent.id !== player.id) opponents.push(opponent);
          })
          if (opponents.length > 0) { //make customizable?
            $location.path('/game');
            emit('start game',game);
          } 
        });
      },
      endTurn(player) {
        emit('turn over',player);
      },
      getTurn(ctrl) {
        on('new turn', nextPlayer => {
          ctrl.turn = nextPlayer;
        })
      },
      buildRoad(edge,player) {
        var i = GameService.getEdge(edge);
        emit('road built',{index: i,player_id: player.id,game_id:player.game_id});
      },
      getRoads(ctrl) {
        on('road built', road => {
          GameService.buildRoad(road,ctrl);
        });
      },
      buildSettlement(node,player) {
        var i = GameService.getNode(node);
        emit('settlement built',{index: i,player_id: player.id,game_id:player.game_id})
      },
      buildCity(node,player) {
        var i = GameService.getNode(node);
        emit('city built',{index: i, player_id: player.id,game_id:player.game_id,building: 'city',id: node.id})
      },
      getBuildings(ctrl) {
        on('settlement built', settlement => {
          GameService.buildSettlement(settlement,ctrl);
        });
        on('city built', city => {
          GameService.buildCity(city,ctrl)
        });
      },
      rollDice(values,player) {
        var data = {
          values,
          player
        };
        emit('dice rolled', data);
      },
      getDiceVals(ctrl){
        on('dice rolled', data => {
          GameService.getResources(data.values,ctrl.player)
            if (ctrl.player.id !== data.player.id) {
              ctrl.die1.roll(0,data.values.val1);
              ctrl.die2.roll(0,data.values.val2);
            }
          console.log(data.player.username + ' rolled a ' + data.values.val1 + ' and a ' + data.values.val2);
        });
      }
      // tradeOffered: function(){},
      // tradeAccepted: function(){},
      // building: function(){},
      // road: function(){},
      // turnCompleted: function(){}
    // }
    // socket.emit('dice rolled',()=> {

    }
  }
  function PlayerService($http, $window){
    var api = 'http://localhost:3100/api';
    return {
      register(newUser){
        return $http.post('/players/new', newUser);
      },
      login(player){
        return $http.post('/players/login', player);
      },
      logout(){
        $window.localStorage.clear();
      },
      setCurrent(data){
        $window.localStorage.setItem('token',data.token);
        $window.localStorage.setItem('player',JSON.stringify(data.player));
      },
      getCurrent(){
        return JSON.parse($window.localStorage.getItem('player'));
      },
      get(id){
        return $http.get(api + '/players/' + id);
      }
    }
  }

  function DOMService(){
    function index(el){
      var elements = document.getElementsByTagName(el.tagName);
      for (let i = 0; i < elements.length; i++) {
        if (elements[i] === el) return i;
      }
      return -1;
    }

    function get(tag,i){
      return document.getElementsByTagName(tag)[i]
    }
    return {index,get}
  }
  
  function GameService($http,PlayerService){
    
    //for help understanding canvas animations, thanks to the tutorial at
    //http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/

    function Dice(context,width,height,img,framesPerRow=1,ticksPerFrame=0,rows=1) {
      this.context = context;
      this.width = width;
      this.height = height;
      this.img = img;
      this.framesPerRow = framesPerRow;
      this.frameIndex = 0;
      this.tickCount = 0;
      this.ticksPerFrame = ticksPerFrame;
      this.rows = rows;
      this.rowTop = 0;
    }

    Dice.prototype.render = function(){
      this.context.clearRect(0, 0, this.width, this.height);
      this.context.drawImage(
        this.img,
        this.frameIndex * this.width/this.framesPerRow,
        this.rowTop,
        this.width/this.framesPerRow,
        this.height + 200,
        0,
        0,
        this.width/this.framesPerRow,
        this.height)
    };
    Dice.prototype.update = function(){
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
          this.tickCount = 0;
          if (this.frameIndex < this.framesPerRow - 1) this.frameIndex++; 
          else  {
            this.frameIndex = 0;
            if (this.rowTop + this.height/this.rows === this.height) this.rowTop = 0;
            else this.rowTop += this.height/this.rows;
          }
        }
        this.val = this.frameIndex + 1 + (this.rowTop/this.height * this.rows *this.framesPerRow);
    }
    Dice.prototype.roll = function(time,val){
      var repeat = true;

      function loop(){
        if (repeat) {
          this.update();
          this.render();
          window.requestAnimationFrame(loop);
        }
        if (time) window.setTimeout(()=> repeat = false,time);
        else if (this.val === val) repeat = false;
      }

      var loop = loop.bind(this);
   
      window.requestAnimationFrame(loop)

    }
    Dice.prototype.display = function(num) {
      this.frameIndex
    }

    function Player(username,password,color){
      this.username = username
      this.password = password
      this.color = color;
    }
    function Tile(edges){
      this.edges = edges;
      this.terrain = null; // hills,forest,mountains,fields,pasture
      this.val = null;
    }

    function Edge(nodes){
      this.nodes = nodes;
      this.road = null;
      this.player_id = null;
      this.color = 'black'
    }

    function Node(){
      this.edges = [];
      this.building = null;
      this.player_id = null;
      this.color = 'black';
    }
    var api = 'http://localhost:3100/api';
    var nodes = [];
    for (var i = 0; i< 56; i++){
      nodes.push(new Node());
    }
    var edges = [
      new Edge([nodes[0],nodes[1]]),
      new Edge([nodes[1],nodes[2]]),
      new Edge([nodes[2],nodes[3]]),
      new Edge([nodes[3],nodes[4]]),
      new Edge([nodes[4],nodes[5]]),
      new Edge([nodes[5],nodes[0]]),
      new Edge([nodes[2],nodes[6]]),
      new Edge([nodes[6],nodes[7]]),
      new Edge([nodes[7],nodes[8]]),
      new Edge([nodes[8],nodes[9]]),
      new Edge([nodes[9],nodes[3]]),
      new Edge([nodes[7],nodes[10]]),
      new Edge([nodes[10],nodes[11]]),
      new Edge([nodes[11],nodes[12]]),
      new Edge([nodes[12],nodes[13]]),
      new Edge([nodes[13],nodes[8]]),
      new Edge([nodes[14],nodes[5]]),
      new Edge([nodes[4],nodes[15]]),
      new Edge([nodes[15],nodes[16]]),
      new Edge([nodes[16],nodes[17]]),
      new Edge([nodes[17],nodes[14]]),
      new Edge([nodes[9],nodes[18]]),
      new Edge([nodes[18],nodes[19]]),
      new Edge([nodes[19],nodes[15]]),
      new Edge([nodes[13],nodes[20]]),
      new Edge([nodes[20],nodes[21]]),
      new Edge([nodes[21],nodes[18]]),
      new Edge([nodes[12],nodes[22]]),
      new Edge([nodes[22],nodes[23]]),
      new Edge([nodes[23],nodes[24]]),
      new Edge([nodes[24],nodes[20]]),
      new Edge([nodes[25],nodes[17]]),
      new Edge([nodes[16],nodes[26]]),
      new Edge([nodes[26],nodes[27]]),
      new Edge([nodes[27],nodes[28]]),
      new Edge([nodes[28],nodes[25]]),
      new Edge([nodes[19],nodes[29]]),
      new Edge([nodes[29],nodes[30]]),
      new Edge([nodes[30],nodes[26]]),
      new Edge([nodes[21],nodes[31]]),
      new Edge([nodes[31],nodes[32]]),
      new Edge([nodes[32],nodes[29]]),
      new Edge([nodes[24],nodes[33]]),
      new Edge([nodes[33],nodes[34]]),
      new Edge([nodes[34],nodes[31]]),
      new Edge([nodes[23],nodes[35]]),
      new Edge([nodes[35],nodes[36]]),
      new Edge([nodes[36],nodes[37]]),
      new Edge([nodes[37],nodes[33]]),
      new Edge([nodes[30],nodes[38]]),
      new Edge([nodes[38],nodes[39]]),
      new Edge([nodes[39],nodes[40]]),
      new Edge([nodes[40],nodes[27]]),
      new Edge([nodes[32],nodes[41]]),
      new Edge([nodes[41],nodes[42]]),
      new Edge([nodes[42],nodes[38]]),
      new Edge([nodes[34],nodes[43]]),
      new Edge([nodes[43],nodes[44]]),
      new Edge([nodes[44],nodes[41]]),
      new Edge([nodes[37],nodes[45]]),
      new Edge([nodes[45],nodes[46]]),
      new Edge([nodes[46],nodes[43]]),
      new Edge([nodes[42],nodes[47]]),
      new Edge([nodes[47],nodes[48]]),
      new Edge([nodes[48],nodes[49]]),
      new Edge([nodes[49],nodes[39]]),
      new Edge([nodes[44],nodes[50]]),
      new Edge([nodes[50],nodes[51]]),
      new Edge([nodes[51],nodes[47]]),
      new Edge([nodes[46],nodes[52]]),
      new Edge([nodes[52],nodes[53]]),
      new Edge([nodes[53],nodes[50]])
    ];

    var tiles =[
      new Tile([
        edges[0],
        edges[1],
        edges[2],
        edges[3],
        edges[4],
        edges[5]
      ]),

      new Tile([
        edges[6],
        edges[7],
        edges[8],
        edges[9],
        edges[10],
        edges[2]
      ]),

      new Tile([
        edges[11],
        edges[12],
        edges[13],
        edges[14],
        edges[15],
        edges[8]
      ]),

      new Tile([
        edges[16],
        edges[4],
        edges[17],
        edges[18],
        edges[19],
        edges[20],
      ]),

      new Tile([
        edges[3],
        edges[10],
        edges[21],
        edges[22],
        edges[23],
        edges[17]
      ]),

      new Tile([
        edges[9],
        edges[15],
        edges[24],
        edges[25],
        edges[26],
        edges[21]
      ]),

      new Tile([
        edges[14],
        edges[27],
        edges[28],
        edges[29],
        edges[30],
        edges[24]
      ]),

      new Tile([
        edges[31],
        edges[19],
        edges[32],
        edges[33],
        edges[34],
        edges[35]
      ]),

      new Tile([
        edges[18],
        edges[23],
        edges[36],
        edges[37],
        edges[38],
        edges[32]
      ]),

      new Tile([
        edges[22],
        edges[26],
        edges[39],
        edges[40],
        edges[41],
        edges[36]
      ]),
      
      new Tile([
        edges[25],
        edges[30],
        edges[42],
        edges[43],
        edges[44],
        edges[39]
      ]),

      new Tile([
        edges[29],
        edges[45],
        edges[46],
        edges[47],
        edges[48],
        edges[42]
      ]),
      new Tile([
        edges[33],
        edges[38],
        edges[49],
        edges[50],
        edges[51],
        edges[52]
      ]),

      new Tile([
        edges[37],
        edges[41],
        edges[53],
        edges[54],
        edges[55],
        edges[49]
      ]),

      new Tile([
        edges[40], 
        edges[44],
        edges[56],
        edges[57],
        edges[58],
        edges[53]
      ]), 

      new Tile([
        edges[43],
        edges[48],
        edges[59],
        edges[60],
        edges[61],
        edges[56]
      ]),

      new Tile([
        edges[50],
        edges[55],
        edges[62],
        edges[63],
        edges[64],
        edges[65]
      ]),

      new Tile([
        edges[54],
        edges[58],
        edges[66],
        edges[67],
        edges[68],
        edges[62]
      ]),

      new Tile([
        edges[57],
        edges[61],
        edges[69],
        edges[70],
        edges[71],
        edges[66],
      ])
    ];



    //public methods
    return {
      init(ctrl,player) {

        ctrl.tiles = tiles;
        this.get(player.game_id).then (res => {
          var numberTokens = [5, 10, 8, 2, 9, 11, 4, 6, 4, 3, 11, 3, 5, 6, 12, 8, 10, 9],
            deck = res.data.deck.split(',');

          ctrl.tiles.forEach(tile => {
            tile.terrain = deck.shift(); 
            tile.val = tile.terrain === 'desert' ? 'robber' :  numberTokens.shift(); 
            tile.edges.forEach(edge => {
              edge.nodes.forEach(node => {
                if (node.edges.indexOf(edge) == -1) {
                  node.edges.push(edge);
                }
              });
            });
          });
        });
      },
      getNode(node){
        return nodes.reduce((prev,cur,i) => {
          if (cur === node) return i;
          else return prev;
        },-1);
      },
      validRoad(edge,id){
        if (!edge.road) {
          if (edge.nodes.find(node => node.player_id === id)) return true;
          return edge.nodes.filter(node => !node.player_id).reduce((prev,cur) => {
             if (cur.edges.find(edge => edge.player_id === id)) return true
             else return prev;
          },false);
        }
        return false
      },
      validSettlement(node,id) { 
        return !node.building && node.edges.find(edge => edge.player_id === id);
      },
      hasResources(player,construction){
        if (construction === 'road'){
          if (player.hills && player.forest) {
            player.hills--;
            player.forest--;
            return true;
          }  
        }
        else if (construction === 'settlement'){
          if (player.hills && player.forest && player.pasture && player.fields) {
            player.hills--;
            player.forest--;
            player.pasture--;
            player.fields--;
            return true;
          }
        }
        else if (construction === 'city'){
          if (player.mountains > 2 && player.fields > 1) {
            player.mountains -=3 ;
            player.fields -= 2;
            return true;
          }
        }
        debugger;
        return false;
      },
      buildRoad(road,ctrl) {
        if (road.player_id === ctrl.player.id) ctrl.roads++;
        PlayerService.get(road.player_id).then(res => {
          edges[road.index].color = res.data.color;
          edges[road.index].road = true;
          edges[road.index].player_id = road.player_id;
        })
      },
      buildSettlement(building,ctrl) {
        if (building.player_id === ctrl.player.id) ctrl.settlements++;
        PlayerService.get(building.player_id).then(res => {
          nodes[building.index].color = res.data.color;
          nodes[building.index].building = 'settlement';
          nodes[building.index].id = building.id
          nodes[building.index].player_id = building.player_id;

        })
      },
      buildCity(city,ctrl) {
        if (city.player_id === ctrl.player.id) ctrl.cities++;
        nodes[city.index].building = 'city';
      },
      getEdge(edge){
        return edges.reduce((prev,cur,i) => {
          if (cur === edge) return i;
          else return prev;
        },-1);
      },
      createDice(canvas){
        var img = new Image;
        img.src = '/imgs/pieces/dice.png';
        return new Dice(canvas.getContext('2d'),671,448,img,3,2,2); 
      },
      get(id) {
        return $http.get(api + '/games/' + id)
      },
      getResources(values,player) {
        tiles.filter(tile => tile.val === values.val1 + values.val2)
        .forEach(tile => {tile.edges
          .reduce((arr,edge) => arr.concat(edge.nodes),[])
          .filter((node,i,arr) => arr.indexOf(node) === i && node.player_id === player.id)
          .forEach(node => {
            player[tile.terrain]++;
            if (node.building === 'city') player[tile.terrain]++;
          });
        })
      },
      getRoads(id){
        return edges.filter(edge => edge.player_id === id).length;
      },
      getCities(id){
        return edges.filter(node => node.player_id === id && node.building === 'city').length;
      },
      getSettlements(id){
        return nodes.filter(node => node.player_id === id && node.building === 'settlement').length
      },
    }
  }

  function HexService(){
  
    //private methods



    return {   
      create(deck,val,nodes){
        // var deck = []
        // return new Tile(terrain,val)
      }
    };
  }
})()

