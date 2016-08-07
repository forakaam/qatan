from flask import Flask, request
from flask_restful import Resource, Api
from flask_modus import Modus
from flask_bcrypt import Bcrypt
from flask_jwt import JWT, jwt_required, current_identity
from werkzeug.security import safe_str_cmp
from models.shared import db
from models.player import Player, PlayerSchema
from models.game import Game, GameSchema
from models.card import Card, CardSchema
from models.resource import Resource as MyResource, ResourceSchema
from models.road import Road, RoadSchema
from models.building import Building, BuildingSchema

app = Flask(__name__)
api = Api(app)
modus = Modus(app)
bcrypt = Bcrypt(app)

p_schema = PlayerSchema()
g_schema = GameSchema()
r_schema = RoadSchema()
b_schema = BuildingSchema()

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgres://localhost/qatan_api'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
app.config['SECRET_KEY'] = 'not_very_secret_yet'
app.url_map.strict_slashes = False

db.init_app(app)
with app.app_context():
  db.create_all()

def authenticate(username,password):
  player = Player.filter_by(username=username).first()
  if player and safe_str_cmp(player.password.encode('utf-8'), password.encode('utf-8')):
    return player

def identity(payload):
  id = payload['identity']
  return Player.query.get(id)

jwt = JWT(app, authenticate, identity)

class PlayersListApi(Resource):
  def get(self):
    Players = Player.query.all()
    return PlayerSchema.dump(Players, many=True)

  def post(self):
    new_player = p_schema.loads(request.get_json()).data
    if Player.query.filter_by(username=new_player.username).first():
      return '', 422
    new_player.password = bcrypt.generate_password_hash(new_player.password).decode('utf-8')
    db.session.add(new_player)
    db.session.commit()
    return p_schema.dump(new_player)

  def put(self):
    data = p_schema.loads(request.get_json()).data
    player = Player.query.filter_by(username=data.username).first()
    if player and bcrypt.check_password_hash(player.password, data.password):
      return p_schema.dump(player)
    return '', 401

class PlayersApi(Resource):
  def get(self, id):
    return p_schema.dump(Player.query.get_or_404(id))

  def put(self,id): 
    data = p_schema.loads(request.get_json()).data
    if type(data) is dict:
      player = Player.query.get_or_404(data['id'])
      if data.get('username'):
        player.username = data.get('username')
      if data.get('color'):
        player.color = data.get('color')
      if data.get('game_id'):
        player.game_id = data.get('game_id')
      if data.get('socket'):
        player.socket = data.get('socket')
    else:
      player = Player.query.get_or_404(data.id)
      if data.username:
        player.username = data.username
      if data.color:
        player.color = data.color
      if data.game_id:
        player.game_id = data.game_id
      if data.socket:
        player.socket = data.socket

    db.session.add(player)
    db.session.commit()
    return p_schema.dump(player)

class GamesListApi(Resource):


  def post(self):
    game = g_schema.loads(request.get_json()).data
    db.session.add(game)
    db.session.commit()
    return g_schema.dump(game)

  def put(self):
    pass
  # @jwt_required()

class GamesApi(Resource):
  def get(self,id):
    if id == 'open':
       return [g_schema.dump(game) for game in Game.query.filter_by(open=True).all()];
    else:
      return g_schema.dump(Game.query.get_or_404(id))

  def put(self,id): 
    data = g_schema.loads(request.get_json()).data
    if type(data) is dict:
      game = Game.query.get_or_404(data['id'])
      if data.get('open'):
        game.open = data.get('open')
      if data.get('deck'):
        game.deck = data.get('deck')
    else:
      game = Game.query.get_or_404(data.id)
      if data.open:
        game.open = data.open
      if data.deck:
        game.deck = data.deck
    if len([player for player in game.players if player.color]) != len(game.players):
      colors = ['blue','red','yellow','green']
      for player in game.players:
        player.color = colors.pop();
    db.session.add(game)
    db.session.commit()
    return g_schema.dump(game)

class RoadsListApi(Resource):
  def post(self):
    road = Road(**b_schema.loads(request.get_json()).data)
    db.session.add(road)
    db.session.commit()
    return r_schema.dump(road)

class BuildingsListApi(Resource):
  def post(self):
    building = Building(**b_schema.loads(request.get_json()).data)
    db.session.add(building)
    db.session.commit()
    return r_schema.dump(building)

class BuildingsApi(Resource):
  def put(self,id):
    data = Building(**b_schema.loads(request.get_json()).data)
    building = Building.query.get_or_404(id)
    building.building = data.building
    db.session.add(building)
    db.session.commit()
    return b_schema.dump(building)

api.add_resource(PlayersListApi, '/api/players')
api.add_resource(GamesListApi, '/api/games')
api.add_resource(PlayersApi, '/api/players/<id>')
api.add_resource(GamesApi, '/api/games/<id>')
api.add_resource(RoadsListApi, '/api/roads')
api.add_resource(BuildingsListApi, '/api/buildings')
api.add_resource(BuildingsApi, '/api/buildings<id>')



@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  return response

if __name__ == '__main__':
  app.run(debug=True, port=3100, threaded=True)