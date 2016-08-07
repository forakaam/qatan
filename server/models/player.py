from models.shared import db
from models.building import BuildingSchema
from models.card import CardSchema
from models.resource import ResourceSchema
from models.road import RoadSchema
from marshmallow import Schema, fields, post_load

opponents = db.Table('opponents',
  db.Column('player_id', db.Integer, db.ForeignKey('players.id'),primary_key=True),
  db.Column('opponent_id', db.Integer, db.ForeignKey('players.id'),primary_key=True)
)
class OpponentSchema(Schema):
  player_id = fields.Int()
  opponent_id = fields.Int()

class Player(db.Model):

  __tablename__ = "players"
  
  id = db.Column(db.Integer, primary_key=True)
  username = db.Column(db.Text)
  password = db.Column(db.Text)
  color = db.Column(db.Text)
  socket = db.Column(db.Text)
  game_id = db.Column(db.Integer, db.ForeignKey('games.id'))
  buildings = db.relationship('Building', backref='player', lazy='joined')
  hand = db.relationship('Card', backref='player', lazy='joined')
  resources = db.relationship('Resource', backref='player', lazy='joined')
  roads = db.relationship('Road', backref='player', lazy='joined')
  opponents = db.relationship('Player', secondary=opponents, primaryjoin=id==opponents.c.player_id,
    secondaryjoin=id==opponents.c.opponent_id, backref=db.backref('players', lazy='dynamic'))
        

  def __init__(self,username,password,color=None,socket=None,id=None,game_id=None,**kwargs):
    # buildings=[],hand=[],resources=[],roads=[],opponents=[]
    self.username = username
    self.password = password
    self.color = color
    self.socket = socket
    self.id =id
    self.game_id = game_id
    # self.buildings = buildings
    # self.hand = hand
    # self.resources = resources
    # self.roads = roads
    # self.opponents = opponents


class PlayerSchema(Schema):
  id = fields.Int()
  username = fields.Str()
  password = fields.Str()
  color = fields.Str()
  socket = fields.Str()
  game_id = fields.Int();
  buildings = fields.Nested(BuildingSchema, many=True)
  hand = fields.Nested(CardSchema, many=True)
  resources = fields.Nested(ResourceSchema, many=True)
  roads = fields.Nested(RoadSchema, many=True)
  opponents = fields.Nested(OpponentSchema, many=True)

  @post_load
  def make_player(self, kwargs):
    return Player(**kwargs)
