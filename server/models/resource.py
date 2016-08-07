from models.shared import db
from marshmallow import Schema, fields

class Resource(db.Model):

  __tablename__ = "resources"

  id = db.Column(db.Integer, primary_key=True)
  type = db.Column(db.Text)
  user_id = db.Column(db.Integer, db.ForeignKey('players.id'))
  building_id = db.Column(db.Integer, db.ForeignKey('buildings.id'))

  def __init__(self,type,**kwargs):
    self.type = type


class ResourceSchema(Schema):
  id = fields.Int()
  type = fields.Str()