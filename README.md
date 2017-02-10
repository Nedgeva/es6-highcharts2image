# highcharts2image

> Render Highcharts/Highstock plots to image on client side without any hassle

## Description

highcharts2image is standalone micro library written in pure JS (ES6) using Promises, runs in browser and requires no extra dependencies (actually it loads all necessary depedencies by itself). Just pass chart options to highcharts2image and it will resolve base64 encoded PNG image. Can be tweaked to use this lib locally without internet connection.

## How it works

  0. highcharts2image takes options and returns Promise object
  1. highcharts2image creates 1px*1px hidden iframe right before </body>
  2. adds window.onmessage listener
  3. appends <div> container to iframe body with provided width and height
  4. injects 3 scripts into created iframe and loads them sequentially (highcharts/highstock lib, exporting and offline-exporting JS libs)
  5. renders chart based on provided options to <div> container
  6. optionally runs callback with created chart object (very useful option!)
  7. internally converts rendered svg chart to base64 encoded pnd image (thanks to exporting and offline-exporting JS libs)
  8. sends image back to highcharts2image via window.postMessage()
  9. removes attached window.onmessage listener
  10. removes created iframe
  11. resolves base64 encoded pnd image as value or rejects with error message

## Installation

    git clone
    npm install

## Usage
You can use pre-built (ES6 transpiled to ES5 with Babel) minified version from 'dist/highcharts2image.min.js'. Simply attach highcharts2image to the bottom of your page and call it like this:
```html
<script src="../dist/highcharts2image.min.js"></script>
<script>
  // Any valid HighCharts plot options is ok
  const chartOptions = {
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', ... ]
    },
    series: [{
      data: [29.9, 71.5, 106.4, ... ]
    }]
  } 
  
  // highcharts2image options
  const options = {
    chartOptions,
    width: 800,
    height: 600
  }
  
  // call highCharts2Image and wait for result
  highCharts2Image(options)
      .then(result => {
        // 'result' is the base64 encoded png
      })
      .catch(reason => {
        // Oops, we've got an error!
        // reason is the string with useful information about error
      })
</script>
```

## API

### highCharts2Image(options)
Returns Promise that will be fullfiled with base64 encoded png or rejected with error explanation.
Takes single `options` {Object} argument with only one required property 'chartOptions':
{

- `chartOptions` {Object}  - Highcharts/Highstock options
- [`chartEngine`] {String} - use 'highcharts' or 'highstock' plot engine (default is 'highcharts')
- [`chartEngineVersion`] {String} - Highcharts/Highstock engine version (default is '5.0.7')
- [`chartCallback`] {Function} - pass callback function with `chart` as single argument (default is `chart => chart.redraw()`)
- [`iframeId`] {String} - specify id for temporary created iframe by highCharts2Image lib (default is pseudo-random GUID used as iframe id)
- [`width`] {Number} - specify width in pixels for output image (default is `600`)
- [`height`] {Number} - specify height in pixels for output image (default is `400`)

}

## Build with Babel

    npm run build

## Test in browser with Mocha

    npm test

## License
MIT license. Copyright © 2017.