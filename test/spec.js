'use strict';

const chartOptions = {
  title: {
     text: ''
  },
  xAxis: {
     categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  },
  series: [{
     data: [29.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]
  }],
  navigation: {
    buttonOptions: {
      align: 'center'
    }
  }
}

const isBase64 = str => {
  try {
    const commaIndex = str.indexOf(',') + 1
    const base64 = str.slice(commaIndex, str.length)
    return btoa(atob(base64)) == base64;
  } catch (err) {
    return false;
  }
}

describe('Testing highCharts2Image internal features', () => {

  const elToRemove = {
    context: null,
    child: null
  }

  const oldRemoveChild = Element.prototype.removeChild

  before(() => {

    function removeChildHooked(child) {
      elToRemove.context = this
      elToRemove.child = child
    }

    Element.prototype.removeChild = removeChildHooked

    const options = { chartOptions }

    return highCharts2Image(options)
      .catch(error =>
        expect().fail(error)
      )

  })

  after(() => {
    oldRemoveChild.call(elToRemove.context, elToRemove.child)
    Element.prototype.removeChild = oldRemoveChild
  })

  it('Should be successfully loaded and window-wide accessible', () => {
    expect(window.highCharts2Image).to.be.a('function')
  })

  it('Should create hidden 1x1 iframe tag', () => {
    const iframes = document.querySelectorAll('iframe')
    expect(iframes).to.have.length(1)
    expect(iframes[0].style.width).to.be.equal('1px')
    expect(iframes[0].style.height).to.be.equal('1px')
    expect(iframes[0].style.visibility).to.be('hidden')
  })

  it('Should embed all necessary scripts inside iframe', () => {
    const frame = document.querySelector('iframe')
    const embeddedScripts = Array.from(
      frame.contentDocument.querySelectorAll('script')
    )
    
    const sources = embeddedScripts
      .filter(script => script.src)
      .map(script => {
        const slashIndex = script.src.lastIndexOf('/') + 1
        return script.src.slice(slashIndex, script.src.length)
      })
    
    const isEmbedded = ['highcharts.js', 'exporting.js', 'offline-exporting.js']
      .every(libName => sources.includes(libName))

    expect(embeddedScripts).to.have.length(4)
    expect(isEmbedded).to.be.ok()

  })

  it('Should have Highcharts object available inside iframe window', () => {
    const frame = document.querySelector('iframe')
    const winFrame = frame.contentWindow || frame
    expect(winFrame.Highcharts).to.be.a('object')
  })

  it('Should append div container inside iframe', () => {
    const frame = document.querySelector('iframe')
    const divContainer = frame.contentDocument.querySelector('div#container')
    expect(divContainer).to.have.property('nodeName', 'DIV')
  })

})

describe('Testing highCharts2Image external features', () => {

  it('Should resolve proper base64 encoded image', () => {

    const options = {
      chartOptions,
      width: 1,
      height: 1
    }

    return highCharts2Image(options)
      .then(result =>
        expect(isBase64(result)).to.be(true)
      )
      .catch(error =>
        expect().fail(error)
      )

  })

  it('Should resolve proper base64 encoded image with desired dimension', () => {

    const options = {
      chartOptions,
      width: 800,
      height: 600
    }

    const testImgOnLoad = e => {
      expect(e.target.width).to.be.equal(options.width)
      expect(e.target.height).to.be.equal(options.height)
    }

    return highCharts2Image(options)
      .then(result => {
        const img = document.createElement('img')
        img.src = result
        img.onload = testImgOnLoad
      })
      .catch(error =>
        expect().fail(error)
      )

  })

  it('Should resolve same result repeatedly', () => {
    
    const options = {
      chartOptions,
      width: 200,
      height: 400
    }

    const hcInstance = highCharts2Image(options)

    const promiseList = new Array(5)
      .fill(hcInstance)

    return Promise.all(promiseList)
      .then(resultList => {
        const isResultsAreSame = resultList
          .every((v, i, a) => v === a[0])

        expect(resultList).to.have.length(5)
        expect(isResultsAreSame).to.be.ok()
      })
      .catch(error =>
        expect().fail(error)
      )

  })

  it('Should allow to pass custom script and custom callback with async rendering', () => {

    const stockOptions = {
      series: []
    }

    const cb = (chart, win) => {
      chart.addSeries({
        name: 'ADBE',
        data: win.ADBE
      }, false)
      
      chart.addSeries({
        name: 'MSFT',
        data: win.MSFT
      }, false)

      chart.redraw()
    }

    const options = {
      chartOptions: stockOptions,
      chartEngine: 'highstock',
      chartCallback: cb,
      distro: {
        customScript: 'https://www.highcharts.com/samples/data/three-series-1000-points.js'
      },
      width: 400,
      height: 300
    }

    return highCharts2Image(options)
      .then(result => {
        expect(isBase64(result)).to.be(true);
        /*const img = document.createElement('img')
        img.src = result
        document.body.appendChild(img)*/
      })
      .catch(error =>
        expect().fail(error)
      )

  })

  it('Should allow multiple instances which resolves correct results', () => {

    const shuffle = arr =>
      arr
        .slice()
        .sort(() =>
          Math.random() >= 0.5
        )

    const options = {
      chartOptions,
      width: 200,
      height: 400
    }

    const optionList = new Array(5)
      .fill(options)

    const chartDataList = chartOptions.series[0].data

    const promiseList = optionList
      .map(option => {
        option.chartOptions.series[0].data = shuffle(chartDataList)
        //console.log('original', option.chartOptions.series[0].data)
        return highCharts2Image(option)
      })

    return Promise.all(promiseList)
      .then(resultList => {

        resultList.forEach(result => {
          const img = document.createElement('img')
          img.src = result
          document.body.appendChild(img)
        })

        const isResultsAreSame = resultList
          .every((v, i, a) => v === a[0])

        expect(resultList).to.have.length(5)
        expect(isResultsAreSame).not.to.be.ok()

      })
      .catch(error =>
        expect().fail(error)
      )

  })

  it('Should reject on invalid highcharts options', () => {

    const options = {
      chartOptions: {
        series: 'invalid data for demo purposes'
      }
    }

    return highCharts2Image(options)
      .catch(reason =>
        expect(reason).to.contain('Error')
      )

  })

  it('Should reject on invalid highcharts script version', () => {

    const options = {
      chartOptions,
      chartEngineVersion: '666'
    }

    return highCharts2Image(options)
      .catch(reason =>
        expect(reason).to.contain('Error')
      )

  })

  it('Should not leave any iframe tags', () => {
    
    const options = { chartOptions }

    return highCharts2Image(options)
      .then(result =>
        expect(document.querySelectorAll('iframe')).to.have.length(0)
      )
      .catch(error =>
        expect().fail(error)
      )

  })

})