/**
 * highCharts2Image v1.1.1 by Nedgeva
 * 'Render Highcharts/Highstock plots to image on client side without any hassle'
 * https://github.com/Nedgeva/es6-highcharts2image
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * @param {object} options - Main highCharts2Image options object
 * @param {object} options.chartOptions - Highcharts/Highstock options
 * @param {string} options.chartEngine - use 'highcharts' or 'highstock' plot engine (default is 'highcharts')
 * @param {string} options.chartEngineVersion - Highcharts/Highstock engine version (default is '5.0.9')
 * @param {function} options.chartCallback - pass callback function with `chart` and `window` as arguments (default is `chart => chart.redraw()`)
 * @param {object} options.distro - specify urls for highcharts/highstock and even custom libs. Especially useful when creating offline app. Default `{highcharts: 'https://cdnjs.cloudflare.com/.../highcharts.js', exporting: 'https://...', etc}` See spec.js file for more info
 * @param {number} options.width - specify width in pixels for output image (default is `600`)
 * @param {number} options.height - specify width in pixels for output image (default is `400`)
 * @return {Promise<string>} - Base64 encoded PNG image
 * @throws {Promise<string>} - Error explanation
 */

const highCharts2Image = options =>
  new Promise((resolve, reject) => {

    // GUID generator for
    // pseudo-random iframe id
    const pseudoGuid = () => {
      const fourChars = () => 
        ( ((1 + Math.random()) * 0x10000) | 0 )
          .toString(16)
          .substring(1)
          .toUpperCase()
      
      return fourChars()
        + fourChars()
        + "-" + fourChars()
        + "-" + fourChars()
        + "-" + fourChars()
        + "-" + fourChars()
        + fourChars()
        + fourChars()
    }

    // setting defaults, if any option is omitted
    const opts = Object.assign({
      chartEngine: 'highcharts',
      chartEngineVersion: '5.0.9',
      chartCallback: chart => chart.redraw(),
      width: 600,
      height: 400
    }, options)

    const { 
      chartOptions,
      chartEngine,
      chartEngineVersion,
      chartCallback,
      distro,
      width,
      height
    } = opts

    // set main CDN and default distro
    const cdn = 'https://cdnjs.cloudflare.com/ajax/libs/highcharts'

    const defaultDistroObj = {
      highcharts: `${cdn}/${chartEngineVersion}/highcharts.js`,
      highstock: `${cdn}/${chartEngineVersion}/highstock.js`,
      exporting: `${cdn}/${chartEngineVersion}/js/modules/exporting.js`,
      offlineExporting: `${cdn}/${chartEngineVersion}/js/modules/offline-exporting.js`
    }

    const distroObj = Object.assign(defaultDistroObj, distro)

    const iframeId = pseudoGuid()
    
    // stringifying chartOptions early
    // to prevent FF from caching options 
    const strChartOptions = JSON.stringify(chartOptions)

    // escape from promise with iframe removing
    // and listener detaching
    const exitGracefully = (msg, isRejected) => {
      window.removeEventListener('message', onmessage)
      document.body.removeChild(iframe)
      return isRejected
        ? reject(msg)
        : resolve(msg)
    }

    const chartMethodObj = {
      highcharts: 'chart',
      highstock: 'stockChart'
    }

    // define injector fn to ensure sequential script loading
    const injectr = (doc, srcList, cb) => {
      if (srcList.length === 0)
        return cb
          ? cb()
          : false

      const script = doc.createElement('script')
      script.type = 'text/javascript' 
      
      const source = srcList[0]
      const srcListNew = srcList.slice(1)

      const addRemoteScript = (target, src) => {
        target.onload = e =>
          injectr(doc, srcListNew, cb)

        target.onerror = e =>
          exitGracefully(`Error: can't load script: ${src.src}`, true)

        target.src = src.src
        doc.body.appendChild(target)
      }

      const addTextScript = (target, src) => {
        target.textContent = src.text
        doc.body.appendChild(target)
        injectr(doc, srcListNew, cb)
      }

      if (source.src)
        return addRemoteScript(script, source)
      else if (source.text)
        return addTextScript(script, source)
      else
        return injectr(doc, srcListNew, cb)
    }

    const payloadFn = innerWin => {
      const parentWin = window.frames.parent
            
      // post messages to parent window via window.postMessage()
      const postBack = (png, errMsg) =>
        parentWin.postMessage({
          from: innerWin.FRAMEID,
          png,
          errMsg
        }, '*')
    
      const getImageFromSVG = svg =>
        innerWin.Highcharts.imageToDataUrl(
          innerWin.Highcharts.svgToDataUrl(svg),
          'image/png',
          { /* empty */ },
          1,
          postBack
        )
            
      try {
    
        function hc2i() {
          // make sure chart is rendered and then
          // encode svg chart to png image
          return this.getSVGForLocalExport(
            null, 
            null, 
            null, 
            getImageFromSVG
          )
        }
              
        // set/override renderTo option
        const options = Object.assign(JSON.parse(innerWin.CHARTOPTIONS), {
          chart: {
            renderTo: 'container',
            events: {
              redraw: hc2i
            }
          }
        })
              
        // draw chart
        const chart = new innerWin.Highcharts[innerWin.CHARTMETHOD](options)
        
        // run callback immediately after chart is drawn
        {
          innerWin.CALLBACK(chart, innerWin)
        }

      } catch (err) {

        // post back error message via window.postMessage()
        postBack(null, err.toString())
              
      }
    }

    const payloadJS =
      `
        PAYLOAD(window)
      ` 

    const fillFrame = () => {

      const iframeWin = iframe.contentWindow || iframe
      iframeWin.FRAMEID = iframeId
      iframeWin.CHARTOPTIONS = strChartOptions //chartOptions
      iframeWin.CHARTMETHOD = chartMethodObj[chartEngine.toLowerCase()]
      iframeWin.CALLBACK = chartCallback
      iframeWin.PAYLOAD = payloadFn

      const HTMLMarkup =
        `
          <div id="container" style="width: ${width}px; height: ${height}px;"></div>
        `

      // we need this fn to preserve script loading order
      const generateScriptList = () => {
        const blacklist = [
          'highcharts', 
          'highstock', 
          'exporting', 
          'offlineExporting'
        ]

        const addCustomScripts = () =>
          Object.keys(distroObj)
            .filter(libName => !blacklist.includes(libName))
            .map(libName => ({src: distroObj[libName]}))

        return [
          {src: distroObj[chartEngine.toLowerCase()]},
          {src: distroObj.exporting},
          {src: distroObj.offlineExporting},
          ...addCustomScripts(),
          {text: payloadJS}
        ]
      }

      const injScriptList = generateScriptList()

      const doc = iframe.contentDocument

      doc.body.insertAdjacentHTML('beforeend', HTMLMarkup)
      injectr(doc, injScriptList)
    }

    // create iframe
    const iframe = document.createElement('iframe')
    iframe.style = 'width: 1px; height: 1px; visibility: hidden;'
    iframe.onload = fillFrame

    // append iframe
    document.body.appendChild(iframe)

    // deploy conflict-free 'window.onmessage' listener
    const onmessage = message => {
      const { 
        from,
        png,
        errMsg
      } = message.data
      
      // skip messages from other frames
      if (from !== iframeId)
        return

      return png !== null
        ? exitGracefully(png)
        : exitGracefully(errMsg, true)
    }

    window.addEventListener('message', onmessage)

  })

// expose highCharts2Image function to window
window.highCharts2Image = highCharts2Image