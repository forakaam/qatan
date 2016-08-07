from models.shared import db
from marshmallow import Schema, fields, post_load

class Road(db.Model):

  __tablename__ = "roads"

  id = db.Column(db.Integer, primary_key=True)
  index = db.Column(db.Integer)
  player_id = db.Column(db.Integer, db.ForeignKey('players.id'))


  def __init__(self,index,player_id,**kwargs):
    self.index = index
    self.player_id = player_id


class RoadSchema(Schema):
  id = fields.Int()
  index = fields.Int()
  player_id = fields.Int()

@post_load
def make_road(self, kwargs):
  return Road(**kwargs)
