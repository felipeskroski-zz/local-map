//------------------------------------
// IMPORTS
//------------------------------------
// Lib to format dates and time
import moment from 'moment';

// Loads points into the app
import points from './points';
import ko from './knockout/knockout-3.4.2';

//------------------------------------
// Helpers
//------------------------------------
function tideTime(date) {
  // formats dates
  return moment(date).format('Do, h:mm a');
}
// Generates flickr image url
function getFlickrImg(farm, server, id, secret) {
  return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_m.jpg`;
}
// transform title into a parameter
function stringParameterize(str1) {
  return str1.trim().toLowerCase().replace(/[^a-zA-Z0-9 -]/, '').replace(/\s/g, '');
}


//------------------------------------
// API Calls
//------------------------------------
// gets tides from worldtides.com
function getTides(pos) {
  const api = `https://www.worldtides.info/api?extremes&datum=CD&lat=${pos.lat}&lon=${pos.lng}&step=${1800 * 6}&key=b2d957df-b47b-42b3-b815-65d0dbcfedcf`;
  // await response of fetch call
  return fetch(api);
}

// gets images from flickr
function flickrSearch(title, pos) {
  const t = stringParameterize(title);
  const api = `https://api.flickr.com/services/rest/?method=flickr.photos.search&per_page=3lat=${pos.lat}&lon=${pos.lng}&radius=1&api_key=7ef660066ea8d340d7e3d88493181148&tags=surf&text=${t}&format=json&nojsoncallback=1`;
  // await response of fetch call
  return fetch(api);
}


//------------------------------------
// MAP
//------------------------------------
// Create a map variable
let map;
let bounds;
let bubble;
let markers = [];

// map helper: reset all markers
function clearPoints() {
  markers.map(m => m.setMap(null));
  markers = [];
}


// gets a marker in the map by its id
function getMarkerById(id) {
  return markers.find((m) => {
    if (m.id === id) {
      return m;
    }
    return false;
  });
}

// gets a point data obj from points from its id
function getPointById(id) {
  return points.find((p) => {
    if (p.id === id) {
      return p;
    }
    return false;
  });
}

// map helper: reset all markers
function hidePoints(pts) {
  markers.map(m => m.setVisible(false));
  pts.map((p) => {
    const m = getMarkerById(p.id);
    return m.setVisible(true);
  });
}

function renderMap() {
  // first clear all existing markers
  clearPoints();

  // declare info window
  bubble = new google.maps.InfoWindow();

  // declare bounds this is used tu make the map include all points
  bounds = new google.maps.LatLngBounds();

  // iterate over the points to create the marker list
  markers = points.map((p) => {
    const marker = new google.maps.Marker({
      position: p.pos,
      map: map,
      animation: google.maps.Animation.DROP,
      title: p.title,
      id: p.id
    });
    // expand bounds
    bounds.extend(p.pos);
    // handle marker click event
    marker.addListener('click', function () {
      // open info window
      populateInfoWindow(this, bubble);
      // stop bouncing animation
      this.setAnimation(null);
    });
    return marker;
  });
  // change map's zoom level to include all points
  map.fitBounds(bounds);
}

function renderBubble() {
  let imgTag = '';
  let tides = '';
  if (bubble.img) {
    imgTag = `<img width="200" src="${bubble.img}"/>`;
  } else {
    imgTag = '<div> Loading image... </div>';
  }
  if (bubble.tides){
    tides = bubble.tides;
  }else{
    tides = '<div> Loading tides... </div>'
  }
  bubble.setContent(`<div><h3>${bubble.marker.title}</h3>${imgTag}${tides}</div>`);
}
// Populates info window with info related to the point
function populateInfoWindow(point) {
  // gets point info relative to the marker
  const pos = getPointById(point.id);
  // attach infowindow to the current marker
  if (bubble.marker != point) {
    bubble.marker = point;
    // clear bubble data
    bubble.img = false;
    bubble.tides = false;
    // sets content to loading while receives tides and images
    renderBubble()
    bubble.open(map, point);
    // handle close infowindow
    bubble.addListener('closeclick', () => {
      bubble.marker = null;
    });
  }
  // loads image and tides
  flickrSearch(pos.title, pos.pos)
  .then(response => response.json())
  .then((data) => {
    const p = data.photos.photo[0];
    const imgUrl = getFlickrImg(p.farm, p.server, p.id, p.secret);
    bubble.img = imgUrl;
    return renderBubble()
  }).catch(err => 'https://im-1.msw.ms/md/image.php?id=27135&type=PHOTOLAB&resize_type=STREAM_MEDIUM_SQUARE&fromS3');

  getTides(pos.pos)
  .then(response => response.json())
  .then((data) => {
    const tData = data.extremes;
    // this creates the tide list formated
    let tides = `
      <h4>Tides</h4>
      <table class="tide-table">
    `;
    for (let i = 0; i < 6; i++) {
      tides += `
        <tr>
          <td>
            ${tideTime(tData[i].date)}
          </td>
          <td>
           <b>${tData[i].height}</b>
          </td>
          <td>
            ${tData[i].type}
          </td>`;
    }
    tides += '</table>';
    bubble.tides = tides;
    renderBubble()
  }).catch(err => {
    bubble.setContent(`<div><h3>${point.title}</h3> <br>${err.message}</div>`);
  })
  // set content with receved data from apis

}

// map helper: handles list item selection
function selectMarkerFromList(id) {
  const marker = getMarkerById(id);
  const point = getPointById(id);
  console.log(point.pos);
  map.setCenter(marker.position);
  populateInfoWindow(marker);
  toggleBounce(marker);
}


// Function to initialize the map within the map div
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: -41.291697, lng: 174.783407 },
    zoom: 14,
    maxZoom: 14,
  });
  google.maps.event.addDomListener(window, 'resize', function() {
    map.fitBounds(bounds); // `bounds` is a `LatLngBounds` object
  });

  // Add markers to the map
  renderMap();
}

// Turn marker bounce animation on and off
function toggleBounce(m) {
  // first make all stop
  markers.map(point => point.setAnimation(null));
  // Then start only the one we want
  m.setAnimation(google.maps.Animation.BOUNCE);
}


// makes init map a window function this is needed when using webpack
window.initMap = initMap;


//------------------------------------
// LIST
//------------------------------------
// Knockout view model to deal with the list
function LocationsViewModel() {
  const self = this;

  // add points to model
  self.points = ko.observable(points);

  // makes the filter box observable
  self.filter = ko.observable();

  // makes the filter box observable
  self.list_status = ko.observable('');

  // filters list based on filter box
  self.filter.subscribe((value) => {
    // filter points acording to filter box string
    const filtered = points.filter((point) => {
      // normalizes values to lowercase before comparing
      if (point.title.toLowerCase().includes(value.toLowerCase())) {
        return point;
      }
      return false;
    });
    // renders list with filtered result
    self.points(filtered);
    // renders map with the filtered results
    hidePoints(filtered);
  });
  // activate item on click
  self.item_select = function (item) {
    return selectMarkerFromList(item.id);
  };
  // toggle list on mobile views
  self.toggle_list = function () {
    if (self.list_status() == '') {
      self.list_status('collapsed');
    } else {
      self.list_status('');
    }
  };
}
ko.applyBindings(new LocationsViewModel());
