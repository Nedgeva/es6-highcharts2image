# highcharts2image

> Render Highcharts/Highstock plots to image on client side without any hassle

## Description

highcharts2image is standalone micro library written in pure JS (ES6) using Promises, runs in browser and requires no extra dependencies (actually it loads all necessary depedencies by itself).
Just pass chart options to highcharts2image and it will resolve base64 encoded PNG image.
This lib can be tweaked for working offline.

## How it works

  0. highcharts2image takes options and returns Promise object
  1. highcharts2image creates 1px*1px hidden iframe right before enclosing body tag
  2. adds window.onmessage listener
  3. appends div container to iframe body with provided width and height
  4. injects 3 scripts into created iframe and loads them sequentially (highcharts/highstock lib, exporting and offline-exporting JS libs)
  5. renders chart based on provided options to div container
  6. optionally runs callback with created chart object (very useful option!)
  7. internally converts rendered svg chart to base64 encoded png image (thanks to exporting and offline-exporting JS libs)
  8. sends image back to highcharts2image via window.postMessage()
  9. removes attached window.onmessage listener
  10. removes created iframe
  11. resolves base64 encoded png image as value or rejects with error message

## Installation

    npm i highcharts2image

## Usage
You can use pre-built (ES6 transpiled to ES5 with Babel) minified version from 'dist/highcharts2image.min.js'. Simply attach highcharts2image to the bottom of your page and call it like this:
```html
<script src="../dist/highcharts2image.min.js"></script>
<script>
  // Any valid HighCharts plot options is ok
  // Please note: you don't have to specify
  // chart.renderTo option as it will be
  // processed internally
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
      const img = document.createElement('img')
      img.src = result
      document.body.appendChild(img)
    })
    .catch(reason => {
      // Oops, we've got an error!
      // 'reason' is the string with useful information about error
      console.error(reason)
    })

  // or even simpler with async/await
  async function appendImg() {
    try {
      const img = document.createElement('img')
      img.src = await highCharts2Image(options)
      document.body.appendChild(img)
    } catch (ex) {
      console.error(ex)
    }
  }

  appendImg()
</script>
```

## API

### highCharts2Image(options)
Returns Promise that will be fullfiled with base64 encoded png or rejected with error explanation.
Takes single `options` {object} argument with only one required property 'chartOptions':

{

- `chartOptions` {object}  - Highcharts/Highstock options
- [`chartEngine`] {string} - use 'highcharts' or 'highstock' plot engine (default is 'highcharts')
- [`chartEngineVersion`] {string} - Highcharts/Highstock engine version (default is '5.0.7')
- [`chartCallback`] {function} - pass callback function with `chart` as single argument (default is `chart => chart.redraw()`)

`Please note:` if you are passing custom callback that modifies `chart` object, use 'false' flag for redraw option where it's possible, for example: chart.update({/* some options */}, `false`) 
and don't forget to call `chart.redraw()` at the end of your callback fn
- [`distro`] {object} - specify urls for highcharts/highstock libs. Especially useful when creating offline app. Default `{highcharts: 'https://cdnjs.cloudflare.com/.../highcharts.js', exporting: '...url...', etc}`
- [`width`] {number} - specify width in pixels for output image (default is `600`)
- [`height`] {number} - specify height in pixels for output image (default is `400`)

}

## Changelog

    1.1.0 - exposed `distro` option, now it's possible to set custom urls for script sources and even inject custom JS libs
    1.0.4 - fixed compatibility issues with Firefox
    1.0.3 - removed redundant code, disabled `iframeId` option as unneeded
    1.0.2 - skipped (internal build)
    1.0.1 - switched chart-to-image rendering mechanism to event-based instead of sync one
    1.0.0 - initial release

## Build with Babel

    npm run build

## Test in browser with Mocha

    npm test

## License
MIT license. Copyright © 2017.