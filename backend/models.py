from sqlalchemy import Column, Integer, String, ForeignKey, Date, Numeric, Text, Sequence, DateTime, SmallInteger,func, Float

from sqlalchemy.orm import relationship, declarative_base
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
Base= declarative_base()



class VideoGameSale(Base):
    __tablename__ = 'video_game_sales'

    id = Column(Integer, primary_key=True, autoincrement=True)
    rank = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)
    year = Column(Integer)
    genre = Column(String(50))
    publisher = Column(String(100))
    na_sales = Column(Float)
    eu_sales = Column(Float)
    jp_sales = Column(Float)
    other_sales = Column(Float)
    global_sales = Column(Float)

    def __repr__(self):
        return f"<VideoGameSale(name='{self.name}', platform='{self.platform}')>"

from flask_login import UserMixin

class Usuario(Base, UserMixin):
    __tablename__ = 'usuarios'

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
