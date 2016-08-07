from models.shared import db
from marshmallow import Schema, fields, post_load
from models.player import PlayerSchema

class Game(db.Model):

  __tablename__ = "games"

  id = db.Column(db.Integer, primary_key=True)
  open = db.Column(db.Boolean)
  name = db.Column(db.Text)
  deck = db.Column(db.Text);
  players = db.relationship('Player', backref='game', lazy='joined')


class GameSchema(Schema):
  id = fields.Int()
  name = fields.Str()
  deck = fields.Str()
  open = fields.Bool()
  players = fields.Nested(PlayerSchema, many=True)

  @post_load
  def make_game(self, kwargs):
    return Game(**kwargs)
