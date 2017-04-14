//------------------------------------
// DATA
//------------------------------------
import points from './points.js'

//------------------------------------
// LIST
//------------------------------------
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
      renderMap(filtered)
    });

    self.item_select = function(item){
      return select_marker_from_list(item.id)
    }


}
ko.applyBindings(new LocationsViewModel());


// gets tides from worldtides.com
function get_tides(pos){
  const api = `https://www.worldtides.info/api?heights&lat=${pos.lat}&lon=${pos.lng}&key=b2d957df-b47b-42b3-b815-65d0dbcfedcf`
  fetch(api).then(function(response) {
	// Convert to JSON
	return response.json();
  }).then(function(j) {
  	// Yay, `j` is a JavaScript object
  	console.log(j);
  });

}


//------------------------------------
// MAP
//------------------------------------
// Create a map variable
let map, bounds, bubble;
let markers = [];

// Function to initialize the map within the map div
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat:-41.291697, lng:174.783407},
    zoom:14,
    maxZoom: 14,
  });
  // Create a single latLng literal object.
  renderMap(points)
}

function clearPoints(){
  markers.map(m => {
    return m.setMap(null)
  })
  markers = [];
}

function select_marker_from_list(id){
  const point = get_marker_by_id(id)
  populateInfoWindow(point)
  toggleBounce(point)
}

function get_marker_by_id(id){
  return markers.find(m => {
    if(m.id == id){
      return m
    }
  })
}
function get_point_by_id(id){
  return points.find(p => {
    if(p.id == id){
      return p
    }
  })
}

function renderMap(points){
  clearPoints()
  // iterate over points and create all markers
  bubble = new google.maps.InfoWindow()
  bounds = new google.maps.LatLngBounds();
  markers = points.map(p => {
    const marker = new google.maps.Marker({
      position: p.pos,
      map: map,
      animation: google.maps.Animation.DROP,
      title: p.title,
      id: p.id
    });
    bounds.extend(p.pos)
    marker.addListener('click', function() {
      populateInfoWindow(this, bubble);
      this.setAnimation(null)
    });
    return marker
  })
  map.fitBounds(bounds)
  // Opens the infowindow
}

// Turn marker bounce animation on and off
function toggleBounce(m) {
  // first make all stop
  markers.map(point => {
    return point.setAnimation(null)
  })
  // Then start only the onw we want
  m.setAnimation(google.maps.Animation.BOUNCE);
}

function populateInfoWindow(point){
  const pos = get_point_by_id(point.id)
  get_tides(pos.pos)
  if(bubble.marker != point){
    bubble.marker = point;
    bubble.setContent('<div>' + point.title + '</div>');
    bubble.open(map, point);
    bubble.addListener('closeclick', () =>{
      bubble.marker = null;
    });
  }
}

window.initMap = initMap;
