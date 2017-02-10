/**
 * highCharts2Image v1.0.0 by Nedgeva
 * 'Render Highcharts/Highstock plots to image on client side without any hassle'
 * https://github.com/Nedgeva/es6-highcharts2image
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * @param {object} options - Main highCharts2Image options object
 * @param {object} options.chartOptions - Highcharts/Highstock options
 * @param {string} options.chartEngine - use 'highcharts' or 'highstock' plot engine (default is 'highcharts')
 * @param {string} options.chartEngineVersion - Highcharts/Highstock engine version (default is '5.0.7')
 * @param {function} options.chartCallback - pass callback function with `chart` as single argument (default is `chart => chart.redraw()`)
 * @param {string} options.iframeId - specify id for temporary created iframe by highCharts2Image lib (default is pseudo-random GUID used as iframe id)
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
      const fourChars = () => {
        return ( ((1 + Math.random()) * 0x10000) | 0 )
          .toString(16)
          .substring(1)
          .toUpperCase()
      }
      
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
      chartEngineVersion: '5.0.7',
      chartCallback: chart => { /* do anything with chart object */ },
      iframeId: pseudoGuid(),
      width: 600,
      height: 400
    }, options)

    const { 
      chartEngine,
      chartOptions,
      chartEngineVersion,
      chartCallback,
      iframeId,
      width,
      height
    } = opts

    // escape from promise with iframe removing
    const exitGracefully = (msg, isRejected) => {
      window.removeEventListener('message', onmessage)
      const hc2imageFrame = window.document.getElementById(iframeId)
      hc2imageFrame.parentElement.removeChild(hc2imageFrame)
      return isRejected
        ? reject(msg)
        : resolve(msg)
    }

    // set distro urls
    const distroUrl = 'https://cdnjs.cloudflare.com/ajax/libs/highcharts'

    const distroObj = {
      highcharts: `${distroUrl}/${chartEngineVersion}/highcharts.js`,
      highstock: `${distroUrl}/${chartEngineVersion}/highstock.js`,
      exporting: `${distroUrl}/${chartEngineVersion}/js/modules/exporting.js`,
      offlineExporting: `${distroUrl}/${chartEngineVersion}/js/modules/offline-exporting.js`
    }

    const chartMethodObj = {
      highcharts: 'chart',
      highstock: 'stockChart'
    }

    // define injector fn to ensure sequential script loading
    const injectr = (doc, srcList) => {
      if (srcList.length === 0)
        return

      const script = doc.createElement('script')
      script.type = 'text/javascript' 
      
      const source = srcList[0]
      const srcListNew = srcList.slice(1)

      script.onload = e =>
        injectr(doc, srcListNew)

      script.onerror = e =>
        exitGracefully(`Error: can't load script: ${source.src}`, true)

      if (source.src)
        script.src = source.src
      else if (source.text)
        script.textContent = source.text
      else 
        return

      doc.body.appendChild(script)
    }

    const fillFrame = () => {
      
      // convert payload fn to string
      // that will be eval'd inside iframe
      const payloadFn = (() => {
        const win = window.frames.parent
        
        // post messages to parent window via window.postMessage()
        const postBack = (png, errMsg) =>
          win.postMessage({
            from: '$FRAMEID',
            png,
            errMsg
          }, '*')

        const getImageFromSVG = svg =>
          Highcharts.imageToDataUrl(
            Highcharts.svgToDataUrl(svg),
            'image/png',
            { /* empty */ },
            1,
            postBack
          )
        
        try {
          
          // set/override renderTo option
          const options = Object.assign($OPTIONS, {
            chart: {
              renderTo: 'container'
            }
          })
          
          // draw chart
          const chart = new Highcharts.$CHARTMETHOD( options )

          // pass chart object to callback function
          const cbResult = ( $CALLBACK )(chart)

          // encode svg chart to png image
          chart.getSVGForLocalExport(null, null, null, getImageFromSVG)
  
        } catch(err) {  
          
          // post back error message via window.postMessage()
          postBack(null, err.toString())
          
        }
      })
        .toString()
        .replace('$FRAMEID', iframeId)
        .replace('$OPTIONS', JSON.stringify(chartOptions))
        .replace('$CHARTMETHOD', chartMethodObj[chartEngine.toLowerCase()])
        .replace('$CALLBACK', chartCallback.toString())


      const HTMLMarkup =
        `
          <div id="container" style="width: ${width}px; height: ${height}px;"></div>
        `
      
      const payloadJS =
        `
          eval( (${payloadFn})() )
        `

      const injScriptList = [
        {src: distroObj[chartEngine.toLowerCase()]},
        {src: distroObj.exporting},
        {src: distroObj.offlineExporting},
        {text: payloadJS}
      ]
      
      const doc = window.frames[iframeId].document
      doc.body.insertAdjacentHTML('beforeend', HTMLMarkup)
      injectr(doc, injScriptList)
    }

    // create iframe
    const iframe = document.createElement('iframe')
    iframe.id = iframeId
    iframe.name = iframeId
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