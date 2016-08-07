from models.shared import db
from marshmallow import Schema, fields, post_load

class Building(db.Model):

  __tablename__ = "buildings"
  
  id = db.Column(db.Integer, primary_key=True)
  index = db.Column(db.Integer)
  player_id = db.Column(db.Integer, db.ForeignKey('players.id'))
  building = db.Column(db.String)

  def __init__(self,index,player_id,building="Settlement"):
    self.index = index
    self.player_id = player_id

class BuildingSchema(Schema):
  id = fields.Int()
  index = fields.Int()
  player_id = fields.Int();
  building = fields.Str();



@post_load
def make_building(self, **kwargs):
  return Building(**kwargs)
