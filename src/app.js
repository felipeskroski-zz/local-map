//------------------------------------
// DATA
//------------------------------------
import points from './points.js'
import moment from 'moment'
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

//------------------------------------
// API Calls
//------------------------------------
// gets tides from worldtides.com
async function get_tides(pos) {
  const api = `https://www.worldtides.info/api?extremes&datum=CD&lat=${pos.lat}&lon=${pos.lng}&step=${1800*6}&key=b2d957df-b47b-42b3-b815-65d0dbcfedcf`
  // await response of fetch call
  let response = await fetch(api);
  // only proceed once promise is resolved
  let data = await response.json();
  // only proceed once second promise is resolved

  return data.extremes;
}

function get_flickr_img(farm, server, id, secret){
  return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_m.jpg`;
}

function string_parameterize(str1) {
    return str1.trim().toLowerCase().replace(/[^a-zA-Z0-9 -]/, "").replace(/\s/g, "");
};

async function flickr_search(title, pos){
  const t = string_parameterize(title)
  const api = `https://api.flickr.com/services/rest/?method=flickr.photos.search&per_page=3lat=${pos.lat}&lon=${pos.lng}&radius=1&api_key=7ef660066ea8d340d7e3d88493181148&tags=surf&text=${t}&format=json&nojsoncallback=1`;
  // await response of fetch call
  let response = await fetch(api);
  // only proceed once promise is resolved
  let data = await response.json();
  // only proceed once second promise is resolved
  let p = await data.photos.photo[0]
  let img_url = get_flickr_img(p.farm, p.server, p.id, p.secret)
  return img_url;

}



//------------------------------------
// Helpers
//------------------------------------
function tide_time(date) {
  return moment(date).format('Do, h:mm a');
}
function tide_hr(date) {
  let dt = new Date(date)
  // Convert back to days and return
  return dt.getHours()
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

async function populateInfoWindow(point){
  const pos = get_point_by_id(point.id)
  if(bubble.marker != point){
    bubble.marker = point;
    bubble.setContent(`<div><h3>${point.title}</h3> <br>Loading tides ...</div>`);
    bubble.open(map, point);
    bubble.addListener('closeclick', () =>{
      bubble.marker = null;
    });
  }
  const image = await flickr_search(pos.title, pos.pos)
  const tides = get_tides(pos.pos)
  .then(data =>{
    console.log(data)
    let tides = "<h4>Tides</h4>"
    data.forEach(t => {
      tides += `${tide_time(t.date)}: <b>${t.height}</b> ${t.type}<br> `
    })
    bubble.setContent(`<div style="height: 500px; overflow: hidden;"><h3>${point.title}</h3><br><img src="${image}"/> <br>${tides}</div>`);
  }).catch(
    err => {
      bubble.setContent(`<div><h3>${point.title}</h3> <br>Error: ${err.message}</div>`);
      console.log(err.message)
    }
  )

}

window.initMap = initMap;
