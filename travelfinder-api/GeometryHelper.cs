using System.Data.Entity.Spatial;

namespace TravelfinderAPI
{
    public class GeometryHelper
    {
        public static DbGeometry CreatePolygon(List<DbGeometry> points)
        {
            if (points == null || points.Count < 3)
            {
                throw new ArgumentException("At least three points are required to create a polygon.");
            }

            // Ensure the polygon is closed by adding the first point at the end if it's not already closed
            if (!points.First().Equals(points.Last()))
            {
                points.Add(points.First());
            }

            // Create the polygon text in Well-Known Text (WKT) format
            var polygonText = "POLYGON((" + string.Join(", ", points.Select(p => $"{p.XCoordinate} {p.YCoordinate}")) + "))";

            // Create the DbGeography polygon
            return DbGeometry.PolygonFromText(polygonText, 4326);
        }

        public static DbGeometry GetCenterPoint(DbGeometry point1, DbGeometry point2)
        {
            if (point1 == null || point2 == null)
            {
                throw new ArgumentException("Both points must be provided.");
            }

            var centerLongitude = (point1.XCoordinate.Value + point2.XCoordinate.Value) / 2;
            var centerLatitude = (point1.YCoordinate.Value + point2.YCoordinate.Value) / 2;

            var centerPointText = $"POINT({centerLongitude} {centerLatitude})";

            return DbGeometry.FromText(centerPointText, 4326);
        }

        public static DbGeometry GetCentroid(List<DbGeometry> points)
        {
            if (points.Count > 2)
            {
                var polygon = CreatePolygon(points);

                return polygon.Centroid;
            }
            else if (points.Count == 2)
            {
                return GetCenterPoint(points[0], points[1]);
            }

            return points.First();
        }
    }
}
