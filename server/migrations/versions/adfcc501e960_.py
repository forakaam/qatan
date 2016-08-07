"""empty message

Revision ID: adfcc501e960
Revises: 818f3c03a937
Create Date: 2016-07-19 13:42:34.968042

"""

# revision identifiers, used by Alembic.
revision = 'adfcc501e960'
down_revision = '818f3c03a937'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('roads', sa.Column('color', sa.String(), nullable=True))
    op.add_column('roads', sa.Column('index', sa.Integer(), nullable=True))
    op.drop_column('roads', 'hexagon')
    op.drop_column('roads', 'side')
    op.drop_column('roads', 'row')
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('roads', sa.Column('row', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('roads', sa.Column('side', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('roads', sa.Column('hexagon', sa.INTEGER(), autoincrement=False, nullable=True))
    op.drop_column('roads', 'index')
    op.drop_column('roads', 'color')
    ### end Alembic commands ###