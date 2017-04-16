//------------------------------------
// IMPORTS
//------------------------------------
// Loads points into the app
import points from './points.js'
// Lib to format dates and time
import moment from 'moment'


//------------------------------------
// LIST
//------------------------------------
// Knockout view model to deal with the list
function LocationsViewModel() {
  var self = this;
  // add points to model
  self.points = ko.observable(points);
  // makes the filter box observable
  self.filter = ko.observable()

  // filters list based on filter box
  self.filter.subscribe(function(value) {
    // filter points acording to filter box string
    let filtered = points.filter(function(point){
      // normalizes values to lowercase before comparing
      if(point.title.toLowerCase().includes(value.toLowerCase()) ){
        return point;
      }
    });
    // renders list with filtered result
    self.points(filtered)
    // renders map with the filtered results
    renderMap(filtered)
  });
  // activate item on click
  self.item_select = function(item){
    return select_marker_from_list(item.id)
  };
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
  // if data gets loaded
  try{
    let data = await response.json();
    const t_data = data.extremes;
    // this creates the tide list formated
    let tides = "<h4>Tides</h4>"
    t_data.forEach(t => {
      tides += `${tide_time(t.date)}: <b>${t.height}</b> ${t.type}<br> `
    })
    return tides;
  // in case of an error returns the error msg
  }catch(e){
    console.log(e.message)
    return `Error: ${e.message}`;
  }
}

// gets images from flickr
async function flickr_search(title, pos){
  const t = string_parameterize(title)
  const api = `https://api.flickr.com/services/rest/?method=flickr.photos.search&per_page=3lat=${pos.lat}&lon=${pos.lng}&radius=1&api_key=7ef660066ea8d340d7e3d88493181148&tags=surf&text=${t}&format=json&nojsoncallback=1`;
  // await response of fetch call
  let response = await fetch(api);
  let data = await response.json();
  console.log(data)
  let p = await data.photos.photo[0]
  // if image comes from flickr show it
  try{
    let img_url = await get_flickr_img(p.farm, p.server, p.id, p.secret)
    return img_url;
  //if no image comes use generic image
  // TODO get a better generic image
  }catch(e){
    return "https://im-1.msw.ms/md/image.php?id=27135&type=PHOTOLAB&resize_type=STREAM_MEDIUM_SQUARE&fromS3";
  }
}



//------------------------------------
// Helpers
//------------------------------------
function tide_time(date) {
  //formats dates
  return moment(date).format('Do, h:mm a');
}
// Generates flickr image url
function get_flickr_img(farm, server, id, secret){
  return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_m.jpg`;
}
// transform title into a parameter
function string_parameterize(str1) {
    return str1.trim().toLowerCase().replace(/[^a-zA-Z0-9 -]/, "").replace(/\s/g, "");
};

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
  // Add markers to the map
  renderMap(points)
}

// map helper: reset all markers
function clearPoints(){
  markers.map(m => {
    return m.setMap(null)
  })
  markers = [];
}
// map helper: handles list item selection
function select_marker_from_list(id){
  const point = get_marker_by_id(id)
  populateInfoWindow(point)
  toggleBounce(point)
}

// gets a marker in the map by its id
function get_marker_by_id(id){
  return markers.find(m => {
    if(m.id == id){
      return m
    }
  })
}

// gets a point data obj from points from its id
function get_point_by_id(id){
  return points.find(p => {
    if(p.id == id){
      return p
    }
  })
}

function renderMap(points){
  // first clear all existing markers
  clearPoints()
  // declare info window
  bubble = new google.maps.InfoWindow()
  // declare bounds this is used tu make the map include all points
  bounds = new google.maps.LatLngBounds();
  // iterate over the points to create the marker list
  markers = points.map(p => {
    const marker = new google.maps.Marker({
      position: p.pos,
      map: map,
      animation: google.maps.Animation.DROP,
      title: p.title,
      id: p.id
    });
    // expand bounds
    bounds.extend(p.pos)
    // handle marker click event
    marker.addListener('click', function() {
      // open info window
      populateInfoWindow(this, bubble);
      // stop bouncing animation
      this.setAnimation(null)
    });
    return marker
  })
  // change map's zoom level to include all points
  map.fitBounds(bounds)
}

// Turn marker bounce animation on and off
function toggleBounce(m) {
  // first make all stop
  markers.map(point => {
    return point.setAnimation(null)
  })
  // Then start only the one we want
  m.setAnimation(google.maps.Animation.BOUNCE);
}

// Populates info window with info related to the point
async function populateInfoWindow(point){
  // gets point info relative to the marker
  const pos = get_point_by_id(point.id)
  // attach infowindow to the current marker
  if(bubble.marker != point){
    bubble.marker = point;
    // sets content to loading while receives tides and images
    bubble.setContent(`<div><h3>${point.title}</h3> <br>Loading tides ...</div>`);
    bubble.open(map, point);
    // handle close infowindow
    bubble.addListener('closeclick', () =>{
      bubble.marker = null;
    });
  }
  // loads image and tides
  const image = await flickr_search(pos.title, pos.pos)
  const tides = await get_tides(pos.pos)
  // set content with receved data from apis
  bubble.setContent(`<div><h3>${point.title}</h3><img height="100" src="${image}"/>${tides}</div>`);

}
// makes init map a window function this is needed when using webpack
window.initMap = initMap;
