require('dotenv').config();

const express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  server = require('http').Server(app),
  request = require('request'),
  io = require('socket.io')(server),
  path = require('path'),
  jwt = require('jsonwebtoken'),
  port = process.env.PORT || 3000,
  morgan = require('morgan'),
  api = 'http://localhost:3100/api',
  secret = process.env.SECRET;

var token;


app.use('/stylesheets',express.static(path.join(__dirname, '../client/stylesheets')));
app.use('/js',express.static(path.join(__dirname, '../client/javascripts')));
app.use('/templates',express.static(path.join(__dirname, '../client/templates')));
app.use('/imgs',express.static(path.join(__dirname, '../client/imgs')));

app.use(morgan('tiny'));
app.use(bodyParser.json());

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '../client/templates', 'base.html'));
});

app.post('/players/new', (req,res) => {
  if (req.body.password !== req.body.confirmation) res.send({error:"Passwords don't match"})
  else {
    var user = JSON.stringify(req.body);
    request.post(api + '/players', {json:user}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
          token = jwt.sign({ id: body.id}, secret);
          delete body.password
          res.json({token:token, player:body});
        }
      else if (response.statusCode == 422){
        res.send({error:'Username already taken'});
      }
      else console.log(error)
    })
  }
});

//REFACTOR --combine with socket registration
app.post('/players/login',(req,res) => {
  var player = JSON.stringify(req.body);
  request.put(api + '/players', {json:player}, (error,response,body) => {
    if (!error && response.statusCode == 200) {
      token = jwt.sign({ id: body.id}, secret);
      delete body.password
      res.json({token:token, player:body});
    }
    else if (response.statusCode == 401) {
      res.send({error:'Invalid credentials'});
    }
    else console.log(error) 
  })
});

// app.get('/players/logout', (req,res) => {
//   res.sendFile(path.join(__dirname, '../client/templates', 'base.html'));
// });

io.on('connection',socket => {

  socket.on('update player', payload => {
    delete payload.player.roads;
    delete payload.player.buildings;
    delete payload.player.hand;
    delete payload.player.resources;
    delete payload.player.opponents;

    var data = JSON.stringify(payload.player);
    request.put(api + '/players/' + payload.player.id, {json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        if (payload.private) socket.emit('player updated',body);
        else if (payload.public) io.sockets.emit('player updated',body);
        else io.to(payload.player.game_id).emit('player updated',body);
      }
      else console.log(error) 
     });
  });

  socket.on('new game', game => {
    var data = JSON.stringify(game);
    request.post(api + '/games',{json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        socket.emit('game created',body)
        io.sockets.emit('new game', body);
      }
      else console.log(error) 
    });
  });
  
  socket.on('joining game', player => {
    socket.join(player.game_id);
    io.sockets.emit('joining game',player)
  });

  socket.on('start game', game => {
    var deck = [
        'hills','hills','hills',
        'forest','forest','forest','forest',
        'mountains','mountains','mountains',
        'fields','fields','fields','fields',
        'pasture','pasture','pasture','pasture',
        'desert'
    ];
    game.deck = shuffle(deck).toString();
    game.open = false
    var data = JSON.stringify(game)
    request.put(api + '/games/' + game.id, {json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        io.to(game.id).emit('starting game',body);
      }
      else
        console.log(error)
    })
  
    function shuffle(arr) {
      arr.forEach((el,i,arr) => {
        randomI = Math.floor(Math.random() * (arr.length - 1))
        arr[i] = arr[randomI];
        arr[randomI] = el;
      })
      return arr;
    }
  });
  
  socket.on('road built',road => {
    var data = JSON.stringify(road)
    request.post(api + '/roads',{json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        io.to(road.game_id).emit('road built',body);
      }
      else
        console.log(error)
    })
  });

  socket.on('settlement built',settlement => {
    var data = JSON.stringify(settlement)
    request.post(api + '/buildings',{json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        io.to(settlement.game_id).emit('settlement built',body);
      }
      else
        console.log(error)
    })
  });

  socket.on('city built',city => {
    var id = city.id;
    delete city.id
    var data = JSON.stringify(city)
    request.put(api + '/buildings' + id,{json:data}, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        io.to(city.game_id).emit('city built',body);
      }
      else
        console.log(error)
    })
  });

  socket.on('turn over', player => {
    request.get(api + '/games/' + player.game_id, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        var game = JSON.parse(body);
        var i = game.players.sort().findIndex(el => el.id === player.id);
        var nextPlayer = game.players[i+1] ? game.players[i+1]: game.players[0];
        io.to(player.game_id).emit('new turn',nextPlayer);
        console.log(nextPlayer);
      }
      else 
        console.log(error)
    });
  });

  socket.on('dice rolled', data => {
    io.emit('dice rolled',data);
  });
  // 'msg' --use old app?
  // 'tradeOffered'
  // 'tradeAccepted'
  // 'building'
  // 'road'
  // 'turnCompleted'
  //'disconection'
});

server.listen(port,()=> console.log(`Listening on port ${port}`));
