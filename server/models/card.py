from models.shared import db
from marshmallow import Schema, fields

class Card(db.Model):

  __tablename__ = "cards"
  
  id = db.Column(db.Integer, primary_key=True)
  func = db.Column(db.String)
  power = db.Column(db.Integer)
  description = db.Column(db.String)
  user_id = db.Column(db.Integer, db.ForeignKey('players.id'))

  def __init__(self,func,power,edge,**kwargs):
    self.func = func
    self.power = power
    self.edge = edge


class CardSchema(Schema):
  id = fields.Int()
  func = fields.Str()
  power = fields.Int()
  description = fields.Str()