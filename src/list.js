import points from './points.js'
function LocationsViewModel() {
    var self = this;
    // add points to model
    self.points = ko.observable(points);
    self.filter = ko.observable()

    // filters list based on search box
    self.filter.subscribe(function(value) {
      let filtered = points.filter(function(point){
        if(point.title.toLowerCase().includes(value.toLowerCase()) ){
          return point
        }
      })
      self.points(filtered)
      renderPoints(filtered)
    });


}
ko.applyBindings(new LocationsViewModel());


// Create a map variable
let map;
let markers = [];
// Function to initialize the map within the map div
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat:-41.291697, lng:174.783407},
    zoom:14,
    maxZoom: 14,
  });
  // Create a single latLng literal object.
  renderPoints(points)

}
function clearPoints(){
  markers.map(m => {
    return m.setMap(null)
  })
  markers = [];
}
function renderPoints(points){
  clearPoints()
  // iterate over points and create all markers
  let bubble = new google.maps.InfoWindow()
  let bounds = new google.maps.LatLngBounds();
  markers = points.map(p => {
    const marker = new google.maps.Marker({
      position: p.pos,
      map: map,
      title: p.title
    });
    bounds.extend(p.pos)
    marker.addListener('click', function() {
      populateInfoWindow(this, bubble);
    });
    return marker
  })
  map.fitBounds(bounds)
  // Opens the infowindow
}

function populateInfoWindow(point, infowindow){
  if(infowindow.marker != point){
    infowindow.marker = point;
    infowindow.setContent('<div>' + point.title + '</div>');
    infowindow.open(map, point);
    infowindow.addListener('closeclick', () =>{
      infowindow.marker = null;
    });
  }
}

window.initMap = initMap;
