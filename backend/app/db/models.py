from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geometry
import datetime

Base = declarative_base()

class RoadSegment(Base):
    __tablename__ = 'road_segments'
    id = Column(Integer, primary_key=True)
    osm_id = Column(String, index=True)
    name = Column(String)
    road_type = Column(String)
    lanes = Column(Integer)
    year = Column(Integer)
    geometry = Column(Geometry('LINESTRING'))

class BusStop(Base):
    __tablename__ = 'bus_stops'
    id = Column(Integer, primary_key=True)
    stop_id = Column(String, index=True)
    name = Column(String)
    code = Column(String)
    description = Column(String)
    zone_id = Column(String)
    year = Column(Integer)
    geometry = Column(Geometry('POINT'))

class BusRoute(Base):
    __tablename__ = 'bus_routes'
    id = Column(Integer, primary_key=True)
    route_id = Column(String, index=True)
    name = Column(String)
    agency = Column(String)
    color = Column(String)
    year = Column(Integer)
    geometry = Column(Geometry('LINESTRING'))

class MetroStation(Base):
    __tablename__ = 'metro_stations'
    id = Column(Integer, primary_key=True)
    station_id = Column(String, index=True)
    name = Column(String)
    line_id = Column(String)
    year = Column(Integer)
    geometry = Column(Geometry('POINT'))

class MetroLine(Base):
    __tablename__ = 'metro_lines'
    id = Column(Integer, primary_key=True)
    line_id = Column(String, index=True)
    name = Column(String)
    color = Column(String)
    year = Column(Integer)
    geometry = Column(Geometry('LINESTRING'))

class TrafficSnapshot(Base):
    __tablename__ = 'traffic_snapshots'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    area = Column(String)
    data = Column(JSON) 